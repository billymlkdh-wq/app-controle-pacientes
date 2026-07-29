'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Droplets, Users, Trophy, Star } from 'lucide-react'

const NAV = [
  { href: '/portal',    label: 'Início',    icon: Home    },
  { href: '/habitos',   label: 'Hábitos',   icon: Droplets },
  { href: '/comunidade',label: 'Feed',      icon: Users   },
  { href: '/ranking',   label: 'Ranking',   icon: Trophy  },
  { href: '/conquistas',label: 'Perfil',    icon: Star    },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0d0a] border-t border-[#2a2419]">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/portal' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors ${
                active
                  ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-amber-300 [&>svg]:text-yellow-400'
                  : 'text-[#9a8c70] hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-yellow-400' : ''}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-yellow-400' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
