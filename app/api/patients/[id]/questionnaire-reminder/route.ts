// Lembrete de questionário para UM paciente. Admin-only.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'
import { buildReminderMessage } from '@/lib/notifications/questionnaire-reminder'
import { todayBR } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const today = todayBR()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const portalLink = `${siteUrl}/questionnaire`

  const { data: patient, error: patErr } = await db
    .from('patients')
    .select('id, name, phone, whatsapp_phone, active')
    .eq('id', id)
    .maybeSingle()

  if (patErr) return NextResponse.json({ error: patErr.message }, { status: 500 })
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const phone = patient.whatsapp_phone ?? patient.phone ?? null
  if (!phone) {
    return NextResponse.json({ error: `${patient.name} não tem telefone cadastrado` }, { status: 400 })
  }

  // Questionário aberto e já liberado (vencimento <= hoje)
  const { data: schedule } = await db
    .from('questionnaire_schedule')
    .select('id, due_date')
    .eq('patient_id', id)
    .in('status', ['pending', 'overdue'])
    .is('completed_at', null)
    .lte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!schedule) {
    return NextResponse.json(
      { error: `${patient.name} não tem questionário pendente no momento` },
      { status: 400 },
    )
  }

  const message = buildReminderMessage({
    name: patient.name,
    dueDate: schedule.due_date,
    today,
    portalLink,
  })

  try {
    const result = await sendWhatsAppText({ to: phone, message })
    if (!result.ok) {
      console.error('[questionnaire-reminder] envio falhou', { id, status: result.status })
      return NextResponse.json(
        { error: `Falha no envio (HTTP ${result.status})` },
        { status: 502 },
      )
    }
    return NextResponse.json({
      ok: true,
      name: patient.name,
      phone,
      due_date: schedule.due_date,
      messageId: result.messageId,
    })
  } catch (err) {
    console.error('[questionnaire-reminder] erro', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar' },
      { status: 500 },
    )
  }
}
