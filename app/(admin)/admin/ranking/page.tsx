/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLevel } from '@/lib/gamification'

export default async function AdminRankingPage() {
  const admin = createAdminClient() as any

  const { data: patients } = await admin.from('patients').select('id, name, active').eq('active', true)
  const { data: allPoints } = await admin.from('patient_points').select('patient_id, amount, reason, created_at')
  const { data: allStreaks } = await admin.from('patient_streaks').select('*')

  const pointsByPatient = new Map<string, number>()
  for (const p of allPoints ?? []) {
    pointsByPatient.set(p.patient_id, (pointsByPatient.get(p.patient_id) ?? 0) + p.amount)
  }
  const streakByPatient = new Map((allStreaks ?? []).map((s: any) => [s.patient_id, s]))

  const ranking = ((patients ?? []) as any[])
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      points: pointsByPatient.get(p.id) ?? 0,
      streak: (streakByPatient.get(p.id) as any)?.current_streak ?? 0,
    }))
    .sort((a: any, b: any) => b.points - a.points)

  const medalEmoji = ['🥇', '🥈', '🥉']

  const recentPoints = [...((allPoints ?? []) as any[])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  const patientNameById = new Map(((patients ?? []) as any[]).map((p: any) => [p.id, p.name]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ranking</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Classificação geral</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ranking.map((r: any, i: number) => {
              const level = getLevel(r.points)
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2">
                  <div className="w-7 text-center text-sm font-medium">
                    {i < 3 ? medalEmoji[i] : `#${i + 1}`}
                  </div>
                  <div className="flex-1 text-sm font-medium">{r.name}</div>
                  <Badge variant="outline" className="text-xs">{level.name}</Badge>
                  {r.streak > 0 && <span className="text-xs">🔥{r.streak}</span>}
                  <div className="text-sm font-semibold">{r.points} pts</div>
                </div>
              )
            })}
            {ranking.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum paciente com pontos ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico recente de pontos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentPoints.map((p: any) => (
              <div key={`${p.patient_id}-${p.created_at}`} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex-1 truncate">{patientNameById.get(p.patient_id) ?? p.patient_id}</span>
                <span className="text-xs">{p.reason.replace(/_/g, ' ')}</span>
                <span className="font-medium text-primary">+{p.amount}</span>
              </div>
            ))}
            {recentPoints.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum ponto registrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
