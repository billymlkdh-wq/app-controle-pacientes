/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { ChallengeCard } from '@/components/patient/ChallengeCard'

export default async function DesafiosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()
  const myPatientId = (patient as any)?.id as string | undefined

  const today = new Date().toISOString().split('T')[0]
  const { data: challenges } = await admin
    .from('patient_challenges')
    .select('*')
    .eq('is_active', true)
    .gte('end_date', today)
    .order('start_date', { ascending: true })

  const { data: participants } = challenges?.length
    ? await admin
        .from('patient_challenge_participants')
        .select('*, patients(name)')
        .in('challenge_id', challenges.map((c: any) => c.id))
    : { data: [] }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Desafios</h1>
        <p className="text-sm text-muted-foreground">Compete com outros pacientes e ganhe XP extra</p>
      </div>

      {(!challenges || challenges.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum desafio ativo no momento. Volte em breve!
          </CardContent>
        </Card>
      )}

      {(challenges ?? []).map((challenge: any) => {
        const challengeParticipants = (participants ?? []).filter(
          (p: any) => p.challenge_id === challenge.id
        )
        const myParticipation = myPatientId
          ? challengeParticipants.find((p: any) => p.patient_id === myPatientId)
          : null
        return (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            participants={challengeParticipants}
            myPatientId={myPatientId ?? null}
            isJoined={!!myParticipation}
            myProgress={myParticipation?.current_value ?? 0}
          />
        )
      })}
    </div>
  )
}
