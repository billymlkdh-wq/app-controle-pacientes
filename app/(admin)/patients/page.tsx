import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { UnlockAllQuestionnairesButton } from '@/components/admin/UnlockAllQuestionnairesButton'
import { PatientsTable, type PatientRow } from '@/components/admin/PatientsTable'
import { buildReminderMessage, buildWaLink } from '@/lib/notifications/questionnaire-reminder'

export default async function PatientsPage() {
  const db = createAdminClient() as ReturnType<typeof createAdminClient> & { from: (t: string) => any }

  const today = new Date().toISOString().slice(0, 10)
  const portalLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app-controle-pacientes.vercel.app'}/questionnaire`
  // 16-day lookback — covers one full 15-day cycle + buffer
  const d16 = new Date(); d16.setDate(d16.getDate() - 16)
  const respondedSince = d16.toISOString()

  const [
    { data: rawPatients },
    { data: pendingSchedules },
    { data: recentResponses },
  ] = await Promise.all([
    (db as any).from('patients').select('id, name, email, phone, whatsapp_phone, plan_type, plan_value, active').order('name'),

    // All open schedules due up to today (no response yet = completed_at IS NULL)
    (db as any)
      .from('questionnaire_schedule')
      .select('patient_id, due_date')
      .in('status', ['pending', 'overdue'])
      .is('completed_at', null)
      .lte('due_date', today)
      .order('due_date', { ascending: true }),

    // Patients who responded in last 16 days
    (db as any)
      .from('questionnaire_responses')
      .select('patient_id')
      .gte('created_at', respondedSince),
  ])

  // Sets for O(1) lookup
  const pendingSet = new Set<string>(
    (pendingSchedules ?? []).map((s: { patient_id: string }) => s.patient_id),
  )
  // Vencimento mais antigo em aberto por paciente — base do texto do lembrete
  const dueDateByPatient = new Map<string, string>()
  for (const s of (pendingSchedules ?? []) as Array<{ patient_id: string; due_date: string }>) {
    if (!dueDateByPatient.has(s.patient_id)) dueDateByPatient.set(s.patient_id, s.due_date)
  }
  const respondedSet = new Set<string>(
    (recentResponses ?? []).map((r: { patient_id: string }) => r.patient_id),
  )

  const patients: PatientRow[] = (rawPatients ?? []).map((p: any) => {
    let questionnaire_status: PatientRow['questionnaire_status'] = null
    if (p.active) {
      // If they have an open (unanswered) schedule → pending, regardless of recent responses
      if (pendingSet.has(p.id)) {
        questionnaire_status = 'pending'
      } else if (respondedSet.has(p.id)) {
        questionnaire_status = 'responded'
      }
    }

    // Link do WhatsApp com a mensagem pronta. Montado aqui, no servidor, para
    // o clique no botão ser uma navegação direta — se fosse montado depois de
    // um fetch, o navegador bloquearia a aba como popup.
    let wa_link: string | null = null
    const dueDate = dueDateByPatient.get(p.id)
    const phone = p.whatsapp_phone ?? p.phone
    if (questionnaire_status === 'pending' && dueDate && phone) {
      wa_link = buildWaLink(
        phone,
        buildReminderMessage({ name: p.name, dueDate, today, portalLink }),
      )
    }

    return { ...p, questionnaire_status, wa_link }
  })

  const pendingCount = patients.filter((p) => p.active && p.questionnaire_status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingCount} paciente{pendingCount > 1 ? 's' : ''} com questionário pendente
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UnlockAllQuestionnairesButton />
          <Button asChild><Link href="/patients/new">Novo paciente</Link></Button>
        </div>
      </div>

      <PatientsTable patients={patients} pendingCount={pendingCount} />
    </div>
  )
}
