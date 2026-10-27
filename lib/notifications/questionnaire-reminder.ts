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
