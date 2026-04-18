// Card "próximo questionário" para portal do paciente
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/utils'
import { daysUntilDue, isOverdue } from '@/lib/questionnaire/schedule'

export function NextQuestionnaireCard({ schedule }: { schedule: { due_date: string } | null }) {
  if (!schedule) return null
  const overdue = isOverdue(schedule.due_date)
  const days = daysUntilDue(schedule.due_date)
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span>Próximo questionário</span>
        <Badge variant={overdue ? 'destructive' : days <= 2 ? 'warning' : 'secondary'}>
          {overdue ? 'Atrasado' : days === 0 ? 'Hoje' : `Em ${days} dias`}
        </Badge>
      </CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Data prevista: {formatDateBR(schedule.due_date)}</p>
        <Button asChild><Link href="/questionnaire">Responder</Link></Button>
      </CardContent>
    </Card>
  )
}
