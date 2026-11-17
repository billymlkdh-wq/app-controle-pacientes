// Admin libera a anamnese para um paciente específico (cria a linha pendente)
// e avisa o paciente por WhatsApp. DELETE cancela a liberação (ou reseta para refazer).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const role = (user.app_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { user: null, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user, res: null }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireAdmin()
  if (!user) return res!
  const { id } = await params
  const db = createAdminClient() as any

  const { data: patient } = await db
    .from('patients').select('id, name, phone, whatsapp_phone').eq('id', id).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { data: existing } = await db
    .from('patient_anamnesis').select('id, completed_at').eq('patient_id', id).maybeSingle()
  if (existing) {
    return NextResponse.json({ already: existing.completed_at ? 'completed' : 'released' })
  }

  const { error } = await db.from('patient_anamnesis').insert({ patient_id: id, released_by: user.id })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ already: 'released' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aviso por WhatsApp (falha não impede a liberação)
  let whatsapp: { ok: boolean } = { ok: false }
  const phone = patient.whatsapp_phone ?? patient.phone ?? null
  if (phone) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
    const firstName = (patient.name || '').split(/\s+/)[0] || patient.name
    try {
      whatsapp = await sendWhatsAppText({
        to: phone,
        message: `Oi ${firstName}! Liberei sua anamnese no app, responde com calma quando puder: ${siteUrl}/anamnese`,
      }) as { ok: boolean }
    } catch (e) {
      console.error('[release-anamnesis] whatsapp failed', e)
    }
  }

  revalidatePath(`/patients/${id}`)
  return NextResponse.json({ ok: true, whatsapp })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireAdmin()
  if (!user) return res!
  const { id } = await params
  const db = createAdminClient() as any
  const { error } = await db.from('patient_anamnesis').delete().eq('patient_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath(`/patients/${id}`)
  return NextResponse.json({ ok: true })
}
