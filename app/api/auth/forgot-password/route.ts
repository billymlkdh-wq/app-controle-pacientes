// Gera link de recuperação de senha via admin (token_hash, sem PKCE).
// Envia via Gmail SMTP (igual ao questionário). Funciona em qualquer browser.
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/notifications/email'

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const admin = createAdminClient()

  // Verifica se o usuário existe (não revelamos se não existe — resposta genérica)
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) {
    // Resposta genérica para não revelar se email existe
    return NextResponse.json({ ok: true })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/auth/set-password` },
    } as any)
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (data as any)?.properties ?? {}
    const hashedToken: string | undefined = props.hashed_token
    if (!hashedToken) throw new Error('Supabase não retornou hashed_token')

    const resetUrl = `${siteUrl}/auth/verify?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent('/auth/set-password')}`

    await sendPasswordResetEmail({ to: email, portalLink: resetUrl })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Falha ao gerar link' }, { status: 500 })
  }
}
