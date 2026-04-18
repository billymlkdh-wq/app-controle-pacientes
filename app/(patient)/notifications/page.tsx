// Caixa de notificações do paciente
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'

export default async function PatientNotificationsPage() {
  const supabase = await createClient()
  const { data: list } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Notificações</h1>
      <div className="space-y-2">
        {(list ?? []).map((n) => (
          <Card key={n.id} className={n.read ? 'opacity-60' : ''}>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>{n.title}</span>
              {!n.read && <Badge>Nova</Badge>}
            </CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div>{n.message}</div>
              <div className="mt-1 text-xs">{formatDateBR(n.created_at)}</div>
            </CardContent>
          </Card>
        ))}
        {(list ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma notificação.</p>}
      </div>
    </div>
  )
}
