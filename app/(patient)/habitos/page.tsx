/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { HabitTracker } from '@/components/patient/HabitTracker'
import { getPatientTotalPoints, getLevel, getProgressToNext } from '@/lib/gamification'

export default async function HabitosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()
  const patientId = (patient as any)?.id as string | undefined

  const today = new Date().toISOString().split('T')[0]

  const [{ data: logsRaw }, { data: goalsRaw }] = await Promise.all([
    admin.from('patient_habit_logs').select('*').eq('patient_id', patientId ?? '').eq('logged_date', today),
    admin.from('patient_habit_goals')
      .select('*')
      .or(patientId ? `patient_id.eq.${patientId},patient_id.is.null` : 'patient_id.is.null'),
  ])

  const totalPoints = patientId ? await getPatientTotalPoints(patientId) : 0
  const level = getLevel(totalPoints)
  const progress = getProgressToNext(totalPoints)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hábitos do Dia</h1>
        <p className="text-sm text-muted-foreground">
          {level.emoji} {level.name} · {totalPoints} pts · {progress}% para o próximo nível
        </p>
      </div>

      <HabitTracker todayLogs={logsRaw ?? []} goals={goalsRaw ?? []} />
    </div>
  )
}
