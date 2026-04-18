// Histórico de consultas do paciente
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateBR } from '@/lib/utils'

export default async function PatientAppointmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: appts } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Consultas</h1>
      <div className="space-y-3">
        {(appts ?? []).map((a) => (
          <Card key={a.id}>
            <CardHeader><CardTitle className="text-base">{formatDateBR(a.date)}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              {a.notes && <div><span className="text-muted-foreground">Notas:</span> {a.notes}</div>}
              {a.meal_plan && <div><span className="text-muted-foreground">Plano alimentar:</span> {a.meal_plan}</div>}
              {a.next_appointment && <div><span className="text-muted-foreground">Próxima:</span> {formatDateBR(a.next_appointment)}</div>}
            </CardContent>
          </Card>
        ))}
        {(appts ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma consulta registrada.</p>}
      </div>
    </div>
  )
}
