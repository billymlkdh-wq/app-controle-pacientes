// Responder questionário quinzenal
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionnaireForm } from '@/components/patient/QuestionnaireForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function QuestionnairePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) {
    return <p className="text-muted-foreground">Paciente não vinculado. Contate o admin.</p>
  }

  const [{ data: questions }, { data: schedule }] = await Promise.all([
    supabase.from('questionnaire_questions').select('*').eq('active', true).order('order_num'),
    supabase.from('questionnaire_schedule').select('*').eq('patient_id', patient.id).in('status', ['pending', 'overdue']).order('due_date').limit(1).maybeSingle(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Questionário quinzenal</CardTitle></CardHeader>
        <CardContent>
          <QuestionnaireForm
            patientId={patient.id}
            scheduleId={schedule?.id ?? null}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            questions={(questions ?? []) as any}
          />
        </CardContent>
      </Card>
    </div>
  )
}
