// Sino de notificações — badge + dropdown com as últimas não lidas
'use client'
import * as React from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NotificationRow = {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export function NotificationBell({ basePath }: { basePath: string }) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationRow[]>([])
  const [unread, setUnread] = React.useState(0)

  React.useEffect(() => {
    const supabase = createClient()
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id,title,message,read,created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      if (!mounted) return
      setItems((data as NotificationRow[]) ?? [])
      setUnread(((data as NotificationRow[]) ?? []).filter((n) => !n.read).length)
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notificações" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 min-w-[20px] justify-center px-1 text-[10px]">
            {unread}
          </Badge>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border bg-card shadow-lg z-50">
          <div className="p-3 border-b text-sm font-medium">Notificações</div>
          <ul className="max-h-80 overflow-auto divide-y">
            {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nada por aqui.</li>}
            {items.map((n) => (
              <li key={n.id} className={`p-3 text-sm ${n.read ? 'opacity-60' : ''}`}>
                <div className="font-medium">{n.title}</div>
                <div className="text-muted-foreground">{n.message}</div>
              </li>
            ))}
          </ul>
          <div className="p-2 border-t">
            <Link href={`${basePath}/notifications`} className="block text-center text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
