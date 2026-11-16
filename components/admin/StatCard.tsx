// Stat card compacto para o dashboard admin.
// Segue data-dense: padding reduzido, número grande, ícone SVG (não emoji),
// barra lateral colorida pra hierarquia visual. Clicável opcionalmente.
import Link from 'next/link'
import * as React from 'react'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONE_ACCENT: Record<Tone, string> = {
  primary: 'hsl(var(--primary))',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  info:    '#0ea5e9',
  muted:   'hsl(var(--muted-foreground))',
}
const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger:  'text-red-600 dark:text-red-400',
  info:    'text-sky-600 dark:text-sky-400',
  muted:   'text-muted-foreground',
}
const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger:  'bg-red-500/10 text-red-600 dark:text-red-400',
  info:    'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  muted:   'bg-muted text-muted-foreground',
}

export function StatCard({
  label, value, hint, icon, tone = 'primary', href, active, delay,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: React.ReactNode
  tone?: Tone
  href?: string
  active?: boolean
  delay?: number
}) {
  const style = {
    ['--stat-accent' as string]: TONE_ACCENT[tone],
    animationDelay: delay ? `${delay}ms` : undefined,
  } as React.CSSProperties

  const content = (
    <div
      style={style}
      className={`admin-card admin-stat admin-fade pl-4 pr-3 py-3 flex items-center gap-3 ${
        href ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
    >
      {icon && (
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TONE_BG[tone]}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </div>
        <div className={`text-2xl font-bold leading-tight ${TONE_TEXT[tone]}`}>
          {value}
        </div>
        {hint && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {hint}
          </div>
        )}
      </div>
    </div>
  )

  if (href) return <Link href={href} className="block">{content}</Link>
  return content
}
