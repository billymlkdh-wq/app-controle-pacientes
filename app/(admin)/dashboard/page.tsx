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

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_LABEL[m - 1]}/${String(y).slice(-2)}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
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
    supabase
      .from('payments')
      .select('amount, date')
      .eq('status', 'pago')
      .gte('date', start12mISO),
    supabase.from('patients').select('id, created_at, active, updated_at'),
  ])

  const revenue = ((paymentsMonth.data ?? []) as Array<{ amount: number | string | null }>)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const pendingCount = new Set(
    ((pendingResp.data ?? []) as Array<{ patient_id: string }>).map((r) => r.patient_id),
  ).size

  // Buckets dos últimos 12 meses
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push(monthKey(d))
  }

  // Receita por mês
  const revenueMap = new Map<string, number>(months.map((k) => [k, 0]))
  for (const p of (paymentsAll.data ?? []) as Array<{ amount: number | string | null; date: string }>) {
    const k = p.date.slice(0, 7)
    if (revenueMap.has(k)) revenueMap.set(k, (revenueMap.get(k) ?? 0) + Number(p.amount ?? 0))
  }
  const revenueData: RevenuePoint[] = months.map((k) => ({
    month: monthLabel(k),
    receita: revenueMap.get(k) ?? 0,
  }))

  // Pacientes: ativos (snapshot fim do mês), novos (created_at no mês), desligados (!active e updated_at no mês)
  const pats = (patientsAll.data ?? []) as Array<{
    id: string
    created_at: string
    active: boolean
    updated_at: string | null
  }>
  const patientsData: PatientsPoint[] = months.map((k) => {
    const [y, m] = k.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0, 23, 59, 59)
    const endISO = endOfMonth.toISOString()
    const novos = pats.filter((p) => p.created_at.slice(0, 7) === k).length
    const desligados = pats.filter(
      (p) => !p.active && p.updated_at && p.updated_at.slice(0, 7) === k,
    ).length
    const ativos = pats.filter((p) => {
      if (p.created_at > endISO) return false
      if (p.active) return true
      // inativo agora — considera ativo no mês se desligamento foi depois
      return p.updated_at ? p.updated_at > endISO : false
    }).length
    return { month: monthLabel(k), ativos, novos, desligados }
  })

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
    </div>
  )
}
