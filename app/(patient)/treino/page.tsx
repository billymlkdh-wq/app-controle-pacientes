// Visualização do plano de treino ativo do paciente + registro de carga/reps por série.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkoutSetLogger } from '@/components/patient/WorkoutSetLogger'
import { todayBR } from '@/lib/utils'

const SET_COLOR: Record<string, string> = {
  aquecimento: 'bg-blue-900/40 text-blue-300 border-blue-800',
  preparatoria: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  valida: 'bg-green-900/40 text-green-300 border-green-800',
}
const SET_LABEL: Record<string, string> = {
  aquecimento: 'Aquec',
  preparatoria: 'Prep',
  valida: 'Válida',
}

export default async function PatientTreinoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: patient } = await supabase
    .from('patients').select('id, name').eq('user_id', user.id).single()
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente não vinculado.</p>

  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, name, notes, updated_at')
    .eq('patient_id', patient.id)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Treino</h1>
        <Card><CardContent className="py-8 text-sm text-center text-[#9a8c70]">
          Nenhum treino ativo. Seu profissional vai liberar em breve.
        </CardContent></Card>
      </div>
    )
  }

  const { data: days } = await supabase
    .from('workout_days')
    .select('id, name, notes, order_num, exercises:workout_exercises(id, name, notes, rest_seconds, order_num, sets:workout_sets(id, set_type, reps, target_load_kg, order_num))')
    .eq('plan_id', plan.id)
    .order('order_num')

  // Logs de HOJE pra pré-preencher inputs
  const today = todayBR()
  const { data: todayLogs } = await supabase
    .from('workout_logs')
    .select('set_id, load_kg, reps_done')
    .eq('patient_id', patient.id)
    .eq('performed_date', today)
  const logsBySet = new Map<string, { load_kg: number | null; reps_done: number | null }>()
  for (const l of todayLogs ?? []) {
    logsBySet.set(l.set_id, {
      load_kg: l.load_kg != null ? Number(l.load_kg) : null,
      reps_done: l.reps_done != null ? Number(l.reps_done) : null,
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{plan.name}</h1>
          <p className="text-xs text-[#9a8c70]">Treino</p>
        </div>
        <Link href="/treino/progresso" className="text-sm text-yellow-400 hover:underline">
          📈 Progresso
        </Link>
      </div>

      {(days ?? []).map((d: any) => {
        const exercises = [...(d.exercises ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)
        if (exercises.length === 0) return null
        return (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{d.name}</span>
                <Badge variant="outline">{exercises.length} exerc.</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exercises.map((ex: any) => {
                const sets = [...(ex.sets ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)
                return (
                  <div key={ex.id} className="border-l-2 border-[#2a2419] pl-3">
                    <div className="font-medium text-sm">{ex.name}</div>
                    {ex.notes && <div className="text-xs italic text-[#9a8c70] mt-0.5">{ex.notes}</div>}
                    {ex.rest_seconds && (
                      <div className="text-[10px] text-[#9a8c70]">Descanso: {ex.rest_seconds}s</div>
                    )}
                    <div className="mt-2 space-y-1.5">
                      {sets.map((s: any, i: number) => {
                        const log = logsBySet.get(s.id)
                        return (
                          <div key={s.id} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#9a8c70] w-4">#{i + 1}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 border rounded ${SET_COLOR[s.set_type]}`}>
                              {SET_LABEL[s.set_type]}
                            </span>
                            <span className="text-xs text-[#d4c89a] min-w-[60px]">
                              {s.reps} reps
                              {s.target_load_kg && ` @ ${Number(s.target_load_kg)}kg`}
                            </span>
                            <WorkoutSetLogger
                              setId={s.id}
                              initialLoad={log?.load_kg ?? null}
                              initialReps={log?.reps_done ?? null}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
