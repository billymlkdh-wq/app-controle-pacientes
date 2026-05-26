// Evolução do paciente — questionário (mesmo gráfico que o paciente vê) + medidas manuais.
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/admin/ProgressChart'
import { QuestionnaireEvolutionChart } from '@/components/admin/QuestionnaireEvolutionChart'
import { formatDateBR } from '@/lib/utils'

export default async function PatientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [recordsRes, responsesRes] = await Promise.all([
    supabase
      .from('progress_records')
      .select('*')
      .eq('patient_id', id)
      .order('date', { ascending: true }),
    supabase
      .from('questionnaire_responses')
      .select('response_number,created_at,schedule_id,question:questionnaire_questions(order_num,is_numeric_chart,question_text)')
      .eq('patient_id', id)
      .order('created_at', { ascending: true }),
  ])

  const records = recordsRes.data ?? []
  const responses = responsesRes.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Evolução do paciente</h1>

      <Card>
        <CardHeader><CardTitle>Questionário quinzenal (peso, medidas, scores)</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <QuestionnaireEvolutionChart responses={responses as any} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Medidas manuais (admin)</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ProgressChart records={records as any} />
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tabela de medidas manuais</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Data</th><th>Peso</th><th>Cintura</th><th>Quadril</th></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{formatDateBR(r.date)}</td>
                      <td>{r.weight_kg ?? '-'} kg</td>
                      <td>{r.waist_cm ?? '-'} cm</td>
                      <td>{r.hip_cm ?? '-'} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
