/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server'

function db() { return createAdminClient() as any }

export const POINTS = {
  questionnaire_on_time: 100,
  questionnaire_late: 50,
  streak_bonus_per: 10,
  goal_completed: 200,
  community_post: 20,
  habit_water_goal: 10,
  habit_steps_goal: 8,
  habit_cardio: 15,
  habit_workout: 20,
  challenge_complete: 150,
} as const

export const LEVELS = [
  { name: 'Franguinha',        nameM: 'Franguinho',       emoji: '🐔', min: 0,     max: 499   },
  { name: 'Iniciante',         nameM: 'Iniciante',        emoji: '🌱', min: 500,   max: 999   },
  { name: 'Focada',            nameM: 'Focado',           emoji: '⚡', min: 1000,  max: 1999  },
  { name: 'Rata de Academia',  nameM: 'Rato de Academia', emoji: '🎯', min: 2000,  max: 3999  },
  { name: 'Disciplinada',      nameM: 'Disciplinado',     emoji: '💪', min: 4000,  max: 7999  },
  { name: 'Marombinha',        nameM: 'Marombinho',       emoji: '🔥', min: 8000,  max: 14999 },
  { name: 'Fitness',           nameM: 'Fitness',          emoji: '🏋️', min: 15000, max: 24999 },
  { name: 'Musa',              nameM: 'Galã',             emoji: '🚀', min: 25000, max: 39999 },
  { name: 'Atleta Pro',        nameM: 'Atleta Pro',       emoji: '🏆', min: 40000, max: 59999 },
  { name: 'Deusa Fitness',     nameM: 'Deus Fitness',     emoji: '👑', min: 60000, max: Infinity },
] as const

export type Level = (typeof LEVELS)[number]

export function getLevel(totalPoints: number): Level {
  return (LEVELS.find((l) => totalPoints >= l.min && totalPoints <= l.max) ?? LEVELS[0]) as Level
}

export function getLevelName(level: Level, sex?: string | null): string {
  if (sex === 'M') return (level as any).nameM ?? level.name
  return level.name
}

export function getProgressToNext(totalPoints: number): number {
  const idx = LEVELS.findIndex((l) => totalPoints >= l.min && totalPoints <= l.max)
  if (idx < 0 || idx === LEVELS.length - 1) return 100
  const current = LEVELS[idx]
  const range = LEVELS[idx + 1].min - current.min
  return Math.round(((totalPoints - current.min) / range) * 100)
}

export const ACHIEVEMENTS: Record<string, { label: string; description: string; emoji: string }> = {
  first_questionnaire:  { label: 'Primeira Resposta',  description: 'Respondeu o primeiro questionário',      emoji: '🎯' },
  streak_3:             { label: 'Sequência de 3',      description: '3 questionários seguidos',               emoji: '🔥' },
  streak_5:             { label: 'Sequência de 5',      description: '5 questionários seguidos',               emoji: '⚡' },
  streak_10:            { label: 'Sequência de 10',     description: '10 questionários seguidos',              emoji: '💎' },
  level_agora_vai:      { label: 'Agora Vai',           description: 'Alcançou 1000 pontos',                   emoji: '⚡' },
  level_focada:         { label: 'Focada',              description: 'Alcançou 2000 pontos',                   emoji: '🎯' },
  level_disciplinada:   { label: 'Disciplinada',        description: 'Alcançou 8000 pontos',                   emoji: '🔥' },
  level_marombinha:     { label: 'Marombinha',          description: 'Alcançou 15000 pontos',                  emoji: '🏋️' },
  first_goal:           { label: 'Meta Concluída',      description: 'Concluiu a primeira meta',               emoji: '✅' },
  community_voice:      { label: 'Voz da Comunidade',   description: 'Fez o primeiro post na comunidade',      emoji: '💬' },
  first_water_goal:     { label: 'Hidratada',           description: 'Atingiu a meta de água pela 1ª vez',     emoji: '💧' },
  first_steps_goal:     { label: 'Caminhante',          description: 'Atingiu a meta de passos pela 1ª vez',   emoji: '👟' },
  habit_streak_7:       { label: 'Hábito de 7 dias',    description: '7 dias seguidos registrando hábitos',    emoji: '📅' },
  first_challenge:      { label: 'Desafiada',           description: 'Participou do primeiro desafio',         emoji: '🏆' },
  challenge_win:        { label: 'Campeã',              description: 'Completou um desafio com 100%',          emoji: '🥇' },
}

