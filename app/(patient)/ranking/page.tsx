/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLevel, getProgressToNext } from '@/lib/gamification'
import { RankingPeriodTabs } from '@/components/patient/RankingPeriodTabs'

function periodSince(period: string): Date | null {
  const now = new Date()
  if (period === 'semana') { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
  if (period === 'mes') { const d = new Date(now); d.setDate(d.getDate() - 30); return d }
  return null
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = params.period ?? 'total'
  const since = periodSince(period)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: currentPatient } = await admin
    .from('patients').select('id, name').eq('user_id', user!.id).maybeSingle()

  const { data: patients } = await admin.from('patients').select('id, name').eq('active', true)

  let pointsQuery = admin.from('patient_points').select('patient_id, amount')
  if (since) pointsQuery = pointsQuery.gte('created_at', since.toISOString())
  const { data: allPoints } = await pointsQuery

  const { data: allStreaks } = await admin.from('patient_streaks').select('patient_id, current_streak')

  const pointsByPatient = new Map<string, number>()
  for (const p of (allPoints ?? []) as any[]) {
    pointsByPatient.set(p.patient_id, (pointsByPatient.get(p.patient_id) ?? 0) + p.amount)
  }
  const streakByPatient = new Map(((allStreaks ?? []) as any[]).map((s: any) => [s.patient_id, s]))

  const ranking = ((patients ?? []) as any[])
    .map((p: any) => ({
      id: p.id as string,
      name: p.name as string,
      points: pointsByPatient.get(p.id) ?? 0,
      streak: (streakByPatient.get(p.id) as any)?.current_streak ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  const myId = currentPatient?.id as string | undefined
  const myPos = myId ? ranking.findIndex((r) => r.id === myId) : -1
  const me = myPos >= 0 ? ranking[myPos] : null

  // Para o card pessoal, sempre usar pontos totais para nível
  const { data: allTimePoints } = await admin.from('patient_points').select('amount').eq('patient_id', myId ?? '')
  const myTotalPoints = ((allTimePoints ?? []) as any[]).reduce((s: number, r: any) => s + r.amount, 0)
  const myLevel = getLevel(myTotalPoints)
  const myProgress = getProgressToNext(myTotalPoints)
  const myPeriodPoints = me?.points ?? 0

  const medalEmoji = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Ranking</h1>

      <RankingPeriodTabs current={period} />

      {me && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Minha posição</span>
              <Badge variant="secondary">#{myPos + 1}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{myPeriodPoints} pts</div>
                <div className="text-sm text-muted-foreground">{myLevel.emoji} {myLevel.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">🔥 {me.streak} seguidos</div>
                {period !== 'total' && (
                  <div className="text-xs text-muted-foreground">{myTotalPoints} pts total</div>
                )}
              </div>
            </div>
            {myLevel.name !== 'Deusa Fitness' && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{myLevel.name}</span>
                  <span>{myProgress}% para o próximo nível</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${myProgress}%` }} />
                </div>
              </div>
            )}
            {myLevel.name === 'Deusa Fitness' && (
              <p className="text-sm text-muted-foreground">Nível máximo! 👑</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Classificação geral</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ranking.map((r, i) => {
            const isMe = r.id === myId
            const level = getLevel(r.points)
            const firstName = r.name.split(' ')[0]
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-md px-3 py-2 ${isMe ? 'bg-primary/10 font-medium' : 'bg-muted/40'}`}
              >
                <div className="w-6 text-center text-sm">{i < 3 ? medalEmoji[i] : `#${i + 1}`}</div>
                <div className="flex-1 text-sm">
                  <div>{isMe ? 'Você' : firstName}</div>
                  <div className="text-xs text-muted-foreground">{level.emoji} {level.name}</div>
                </div>
                {r.streak > 0 && <div className="text-xs text-muted-foreground">🔥{r.streak}</div>}
                <div className="text-sm font-medium">{r.points} pts</div>
              </div>
            )
          })}
          {ranking.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum dado ainda. Registre seus hábitos!</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
