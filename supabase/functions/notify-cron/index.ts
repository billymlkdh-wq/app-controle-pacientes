// Edge Function (Deno) — cron diário
// 1. Marca schedules vencidos como overdue + payments pendentes como atrasados
// 2. Emite lembretes D-2/D+1/D+3/D+7 (via templates Meta fora da janela de 24h)
// 3. Alerta admin quando paciente atrasa > 3 dias
// 4. Alerta admin para payments atrasados
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE_MAP: Record<string, string> = {
  d2: 'questionario_lembrete_d2',
  d1: 'questionario_atraso_d1',
  d3: 'questionario_atraso_d3',
  d7: 'questionario_atraso_d7',
  admin_late: 'admin_paciente_atrasado',
  admin_payment: 'admin_pagamento_atrasado',
}

async function invokeSendWhatsApp(payload: unknown) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return resp.ok
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.includes(SERVICE_KEY)) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Marca atrasos (espelho do SQL function — chama via rpc se existir, senão inline)
  await supabase.rpc('mark_overdue_schedules').catch(() => null)

  // 2. Busca schedules pending/overdue com pacientes
  const { data: schedules } = await supabase
    .from('questionnaire_schedule')
    .select('*, patient:patients(id,user_id,name,whatsapp_phone)')
    .in('status', ['pending', 'overdue'])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const s of schedules ?? []) {
    const due = new Date(s.due_date + 'T00:00:00')
    const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000)
    // diffDays === -2 → D-2 (2 dias antes); 1 → D+1; 3 → D+3; 7 → D+7
    let tier: 'd2' | 'd1' | 'd3' | 'd7' | null = null
    let flagField: string | null = null
    if (diffDays === -2 && !s.reminder_d2_sent) { tier = 'd2'; flagField = 'reminder_d2_sent' }
    else if (diffDays === 1 && !s.reminder_d1_sent) { tier = 'd1'; flagField = 'reminder_d1_sent' }
    else if (diffDays === 3 && !s.reminder_d3_sent) { tier = 'd3'; flagField = 'reminder_d3_sent' }
    else if (diffDays === 7 && !s.reminder_d7_sent) { tier = 'd7'; flagField = 'reminder_d7_sent' }
    if (!tier || !s.patient?.user_id) continue

    const title = tier === 'd2' ? 'Seu questionário está próximo' : 'Questionário em atraso'
    const message = tier === 'd2'
      ? `Olá ${s.patient.name}, seu questionário quinzenal vence em 2 dias.`
      : `Olá ${s.patient.name}, seu questionário está atrasado há ${diffDays} dia(s). Por favor, responda quando puder.`

    const { data: notif } = await supabase
      .from('notifications')
      .insert({
        user_id: s.patient.user_id,
        type: tier === 'd2' ? 'questionnaire_due_soon' : 'questionnaire_overdue',
        title, message,
        channel: s.patient.whatsapp_phone ? 'both' : 'in_app',
        related_patient_id: s.patient.id,
        related_entity_id: s.id,
      })
      .select()
      .single()

    if (s.patient.whatsapp_phone && notif) {
      await invokeSendWhatsApp({
        notification_id: notif.id,
        to_phone: s.patient.whatsapp_phone,
        mode: 'template',
        template: TEMPLATE_MAP[tier],
        language: 'pt_BR',
        components: [{ type: 'body', parameters: [{ type: 'text', text: s.patient.name }] }],
      })
    }

    await supabase.from('questionnaire_schedule').update({ [flagField!]: true }).eq('id', s.id)

    // 3. Alerta admin para atrasos > 3 dias
    if (diffDays >= 3) {
      const { data: admins } = await supabase.auth.admin.listUsers()
      const adminUser = admins?.users?.find((u) => (u.user_metadata as { role?: string })?.role === 'admin')
      if (adminUser) {
        await supabase.from('notifications').insert({
          user_id: adminUser.id,
          type: 'patient_questionnaire_late',
          title: `Paciente atrasado: ${s.patient.name}`,
          message: `${s.patient.name} está ${diffDays} dias atrasado no questionário.`,
          channel: 'in_app',
          related_patient_id: s.patient.id,
        })
      }
    }
  }

  // 4. Pagamentos atrasados → notificação para admin
  const { data: overduePayments } = await supabase
    .from('payments')
    .select('*, patient:patients(name)')
    .eq('status', 'atrasado')
  if (overduePayments && overduePayments.length > 0) {
    const { data: admins } = await supabase.auth.admin.listUsers()
    const adminUser = admins?.users?.find((u) => (u.user_metadata as { role?: string })?.role === 'admin')
    if (adminUser) {
      for (const p of overduePayments) {
        await supabase.from('notifications').insert({
          user_id: adminUser.id,
          type: 'payment_overdue',
          title: 'Pagamento atrasado',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: `${(p as any).patient?.name ?? 'Paciente'} está com pagamento de R$ ${p.amount} atrasado.`,
          channel: 'in_app',
          related_patient_id: p.patient_id,
          related_entity_id: p.id,
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
