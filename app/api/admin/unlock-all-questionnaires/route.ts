// Libera o questionário para TODOS os pacientes ativos de uma vez.
// Comportamento simples: clique zera tudo — toda schedule aberta vira due_date=hoje
// (janela de 48h conta a partir de hoje). Quem não tem schedule aberta recebe nova.
// Schedules já completas (completed_at != null) NÃO são reabertas.
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

  // 1. Busca todos os pacientes ativos
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id, name, email, phone, whatsapp_phone')
    .eq('active', true)
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 })

  const activeIds = (patients ?? []).map((p) => p.id)
  if (activeIds.length === 0) {
    return NextResponse.json({ ok: true, unlocked: 0, reset: 0, notified: 0 })
  }

  // 2. Busca schedules abertas (pending/overdue, sem completed_at) dos ativos
  const { data: openSchedules } = await supabase
    .from('questionnaire_schedule')
    .select('id, patient_id, due_date')
    .in('patient_id', activeIds)
    .in('status', ['pending', 'overdue'])
    .is('completed_at', null)

  // 3. Reseta TODAS schedules abertas pra hoje (janela 48h reinicia)
  const toReset = (openSchedules ?? []).filter((s) => s.due_date !== today)
  if (toReset.length > 0) {
    const ids = toReset.map((s) => s.id)
    const { error: updErr } = await supabase
      .from('questionnaire_schedule')
      .update({
        due_date: today,
        status: 'pending',
        reminder_d2_sent: false,
        reminder_d1_sent: false,
        reminder_d3_sent: false,
        reminder_d7_sent: false,
      })
      .in('id', ids)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })
  }

  // 4. Insere schedule pra ativos sem nenhuma aberta
  const openPatientIds = new Set((openSchedules ?? []).map((r) => r.patient_id))
  const toInsert = (patients ?? []).filter((p) => !openPatientIds.has(p.id))
  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({ patient_id: p.id, due_date: today, status: 'pending' }))
    const { error: insErr } = await supabase.from('questionnaire_schedule').insert(rows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
  }

  revalidatePath('/patients')
  revalidatePath('/questionnaires')

  // 5. Notifica TODOS ativos (WhatsApp + email)
  const allActivePatients = (patients ?? []) as PatientRow[]
  await Promise.allSettled(allActivePatients.map((p) => notifyPatient(p, portalLink)))

  return NextResponse.json({
    ok: true,
    unlocked: toInsert.length,
    reset: toReset.length,
    notified: allActivePatients.length,
  })
}
