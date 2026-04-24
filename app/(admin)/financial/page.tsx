// Financeiro — dados reais de plan_contracts + pagamentos
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'
import {
  VendasPlanoChart,
  VendasPlanoQtdChart,
  type PlanoReaisRow,
  type PlanoQtdRow,
} from '@/components/admin/FinancialCharts'

const PLAN_LABELS: Record<string, string> = {
  avulso: 'Avulso',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}
const PLAN_ORDER = ['anual', 'semestral', 'trimestral', 'mensal', 'avulso']

function monthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1).toISOString().slice(0, 10)
  const end   = new Date(y, m + 1, 1).toISOString().slice(0, 10)
  return { start, end, label: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
}

export default async function FinancialPage() {
  const supabase = await createClient()
  const { start, end, label: monthLabel } = monthRange()

  // ── Planos por Status (todos os contratos — portfolio total) ────────────
  const { data: allContracts } = await supabase
    .from('plan_contracts')
    .select('plan_type, status, total_value, start_date')

  // ── Vendas do mês atual (start_date no mês corrente) ───────────────────
  const { data: monthContracts } = await supabase
    .from('plan_contracts')
    .select('plan_type, total_value, status')
    .gte('start_date', start)
    .lt('start_date', end)

  // ── Pagamentos ──────────────────────────────────────────────────────────
  const { data: payments } = await supabase
    .from('payments')
    .select('*, patient:patients(name)')
    .order('date', { ascending: false })
    .limit(200)

  // ── Computar Planos por Status ──────────────────────────────────────────
  type StatusRow = { ativos: number; encerrados: number; cancelados: number; total: number }
  const statusMap = new Map<string, StatusRow>()
  for (const c of allContracts ?? []) {
    if (!statusMap.has(c.plan_type)) {
      statusMap.set(c.plan_type, { ativos: 0, encerrados: 0, cancelados: 0, total: 0 })
    }
    const row = statusMap.get(c.plan_type)!
    if (c.status === 'ativo')      row.ativos++
    else if (c.status === 'encerrado') row.encerrados++
    else if (c.status === 'cancelado') row.cancelados++
    row.total++
  }
  const planoStatus = PLAN_ORDER
    .filter((p) => statusMap.has(p))
    .map((p) => ({ plano: PLAN_LABELS[p] ?? p, ...statusMap.get(p)! }))
  const totaisStatus = planoStatus.reduce(
    (acc, r) => ({ ativos: acc.ativos + r.ativos, encerrados: acc.encerrados + r.encerrados, cancelados: acc.cancelados + r.cancelados, total: acc.total + r.total }),
    { ativos: 0, encerrados: 0, cancelados: 0, total: 0 },
  )

  // ── Computar Vendas do mês ──────────────────────────────────────────────
  type VendaRow = { qtd: number; valor: number }
  const vendaMap = new Map<string, VendaRow>()
  for (const c of monthContracts ?? []) {
    if (!vendaMap.has(c.plan_type)) vendaMap.set(c.plan_type, { qtd: 0, valor: 0 })
    const row = vendaMap.get(c.plan_type)!
    row.qtd++
    row.valor += Number(c.total_value ?? 0)
  }
  const vendasPlanoReais: PlanoReaisRow[] = PLAN_ORDER.map((p) => ({
    plano: PLAN_LABELS[p] ?? p,
    valor: vendaMap.get(p)?.valor ?? 0,
  }))
  const vendasPlanoQtd: PlanoQtdRow[] = PLAN_ORDER.map((p) => ({
    plano: PLAN_LABELS[p] ?? p,
    qtd: vendaMap.get(p)?.qtd ?? 0,
  }))
  const totalVendasReais = vendasPlanoReais.reduce((s, r) => s + r.valor, 0)
  const totalVendasQtd   = vendasPlanoQtd.reduce((s, r) => s + r.qtd, 0)

  // ── Pagamentos summary ──────────────────────────────────────────────────
  const totalPago = (payments ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
  const totalPend = (payments ?? []).filter((p) => p.status === 'pendente').reduce((s, p) => s + Number(p.amount), 0)
  const totalAtr  = (payments ?? []).filter((p) => p.status === 'atrasado').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Financeiro</h1>

      {/* ── KPIs mês atual ────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Receita {monthLabel}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(totalVendasReais)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Vendas no mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalVendasQtd}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Ativos (total)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-blue-600">{totaisStatus.ativos}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Contratos (total)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totaisStatus.total}</CardContent>
        </Card>
      </div>

      {/* ── KPIs pagamentos ────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Recebido (app)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-600">{formatBRL(totalPago)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-500">{formatBRL(totalPend)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Atrasado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{formatBRL(totalAtr)}</CardContent></Card>
      </div>

      {/* ── Planos por Status (portfolio total) ───────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Planos por Status — Portfolio Total</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Plano</th>
                  <th className="py-2 pr-4 text-center">Ativos</th>
                  <th className="py-2 pr-4 text-center">Encerrados</th>
                  <th className="py-2 pr-4 text-center">Cancelados</th>
                  <th className="py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {planoStatus.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Nenhum contrato registrado.</td></tr>
                )}
                {planoStatus.map((row) => (
                  <tr key={row.plano} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.plano}</td>
                    <td className="py-2 pr-4 text-center">
                      {row.ativos > 0 ? <span className="text-blue-600 font-semibold">{row.ativos}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {row.encerrados > 0 ? <span className="text-amber-500">{row.encerrados}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {row.cancelados > 0 ? <span className="text-destructive">{row.cancelados}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 text-center font-semibold">{row.total}</td>
                  </tr>
                ))}
                {planoStatus.length > 0 && (
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-center text-blue-600">{totaisStatus.ativos}</td>
                    <td className="py-2 pr-4 text-center text-amber-500">{totaisStatus.encerrados}</td>
                    <td className="py-2 pr-4 text-center text-destructive">{totaisStatus.cancelados}</td>
                    <td className="py-2 text-center">{totaisStatus.total}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Vendas do mês ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Vendas por Plano — Receita <span className="text-muted-foreground font-normal text-sm capitalize">{monthLabel}</span></CardTitle></CardHeader>
          <CardContent>
            <VendasPlanoChart data={vendasPlanoReais} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-4">Plano</th>
                    <th className="py-1 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasPlanoReais.map((row) => (
                    <tr key={row.plano} className="border-b last:border-0">
                      <td className="py-1 pr-4">{row.plano}</td>
                      <td className="py-1 text-right">{row.valor ? formatBRL(row.valor) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-1 pr-4">Total</td>
                    <td className="py-1 text-right">{formatBRL(totalVendasReais)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vendas por Plano — Quantidade <span className="text-muted-foreground font-normal text-sm capitalize">{monthLabel}</span></CardTitle></CardHeader>
          <CardContent>
            <VendasPlanoQtdChart data={vendasPlanoQtd} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Plano</th>
                    <th className="py-2 pr-4 text-right">Qtd</th>
                    <th className="py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasPlanoQtd.map((row, i) => (
                    <tr key={row.plano} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.plano}</td>
                      <td className="py-2 pr-4 text-right font-semibold">{row.qtd || '—'}</td>
                      <td className="py-2 text-right">{vendasPlanoReais[i]?.valor ? formatBRL(vendasPlanoReais[i].valor) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right">{totalVendasQtd}</td>
                    <td className="py-2 text-right">{formatBRL(totalVendasReais)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos pagamentos ─────────────────────────────────────────────── */}
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
