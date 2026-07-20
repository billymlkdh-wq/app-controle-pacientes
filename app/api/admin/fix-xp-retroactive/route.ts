/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || (user.user_metadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient() as any

  // 1. Todas respostas únicas por (patient_id, schedule_id), ordenadas por data
  const { data: respostas, error: respErr } = await admin
    .from('questionnaire_responses')
    .select('patient_id, schedule_id, created_at')
    .not('schedule_id', 'is', null)
    .order('created_at', { ascending: true })

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  // Dedup por (patient_id, schedule_id) — preserva ordem cronológica
  const seen = new Set<string>()
  const unicas: Array<{ patient_id: string; schedule_id: string; created_at: string }> = []
  for (const r of (respostas ?? [])) {
    const key = `${r.patient_id}__${r.schedule_id}`
    if (!seen.has(key)) { seen.add(key); unicas.push(r) }
  }

  // 2. Contar quantas entradas de XP de questionário cada paciente JÁ TEM
  const { data: existingPoints } = await admin
    .from('patient_points')
    .select('patient_id')
    .in('reason', ['questionario_pontual', 'questionario_atrasado'])

  const xpCount: Record<string, number> = {}
  for (const p of (existingPoints ?? [])) {
    xpCount[p.patient_id] = (xpCount[p.patient_id] ?? 0) + 1
  }

  // 3. Agrupar respostas por paciente (já em ordem cronológica)
  const porPaciente: Record<string, typeof unicas> = {}
  for (const r of unicas) {
    if (!porPaciente[r.patient_id]) porPaciente[r.patient_id] = []
    porPaciente[r.patient_id].push(r)
  }

  // 4. Due dates para calcular atraso
  const scheduleIds = [...new Set(unicas.map(u => u.schedule_id))]
  const { data: schedules } = await admin
    .from('questionnaire_schedule').select('id, due_date').in('id', scheduleIds)
  const dueDateMap: Record<string, string> = {}
  for (const s of (schedules ?? [])) dueDateMap[s.id] = s.due_date

  const resultados: any[] = []
  let corrigidos = 0

  for (const [patientId, resps] of Object.entries(porPaciente)) {
    const jaTemCount = xpCount[patientId] ?? 0
    // Pular respostas que já têm XP (as primeiras jaTemCount por ordem cronológica)
    const pendentes = resps.slice(jaTemCount)

    if (pendentes.length === 0) {
      resultados.push({ patient_id: patientId, status: 'ja_tem_xp_todos', skipped: resps.length })
      continue
    }

    for (const resp of pendentes) {
      const dueDate = dueDateMap[resp.schedule_id]
      const respondedAt = resp.created_at.slice(0, 10)
      const isLate = dueDate ? respondedAt > dueDate : false
      const amount = isLate ? 50 : 100
      const reason = isLate ? 'questionario_atrasado' : 'questionario_pontual'

      const { error: ptErr } = await admin
        .from('patient_points')
        .insert({ patient_id: patientId, amount, reason })

      if (ptErr) {
        resultados.push({ patient_id: patientId, status: 'erro_points', error: ptErr.message })
        continue
      }

      // Upsert streak
      const { data: streak } = await admin
        .from('patient_streaks').select('current_streak, longest_streak')
        .eq('patient_id', patientId).maybeSingle()

      if (streak) {
        const newStreak = streak.current_streak + 1
        await admin.from('patient_streaks').update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_completed_at: resp.created_at,
          updated_at: new Date().toISOString(),
        }).eq('patient_id', patientId)
      } else {
        await admin.from('patient_streaks').insert({
          patient_id: patientId, current_streak: 1, longest_streak: 1,
          last_completed_at: resp.created_at,
        })
      }

      await admin.from('patient_achievements').upsert(
        { patient_id: patientId, achievement_key: 'first_questionnaire' },
        { onConflict: 'patient_id,achievement_key', ignoreDuplicates: true },
      )

      corrigidos++
      resultados.push({ patient_id: patientId, status: 'ok', amount, reason, schedule_id: resp.schedule_id })
    }
  }

  return NextResponse.json({ total_respostas: unicas.length, corrigidos, resultados })
}
