// Financeiro consolidado — planilha Financeiro + pagamentos Supabase
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'
import {
  VendasPlanoChart,
  VendasOrigemChart,
  VendasOrigemQtdChart,
} from '@/components/admin/FinancialCharts'
import {
  PLANOS_STATUS,
  TOTAIS_STATUS,
  VENDAS_PLANO_REAIS,
  VENDAS_PLANO_QTD,
  VENDAS_ORIGEM_REAIS,
  VENDAS_ORIGEM_QTD,
  TOTAL_VENDAS_JAN,
  TOTAL_VENDAS_QTD_JAN,
} from '@/lib/financial-data'

export default async function FinancialPage() {
  const supabase = await createClient()
  const { data: payments } = await supabase
    .from('payments')
    .select('*, patient:patients(name)')
    .order('date', { ascending: false })
    .limit(200)

  const totalPago = (payments ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
  const totalPend = (payments ?? []).filter((p) => p.status === 'pendente').reduce((s, p) => s + Number(p.amount), 0)
  const totalAtr  = (payments ?? []).filter((p) => p.status === 'atrasado').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Financeiro</h1>

      {/* ── KPIs planilha ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Receita Jan/26</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(TOTAL_VENDAS_JAN)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Vendas Jan/26</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{TOTAL_VENDAS_QTD_JAN}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-blue-600">{TOTAIS_STATUS.ativos}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Cancelados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{TOTAIS_STATUS.cancelados}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Contratos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{TOTAIS_STATUS.total}</CardContent>
        </Card>
      </div>

      {/* ── KPIs pagamentos app ────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Recebido (app)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(totalPago)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-500">{formatBRL(totalPend)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Atrasado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{formatBRL(totalAtr)}</CardContent></Card>
      </div>

      {/* ── Planos por Status ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Planos por Status</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Plano</th>
                  <th className="py-2 pr-4 text-center">Ativos</th>
                  <th className="py-2 pr-4 text-center">Cancelados</th>
                  <th className="py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {PLANOS_STATUS.map((row) => (
                  <tr key={row.plano} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.plano}</td>
                    <td className="py-2 pr-4 text-center">
                      {row.ativos > 0 ? <span className="text-blue-600 font-semibold">{row.ativos}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {row.cancelados > 0 ? <span className="text-destructive">{row.cancelados}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 text-center font-semibold">{row.total || '—'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-semibold bg-muted/30">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-center text-blue-600">{TOTAIS_STATUS.ativos}</td>
                  <td className="py-2 pr-4 text-center text-destructive">{TOTAIS_STATUS.cancelados}</td>
                  <td className="py-2 text-center">{TOTAIS_STATUS.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Vendas por Plano ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Vendas por Plano — Receita (R$)</CardTitle></CardHeader>
          <CardContent>
            <VendasPlanoChart />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-4">Plano</th>
                    <th className="py-1 pr-4 text-right">Jan/26</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDAS_PLANO_REAIS.map((row) => (
                    <tr key={row.plano} className="border-b last:border-0">
                      <td className="py-1 pr-4">{row.plano}</td>
                      <td className="py-1 pr-4 text-right">{row.jan ? formatBRL(row.jan) : '—'}</td>
                      <td className="py-1 text-right font-semibold">{row.total ? formatBRL(row.total) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-1 pr-4">Total</td>
                    <td className="py-1 pr-4 text-right">{formatBRL(TOTAL_VENDAS_JAN)}</td>
                    <td className="py-1 text-right">{formatBRL(TOTAL_VENDAS_JAN)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vendas por Plano — Quantidade</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Plano</th>
                    <th className="py-2 pr-4 text-right">Jan/26</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDAS_PLANO_QTD.map((row) => (
                    <tr key={row.plano} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.plano}</td>
                      <td className="py-2 pr-4 text-right">{row.jan || '—'}</td>
                      <td className="py-2 text-right font-semibold">{row.total || '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right">{TOTAL_VENDAS_QTD_JAN}</td>
                    <td className="py-2 text-right">{TOTAL_VENDAS_QTD_JAN}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Vendas por Origem ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Vendas por Origem — Receita (R$)</CardTitle></CardHeader>
          <CardContent>
            <VendasOrigemChart />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-4">Origem</th>
                    <th className="py-1 pr-4 text-right">Jan/26</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDAS_ORIGEM_REAIS.map((row) => (
                    <tr key={row.origem} className="border-b last:border-0">
                      <td className="py-1 pr-4">{row.origem}</td>
                      <td className="py-1 pr-4 text-right">{row.jan ? formatBRL(row.jan) : '—'}</td>
                      <td className="py-1 text-right font-semibold">{row.total ? formatBRL(row.total) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-1 pr-4">Total</td>
                    <td className="py-1 pr-4 text-right">{formatBRL(TOTAL_VENDAS_JAN)}</td>
                    <td className="py-1 text-right">{formatBRL(TOTAL_VENDAS_JAN)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vendas por Origem — Quantidade</CardTitle></CardHeader>
          <CardContent>
            <VendasOrigemQtdChart />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Origem</th>
                    <th className="py-2 pr-4 text-right">Jan/26</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDAS_ORIGEM_QTD.map((row) => (
                    <tr key={row.origem} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.origem}</td>
                      <td className="py-2 pr-4 text-right">{row.jan || '—'}</td>
                      <td className="py-2 text-right font-semibold">{row.total || '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right">{TOTAL_VENDAS_QTD_JAN}</td>
                    <td className="py-2 text-right">{TOTAL_VENDAS_QTD_JAN}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos pagamentos (app) ───────────────────────────────────────── */}
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
