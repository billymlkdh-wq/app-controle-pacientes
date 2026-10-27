// Texto do lembrete de questionário — compartilhado entre o envio em massa
// e o envio individual, para as duas mensagens nunca divergirem.

export function daysLateFrom(dueDate: string, today: string): number {
  return Math.max(
    0,
    Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86_400_000),
  )
}

export function buildReminderMessage({
  name, dueDate, today, portalLink,
}: {
  name: string | null
  dueDate: string
  today: string
  portalLink: string
}): string {
  const firstName = (name || '').split(/\s+/)[0] || name || 'tudo bem'
  const daysLate = daysLateFrom(dueDate, today)

  if (daysLate === 0) {
    return `Oi ${firstName}! Seu questionário quinzenal está disponível. Responde aqui quando puder: ${portalLink}`
  }
  if (daysLate === 1) {
    return `${firstName}, seu questionário venceu ontem. Leva 2 minutos: ${portalLink}`
  }
  return `${firstName}, já são ${daysLate} dias sem responder o questionário. Preciso acompanhar sua evolução: ${portalLink}`
}

/**
 * Normaliza para o formato que o wa.me exige: só dígitos, com código do país.
 * Aceita tanto número já internacional (5551999990000) quanto local com DDD
 * (51999990000), que é como parte da base está cadastrada.
 */
export function normalizePhoneForWa(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}` // DDD + número
  if (digits.length >= 12 && digits.length <= 13) return digits          // já tem o 55
  return digits.length >= 10 ? digits : null
}

/** Link "Click to Chat" oficial: abre a conversa com o texto já preenchido. */
export function buildWaLink(phone: string, message: string): string | null {
  const normalized = normalizePhoneForWa(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
