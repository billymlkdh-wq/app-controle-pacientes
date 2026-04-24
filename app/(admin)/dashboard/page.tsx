// Dashboard admin — KPIs + gráficos (faturamento 12m, pacientes ativos/novos/desligados)
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'
import {
  RevenueChart, PatientsChart,
  type RevenuePoint, type PatientsPoint,
} from '@/components/admin/DashboardCharts'

const MONTH_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PLAN_LABELS: Record<string, string> = {
  avulso: 'Avulso', mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}
const PLAN_ORDER = ['anual', 'semestral', 'trimestral', 'mensal', 'avulso']

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_LABEL[m - 1]}/${String(y).slice(-2)}`
}
function currentMonthLabel(): string {
  const now = new Date()
  return `${MONTH_LABEL[now.getMonth()]}/${String(now.getFullYear()).slice(-2)}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10)
  const start12m = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const start12mISO = start12m.toISOString().slice(0, 10)

  const [
    patientsActive,
    paymentsMonth,
    overdueSchedules,
    overduePayments,
    pendingResp,
    paymentsAll,
    patientsAll,
    allContracts,
    monthContracts,
  ] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('payments').select('amount').eq('status', 'pago').gte('date', firstOfMonth),
    supabase.from('questionnaire_schedule').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'atrasado'),
    supabase
      .from('questionnaire_schedule')
      .select('patient_id')
      .in('status', ['pending', 'overdue'])
      .is('completed_at', null)
      .lte('due_date', todayISO),
    supabase.from('payments').select('amount, date').eq('status', 'pago').gte('date', start12mISO),
    supabase.from('patients').select('id, created_at, active, updated_at'),
    // Todos os contratos para Planos por Status
    supabase.from('plan_contracts').select('plan_type, status'),
    // Contratos do mês atual para Vendas do mês
    supabase
      .from('plan_contracts')
      .select('plan_type, total_value')
      .gte('start_date', firstOfMonth)
      .lt('start_date', firstOfNextMonth),
  ])

  const revenue = ((paymentsMonth.data ?? []) as Array<{ amount: number | string | null }>)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const pendingCount = new Set(
    ((pendingResp.data ?? []) as Array<{ patient_id: string }>).map((r) => r.patient_id),
  ).size

  // ── Buckets 12 meses ────────────────────────────────────────────────────
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push(monthKey(d))
  }
  const revenueMap = new Map<string, number>(months.map((k) => [k, 0]))
  for (const p of (paymentsAll.data ?? []) as Array<{ amount: number | string | null; date: string }>) {
    const k = p.date.slice(0, 7)
    if (revenueMap.has(k)) revenueMap.set(k, (revenueMap.get(k) ?? 0) + Number(p.amount ?? 0))
  }
  const revenueData: RevenuePoint[] = months.map((k) => ({ month: monthLabel(k), receita: revenueMap.get(k) ?? 0 }))

  const pats = (patientsAll.data ?? []) as Array<{ id: string; created_at: string; active: boolean; updated_at: string | null }>
  const patientsData: PatientsPoint[] = months.map((k) => {
    const [y, m] = k.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0, 23, 59, 59)
    const endISO = endOfMonth.toISOString()
    const novos = pats.filter((p) => p.created_at.slice(0, 7) === k).length
    const desligados = pats.filter((p) => !p.active && p.updated_at && p.updated_at.slice(0, 7) === k).length
    const ativos = pats.filter((p) => {
      if (p.created_at > endISO) return false
      if (p.active) return true
      return p.updated_at ? p.updated_at > endISO : false
    }).length
    return { month: monthLabel(k), ativos, novos, desligados }
  })

  // ── Planos por Status (portfolio total) ─────────────────────────────────
  type StatusRow = { ativos: number; encerrados: number; cancelados: number; total: number }
  const statusMap = new Map<string, StatusRow>()
  for (const c of (allContracts.data ?? []) as Array<{ plan_type: string; status: string }>) {
    if (!statusMap.has(c.plan_type)) statusMap.set(c.plan_type, { ativos: 0, encerrados: 0, cancelados: 0, total: 0 })
    const row = statusMap.get(c.plan_type)!
    if (c.status === 'ativo')          row.ativos++
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

  // ── Vendas do mês atual ──────────────────────────────────────────────────
  type VendaRow = { qtd: number; valor: number }
  const vendaMap = new Map<string, VendaRow>()
  for (const c of (monthContracts.data ?? []) as Array<{ plan_type: string; total_value: number | string | null }>) {
    if (!vendaMap.has(c.plan_type)) vendaMap.set(c.plan_type, { qtd: 0, valor: 0 })
    const row = vendaMap.get(c.plan_type)!
    row.qtd++
    row.valor += Number(c.total_value ?? 0)
  }
  const vendasMes = PLAN_ORDER
    .filter((p) => vendaMap.has(p))
    .map((p) => ({ plano: PLAN_LABELS[p] ?? p, ...vendaMap.get(p)! }))
  const totalVendasQtd   = vendasMes.reduce((s, r) => s + r.qtd, 0)
  const totalVendasReais = vendasMes.reduce((s, r) => s + r.valor, 0)
  const curMonthLabel = currentMonthLabel()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pacientes ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{patientsActive.count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Receita do mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBRL(revenue)}</CardContent></Card>
        <Link href="/questionnaires" className="block">
          <Card className="hover:bg-accent transition-colors h-full">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Faltam responder</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{pendingCount}</CardContent>
          </Card>
        </Link>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Questionários atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overdueSchedules.count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pagamentos atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overduePayments.count ?? 0}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento (12 meses)</CardTitle></CardHeader>
          <CardContent><RevenueChart data={revenueData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pacientes (12 meses)</CardTitle></CardHeader>
          <CardContent><PatientsChart data={patientsData} /></CardContent>
        </Card>
      </div>

      {/* ── Tabelas resumo contratos ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Planos por Status — portfolio total */}
        <Card>
          <CardHeader><CardTitle className="text-base">Planos por Status</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-1 pr-3">Plano</th>
                  <th className="py-1 text-center">Ativos</th>
                  <th className="py-1 text-center">Encerr.</th>
                  <th className="py-1 text-center">Canc.</th>
                </tr>
              </thead>
              <tbody>
                {planoStatus.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-center text-muted-foreground text-xs">Nenhum contrato.</td></tr>
                )}
                {planoStatus.map((row) => (
                  <tr key={row.plano} className="border-b last:border-0">
                    <td className="py-1 pr-3">{row.plano}</td>
                    <td className="py-1 text-center text-blue-600 font-semibold">{row.ativos || '—'}</td>
                    <td className="py-1 text-center text-amber-500">{row.encerrados || '—'}</td>
                    <td className="py-1 text-center text-destructive">{row.cancelados || '—'}</td>
                  </tr>
                ))}
                {planoStatus.length > 0 && (
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-1 pr-3">Total</td>
                    <td className="py-1 text-center text-blue-600">{totaisStatus.ativos}</td>
                    <td className="py-1 text-center text-amber-500">{totaisStatus.encerrados}</td>
                    <td className="py-1 text-center text-destructive">{totaisStatus.cancelados}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Vendas do mês atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vendas por Plano{' '}
              <span className="text-muted-foreground font-normal text-xs">{curMonthLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-1 pr-3">Plano</th>
                  <th className="py-1 text-right">Qtd</th>
                  <th className="py-1 text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {vendasMes.length === 0 && (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground text-xs">Sem vendas no mês.</td></tr>
                )}
                {vendasMes.map((row) => (
                  <tr key={row.plano} className="border-b last:border-0">
                    <td className="py-1 pr-3">{row.plano}</td>
                    <td className="py-1 text-right font-semibold">{row.qtd}</td>
                    <td className="py-1 text-right text-emerald-600">{formatBRL(row.valor)}</td>
                  </tr>
                ))}
                {vendasMes.length > 0 && (
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="py-1 pr-3">Total</td>
                    <td className="py-1 text-right">{totalVendasQtd}</td>
                    <td className="py-1 text-right text-emerald-600">{formatBRL(totalVendasReais)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
