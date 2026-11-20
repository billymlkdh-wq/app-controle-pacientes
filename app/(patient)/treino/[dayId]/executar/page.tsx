// Página servidor que carrega exercícios do dia + logs de hoje, delega pro cliente.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkoutRunner, type RunnerExercise } from '@/components/patient/WorkoutRunner'
import { todayBR } from '@/lib/utils'

export default async function TreinoExecutarPage({
  params,
}: {
  params: Promise<{ dayId: string }>
}) {
  const { dayId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: patient } = await supabase
    .from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente não vinculado.</p>

  const { data: day } = await supabase
    .from('workout_days')
    .select('id, name, exercises:workout_exercises(id, name, notes, rest_seconds, video_url, order_num, sets:workout_sets(id, set_type, reps, target_load_kg, order_num))')
    .eq('id', dayId)
    .single()
  if (!day) notFound()

  const setIds = (day.exercises ?? []).flatMap((e: any) => (e.sets ?? []).map((s: any) => s.id))
  const today = todayBR()
  const logsBySet = new Map<string, { load_kg: number | null; reps_done: number | null }>()
  if (setIds.length > 0) {
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('set_id, load_kg, reps_done')
      .eq('patient_id', patient.id)
      .eq('performed_date', today)
      .in('set_id', setIds)
    for (const l of logs ?? []) {
      logsBySet.set(l.set_id, {
        load_kg: l.load_kg != null ? Number(l.load_kg) : null,
        reps_done: l.reps_done != null ? Number(l.reps_done) : null,
      })
    }
  }

  const exercises: RunnerExercise[] = [...(day.exercises ?? [])]
    .sort((a: any, b: any) => a.order_num - b.order_num)
    .map((e: any) => ({
      id: e.id,
      name: e.name,
      notes: e.notes,
      rest_seconds: e.rest_seconds,
      video_url: e.video_url ?? null,
      sets: [...(e.sets ?? [])].sort((a: any, b: any) => a.order_num - b.order_num).map((s: any) => {
        const log = logsBySet.get(s.id)
        return {
          id: s.id,
          set_type: s.set_type,
          reps: s.reps,
          target_load_kg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
          done: log != null && (log.load_kg != null || log.reps_done != null),
          load_kg: log?.load_kg ?? null,
          reps_done: log?.reps_done ?? null,
        }
      }),
    }))

  return (
    <WorkoutRunner
      dayId={day.id}
      dayName={day.name}
      exercises={exercises}
    />
  )
}
