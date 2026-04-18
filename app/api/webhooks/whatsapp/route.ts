// Webhook Z-API — recebe status de delivery e atualiza notifications
//
// Decisão Checkpoint 3b: migrado de Meta Cloud API para Z-API.
// Segurança: valida header `Client-Token` contra ZAPI_CLIENT_TOKEN (equivalente ao HMAC do Meta).
// Precisão: atualiza a notificação correta via whatsapp_message_id (mantido do fix I2).
//
// Eventos Z-API relevantes (configurar no painel app.z-api.io):
// - MESSAGE_STATUS (sent, received/delivered, read)
// - "on-message-status" → POST no endpoint
// Docs: https://developer.z-api.io/webhooks/message-status
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Z-API envia status em minúsculas: "SENT" | "RECEIVED" | "READ" | "PLAYED"
// (RECEIVED equivale a "delivered" do Meta)
type ZapiStatusPayload = {
  type?: string // ex: "MessageStatusCallback"
  status?: string
  ids?: string[] // ids das mensagens
  messageId?: string
  phone?: string
  momment?: number // sic — Z-API usa "momment"
}

function mapStatus(zapi: string | undefined): 'sent' | 'delivered' | 'read' | 'failed' | null {
  if (!zapi) return null
  const s = zapi.toUpperCase()
  if (s === 'SENT') return 'sent'
  if (s === 'RECEIVED' || s === 'DELIVERED') return 'delivered'
  if (s === 'READ' || s === 'PLAYED') return 'read'
  if (s === 'FAILED' || s === 'ERROR') return 'failed'
  return null
}

export async function GET() {
  // Z-API não faz handshake — endpoint público só pra healthcheck
  return NextResponse.json({ ok: true, provider: 'z-api' })
}

export async function POST(request: NextRequest) {
  try {
    // Validação (fix I1 adaptado): Client-Token precisa bater
    const clientToken = request.headers.get('client-token')
    const expected = process.env.ZAPI_CLIENT_TOKEN
    if (!expected || clientToken !== expected) {
      return new NextResponse('Invalid client token', { status: 401 })
    }

    const body = (await request.json()) as ZapiStatusPayload
    const status = mapStatus(body.status)
    if (!status) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const messageIds: string[] = []
    if (Array.isArray(body.ids)) messageIds.push(...body.ids)
    if (body.messageId) messageIds.push(body.messageId)

    if (messageIds.length === 0) {
      return NextResponse.json({ ok: true, no_ids: true })
    }

    const admin = createAdminClient()
    for (const id of messageIds) {
      // Fix I2 mantido: atualiza a notificação exata via whatsapp_message_id
      await admin
        .from('notifications')
        .update({ whatsapp_status: status })
        .eq('whatsapp_message_id', id)
    }

    return NextResponse.json({ ok: true, updated: messageIds.length })
  } catch (err) {
    console.error('Webhook Z-API error:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
