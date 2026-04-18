// Cálculo de próximo schedule quinzenal
import { addDays, differenceInDays, format } from 'date-fns'

export function nextDueDate(from: Date = new Date()): string {
  return format(addDays(from, 15), 'yyyy-MM-dd')
}

export function daysUntilDue(dueDate: string): number {
  return differenceInDays(new Date(dueDate), new Date())
}

export function isDueSoon(dueDate: string): boolean {
  const d = daysUntilDue(dueDate)
  return d >= 0 && d <= 2
}

export function isOverdue(dueDate: string): boolean {
  return daysUntilDue(dueDate) < 0
}
