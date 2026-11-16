'use client'
// Bottom nav do paciente — 5 slots:
//   Início | Plano | Treino | Hábitos | Mais (drawer com o resto)
// "Mais" abre um Vaul drawer (iOS-like sheet) com os menus secundários.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { Drawer } from 'vaul'
import {
  Home, Utensils, Dumbbell, Droplets, Menu,
  Users, Trophy, Star, Target, Swords, LineChart, Bell, LogOut,
} from 'lucide-react'

type Item = { href: string; label: string; Icon: typeof Home }

const MAIN: Item[] = [
  { href: '/portal',   label: 'Início',  Icon: Home },
  { href: '/plano',    label: 'Plano',   Icon: Utensils },
  { href: '/treino',   label: 'Treino',  Icon: Dumbbell },
  { href: '/habitos',  label: 'Hábitos', Icon: Droplets },
]

const MORE: Item[] = [
  { href: '/comunidade',  label: 'Comunidade',   Icon: Users },
  { href: '/ranking',     label: 'Ranking',      Icon: Trophy },
  { href: '/desafios',    label: 'Desafios',     Icon: Swords },
  { href: '/metas',       label: 'Metas',        Icon: Target },
  { href: '/conquistas',  label: 'Conquistas',   Icon: Star },
  { href: '/progress',    label: 'Evolução',     Icon: LineChart },
  { href: '/portal/notifications', label: 'Notificações', Icon: Bell },
]

function NavItem({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors ${
        active ? 'text-yellow-400' : 'text-[#9a8c70] hover:text-white'
      }`}
    >
      <item.Icon className="h-5 w-5" />
      <span className="text-[10px] font-semibold tracking-wide uppercase p-display">
        {item.label}
      </span>
      {active && (
        <span aria-hidden="true" className="absolute -bottom-1 h-1 w-1 rounded-full bg-yellow-400" />
      )}
    </Link>
  )
}

export function BottomNav() {
  const path = usePathname()
  const [open, setOpen] = React.useState(false)

  const isActive = (href: string) =>
    path === href || (href !== '/portal' && path.startsWith(href))

  const moreActive = MORE.some((m) => isActive(m.href))

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0d0a] border-t border-[#2a2419]">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
          {MAIN.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors ${
              moreActive ? 'text-yellow-400' : 'text-[#9a8c70] hover:text-white'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-semibold tracking-wide uppercase p-display">Mais</span>
            {moreActive && (
              <span aria-hidden="true" className="absolute -bottom-1 h-1 w-1 rounded-full bg-yellow-400" />
            )}
          </button>
        </div>
      </nav>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[60]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0f0d0a] border-t border-[#2a2419] rounded-t-2xl outline-none">
            <Drawer.Title className="sr-only">Mais opções</Drawer.Title>
            <div className="mx-auto w-10 h-1.5 bg-[#2a2419] rounded-full my-3" />
            <div className="max-w-lg mx-auto px-4 pb-6">
              <div className="text-xs uppercase tracking-widest text-[#9a8c70] font-medium mb-3">
                Mais
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MORE.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border transition-colors ${
                      isActive(item.href)
                        ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                        : 'border-[#2a2419] bg-[#1a1610] text-[#d4c89a] hover:border-[#3a3119]'
                    }`}
                  >
                    <item.Icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
              <form action="/auth/logout" method="post" className="mt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2a2419] bg-[#1a1610] text-red-400 text-sm font-medium hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
