// Layout admin — sidebar agrupada + header + ThemeToggle + NotificationBell
// Design: data-dense dashboard + soft UI evolution (soft shadows + Atkinson).
import { redirect } from 'next/navigation'
import { Eye, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { CommandPalette } from '@/components/admin/CommandPalette'
import { SidebarLink, type IconName } from '@/components/admin/SidebarLink'

type NavItem = { href: string; label: string; iconName: IconName }

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operação',
    items: [
      { href: '/dashboard',       label: 'Dashboard',     iconName: 'LayoutDashboard' },
      { href: '/patients',        label: 'Pacientes',     iconName: 'Users' },
      { href: '/financial',       label: 'Financeiro',    iconName: 'Wallet' },
      { href: '/questionnaires',  label: 'Questionários', iconName: 'ClipboardList' },
    ],
  },
  {
    title: 'Engajamento',
    items: [
      { href: '/admin/ranking',    label: 'Ranking',     iconName: 'Trophy' },
      { href: '/admin/metas',      label: 'Metas',       iconName: 'Target' },
      { href: '/admin/desafios',   label: 'Desafios',    iconName: 'Swords' },
      { href: '/admin/habitos',    label: 'Hábitos',     iconName: 'Flame' },
      { href: '/admin/comunidade', label: 'Comunidade',  iconName: 'MessageSquare' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/notifications', label: 'Notificações', iconName: 'Bell' },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const role = (user.app_metadata as { role?: string } | null)?.role
  if (role !== 'admin') redirect('/portal')

  return (
    <div data-admin="true" className="min-h-screen flex bg-background">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-card/50 backdrop-blur-sm">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-base shadow-sm">
              R
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate leading-tight">Rafael Bolson</div>
              <div className="text-[11px] text-muted-foreground">Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="px-3 pb-1.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">
                {g.title}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    iconName={item.iconName}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t space-y-2">
          <form action="/api/admin/enter-patient-view" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors"
            >
              <Eye className="h-4 w-4" />
              Ver como paciente
            </button>
          </form>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-border transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/60 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 px-4">
          <div className="md:hidden font-semibold">Rafael Bolson</div>
          <div className="flex-1 flex items-center">
            <CommandPalette />
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell basePath="/admin" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
