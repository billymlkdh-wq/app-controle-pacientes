// Home do paciente — próximo questionário + alertas
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'
import { daysUntilDue, isOverdue } from '@/lib/questionnaire/schedule'

export default async function PortalHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: patient } = await supabase.from('patients').select('*').eq('user_id', user!.id).single()

  const { data: schedule } = await supabase
    .from('questionnaire_schedule')
    .select('*')
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const today = new Date().toISOString().slice(0, 10)
  const overdue = schedule ? isOverdue(schedule.due_date) : false
  const days = schedule ? daysUntilDue(schedule.due_date) : null
  // "Bloqueado" = existe schedule mas data ainda não chegou (paciente acabou de responder)
  const locked = !!schedule && schedule.due_date > today

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {patient?.name ?? ''}</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo de volta ao seu acompanhamento.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Próximo questionário</span>
            {schedule && <Badge variant={overdue ? 'destructive' : locked ? 'secondary' : days !== null && days <= 2 ? 'warning' : 'secondary'}>
              {overdue ? 'Atrasado' : locked ? 'Bloqueado' : days === 0 ? 'Hoje' : days !== null && days > 0 ? `Em ${days} dias` : '-'}
            </Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedule ? (
            locked ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Você já respondeu. Seu próximo questionário será liberado em <strong>{formatDateBR(schedule.due_date)}</strong> ({days === 1 ? '1 dia' : `${days} dias`}).
                </p>
                <Button disabled variant="outline">Responder agora</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Data prevista: {formatDateBR(schedule.due_date)}</p>
                <Button asChild><Link href="/questionnaire">Responder agora</Link></Button>
              </>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum questionário pendente no momento.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Evolução</CardTitle></CardHeader>
          <CardContent><Link href="/progress" className="text-sm text-primary hover:underline">Ver meu gráfico</Link></CardContent></Card>
        <Card><CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
          <CardContent><Link href="/portal/notifications" className="text-sm text-primary hover:underline">Abrir caixa</Link></CardContent></Card>
      </div>
    </div>
  )
}
