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

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  // 2-day notification window
  const d2 = new Date(); d2.setDate(d2.getDate() - 2)
  const windowStart = d2.toISOString().slice(0, 10)
  // 16-day lookback for "Respondeu" (one cycle + buffer)
  const d16 = new Date(); d16.setDate(d16.getDate() - 16)
  const respondedSince = d16.toISOString()

  const [
    { data: patients, error },
    { data: schedules },
    { data: recentResponses },
  ] = await Promise.all([
    supabase.from('patients').select('*').order('name'),

    // Open schedules in the 2-day window — drives "Pendente" badge
    supabase
      .from('questionnaire_schedule')
      .select('patient_id, due_date')
      .in('status', ['pending', 'overdue'])
      .lte('due_date', today)
      .gte('due_date', windowStart),

    // Most recent responses per patient within last 16 days — drives "Respondeu" badge
    supabase
      .from('questionnaire_responses')
      .select('patient_id, created_at')
      .gte('created_at', respondedSince)
      .order('created_at', { ascending: false }),
  ])

  // Set of patient_ids with an open schedule in the 2-day window
  const pendingPatients = new Set(
    (schedules ?? []).map((s: { patient_id: string }) => s.patient_id),
  )

  // Map of patient_id → most recent response date (within last 16 days)
  const lastResponseByPatient = new Map<string, string>()
  for (const r of (recentResponses ?? []) as Array<{ patient_id: string; created_at: string }>) {
    if (!lastResponseByPatient.has(r.patient_id)) {
      lastResponseByPatient.set(r.patient_id, r.created_at)
    }
  }

  function resolveStatus(patientId: string): 'pending' | 'completed' | null {
    // "Pendente": open schedule due within last 2 days, patient hasn't answered it yet
    if (pendingPatients.has(patientId)) {
      // If they also responded recently, don't show Pendente (they already answered this cycle)
      if (!lastResponseByPatient.has(patientId)) return 'pending'
    }
    // "Respondeu": has a response within the last 16 days
    if (lastResponseByPatient.has(patientId)) return 'completed'
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
