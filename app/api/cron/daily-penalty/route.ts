/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const HABIT_XP: Record<string, number> = {
  water:   10,
  steps:    8,
  cardio:  15,
  workout: 20,
}
const QUESTIONNAIRE_XP = 100

// Runs at 00:05 UTC daily via Vercel Cron
// Applies XP penalty = -floor(xp/2) for each missed task from yesterday
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient() as any

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yDate = yesterday.toISOString().split('T')[0]

  // All active patients
  const { data: patients } = await db.from('patients').select('id').eq('active', true)
  if (!patients?.length) return NextResponse.json({ ok: true, penalized: 0 })

  let totalPenalties = 0

  for (const { id: patientId } of patients as any[]) {
    // Habits logged yesterday
    const { data: habitLogs } = await db
      .from('patient_habit_logs')
      .select('habit_type')
      .eq('patient_id', patientId)
      .eq('logged_date', yDate)

    const loggedTypes = new Set((habitLogs ?? []).map((l: any) => l.habit_type as string))

    for (const [habitType, xp] of Object.entries(HABIT_XP)) {
      if (loggedTypes.has(habitType)) continue

      // Already penalized?
      const { data: existing } = await db
        .from('patient_penalty_log')
        .select('id')
        .eq('patient_id', patientId)
        .eq('penalty_date', yDate)
        .eq('task_type', habitType)
        .maybeSingle()
      if (existing) continue

      const penalty = -Math.floor(xp / 2)

      await Promise.all([
        db.from('patient_points').insert({
          patient_id: patientId,
          amount: penalty,
          reason: `missed_${habitType}`,
        }),
        db.from('patient_penalty_log').insert({
          patient_id: patientId,
          penalty_date: yDate,
          task_type: habitType,
          xp_lost: Math.abs(penalty),
        }),
      ])
      totalPenalties++
    }

    // Check questionnaire (if any was due yesterday and not answered)
    const { data: pendingQ } = await db
      .from('questionnaire_schedule')
      .select('id')
      .eq('patient_id', patientId)
      .lte('due_date', yDate)
      .in('status', ['pending', 'overdue'])
      .is('completed_at', null)

    for (const q of (pendingQ ?? []) as any[]) {
      const { data: existing } = await db
        .from('patient_penalty_log')
        .select('id')
        .eq('patient_id', patientId)
        .eq('penalty_date', yDate)
        .eq('task_type', `questionnaire_${q.id}`)
        .maybeSingle()
      if (existing) continue

      const penalty = -Math.floor(QUESTIONNAIRE_XP / 2)
      await Promise.all([
        db.from('patient_points').insert({ patient_id: patientId, amount: penalty, reason: 'missed_questionnaire' }),
        db.from('patient_penalty_log').insert({
          patient_id: patientId,
          penalty_date: yDate,
          task_type: `questionnaire_${q.id}`,
          xp_lost: Math.abs(penalty),
        }),
      ])
      totalPenalties++
    }
  }

  return NextResponse.json({ ok: true, date: yDate, penalized: totalPenalties })
}
