// Responder questionário quinzenal
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionnaireForm } from '@/components/patient/QuestionnaireForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateBR, todayBR } from '@/lib/utils'
import { daysUntilDue } from '@/lib/questionnaire/schedule'

export default async function QuestionnairePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) {
    return <p className="text-muted-foreground">Paciente não vinculado. Contate o admin.</p>
  }

  // Busca o PRÓXIMO schedule pendente/atrasado (o mais antigo ainda aberto)
  const { data: schedule } = await supabase
    .from('questionnaire_schedule')
    .select('*')
    .eq('patient_id', patient.id)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const today = todayBR()
  const isLocked = schedule ? schedule.due_date > today : true

  // Se está bloqueado (ou sem schedule), mostra aviso com próxima data
  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Questionário quinzenal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {schedule ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Você já respondeu seu último questionário. Obrigado!
                </p>
                <div className="rounded-md border bg-muted/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Próxima liberação</div>
                  <div className="text-lg font-medium">{formatDateBR(schedule.due_date)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const d = daysUntilDue(schedule.due_date)
                      return d === 1 ? 'em 1 dia' : `em ${d} dias`
                    })()}
                  </div>
                </div>
                <Button asChild variant="outline"><Link href="/portal">Voltar</Link></Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Nenhum questionário agendado no momento. Fale com seu nutricionista se acha que é um engano.
                </p>
                <Button asChild variant="outline"><Link href="/portal">Voltar</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Schedule liberado hoje ou atrasado → renderiza o formulário
  const { data: questions } = await supabase
    .from('questionnaire_questions')
    .select('*')
    .eq('active', true)
    .order('order_num')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Questionário quinzenal</CardTitle></CardHeader>
        <CardContent>
          <QuestionnaireForm
            patientId={patient.id}
            scheduleId={schedule!.id}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            questions={(questions ?? []) as any}
          />
        </CardContent>
      </Card>
    </div>
  )
}
