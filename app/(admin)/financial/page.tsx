// Financeiro consolidado — receita mensal + inadimplência
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'

export default async function FinancialPage() {
  const supabase = await createClient()
  const { data: payments } = await supabase
    .from('payments')
    .select('*, patient:patients(name)')
    .order('date', { ascending: false })
    .limit(200)

  const totalPago = (payments ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
  const totalPend = (payments ?? []).filter((p) => p.status === 'pendente').reduce((s, p) => s + Number(p.amount), 0)
  const totalAtr = (payments ?? []).filter((p) => p.status === 'atrasado').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Financeiro</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Recebido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(totalPago)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-500">{formatBRL(totalPend)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Atrasado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{formatBRL(totalAtr)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Últimos pagamentos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Data</th><th>Paciente</th><th>Valor</th><th>Método</th><th>Status</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((payments ?? []) as any[]).map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{formatDateBR(p.date)}</td>
                    <td>{p.patient?.name ?? '-'}</td>
                    <td>{formatBRL(Number(p.amount))}</td>
                    <td>{p.method ?? '-'}</td>
                    <td><Badge variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'destructive' : 'warning'}>{p.status}</Badge></td>
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
