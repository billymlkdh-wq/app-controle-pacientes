// Endpoint consumido pelo header do paciente (XPHeader client).
// Devolve XP total, nível, streak e progresso. Permite atualização ao vivo
// quando o próprio paciente ganha XP (meal, questionário, hábito).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LEVELS, getLevelName } from '@/lib/gamification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient() as any
  const { data: patient } = await db
    .from('patients')
    .select('id, sex')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!patient?.id) {
    return NextResponse.json({
      totalXP: 0, streak: 0, levelEmoji: '🐔',
      levelName: 'Franguinha', nextLevelName: null,
      progress: 0, xpToNext: 0,
    })
  }

  const [{ data: pts }, { data: str }] = await Promise.all([
    db.from('patient_points').select('amount').eq('patient_id', patient.id),
    db.from('patient_streaks').select('current_streak').eq('patient_id', patient.id).maybeSingle(),
  ])
  const totalXP = (pts ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
  const streak = str?.current_streak ?? 0

  const idx = LEVELS.findIndex((l) => totalXP >= l.min && totalXP <= l.max)
  const safe = idx === -1 ? LEVELS.length - 1 : idx
  const current = LEVELS[safe]
  const next = safe < LEVELS.length - 1 ? LEVELS[safe + 1] : null
  const progress = next
    ? Math.min(100, ((totalXP - current.min) / (next.min - current.min)) * 100)
    : 100
  const xpToNext = next ? next.min - totalXP : 0

  return NextResponse.json({
    totalXP,
    streak,
    levelEmoji: current.emoji,
    levelName: getLevelName(current, patient.sex),
    nextLevelName: next ? getLevelName(next, patient.sex) : null,
    progress,
    xpToNext,
  })
}
