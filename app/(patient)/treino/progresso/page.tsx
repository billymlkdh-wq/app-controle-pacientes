// Gráfico de progressão por exercício: carga máxima do dia + reps total por dia.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkoutProgressChart, type ProgressPoint } from '@/components/patient/WorkoutProgressChart'

export default async function TreinoProgressoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: patient } = await supabase
    .from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente não vinculado.</p>

  // Carrega logs com join pra exercise name
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('load_kg, reps_done, performed_date, set:workout_sets(exercise_id, exercise:workout_exercises(id, name))')
    .eq('patient_id', patient.id)
    .order('performed_date', { ascending: true })

  // Agrupa por exercise_id → date → max_load, sum_reps
  const byExercise = new Map<string, { name: string; byDate: Map<string, { max_load: number; total_reps: number }> }>()
  for (const l of (logs ?? []) as any[]) {
    const ex = l.set?.exercise
    if (!ex) continue
    const exId = ex.id
    const g = byExercise.get(exId) ?? { name: ex.name, byDate: new Map() }
    const date = l.performed_date
    const d = g.byDate.get(date) ?? { max_load: 0, total_reps: 0 }
    const load = Number(l.load_kg ?? 0)
    const reps = Number(l.reps_done ?? 0)
    if (load > d.max_load) d.max_load = load
    d.total_reps += reps
    g.byDate.set(date, d)
    byExercise.set(exId, g)
  }

  const exerciseData = [...byExercise.entries()].map(([exId, g]) => ({
    exId,
    name: g.name,
    series: [...g.byDate.entries()].map(([date, v]): ProgressPoint => ({
      date: date.slice(5).replace('-', '/'),  // MM/DD
      max_load: v.max_load,
      total_reps: v.total_reps,
      volume: v.max_load * v.total_reps,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  })).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Progresso</h1>
        <Link href="/treino" className="text-sm text-yellow-400 hover:underline">← Treino</Link>
      </div>

      {exerciseData.length === 0 ? (
        <Card><CardContent className="py-8 text-sm text-center text-[#9a8c70]">
          Registre carga + reps no treino pra começar a ver o gráfico.
        </CardContent></Card>
      ) : (
        exerciseData.map((ex) => (
          <Card key={ex.exId}>
            <CardHeader>
              <CardTitle className="text-sm">{ex.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkoutProgressChart data={ex.series} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
