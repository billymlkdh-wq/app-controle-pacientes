// Edge Function (Deno) — envia mensagem via Z-API
// Decisão Checkpoint 3b: migrado de Meta Cloud API para Z-API (conta Meta indisponível).
// Invocada pelo cron worker ou API server-side. Requer Authorization com service role.
//
// Docs Z-API: https://developer.z-api.io/
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

interface SendPayload {
  notification_id?: string
  to_phone: string
  mode?: 'text' | 'template'
  message?: string
  template?: string
  language?: string
  components?: unknown
}

// Mapa de mensagens (equivalente aos templates Meta, mas texto livre)
const TEMPLATE_MESSAGES: Record<string, string> = {
  questionario_lembrete_d2:
    'Olá {{1}}! Seu questionário quinzenal vence em 2 dias. Responda em {{2}} — leva só 2 minutos. 💚',
  questionario_atraso_d1:
    '{{1}}, seu questionário venceu ontem. Para eu acompanhar sua evolução, responda aqui: {{2}}',
  questionario_atraso_d3:
    '{{1}}, já são 3 dias sem responder o questionário. Preciso acompanhar sua evolução: {{2}}',
  questionario_atraso_d7:
    '{{1}}, 1 semana sem resposta do questionário. Está tudo bem? Qualquer coisa me avisa: {{2}}',
  admin_paciente_atrasado:
    '⚠️ Paciente {{1}} está atrasado há {{2}} dias no questionário quinzenal.',
  admin_pagamento_atrasado:
    '💰 Pagamento de {{1}} (R$ {{2}}) venceu em {{3}} e está atrasado.',
}

function renderTemplate(template: string, components: unknown): string {
  const tpl = TEMPLATE_MESSAGES[template] ?? template
  const params: string[] = []
  if (Array.isArray(components)) {
    for (const c of components as Array<{ parameters?: Array<{ text?: string }> }>) {
      for (const p of c.parameters ?? []) {
        if (p.text) params.push(p.text)
      }
    }
  }
  return tpl.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] ?? '')
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey || !authHeader.includes(serviceKey)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload: SendPayload = await req.json()
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID')
  const zapiToken = Deno.env.get('ZAPI_TOKEN')
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN')
  if (!instanceId || !zapiToken || !clientToken) {
    return new Response(JSON.stringify({ error: 'Z-API env not configured' }), { status: 500 })
  }

  const phone = payload.to_phone.replace(/\D/g, '')
  const message =
    payload.mode === 'template' && payload.template
      ? renderTemplate(payload.template, payload.components)
      : payload.message ?? ''

  const zapiResp = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      body: JSON.stringify({ phone, message }),
    },
  )
  const result = await zapiResp.json().catch(() => ({}))
  const messageId = result?.messageId ?? result?.id ?? result?.zaapId ?? null

  if (payload.notification_id) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${payload.notification_id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        whatsapp_sent_at: new Date().toISOString(),
        whatsapp_status: zapiResp.ok ? 'sent' : 'failed',
        whatsapp_message_id: messageId,
      }),
    })
  }

  return new Response(JSON.stringify(result), {
    status: zapiResp.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  })
})
