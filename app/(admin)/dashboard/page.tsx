// Dashboard admin — visão geral: pacientes ativos, receita do mês, alertas
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const [patientsActive, paymentsMonth, overdueSchedules, overduePayments] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('payments').select('amount').eq('status', 'pago').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    supabase.from('questionnaire_schedule').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'atrasado'),
  ])
  const revenue = ((paymentsMonth.data ?? []) as Array<{ amount: number | string | null }>).reduce((s, p) => s + Number(p.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pacientes ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{patientsActive.count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Receita do mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBRL(revenue)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Questionários atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overdueSchedules.count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pagamentos atrasados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overduePayments.count ?? 0}</CardContent></Card>
      </div>
    </div>
  )
}
