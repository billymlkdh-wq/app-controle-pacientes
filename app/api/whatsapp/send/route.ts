// Proxy server-side para envio WhatsApp Cloud API — exige admin
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/notifications/whatsapp'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as
    | { mode: 'text'; to: string; message: string; notification_id?: string }
    | { mode: 'template'; to: string; template: string; language?: string; components?: unknown; notification_id?: string }

  try {
    const result =
      body.mode === 'template'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? await sendWhatsAppTemplate({ to: body.to, template: body.template, language: body.language, components: body.components as any })
        : await sendWhatsAppText({ to: body.to, message: body.message })

    if (body.notification_id) {
      await supabase
        .from('notifications')
        .update({
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_status: result.ok ? 'sent' : 'failed',
          whatsapp_message_id: result.messageId,
        })
        .eq('id', body.notification_id)
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro' }, { status: 500 })
  }
}
