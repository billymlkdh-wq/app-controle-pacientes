// Evolução do próprio paciente — gráfico multi-série
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuestionnaireEvolutionChart } from '@/components/admin/QuestionnaireEvolutionChart'

export default async function PatientProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user!.id).single()

  const { data: responses } = await supabase
    .from('questionnaire_responses')
    .select('response_number,created_at,question:questionnaire_questions(order_num,is_numeric_chart,question_text)')
    .eq('patient_id', patient!.id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Minha evolução</h1>
      <Card>
        <CardHeader><CardTitle>Respostas numéricas</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <QuestionnaireEvolutionChart responses={(responses ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  )
}
