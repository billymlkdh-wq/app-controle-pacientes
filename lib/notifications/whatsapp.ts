// Wrapper server-side para Z-API (provider brasileiro)
// IMPORTANTE: chamar apenas de rotas server-side. Nunca importar em 'use client'.
//
// Docs: https://developer.z-api.io/
// Decisão Checkpoint 3b: migrado de Meta Cloud API para Z-API (conta Meta indisponível).

type SendTextInput = { to: string; message: string }
type SendTemplateInput = {
  to: string
  template: string
  language?: string
  components?: Array<{
    type: 'body' | 'header'
    parameters: Array<{ type: 'text'; text: string }>
  }>
}
type SendResult = {
  ok: boolean
  status: number
  data: unknown
  messageId: string | null
}

function zapiBase() {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instanceId || !token) throw new Error('ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados')
  return `https://api.z-api.io/instances/${instanceId}/token/${token}`
}

function zapiHeaders() {
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!clientToken) throw new Error('ZAPI_CLIENT_TOKEN não configurado')
  return {
    'Content-Type': 'application/json',
    'Client-Token': clientToken,
  }
}

function normalizePhone(raw: string): string {
  // Z-API aceita E.164 sem "+", apenas dígitos. Ex: 5551999990000
  return raw.replace(/\D/g, '')
}

function extractMessageId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as { messageId?: string; id?: string; zaapId?: string }
  return d.messageId ?? d.id ?? d.zaapId ?? null
}

export async function sendWhatsAppText({ to, message }: SendTextInput): Promise<SendResult> {
  const res = await fetch(`${zapiBase()}/send-text`, {
    method: 'POST',
    headers: zapiHeaders(),
    body: JSON.stringify({
      phone: normalizePhone(to),
      message,
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data, messageId: extractMessageId(data) }
}

/**
 * Compatibilidade com a API anterior (Meta templates).
 * Z-API não usa templates pré-aprovados — renderiza parâmetros em linha e envia texto.
 */
export async function sendWhatsAppTemplate({
  to,
  template,
  components,
}: SendTemplateInput): Promise<SendResult> {
  const params = components?.flatMap((c) => c.parameters.map((p) => p.text)) ?? []
  const message = renderTemplateMessage(template, params)
  return sendWhatsAppText({ to, message })
}

/**
 * Mapa de mensagens (equivalente aos templates da Meta, mas em texto livre).
 * Cada placeholder {{N}} é substituído pelo parâmetro de índice N-1.
 */
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

function renderTemplateMessage(templateName: string, params: string[]): string {
  const tpl = TEMPLATE_MESSAGES[templateName] ?? templateName
  return tpl.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] ?? '')
}
