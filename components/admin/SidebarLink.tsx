'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Wallet, ClipboardList, Bell,
  Trophy, Target, MessageSquare, Flame, Swords,
  type LucideIcon,
} from 'lucide-react'

// Resolver client-side: evita passar função Lucide do RSC (server) pro client.
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Wallet, ClipboardList, Bell,
  Trophy, Target, MessageSquare, Flame, Swords,
}

export type IconName = keyof typeof ICONS

export function SidebarLink({
  href, label, iconName,
}: { href: string; label: string; iconName: IconName }) {
  const path = usePathname()
  const active = path === href || (href !== '/dashboard' && path.startsWith(href))
  const Icon = ICONS[iconName] ?? Users
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all relative ${
        active
          ? 'bg-primary/10 text-foreground font-semibold'
          : 'text-foreground/75 hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
        />
      )}
      <Icon className={`h-4 w-4 transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
      }`} />
      <span>{label}</span>
    </Link>
  )
}
