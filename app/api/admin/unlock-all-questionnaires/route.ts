// Libera o questionário para TODOS os pacientes ativos de uma vez.
// Insere questionnaire_schedule pending hoje apenas para quem ainda não tem aberto.
// Após liberar, envia email + WhatsApp para cada paciente notificado.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'
import { sendQuestionnaireUnlockedEmail } from '@/lib/notifications/email'

type PatientRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp_phone: string | null
}

async function notifyPatient(patient: PatientRow, portalLink: string) {
  const firstName = (patient.name || '').split(/\s+/)[0] || patient.name
  const phone = patient.whatsapp_phone ?? patient.phone ?? null

  await Promise.allSettled([
    phone
      ? sendWhatsAppText({
          to: phone,
          message: `Oi ${firstName}! Seu questionário quinzenal está disponível. Responde aqui quando puder: ${portalLink}`,
        })
      : Promise.resolve(),
    patient.email
      ? sendQuestionnaireUnlockedEmail({ to: patient.email, name: patient.name, portalLink })
      : Promise.resolve(),
  ])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = todayBR()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const portalLink = `${siteUrl}/questionnaire`

  // Busca schedules pending/overdue de pacientes ativos
  const { data: openSchedules } = await supabase
    .from('questionnaire_schedule')
    .select('id, patient_id, due_date')
    .in('status', ['pending', 'overdue'])

  // Schedules com due_date no futuro precisam ser adiantados para hoje
  const futureSchedules = (openSchedules ?? []).filter((s) => s.due_date > today)
  const openPatientIds = new Set((openSchedules ?? []).map((r) => r.patient_id))

  // Busca todos os pacientes ativos com dados de contato
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id, name, email, phone, whatsapp_phone')
    .eq('active', true)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 })

  const patientMap = new Map<string, PatientRow>((patients ?? []).map((p) => [p.id, p]))

  // Pacientes sem nenhum schedule aberto → inserir pending com due_date=hoje
  const toInsert = (patients ?? []).filter((p) => !openPatientIds.has(p.id))

  // Atualiza schedules futuros para due_date=hoje (desbloqueio imediato)
  if (futureSchedules.length > 0) {
    const ids = futureSchedules.map((s) => s.id)
    const { error: updErr } = await supabase
      .from('questionnaire_schedule')
      .update({ due_date: today })
      .in('id', ids)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })
  }

  // Insere novos schedules para quem não tinha nenhum aberto
  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({ patient_id: p.id, due_date: today, status: 'pending' }))
    const { error: insErr } = await supabase.from('questionnaire_schedule').insert(rows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
  }

  revalidatePath('/patients')
  revalidatePath('/questionnaires')

  // Sempre notifica TODOS os pacientes ativos — independente de já terem schedule aberto
  const allActivePatients = (patients ?? []) as PatientRow[]
  await Promise.allSettled(allActivePatients.map((p) => notifyPatient(p, portalLink)))

  const totalUnlocked = toInsert.length + futureSchedules.length
  return NextResponse.json({
    ok: true,
    unlocked: totalUnlocked,
    already_open: (openSchedules ?? []).length - futureSchedules.length,
    notified: allActivePatients.length,
  })
}
