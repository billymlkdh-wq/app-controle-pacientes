// Dispara WhatsApp manual para pacientes com questionário liberado e ainda sem resposta.
// Admin-only. Retorna sumário: { sent, failed, skipped, details[] }.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'

type PatientRow = { id: string; name: string; whatsapp_phone: string | null; phone: string | null }
type ScheduleRow = {
  id: string
  due_date: string
  status: string
  patient: PatientRow | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = new Date().toISOString().slice(0, 10)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const portalLink = `${siteUrl}/questionnaire`

  // Schedules pendentes/atrasados com data <= hoje (ou seja, paciente PODE responder mas não respondeu)
  const { data: schedules, error } = await supabase
    .from('questionnaire_schedule')
    .select('id, due_date, status, patient:patients(id, name, whatsapp_phone, phone)')
    .in('status', ['pending', 'overdue'])
    .is('completed_at', null)
    .lte('due_date', today)
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (schedules ?? []) as unknown as ScheduleRow[]

  const details: Array<{
    patient_id: string | null
    name: string | null
    phone: string | null
    status: 'sent' | 'failed' | 'skipped_no_phone' | 'skipped_inactive'
    reason?: string
    messageId?: string | null
  }> = []
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const s of rows) {
    const p = s.patient
    if (!p) continue
    const phone = p.whatsapp_phone ?? p.phone ?? null
    if (!phone) {
      skipped++
      details.push({ patient_id: p.id, name: p.name, phone: null, status: 'skipped_no_phone' })
      continue
    }

    const daysLate = Math.max(
      0,
      Math.floor((new Date(today).getTime() - new Date(s.due_date).getTime()) / 86_400_000),
    )

    const firstName = (p.name || '').split(/\s+/)[0] || p.name
    const message = daysLate === 0
      ? `Oi ${firstName}! Seu questionário quinzenal está disponível. Responde aqui quando puder: ${portalLink}`
      : daysLate === 1
        ? `${firstName}, seu questionário venceu ontem. Leva 2 minutos: ${portalLink}`
        : `${firstName}, já são ${daysLate} dias sem responder o questionário. Preciso acompanhar sua evolução: ${portalLink}`

    try {
      const result = await sendWhatsAppText({ to: phone, message })
      if (result.ok) {
        sent++
        details.push({ patient_id: p.id, name: p.name, phone, status: 'sent', messageId: result.messageId })
      } else {
        failed++
        details.push({ patient_id: p.id, name: p.name, phone, status: 'failed', reason: `HTTP ${result.status}` })
      }
    } catch (err) {
      failed++
      details.push({
        patient_id: p.id,
        name: p.name,
        phone,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'erro',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    sent,
    failed,
    skipped,
    details,
  })
}
