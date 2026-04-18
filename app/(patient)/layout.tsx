// Layout paciente — header limpo + ThemeToggle + NotificationBell
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { Button } from '@/components/ui/button'

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role === 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="font-semibold">Rafael Bolson</div>
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link href="/portal" className="hover:text-primary">Início</Link>
            <Link href="/questionnaire" className="hover:text-primary">Questionário</Link>
            <Link href="/progress" className="hover:text-primary">Evolução</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell basePath="/portal" />
          <ThemeToggle />
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">Sair</Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
