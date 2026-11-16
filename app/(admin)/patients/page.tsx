import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/admin/PageHeader'
import { UnlockAllQuestionnairesButton } from '@/components/admin/UnlockAllQuestionnairesButton'
import { PatientsGrid, type PatientCard } from '@/components/admin/PatientsGrid'
import { buildReminderMessage, buildWaLink } from '@/lib/notifications/questionnaire-reminder'
import { buildCheckupWaLink, weekRange } from '@/lib/notifications/checkup'

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
    { data: pointsRows },
    { data: streakRows },
    { data: checkupRows },
  ] = await Promise.all([
    (db as any).from('patients').select('id, name, email, phone, whatsapp_phone, plan_type, plan_value, active, avatar_url, created_at').order('name'),

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

    // XP acumulado por paciente — somamos no client (uma linha por reason)
    (db as any).from('patient_points').select('patient_id, amount'),

    // Streak atual por paciente
    (db as any).from('patient_streaks').select('patient_id, current_streak'),

    // Check-ups da semana corrente. Se a migration 0026 ainda não rodou,
    // a tabela não existe — captamos o erro e seguimos sem derrubar a página.
    (db as any)
      .from('patient_checkups')
      .select('patient_id, checked_at')
      .gte('checked_at', weekRange().start.toISOString())
      .lt('checked_at', weekRange().end.toISOString())
      .then((r: any) => r, () => ({ data: [] as any[], error: null })),
  ])

  // Agrega XP + streak em maps
  const xpByPatient = new Map<string, number>()
  for (const r of (pointsRows ?? []) as Array<{ patient_id: string; amount: number | null }>) {
    xpByPatient.set(r.patient_id, (xpByPatient.get(r.patient_id) ?? 0) + Number(r.amount ?? 0))
  }
  const streakByPatient = new Map<string, number>()
  for (const r of (streakRows ?? []) as Array<{ patient_id: string; current_streak: number | null }>) {
    streakByPatient.set(r.patient_id, Number(r.current_streak ?? 0))
  }

  // Check-ups desta semana (patient_id → checked_at ISO)
  const checkupByPatient = new Map<string, string>()
  for (const r of (checkupRows ?? []) as Array<{ patient_id: string; checked_at: string }>) {
    checkupByPatient.set(r.patient_id, r.checked_at)
  }

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

  const patients: PatientCard[] = (rawPatients ?? []).map((p: any) => {
    let questionnaire_status: PatientCard['questionnaire_status'] = null
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

    // Link do check-up: todo paciente ativo com telefone pode receber
    const checkup_wa_link = p.active && phone
      ? buildCheckupWaLink(phone, p.name)
      : null

    return {
      ...p,
      questionnaire_status,
      wa_link,
      total_xp: xpByPatient.get(p.id) ?? 0,
      streak: streakByPatient.get(p.id) ?? 0,
      checkup_this_week: checkupByPatient.get(p.id) ?? null,
      checkup_wa_link,
    }
  })

  const pendingCount = patients.filter((p) => p.active && p.questionnaire_status === 'pending').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        subtitle={pendingCount > 0
          ? `${pendingCount} paciente${pendingCount > 1 ? 's' : ''} com questionário pendente`
          : undefined}
        action={
          <>
            <UnlockAllQuestionnairesButton />
            <Button asChild><Link href="/patients/new">Novo paciente</Link></Button>
          </>
        }
      />

      <PatientsGrid patients={patients} pendingCount={pendingCount} />
    </div>
  )
}
