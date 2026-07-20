/* eslint-disable @typescript-eslint/no-explicit-any */
// Rota temporária para corrigir XP retroativo de quem respondeu questionário
// mas não recebeu pontos por causa do bug de fire-and-forget
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || (user.user_metadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient() as any

  // 1. Pegar todas respostas únicas por (patient_id, schedule_id)
  const { data: respostas, error: respErr } = await admin
    .from('questionnaire_responses')
    .select('patient_id, schedule_id, created_at')
    .not('schedule_id', 'is', null)
    .order('created_at', { ascending: true })

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  // Dedup: pegar a primeira resposta por (patient_id, schedule_id)
  const seen = new Set<string>()
  const unicas: Array<{ patient_id: string; schedule_id: string; created_at: string }> = []
  for (const r of (respostas ?? [])) {
    const key = `${r.patient_id}__${r.schedule_id}`
    if (!seen.has(key)) {
      seen.add(key)
      unicas.push(r)
    }
  }

  // 2. Pegar quem já tem pontos de questionário
  const { data: existingPoints } = await admin
    .from('patient_points')
    .select('patient_id, reason')
    .in('reason', ['questionario_pontual', 'questionario_atrasado'])

  const jaTemXp = new Set<string>((existingPoints ?? []).map((p: any) => p.patient_id))

  // 3. Pegar due_date de cada schedule para calcular se foi atrasado
  const scheduleIds = [...new Set(unicas.map(u => u.schedule_id))]
  const { data: schedules } = await admin
    .from('questionnaire_schedule')
    .select('id, due_date')
    .in('id', scheduleIds)

  const scheduleDueMap: Record<string, string> = {}
  for (const s of (schedules ?? [])) scheduleDueMap[s.id] = s.due_date

  const resultados: any[] = []
  let corrigidos = 0

  for (const resp of unicas) {
    if (jaTemXp.has(resp.patient_id)) {
      resultados.push({ patient_id: resp.patient_id, status: 'ja_tem_xp', skipped: true })
      continue
    }

    const dueDate = scheduleDueMap[resp.schedule_id]
    const respondedAt = resp.created_at.slice(0, 10)
    const isLate = dueDate ? respondedAt > dueDate : false
    const amount = isLate ? 50 : 100
    const reason = isLate ? 'questionario_atrasado' : 'questionario_pontual'

    // Inserir pontos
    const { error: ptErr } = await admin
      .from('patient_points')
      .insert({ patient_id: resp.patient_id, amount, reason })

    if (ptErr) {
      resultados.push({ patient_id: resp.patient_id, status: 'erro_points', error: ptErr.message })
      continue
    }

    // Upsert streak (simplificado: streak = 1 pra quem não tem nada)
    const { data: existingStreak } = await admin
      .from('patient_streaks')
      .select('current_streak, longest_streak')
      .eq('patient_id', resp.patient_id)
      .maybeSingle()

    if (existingStreak) {
      const newStreak = existingStreak.current_streak + 1
      await admin.from('patient_streaks').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, existingStreak.longest_streak),
        last_completed_at: resp.created_at,
        updated_at: new Date().toISOString(),
      }).eq('patient_id', resp.patient_id)
    } else {
      await admin.from('patient_streaks').insert({
        patient_id: resp.patient_id,
        current_streak: 1,
        longest_streak: 1,
        last_completed_at: resp.created_at,
      })
    }

    // Conquista primeira resposta
    await admin.from('patient_achievements').upsert(
      { patient_id: resp.patient_id, achievement_key: 'first_questionnaire' },
      { onConflict: 'patient_id,achievement_key', ignoreDuplicates: true },
    )

    corrigidos++
    jaTemXp.add(resp.patient_id) // evita duplo processamento na mesma chamada
    resultados.push({ patient_id: resp.patient_id, status: 'ok', amount, reason })
  }

  return NextResponse.json({
    total_respostas: unicas.length,
    corrigidos,
    resultados,
  })
}
