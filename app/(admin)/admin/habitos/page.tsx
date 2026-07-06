/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminHabitGoalsManager } from '@/components/admin/AdminHabitGoalsManager'

export default async function AdminHabitosPage() {
  const admin = createAdminClient() as any
  const [{ data: patients }, { data: goals }, { data: recentLogs }] = await Promise.all([
    admin.from('patients').select('id, name').eq('active', true).order('name'),
    admin.from('patient_habit_goals').select('*').order('habit_type'),
    admin.from('patient_habit_logs')
      .select('patient_id, habit_type, value, logged_date, patients(name)')
      .gte('logged_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      .order('logged_date', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Hábitos dos Pacientes</h1>

      <AdminHabitGoalsManager patients={patients ?? []} goals={goals ?? []} />

      <Card>
        <CardHeader><CardTitle className="text-base">Registros recentes (7 dias)</CardTitle></CardHeader>
        <CardContent>
          {(!recentLogs || recentLogs.length === 0) && (
            <p className="text-sm text-muted-foreground">Nenhum registro nos últimos 7 dias.</p>
          )}
          <div className="space-y-1">
            {(recentLogs ?? []).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground text-xs w-20">{log.logged_date}</span>
                <span className="flex-1">{(log.patients as any)?.name ?? '—'}</span>
                <span className="text-muted-foreground capitalize">{log.habit_type}</span>
                <span className="font-medium">{log.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
