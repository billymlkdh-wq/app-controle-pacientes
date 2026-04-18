// Financeiro do paciente (admin only)
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'

export default async function PatientFinancialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: false })

  const total = (payments ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <div className="text-sm text-muted-foreground">Total pago: <span className="text-foreground font-medium">{formatBRL(total)}</span></div>
      </div>
      <div className="space-y-2">
        {(payments ?? []).map((p) => (
          <Card key={p.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{formatBRL(Number(p.amount))}</div>
                <div className="text-xs text-muted-foreground">{formatDateBR(p.date)} · {p.method ?? '-'}</div>
              </div>
              <Badge variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'destructive' : 'warning'}>{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {(payments ?? []).length === 0 && <p className="text-muted-foreground">Nenhum pagamento.</p>}
      </div>
    </div>
  )
}
