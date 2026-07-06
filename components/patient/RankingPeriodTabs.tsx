'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes',    label: 'Mês'    },
  { value: 'total',  label: 'Total'  },
]

export function RankingPeriodTabs({ current }: { current: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  return (
    <div className="flex gap-2">
      {TABS.map((t) => {
        const active = current === t.value
        return (
          <button
            key={t.value}
            onClick={() => {
              const params = new URLSearchParams(sp.toString())
              params.set('period', t.value)
              router.push(`/ranking?${params.toString()}`)
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              active
                ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]'
                : 'bg-[#1a1b30] text-[#8892b0] border border-[#2a2b50] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
