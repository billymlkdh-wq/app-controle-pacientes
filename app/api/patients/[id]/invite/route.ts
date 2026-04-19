// Gera o link de criação/redefinição de senha do paciente SEM enviar email.
// Retorna { url, mode, email, expires_at } para o admin copiar/compartilhar
// (WhatsApp, etc). Usa generateLink — se o usuário ainda não existe em
// auth.users, cria via invite; se existe, gera link de recovery.
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { data: patient, error } = await supabase
    .from('patients')
    .select('id,email,whatsapp_phone,phone,name')
    .eq('id', id)
    .single()
  if (error || !patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  if (!patient.email) return NextResponse.json({ error: 'Paciente sem email cadastrado' }, { status: 400 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`

  try {
    // Verifica se o usuário já existe
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === patient.email!.toLowerCase())

    const linkType = existing ? 'recovery' : 'invite'
    const { data, error: linkErr } = await admin.auth.admin.generateLink({
      type: linkType,
      email: patient.email,
      options: {
        redirectTo,
        ...(linkType === 'invite'
          ? { data: { role: 'patient', patient_id: patient.id } }
          : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    if (linkErr) throw linkErr

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (data as any)?.properties ?? {}
    const url: string | undefined = props.action_link
    if (!url) throw new Error('Supabase não retornou action_link')

    return NextResponse.json({
      ok: true,
      mode: linkType,
      email: patient.email,
      url,
      whatsapp_phone: patient.whatsapp_phone ?? patient.phone ?? null,
      name: patient.name,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar link'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
