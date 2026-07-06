// Gamification helpers — pontos, níveis, streaks, conquistas
// Usa createAdminClient (service role) para escrever sem RLS
// As tabelas de gamificação não estão nos tipos gerados; usar cast `as any` até próximo supabase db pull

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server'

function db() { return createAdminClient() as any }

export const POINTS = {
  questionnaire_on_time: 100,
  questionnaire_late: 50,
  streak_bonus_per: 10,   // × current_streak
  goal_completed: 200,
  community_post: 20,
} as const

export const LEVELS = [
  { name: 'Bronze',   min: 0,    max: 499  },
  { name: 'Prata',    min: 500,  max: 1499 },
  { name: 'Ouro',     min: 1500, max: 3999 },
  { name: 'Diamante', min: 4000, max: Infinity },
] as const

export function getLevel(totalPoints: number) {
  return LEVELS.find((l) => totalPoints >= l.min && totalPoints <= l.max) ?? LEVELS[0]
}

export function getProgressToNext(totalPoints: number): number {
  const idx = LEVELS.findIndex((l) => totalPoints >= l.min && totalPoints <= l.max)
  if (idx < 0 || idx === LEVELS.length - 1) return 100
  const current = LEVELS[idx]
  const range = (LEVELS[idx + 1].min) - current.min
  return Math.round(((totalPoints - current.min) / range) * 100)
}

export const ACHIEVEMENTS: Record<string, { label: string; description: string; emoji: string }> = {
  first_questionnaire:  { label: 'Primeira Resposta',  description: 'Respondeu o primeiro questionário',      emoji: '🎯' },
  streak_3:             { label: 'Sequência de 3',      description: '3 questionários seguidos',               emoji: '🔥' },
  streak_5:             { label: 'Sequência de 5',      description: '5 questionários seguidos',               emoji: '⚡' },
  streak_10:            { label: 'Sequência de 10',     description: '10 questionários seguidos',              emoji: '💎' },
  level_prata:          { label: 'Nível Prata',         description: 'Alcançou 500 pontos',                    emoji: '🥈' },
  level_ouro:           { label: 'Nível Ouro',          description: 'Alcançou 1500 pontos',                   emoji: '🥇' },
  level_diamante:       { label: 'Nível Diamante',      description: 'Alcançou 4000 pontos',                   emoji: '💎' },
  first_goal:           { label: 'Meta Concluída',      description: 'Concluiu a primeira meta',               emoji: '✅' },
  community_voice:      { label: 'Voz da Comunidade',   description: 'Fez o primeiro post na comunidade',      emoji: '💬' },
}

// Retorna total de pontos de um paciente
export async function getPatientTotalPoints(patientId: string): Promise<number> {
  const admin = db()
  const { data } = await admin
    .from('patient_points')
    .select('amount')
    .eq('patient_id', patientId)
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
}

// Concede pontos e verifica conquistas relacionadas a nível
async function awardPoints(patientId: string, amount: number, reason: string) {
  const admin = db()
  await admin.from('patient_points').insert({ patient_id: patientId, amount, reason })

  // Verifica conquistas de nível após novo ponto
  const total = await getPatientTotalPoints(patientId)
  const levelKeys: Record<number, string> = { 500: 'level_prata', 1500: 'level_ouro', 4000: 'level_diamante' }
  for (const [threshold, key] of Object.entries(levelKeys)) {
    if (total >= Number(threshold)) {
      await unlockAchievement(patientId, key)
    }
  }
}

async function unlockAchievement(patientId: string, key: string) {
  const admin = db()
  // UPSERT ignorado se já existe (UNIQUE constraint)
  await admin.from('patient_achievements').upsert(
    { patient_id: patientId, achievement_key: key },
    { onConflict: 'patient_id,achievement_key', ignoreDuplicates: true },
  )
}

// Chamado após submissão de questionário bem-sucedida
export async function handleQuestionnaireSubmission(patientId: string, isLate: boolean) {
  const admin = db()

  // Busca ou cria streak
  const { data: streakRow } = await admin
    .from('patient_streaks')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  const now = new Date()
  let currentStreak = (streakRow?.current_streak ?? 0) + 1
  const longestStreak = Math.max(currentStreak, streakRow?.longest_streak ?? 0)

  if (streakRow) {
    await admin.from('patient_streaks').update({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('patient_id', patientId)
  } else {
    await admin.from('patient_streaks').insert({
      patient_id: patientId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_at: now.toISOString(),
    })
  }

  // Pontos base
  const base = isLate ? POINTS.questionnaire_late : POINTS.questionnaire_on_time
  const streakBonus = currentStreak * POINTS.streak_bonus_per
  await awardPoints(patientId, base, isLate ? 'questionario_atrasado' : 'questionario_pontual')
  if (streakBonus > 0) await awardPoints(patientId, streakBonus, `streak_bonus_${currentStreak}`)

  // Conquistas
  const total = await getPatientTotalPoints(patientId)
  const { data: existingAch } = await admin
    .from('patient_achievements')
    .select('achievement_key')
    .eq('patient_id', patientId)
  const earned = new Set((existingAch ?? []).map((a: any) => a.achievement_key))

  if (!earned.has('first_questionnaire')) await unlockAchievement(patientId, 'first_questionnaire')
  if (currentStreak >= 3) await unlockAchievement(patientId, 'streak_3')
  if (currentStreak >= 5) await unlockAchievement(patientId, 'streak_5')
  if (currentStreak >= 10) await unlockAchievement(patientId, 'streak_10')
  void total // points-level achievements handled inside awardPoints
}

// Chamado quando paciente faz post na comunidade
export async function handleCommunityPost(patientId: string) {
  const admin = db()
  await awardPoints(patientId, POINTS.community_post, 'community_post')
  const { data: existing } = await admin
    .from('patient_achievements')
    .select('achievement_key')
    .eq('patient_id', patientId)
    .eq('achievement_key', 'community_voice')
    .maybeSingle()
  if (!existing) await unlockAchievement(patientId, 'community_voice')
}

// Chamado quando meta é concluída
export async function handleGoalCompleted(patientId: string) {
  const admin = db()
  await awardPoints(patientId, POINTS.goal_completed, 'meta_concluida')
  const { data: existing } = await admin
    .from('patient_achievements')
    .select('achievement_key')
    .eq('patient_id', patientId)
    .eq('achievement_key', 'first_goal')
    .maybeSingle()
  if (!existing) await unlockAchievement(patientId, 'first_goal')
}
