/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL, formatDateBR } from '@/lib/utils'
import {
  RevenueChart, PatientsChart,
  type RevenuePoint, type PatientsPoint,
} from '@/components/admin/DashboardCharts'

const MONTH_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PLAN_LABELS: Record<string, string> = {
  avulso: 'Avulso', mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}
const PLAN_ORDER = ['anual', 'semestral', 'trimestral', 'mensal', 'avulso']

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_LABEL[m - 1]}/${String(y).slice(-2)}`
}
function currentMonthLabel() {
  const now = new Date()
  return `${MONTH_LABEL[now.getMonth()]}/${String(now.getFullYear()).slice(-2)}`
}

const PANEL_TITLES: Record<string, string> = {
  responderam:  '✅ Responderam o questionário (últimos 16 dias)',
  nao_responderam: '⏳ Não responderam o questionário',
  inativos:     '😴 Sem interação há 7+ dias',
  vencimento:   '💳 Vencimento de pagamento próximo (7 dias)',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>
}) {
  const { panel } = await searchParams
  const admin = createAdminClient() as any

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const d2ago  = new Date(today.getTime() - 2  * 864e5).toISOString().slice(0, 10)
  const d7ago  = new Date(today.getTime() - 7  * 864e5)
  const d7agoISO  = d7ago.toISOString()
  const d7agoDate = d7ago.toISOString().slice(0, 10)
  const d16ago = new Date(today.getTime() - 16 * 864e5).toISOString()
  const d7from = new Date(today.getTime() + 7  * 864e5).toISOString().slice(0, 10)
  const firstOfMonth     = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10)
  const start12mISO = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10)

  const [
    patientsActiveCount,
    paymentsMonth,
    overdueSchedules,
    overduePayments,
    paymentsAll,
    patientsAll,
    allContracts,
    monthContracts,
    // Insights
    respondidasRaw,
    pendingSchedulesRaw,
    upcomingPaymentsRaw,
    recentHabitsRaw,
    recentRespRaw,
    recentPostsRaw,
  ] = await Promise.all([
    admin.from('patients').select('id', { count: 'exact', head: true }).eq('active', true),
    admin.from('payments').select('amount').eq('status', 'pago').gte('date', firstOfMonth),
    admin.from('questionnaire_schedule')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'overdue'])
      .is('completed_at', null)
      .lt('due_date', d2ago),
    admin.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'atrasado'),
    admin.from('payments').select('amount, date').eq('status', 'pago').gte('date', start12mISO),
    admin.from('patients').select('id, name, phone, created_at, active, updated_at, last_seen_at'),
    admin.from('plan_contracts').select('plan_type, status'),
    admin.from('plan_contracts').select('plan_type, total_value')
      .gte('start_date', firstOfMonth).lt('start_date', firstOfNextMonth),
    // responderam: respostas dos últimos 16 dias com nome do paciente
    admin.from('questionnaire_responses')
      .select('patient_id, created_at, patients(name, phone)')
      .gte('created_at', d16ago)
      .order('created_at', { ascending: false }),
    // não responderam: schedules abertos vencidos
    admin.from('questionnaire_schedule')
      .select('patient_id, due_date, patients(name, phone)')
      .in('status', ['pending', 'overdue'])
      .is('completed_at', null)
      .lte('due_date', todayISO)
      .order('due_date', { ascending: true }),
    // vencimento: pagamentos pendentes nos próximos 7 dias
    admin.from('payments')
      .select('patient_id, due_date, amount, status, patients(name, phone)')
      .in('status', ['pendente', 'atrasado'])
      .gte('due_date', todayISO)
      .lte('due_date', d7from)
      .order('due_date', { ascending: true }),
    // para inativos: quem teve atividade nos últimos 7 dias
    admin.from('patient_habit_logs').select('patient_id').gte('logged_date', d7agoDate),
    admin.from('questionnaire_responses').select('patient_id').gte('created_at', d7agoISO),
    admin.from('community_posts').select('patient_id').gte('created_at', d7agoISO),
  ])

  // ── Processa insights ────────────────────────────────────────────────────
  // Responderam: dedup por patient_id (mais recente primeiro)
  const respondidasMap = new Map<string, { name: string; phone: string; created_at: string }>()
  for (const r of (respondidasRaw.data ?? [])) {
    if (!respondidasMap.has(r.patient_id))
      respondidasMap.set(r.patient_id, {
        name: r.patients?.name ?? 'N/A',
        phone: r.patients?.phone ?? '',
        created_at: r.created_at,
      })
  }

  // Set de IDs de pacientes ATIVOS — base para todos os filtros
  type PatRow = { id: string; name: string; phone: string; created_at: string; active: boolean; updated_at: string | null; last_seen_at: string | null }
  const pats = (patientsAll.data ?? []) as PatRow[]
  const activePatients = pats.filter(p => p.active)
  const activePatientIds = new Set(activePatients.map(p => p.id))

  // Filtrar responderam: apenas pacientes ativos
  for (const id of [...respondidasMap.keys()]) {
    if (!activePatientIds.has(id)) respondidasMap.delete(id)
  }

  // Não responderam = TODOS os ativos que não responderam no ciclo atual
  // (garante responderam + não responderam = total de ativos)
  const dueDateByPatient = new Map<string, string>()
  for (const s of (pendingSchedulesRaw.data ?? [])) {
    if (!dueDateByPatient.has(s.patient_id)) dueDateByPatient.set(s.patient_id, s.due_date)
  }
  const pendingMap = new Map<string, { name: string; phone: string; due_date: string }>()
  for (const p of activePatients) {
    if (respondidasMap.has(p.id)) continue
    pendingMap.set(p.id, {
      name: p.name,
      phone: p.phone ?? '',
      due_date: dueDateByPatient.get(p.id) ?? '',
    })
  }

  // Vencimento próximo (apenas ativos)
  type PayRow = { patient_id: string; due_date: string; amount: number; status: string; patients: { name: string; phone: string } }
  const upcomingPayments = ((upcomingPaymentsRaw.data ?? []) as PayRow[])
    .filter(p => activePatientIds.has(p.patient_id))

  // Inativos: ativos sem acesso ao app (last_seen_at) E sem nenhuma interação nos últimos 7 dias
  const recentlyActiveIds = new Set([
    ...(recentHabitsRaw.data ?? []).map((r: any) => r.patient_id as string),
    ...(recentRespRaw.data   ?? []).map((r: any) => r.patient_id as string),
    ...(recentPostsRaw.data  ?? []).map((r: any) => r.patient_id as string),
  ])
  const inactivePatients = activePatients.filter(p =>
    !recentlyActiveIds.has(p.id) &&
    (!p.last_seen_at || p.last_seen_at < d7agoISO)
  )

  // ── Faturamento ──────────────────────────────────────────────────────────
  const revenue = ((paymentsMonth.data ?? []) as Array<{ amount: number | string | null }>)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  // ── Gráficos 12 meses ────────────────────────────────────────────────────
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    months.push(monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1)))
  }
  const revenueMap = new Map<string, number>(months.map(k => [k, 0]))
  for (const p of (paymentsAll.data ?? []) as Array<{ amount: number | string | null; date: string }>) {
    const k = p.date.slice(0, 7)
    if (revenueMap.has(k)) revenueMap.set(k, (revenueMap.get(k) ?? 0) + Number(p.amount ?? 0))
  }
  const revenueData: RevenuePoint[] = months.map(k => ({ month: monthLabel(k), receita: revenueMap.get(k) ?? 0 }))

  const patientsData: PatientsPoint[] = months.map(k => {
    const [y, m] = k.split('-').map(Number)
    const endISO = new Date(y, m, 0, 23, 59, 59).toISOString()
    return {
      month: monthLabel(k),
      novos:      pats.filter(p => p.created_at.slice(0, 7) === k).length,
      desligados: pats.filter(p => !p.active && p.updated_at && p.updated_at.slice(0, 7) === k).length,
      ativos:     pats.filter(p => {
        if (p.created_at > endISO) return false
        if (p.active) return true
        return p.updated_at ? p.updated_at > endISO : false
      }).length,
    }
  })

  // ── Planos por Status ────────────────────────────────────────────────────
  type StatusRow = { ativos: number; encerrados: number; cancelados: number; total: number }
  const statusMap = new Map<string, StatusRow>()
  for (const c of (allContracts.data ?? []) as Array<{ plan_type: string; status: string }>) {
    if (!statusMap.has(c.plan_type)) statusMap.set(c.plan_type, { ativos: 0, encerrados: 0, cancelados: 0, total: 0 })
    const row = statusMap.get(c.plan_type)!
    if (c.status === 'ativo') row.ativos++
    else if (c.status === 'encerrado') row.encerrados++
    else if (c.status === 'cancelado') row.cancelados++
    row.total++
  }
  const planoStatus = PLAN_ORDER.filter(p => statusMap.has(p)).map(p => ({ plano: PLAN_LABELS[p] ?? p, ...statusMap.get(p)! }))
  const totaisStatus = planoStatus.reduce(
    (acc, r) => ({ ativos: acc.ativos + r.ativos, encerrados: acc.encerrados + r.encerrados, cancelados: acc.cancelados + r.cancelados, total: acc.total + r.total }),
    { ativos: 0, encerrados: 0, cancelados: 0, total: 0 },
  )

  // ── Vendas do mês ────────────────────────────────────────────────────────
  type VendaRow = { qtd: number; valor: number }
  const vendaMap = new Map<string, VendaRow>()
  for (const c of (monthContracts.data ?? []) as Array<{ plan_type: string; total_value: number | string | null }>) {
    if (!vendaMap.has(c.plan_type)) vendaMap.set(c.plan_type, { qtd: 0, valor: 0 })
    const row = vendaMap.get(c.plan_type)!
    row.qtd++; row.valor += Number(c.total_value ?? 0)
  }
  const vendasMes = PLAN_ORDER.filter(p => vendaMap.has(p)).map(p => ({ plano: PLAN_LABELS[p] ?? p, ...vendaMap.get(p)! }))
  const totalVendasQtd   = vendasMes.reduce((s, r) => s + r.qtd, 0)
  const totalVendasReais = vendasMes.reduce((s, r) => s + r.valor, 0)

  // ── Panel helper ─────────────────────────────────────────────────────────
  function cardHref(key: string) { return panel === key ? '/dashboard' : `?panel=${key}` }
  function cardClass(key: string) {
    return `hover:bg-accent transition-colors cursor-pointer h-full block ${panel === key ? 'ring-2 ring-primary' : ''}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* ── KPIs originais ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Pacientes ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{patientsActiveCount.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Receita do mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBRL(revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Quest. atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overdueSchedules.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Pgtos atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overduePayments.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Inativos 7d</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{inactivePatients.length}</CardContent>
        </Card>
      </div>

      {/* ── Insights clicáveis ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href={cardHref('responderam')} className={cardClass('responderam')}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">✅ Responderam questionário</CardTitle></CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-emerald-600">{respondidasMap.size}</span>
              <p className="text-xs text-muted-foreground mt-1">últimos 16 dias</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={cardHref('nao_responderam')} className={cardClass('nao_responderam')}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">⏳ Não responderam</CardTitle></CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-amber-600">{pendingMap.size}</span>
              <p className="text-xs text-muted-foreground mt-1">questionário pendente</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={cardHref('inativos')} className={cardClass('inativos')}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">😴 Sem interação</CardTitle></CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-orange-600">{inactivePatients.length}</span>
              <p className="text-xs text-muted-foreground mt-1">há 7 ou mais dias</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={cardHref('vencimento')} className={cardClass('vencimento')}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">💳 Vencimento próximo</CardTitle></CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-red-600">{upcomingPayments.length}</span>
              <p className="text-xs text-muted-foreground mt-1">nos próximos 7 dias</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Painel de detalhe ───────────────────────────────────────────── */}
      {panel && PANEL_TITLES[panel] && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{PANEL_TITLES[panel]}</CardTitle>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">fechar ✕</Link>
          </CardHeader>
          <CardContent>

            {/* RESPONDERAM */}
            {panel === 'responderam' && (
              respondidasMap.size === 0
                ? <p className="text-sm text-muted-foreground">Nenhum paciente respondeu nos últimos 16 dias.</p>
                : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Contato</th>
                        <th className="py-2">Respondeu em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...respondidasMap.entries()].map(([id, p]) => (
                        <tr key={id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-4">
                            <Link href={`/patients/${id}`} className="hover:underline font-medium">{p.name}</Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{p.phone || '—'}</td>
                          <td className="py-2">{formatDateBR(p.created_at.slice(0, 10))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            {/* NÃO RESPONDERAM */}
            {panel === 'nao_responderam' && (
              pendingMap.size === 0
                ? <p className="text-sm text-muted-foreground">Todos os pacientes responderam.</p>
                : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Contato</th>
                        <th className="py-2">Venceu em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...pendingMap.entries()].map(([id, p]) => (
                        <tr key={id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-4">
                            <Link href={`/patients/${id}`} className="hover:underline font-medium">{p.name}</Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{p.phone || '—'}</td>
                          <td className="py-2 text-amber-600 font-medium">{p.due_date ? formatDateBR(p.due_date) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            {/* INATIVOS */}
            {panel === 'inativos' && (
              inactivePatients.length === 0
                ? <p className="text-sm text-muted-foreground">Todos os pacientes interagiram nos últimos 7 dias.</p>
                : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Contato</th>
                        <th className="py-2">Último acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactivePatients.map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-4">
                            <Link href={`/patients/${p.id}`} className="hover:underline font-medium">{p.name}</Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{p.phone || '—'}</td>
                          <td className="py-2 text-muted-foreground">
                            {p.last_seen_at ? formatDateBR(p.last_seen_at.slice(0, 10)) : 'nunca'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            {/* VENCIMENTO */}
            {panel === 'vencimento' && (
              upcomingPayments.length === 0
                ? <p className="text-sm text-muted-foreground">Nenhum vencimento nos próximos 7 dias.</p>
                : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Contato</th>
                        <th className="py-2 pr-4">Vence em</th>
                        <th className="py-2 pr-4">Valor</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingPayments.map((p, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-4">
                            <Link href={`/patients/${p.patient_id}`} className="hover:underline font-medium">
                              {p.patients?.name ?? 'N/A'}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{p.patients?.phone || '—'}</td>
                          <td className="py-2 pr-4 font-medium">{formatDateBR(p.due_date)}</td>
                          <td className="py-2 pr-4 text-emerald-600">{formatBRL(p.amount)}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

          </CardContent>
        </Card>
      )}

      {/* ── Gráficos ────────────────────────────────────────────────────── */}
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

      {/* ── Tabelas contratos ────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
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
                {planoStatus.map(row => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vendas por Plano{' '}
              <span className="text-muted-foreground font-normal text-xs">{currentMonthLabel()}</span>
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
                {vendasMes.map(row => (
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
