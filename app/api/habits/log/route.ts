/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleHabitLog } from '@/lib/gamification'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user.id).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  const body = await req.json()
  const { habit_type, value, photo_url, note, auto_post } = body as {
    habit_type: 'water' | 'steps' | 'cardio' | 'workout'
    value: number
    photo_url?: string
    note?: string
    auto_post?: boolean
  }


  const today = new Date().toISOString().split('T')[0]

  // Busca meta (paciente específico ou global)
  const { data: goalRow } = await admin
    .from('patient_habit_goals')
    .select('daily_goal, xp_reward')
    .or(`patient_id.eq.${patient.id},patient_id.is.null`)
    .eq('habit_type', habit_type)
    .order('patient_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const goalValue = goalRow?.daily_goal ?? 0

  // Insere log
  const { data: log, error } = await admin.from('patient_habit_logs').insert({
    patient_id: patient.id,
    habit_type,
    value,
    logged_date: today,
    photo_url: photo_url ?? null,
    note: note ?? null,
    auto_posted: !!auto_post,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Soma acumulada do dia (incluindo o log recém inserido)
  // Necessário para detectar quando meta diária é atingida em múltiplos registros
  const { data: todayLogs } = await admin
    .from('patient_habit_logs')
    .select('value')
    .eq('patient_id', patient.id)
    .eq('habit_type', habit_type)
    .eq('logged_date', today)
  const dailyTotal = (todayLogs ?? []).reduce((s: number, l: any) => s + (l.value ?? 0), 0)
  const previousTotal = dailyTotal - value

  // XP + conquistas
  const result = await handleHabitLog(patient.id, habit_type, value, goalValue, dailyTotal, previousTotal).catch(() => ({ xp: 0, goalReached: false }))

  // Auto-post na comunidade
  if (auto_post) {
    const labels: Record<string, string> = {
      water: `Bebi ${value}L de água hoje! 💧`,
      steps: `Dei ${value.toLocaleString('pt-BR')} passos hoje! 👟`,
      cardio: 'Fiz cardio hoje! 🏃',
      workout: 'Treino concluído hoje! 💪',
    }
    await admin.from('community_posts').insert({
      patient_id: patient.id,
      content: labels[habit_type] ?? `Hábito registrado: ${habit_type}`,
      is_anonymous: false,
      post_type: `habit_${habit_type}`,
      source_id: log.id,
    })
  }

  return NextResponse.json({ success: true, xp: result.xp, goalReached: result.goalReached })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user.id).maybeSingle()
  if (!patient) return NextResponse.json({ logs: [] })

  const today = new Date().toISOString().split('T')[0]
  const { data: logs } = await admin
    .from('patient_habit_logs')
    .select('*')
    .eq('patient_id', patient.id)
    .eq('logged_date', today)

  const { data: goals } = await admin
    .from('patient_habit_goals')
    .select('*')
    .or(`patient_id.eq.${patient.id},patient_id.is.null`)

  return NextResponse.json({ logs: logs ?? [], goals: goals ?? [] })
}
