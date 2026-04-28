// Lista de pacientes com indicador de status do questionário liberado
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'
import { UnlockAllQuestionnairesButton } from '@/components/admin/UnlockAllQuestionnairesButton'

export default async function PatientsPage() {
  const supabase = await createClient()

  const [{ data: patients, error }, { data: schedules }] = await Promise.all([
    supabase.from('patients').select('*').order('name'),
    // Latest schedule per patient — only care about current open or most-recently-completed
    supabase
      .from('questionnaire_schedule')
      .select('patient_id, status, due_date, completed_at')
      .in('status', ['pending', 'overdue', 'completed'])
      .order('due_date', { ascending: false }),
  ])

  // Badge logic per patient:
  // 1. If any pending/overdue with due_date <= today → "Pendente" (questionário liberado)
  // 2. Else if most-recent schedule is completed → "Respondeu"
  // 3. Else → nothing (next questionnaire still in the future)
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Group all schedules per patient (already ordered due_date DESC)
  type Row = { patient_id: string; status: string; due_date: string }
  const allByPatient = new Map<string, Row[]>()
  for (const s of (schedules ?? []) as Row[]) {
    const arr = allByPatient.get(s.patient_id) ?? []
    arr.push(s)
    allByPatient.set(s.patient_id, arr)
  }

  function resolveStatus(patientId: string): 'pending' | 'completed' | null {
    const rows = allByPatient.get(patientId)
    if (!rows || rows.length === 0) return null
    // Check if any open schedule is due now
    const hasDue = rows.some(
      (r) => (r.status === 'pending' || r.status === 'overdue') && r.due_date <= today
    )
    if (hasDue) return 'pending'
    // Check if most recent (highest due_date) is completed
    if (rows[0].status === 'completed') return 'completed'
    return null
  }

  function QuestionnaireBadge({ patientId, active }: { patientId: string; active: boolean }) {
    if (!active) return null
    const s = resolveStatus(patientId)
    if (s === 'completed') {
      return <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Respondeu</Badge>
    }
    if (s === 'pending') {
      return <Badge variant="warning" className="text-[10px] px-1.5 py-0">⏳ Pendente</Badge>
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <div className="flex items-center gap-2">
          <UnlockAllQuestionnairesButton />
          <Button asChild><Link href="/patients/new">Novo paciente</Link></Button>
        </div>
      </div>
      {error && <p className="text-destructive">{error.message}</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(patients ?? []).map((p) => (
          <Link key={p.id} href={`/patients/${p.id}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <QuestionnaireBadge patientId={p.id} active={p.active} />
                    <Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>{p.email ?? 'sem e-mail'}</div>
                <div>Plano: {p.plan_type} {p.plan_value ? `· ${formatBRL(Number(p.plan_value))}` : ''}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(patients ?? []).length === 0 && <p className="text-muted-foreground">Nenhum paciente ainda.</p>}
      </div>
    </div>
  )
}
