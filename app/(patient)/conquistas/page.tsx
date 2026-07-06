/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { ACHIEVEMENTS, getLevel } from '@/lib/gamification'

export default async function ConquistasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()

  const patientId = (patient as any)?.id as string | undefined

  const [{ data: earnedRaw }, { data: pointsRaw }] = await Promise.all([
    admin.from('patient_achievements').select('achievement_key, earned_at').eq('patient_id', patientId ?? ''),
    admin.from('patient_points').select('amount').eq('patient_id', patientId ?? ''),
  ])

  const earnedMap = new Map(
    ((earnedRaw ?? []) as any[]).map((a: any) => [a.achievement_key as string, a.earned_at as string])
  )
  const totalPoints = ((pointsRaw ?? []) as any[]).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
  const level = getLevel(totalPoints)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conquistas</h1>
        <p className="text-sm text-muted-foreground">
          {earnedMap.size} de {Object.keys(ACHIEVEMENTS).length} desbloqueadas · Nível {level.name} · {totalPoints} pts
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(ACHIEVEMENTS).map(([key, ach]) => {
          const isEarned = earnedMap.has(key)
          const earnedAt = earnedMap.get(key)
          return (
            <Card
              key={key}
              className={`text-center transition-all ${isEarned ? 'border-primary/50 bg-primary/5' : 'opacity-50 grayscale'}`}
            >
              <CardContent className="pt-4 pb-3 space-y-1">
                <div className="text-3xl">{isEarned ? ach.emoji : '🔒'}</div>
                <div className="text-sm font-medium">{ach.label}</div>
                <div className="text-xs text-muted-foreground">{ach.description}</div>
                {isEarned && earnedAt && (
                  <div className="text-xs text-primary">
                    {new Date(earnedAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