export async function getPatientTotalPoints(patientId: string): Promise<number> {
  const admin = db()
  const { data } = await admin.from('patient_points').select('amount').eq('patient_id', patientId)
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
}

export async function getPatientPointsForPeriod(patientId: string, since: Date): Promise<number> {
  const admin = db()
  const { data } = await admin
    .from('patient_points')
    .select('amount')
    .eq('patient_id', patientId)
    .gte('created_at', since.toISOString())
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
}

async function awardPoints(patientId: string, amount: number, reason: string) {
  const admin = db()
  const { error: insertErr } = await admin.from('patient_points').insert({ patient_id: patientId, amount, reason })
  if (insertErr) {
    console.error('[gamification] awardPoints FAILED', { patientId, amount, reason, error: insertErr.message })
    return
  }
  const total = await getPatientTotalPoints(patientId)
  const levelKeys: Record<number, string> = {
    1000: 'level_agora_vai',
    2000: 'level_focada',
    8000: 'level_disciplinada',
    15000: 'level_marombinha',
  }
  for (const [threshold, key] of Object.entries(levelKeys)) {
    if (total >= Number(threshold)) await unlockAchievement(patientId, key)
  }
}

async function unlockAchievement(patientId: string, key: string) {
  const admin = db()
  await admin.from('patient_achievements').upsert(
    { patient_id: patientId, achievement_key: key },
    { onConflict: 'patient_id,achievement_key', ignoreDuplicates: true },
  )
}

export async function handleQuestionnaireSubmission(patientId: string, isLate: boolean) {
  const admin = db()
  const { data: streakRow } = await admin
    .from('patient_streaks').select('*').eq('patient_id', patientId).maybeSingle()
  const now = new Date()
  const currentStreak = (streakRow?.current_streak ?? 0) + 1
  const longestStreak = Math.max(currentStreak, streakRow?.longest_streak ?? 0)
  if (streakRow) {
    const { error: updErr } = await admin.from('patient_streaks').update({
      current_streak: currentStreak, longest_streak: longestStreak,
      last_completed_at: now.toISOString(), updated_at: now.toISOString(),
    }).eq('patient_id', patientId)
    if (updErr) console.error('[gamification] streak update FAILED', { patientId, error: updErr.message })
  } else {
    const { error: insErr } = await admin.from('patient_streaks').insert({
      patient_id: patientId, current_streak: currentStreak,
      longest_streak: longestStreak, last_completed_at: now.toISOString(),
    })
    if (insErr) console.error('[gamification] streak insert FAILED', { patientId, error: insErr.message })
  }
  const base = isLate ? POINTS.questionnaire_late : POINTS.questionnaire_on_time
  const streakBonus = currentStreak * POINTS.streak_bonus_per
  await awardPoints(patientId, base, isLate ? 'questionario_atrasado' : 'questionario_pontual')
  if (streakBonus > 0) await awardPoints(patientId, streakBonus, `streak_bonus_${currentStreak}`)
  const { data: existingAch } = await admin
    .from('patient_achievements').select('achievement_key').eq('patient_id', patientId)
  const earned = new Set((existingAch ?? []).map((a: any) => a.achievement_key))
  if (!earned.has('first_questionnaire')) await unlockAchievement(patientId, 'first_questionnaire')
  if (currentStreak >= 3) await unlockAchievement(patientId, 'streak_3')
  if (currentStreak >= 5) await unlockAchievement(patientId, 'streak_5')
  if (currentStreak >= 10) await unlockAchievement(patientId, 'streak_10')
}

