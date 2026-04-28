// Email sending via Gmail SMTP (Nodemailer) — server-side only
// Requires GMAIL_USER=seu@gmail.com and GMAIL_APP_PASSWORD (Google App Password)
// How to create app password: myaccount.google.com → Security → 2-Step Verification → App passwords
// Free: up to 500 emails/day

import nodemailer from 'nodemailer'

function getTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    console.warn('[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — email skipped')
    return null
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

function fromAddress(): string {
  const user = process.env.GMAIL_USER ?? ''
  return `Rafael Bolson <${user}>`
}

export type SendEmailResult = { ok: boolean; id?: string; error?: string }

export async function sendPasswordResetEmail({
  to,
  portalLink,
}: {
  to: string
  portalLink: string
}): Promise<SendEmailResult> {
  const transport = getTransport()
  if (!transport) return { ok: false, error: 'GMAIL_USER / GMAIL_APP_PASSWORD not set' }

  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: '🔑 Redefinição de senha — Portal do Paciente',
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #16a34a;">Redefinir sua senha 🔑</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no portal de acompanhamento.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${portalLink}"
               style="background: #16a34a; color: #fff; padding: 12px 28px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; font-size: 16px;">
              Redefinir senha
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">
            Se o botão não funcionar, acesse: <a href="${portalLink}">${portalLink}</a>
          </p>
          <p style="color: #888; font-size: 12px;">Se você não solicitou isso, ignore este e-mail.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Rafael Bolson — Nutricionista Clínico e Esportivo</p>
        </div>
      `,
    })
    return { ok: true, id: info.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'erro' }
  }
}

export async function sendQuestionnaireUnlockedEmail({
  to,
  name,
  portalLink,
}: {
  to: string
  name: string
  portalLink: string
}): Promise<SendEmailResult> {
  const transport = getTransport()
  if (!transport) return { ok: false, error: 'GMAIL_USER / GMAIL_APP_PASSWORD not set' }

  const firstName = name.split(/\s+/)[0] || name

  try {
    const info = await transport.sendMail({
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
    return { ok: true, id: info.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'erro' }
  }
}
