// Libera manualmente o acesso ao questionário: cria um questionnaire_schedule
// com due_date = hoje e status = 'pending'. Após liberar, envia email + WhatsApp ao paciente.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'
import { sendQuestionnaireUnlockedEmail } from '@/lib/notifications/email'

async function notifyPatient(
  patient: { name: string; email: string | null; phone: string | null; whatsapp_phone: string | null },
  portalLink: string,
) {
  const firstName = (patient.name || '').split(/\s+/)[0] || patient.name
  const phone = patient.whatsapp_phone ?? patient.phone ?? null

  const results = await Promise.allSettled([
    // WhatsApp
    phone
      ? sendWhatsAppText({
          to: phone,
          message: `Oi ${firstName}! Seu questionário quinzenal está disponível. Responde aqui quando puder: ${portalLink}`,
        })
      : Promise.resolve({ ok: false, error: 'sem telefone' }),

    // Email
    patient.email
      ? sendQuestionnaireUnlockedEmail({ to: patient.email, name: patient.name, portalLink })
      : Promise.resolve({ ok: false, error: 'sem email' }),
  ])

  return {
    whatsapp: results[0].status === 'fulfilled' ? results[0].value : { ok: false },
    email: results[1].status === 'fulfilled' ? results[1].value : { ok: false },
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const today = todayBR()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const portalLink = `${siteUrl}/questionnaire`

  // Busca dados do paciente para notificações
  const { data: patient } = await supabase
    .from('patients')
    .select('name, email, phone, whatsapp_phone')
    .eq('id', id)
    .single()

  // Evita duplicar se já existe um pendente aberto pra esse paciente
  const { data: existing } = await supabase
    .from('questionnaire_schedule')
    .select('id,due_date,status')
    .eq('patient_id', id)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Se due_date ainda está no futuro, adianta para hoje (desbloqueio imediato)
    if (existing.due_date > today) {
      const { error: updErr } = await supabase
        .from('questionnaire_schedule')
        .update({ due_date: today })
        .eq('id', existing.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

      const notifications = patient ? await notifyPatient(patient, portalLink) : null
      revalidatePath(`/patients/${id}`)
      return NextResponse.json({ ok: true, schedule_id: existing.id, due_date: today, notifications })
    }

    // Já estava aberto e acessível — notifica mesmo assim
    const notifications = patient ? await notifyPatient(patient, portalLink) : null
    return NextResponse.json({
      ok: true,
      already_open: true,
      schedule_id: existing.id,
      due_date: existing.due_date,
      status: existing.status,
      notifications,
    })
  }

  const { data, error } = await supabase
    .from('questionnaire_schedule')
    .insert({ patient_id: id, due_date: today, status: 'pending' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const notifications = patient ? await notifyPatient(patient, portalLink) : null
  revalidatePath(`/patients/${id}`)
  return NextResponse.json({ ok: true, schedule_id: data.id, due_date: data.due_date, notifications }, { status: 201 })
}
