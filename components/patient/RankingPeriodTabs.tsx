'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mês' },
  { key: 'total',  label: 'Total' },
]

export function RankingPeriodTabs({ current }: { current: string }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/ranking?period=${t.key}`}
          className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors ${
            current === t.key
              ? 'bg-background text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
