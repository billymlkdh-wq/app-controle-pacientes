// Avisa paciente que plano alimentar está pronto: WhatsApp + email + notif in-app.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'
import { sendMealPlanReadyEmail } from '@/lib/notifications/email'

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

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, name, patient_id, patient:patients(id, user_id, name, email, phone, whatsapp_phone)')
    .eq('id', id)
    .single()
  if (!plan || !plan.patient) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = plan.patient as any
  const firstName = (p.name || '').split(/\s+/)[0] || p.name
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const planLink = `${siteUrl}/plano`
  const phone = p.whatsapp_phone ?? p.phone ?? null

  // In-app notification
  if (p.user_id) {
    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'meal_plan_ready',
      title: '🍽️ Novo plano alimentar',
      message: `Teu plano "${plan.name}" está pronto. Abre o app pra ver.`,
      channel: phone ? 'both' : 'in_app',
      related_patient_id: p.id,
      related_entity_id: plan.id,
    })
  }

  const results = await Promise.allSettled([
    phone
      ? sendWhatsAppText({
          to: phone,
          message: `Oi ${firstName}! Teu plano alimentar "${plan.name}" está pronto no app. Confere aqui: ${planLink}`,
        })
      : Promise.resolve({ ok: false, error: 'sem telefone' }),
    p.email
      ? sendMealPlanReadyEmail({ to: p.email, name: p.name, portalLink: planLink, planName: plan.name })
      : Promise.resolve({ ok: false, error: 'sem email' }),
  ])

  return NextResponse.json({
    ok: true,
    whatsapp: results[0].status === 'fulfilled' ? results[0].value : { ok: false },
    email: results[1].status === 'fulfilled' ? results[1].value : { ok: false },
  })
}
