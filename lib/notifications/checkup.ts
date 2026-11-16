// Mensagem do check-up semanal. Texto curto, com o primeiro nome.
import { buildWaLink } from './questionnaire-reminder'

export function buildCheckupMessage(name: string | null): string {
  const first = (name || '').split(/\s+/)[0] || 'tudo bem'
  return (
    `Oii ${first}, tudo bem?? Como estão as coisas? ` +
    `Tem tido alguma dificuldade com sua dieta? ` +
    `Pode contar comigo viu 💛`
  )
}

export function buildCheckupWaLink(phone: string, name: string | null): string | null {
  return buildWaLink(phone, buildCheckupMessage(name))
}

/** Segunda-feira 00:00 local da semana que contém `d`. ISO: semana começa seg. */
export function mondayOfWeek(d: Date = new Date()): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() // 0 = dom, 1 = seg, …
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  return date
}

export function weekRange(d: Date = new Date()): { start: Date; end: Date } {
  const start = mondayOfWeek(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}
