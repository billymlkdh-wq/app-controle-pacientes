// Evolução (peso/medidas) do paciente — gráfico + tabela
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/admin/ProgressChart'
import { formatDateBR } from '@/lib/utils'

export default async function PatientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: records } = await supabase
    .from('progress_records')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Evolução física</h1>
      <Card>
        <CardHeader><CardTitle>Gráfico</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ProgressChart records={(records ?? []) as any} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Medidas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Data</th><th>Peso</th><th>Cintura</th><th>Quadril</th></tr></thead>
              <tbody>
                {(records ?? []).map((r) => (
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
    </div>
  )
}
