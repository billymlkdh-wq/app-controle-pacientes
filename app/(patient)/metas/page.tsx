/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Goal {
  id: string
  title: string
  description: string | null
  target_value: number | null
  current_value: number | null
  unit: string | null
  goal_type: string
  deadline: string | null
  status: string
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-primary'
}

export default async function MetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()
  const patientId = (patient as any)?.id as string | undefined

  const { data: goalsRaw } = await admin
    .from('patient_goals')
    .select('*')
    .eq('patient_id', patientId ?? '')
    .order('created_at', { ascending: false })

  const goals = (goalsRaw ?? []) as Goal[]
  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Minhas Metas</h1>

      {goals.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-center text-muted-foreground">
            Seu nutricionista ainda não cadastrou nenhuma meta para você.
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Em andamento</h2>
          {active.map((g) => {
            const pct = g.target_value && g.target_value > 0
              ? Math.min(100, Math.round(((g.current_value ?? 0) / g.target_value) * 100))
              : null
            return (
              <Card key={g.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{g.title}</span>
                    {g.deadline && (
                      <span className="text-xs font-normal text-muted-foreground">
                        até {new Date(g.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {g.description && (
                    <p className="text-sm text-muted-foreground">{g.description}</p>
                  )}
                  {pct !== null && (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{g.current_value ?? 0} {g.unit}</span>
                        <span>{g.target_value} {g.unit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-right text-muted-foreground">{pct}%</div>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Concluídas</h2>
          {completed.map((g) => (
            <Card key={g.id} className="opacity-70">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>✅ {g.title}</span>
                  <Badge variant="outline" className="text-xs">Concluída</Badge>
                </CardTitle>
              </CardHeader>
              {g.description && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
