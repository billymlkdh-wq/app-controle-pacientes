// Reenvia convite Supabase Auth para o email do paciente.
// - Se o usuário ainda NÃO existe em auth.users → inviteUserByEmail
// - Se já existe → generateLink type=recovery (link de "redefinir senha"),
//   porque inviteUserByEmail falha para usuários existentes.
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { data: patient, error } = await supabase.from('patients').select('id,email').eq('id', id).single()
  if (error || !patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  if (!patient.email) return NextResponse.json({ error: 'Paciente sem email cadastrado' }, { status: 400 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`

  try {
    // Descobre se o usuário já existe em auth.users
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === patient.email!.toLowerCase())

    if (!existing) {
      const { error: invErr } = await admin.auth.admin.inviteUserByEmail(patient.email, {
        data: { role: 'patient', patient_id: patient.id },
        redirectTo,
      })
      if (invErr) throw invErr
      return NextResponse.json({ ok: true, mode: 'invite', email: patient.email })
    }

    // Usuário existe → dispara link de recovery (envia email via SMTP do Supabase)
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: patient.email,
      options: { redirectTo },
    })
    if (linkErr) throw linkErr
    return NextResponse.json({ ok: true, mode: 'recovery', email: patient.email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao reenviar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
