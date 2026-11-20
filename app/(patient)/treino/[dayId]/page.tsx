// Lista exercícios do dia de treino escolhido (estilo Smartfit).
// Cada exercício mostra dots coloridos por tipo de série + range reps + badge última carga.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, Play } from 'lucide-react'
import { ExerciseVideoButton } from '@/components/patient/ExerciseVideoButton'

const SET_DOT: Record<string, string> = {
  aquecimento: 'bg-red-500',
  preparatoria: 'bg-yellow-400',
  valida: 'bg-green-500',
}

function repsRange(sets: Array<{ reps: string }>): string {
  const nums: number[] = []
  for (const s of sets) {
    const m = s.reps.match(/\d+/g)
    if (m) nums.push(...m.map(Number))
  }
  if (nums.length === 0) return '—'
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return min === max ? `${min} repetições` : `${min}-${max} repetições`
}

export default async function TreinoDayPage({
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

  // Última carga por exercício (max load_kg mais recente)
  const exIds = (day.exercises ?? []).map((e: any) => e.id)
  const setIds = (day.exercises ?? []).flatMap((e: any) => (e.sets ?? []).map((s: any) => s.id))
  const lastByExercise = new Map<string, { load_kg: number; reps_done: number | null }>()
  if (setIds.length > 0) {
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('set_id, load_kg, reps_done, performed_date, set:workout_sets(exercise_id)')
      .in('set_id', setIds)
      .order('performed_date', { ascending: false })
      .limit(500)
    for (const l of (logs ?? []) as any[]) {
      const exId = l.set?.exercise_id
      if (!exId || l.load_kg == null) continue
      if (!lastByExercise.has(exId)) {
        lastByExercise.set(exId, {
          load_kg: Number(l.load_kg),
          reps_done: l.reps_done != null ? Number(l.reps_done) : null,
        })
      }
    }
  }

  const exercises = [...(day.exercises ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/treino"
          className="inline-flex items-center gap-1 bg-orange-500 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-orange-600">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>
      <h1 className="text-center text-2xl font-bold tracking-wide text-white">
        {day.name.toUpperCase()}
      </h1>

      {/* Lista de exercícios */}
      <div className="space-y-4">
        {exercises.map((ex: any) => {
          const sets = [...(ex.sets ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)
          const last = lastByExercise.get(ex.id)
          return (
            <div key={ex.id} className="border-b border-[#2a2419] pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-base font-semibold text-white">
                    {ex.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[#d4c89a]">
                    <span>Séries:</span>
                    {sets.map((s: any, i: number) => (
                      <span key={s.id} className={`inline-flex items-center gap-1 ml-1`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${SET_DOT[s.set_type]}`} />
                        {i + 1}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#9a8c70] mt-0.5">{repsRange(sets)}</div>
                  {ex.video_url && (
                    <div className="mt-2">
                      <ExerciseVideoButton url={ex.video_url} title={ex.name} />
                    </div>
                  )}
                </div>
                {last && (
                  <div className="bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    {last.load_kg}kg{last.reps_done ? ` · ${last.reps_done} reps` : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Botão fixo Iniciar */}
      <Link
        href={`/treino/${day.id}/executar`}
        className="fixed bottom-20 left-4 right-4 max-w-xl mx-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg"
      >
        <Play className="h-5 w-5 fill-white" />
        Iniciar treino
      </Link>
    </div>
  )
}
