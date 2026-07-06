// Layout admin — sidebar + header + ThemeToggle + NotificationBell
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Users, Wallet, ClipboardList, Bell, Trophy, Target, MessageSquare, Flame, Swords, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') redirect('/portal')

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/patients', label: 'Pacientes', icon: Users },
    { href: '/financial', label: 'Financeiro', icon: Wallet },
    { href: '/questionnaires', label: 'Questionários', icon: ClipboardList },
    { href: '/admin/ranking', label: 'Ranking', icon: Trophy },
    { href: '/admin/metas', label: 'Metas', icon: Target },
    { href: '/admin/desafios', label: 'Desafios', icon: Swords },
    { href: '/admin/habitos', label: 'Hábitos', icon: Flame },
    { href: '/admin/comunidade', label: 'Comunidade', icon: MessageSquare },
    { href: '/notifications', label: 'Notificações', icon: Bell },
  ]

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-card">
        <div className="p-4 border-b">
          <div className="font-semibold">Rafael Bolson</div>
          <div className="text-xs text-muted-foreground">Admin</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <Link href="/admin/ver-como-paciente" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-500 border border-yellow-500/30">
            <Eye className="h-4 w-4" />
            Ver como paciente
          </Link>
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="outline" size="sm" className="w-full">Sair</Button>
          </form>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="md:hidden font-semibold">Rafael Bolson</div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationBell basePath="/admin" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
