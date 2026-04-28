// Email sending via Resend — server-side only
// Docs: https://resend.com/docs
// Requires RESEND_API_KEY in env
// Requires FROM_EMAIL in env (e.g. "Rafael Bolson <noreply@seudominio.com>")
// If keys are missing, logs warning and skips silently.

import { Resend } from 'resend'

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — email skipped')
    return null
  }
  return new Resend(key)
}

function fromAddress(): string {
  return process.env.FROM_EMAIL ?? 'Rafael Bolson <noreply@rafaelbolson.com.br>'
}

export type SendEmailResult = { ok: boolean; id?: string; error?: string }

export async function sendQuestionnaireUnlockedEmail({
  to,
  name,
  portalLink,
}: {
  to: string
  name: string
  portalLink: string
}): Promise<SendEmailResult> {
  const resend = getClient()
  if (!resend) return { ok: false, error: 'RESEND_API_KEY not set' }

  const firstName = name.split(/\s+/)[0] || name

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: '📋 Seu questionário quinzenal está disponível!',
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #16a34a;">Oi, ${firstName}! 👋</h2>
          <p>Seu questionário quinzenal já está liberado e pronto para ser respondido.</p>
          <p>Leva menos de 2 minutos e me ajuda a acompanhar sua evolução de perto.</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${portalLink}"
               style="background: #16a34a; color: #fff; padding: 12px 28px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; font-size: 16px;">
              Responder questionário
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">
            Se o botão não funcionar, acesse: <a href="${portalLink}">${portalLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Rafael Bolson — Nutricionista Clínico e Esportivo</p>
        </div>
      `,
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'erro' }
  }
}