export async function handleCommunityPost(patientId: string) {
  const admin = db()
  await awardPoints(patientId, POINTS.community_post, 'community_post')
  const { data: existing } = await admin
    .from('patient_achievements').select('achievement_key')
    .eq('patient_id', patientId).eq('achievement_key', 'community_voice').maybeSingle()
  if (!existing) await unlockAchievement(patientId, 'community_voice')
}

export async function handleGoalCompleted(patientId: string) {
  const admin = db()
  await awardPoints(patientId, POINTS.goal_completed, 'meta_concluida')
  const { data: existing } = await admin
    .from('patient_achievements').select('achievement_key')
    .eq('patient_id', patientId).eq('achievement_key', 'first_goal').maybeSingle()
  if (!existing) await unlockAchievement(patientId, 'first_goal')
}

export async function handleHabitLog(
  patientId: string,
  habitType: 'water' | 'steps' | 'cardio' | 'workout',
  value: number,
  goalValue: number,
  dailyTotal?: number,   // total acumulado do dia incluindo este log
  previousTotal?: number, // total antes deste log
) {
  const admin = db()

  // Para água e passos: usa total acumulado do dia para detectar meta
  // Para cardio e treino: XP por sessão independente de meta
  const cumulative = dailyTotal ?? value
  const prevTotal  = previousTotal ?? 0

  // Meta "cruzada" neste exato log (evita XP duplo em logs subsequentes)
  const justReachedGoal = goalValue > 0 && cumulative >= goalValue && prevTotal < goalValue
  const goalReached = goalValue > 0 && cumulative >= goalValue

  let xp = 0
  let reason = ''
  switch (habitType) {
    case 'water':
      if (justReachedGoal) { xp = POINTS.habit_water_goal; reason = 'meta_agua' }
      break
    case 'steps':
      if (justReachedGoal) { xp = POINTS.habit_steps_goal; reason = 'meta_passos' }
      break
    case 'cardio':
      xp = POINTS.habit_cardio; reason = 'cardio_extra'
      break
    case 'workout':
      xp = POINTS.habit_workout; reason = 'treino_confirmado'
      break
  }
  if (xp > 0) await awardPoints(patientId, xp, reason)

  if (goalReached) {
    if (habitType === 'water') {
      const { data: ex } = await admin.from('patient_achievements').select('achievement_key')
        .eq('patient_id', patientId).eq('achievement_key', 'first_water_goal').maybeSingle()
      if (!ex) await unlockAchievement(patientId, 'first_water_goal')
    }
    if (habitType === 'steps') {
      const { data: ex } = await admin.from('patient_achievements').select('achievement_key')
        .eq('patient_id', patientId).eq('achievement_key', 'first_steps_goal').maybeSingle()
      if (!ex) await unlockAchievement(patientId, 'first_steps_goal')
    }
  }

  // Verifica streak de 7 dias de hábitos
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: recentLogs } = await admin
    .from('patient_habit_logs')
    .select('logged_date')
    .eq('patient_id', patientId)
    .gte('logged_date', sevenDaysAgo.toISOString().split('T')[0])
  const uniqueDays = new Set((recentLogs ?? []).map((l: any) => l.logged_date as string))
  if (uniqueDays.size >= 7) await unlockAchievement(patientId, 'habit_streak_7')

  return { xp, goalReached }
}

export async function handleChallengeJoined(patientId: string) {
  const admin = db()
  const { data: ex } = await admin.from('patient_achievements').select('achievement_key')
    .eq('patient_id', patientId).eq('achievement_key', 'first_challenge').maybeSingle()
  if (!ex) await unlockAchievement(patientId, 'first_challenge')
}

export async function handleChallengeCompleted(patientId: string) {
  await handleChallengeJoined(patientId)
  const admin = db()
  await awardPoints(patientId, POINTS.challenge_complete, 'desafio_concluido')
  const { data: ex } = await admin.from('patient_achievements').select('achievement_key')
    .eq('patient_id', patientId).eq('achievement_key', 'challenge_win').maybeSingle()
  if (!ex) await unlockAchievement(patientId, 'challenge_win')
}
