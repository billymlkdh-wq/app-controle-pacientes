'use client'
// Header de XP + streak client-side.
// Faz fetch inicial, revalida em:
//   - window 'xp-updated' (disparado após ganhar XP)
//   - window focus (volta ao app → atualiza)
//   - cada navegação (pathname mudou)
// Resolve o bug do XP não atualizar na barra amarela após marcar refeição.
import NumberFlow from '@number-flow/react'
import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Flame } from 'lucide-react'

type XP = {
  totalXP: number
  streak: number
  levelEmoji: string
  levelName: string
  nextLevelName: string | null
  progress: number
  xpToNext: number
}

const INITIAL: XP = {
  totalXP: 0, streak: 0, levelEmoji: '🐔',
  levelName: '', nextLevelName: null, progress: 0, xpToNext: 0,
}

export function XPHeaderFull({
  initial,
}: {
  initial?: Partial<XP>
}) {
  const path = usePathname()
  const [data, setData] = React.useState<XP>({ ...INITIAL, ...initial })
  const mounted = React.useRef(false)

  const fetchXP = React.useCallback(async () => {
    try {
      const r = await fetch('/api/patient/me/xp', { cache: 'no-store' })
      if (!r.ok) return
      const j = (await r.json()) as XP
      setData(j)
    } catch {
      // silencioso — mantém último valor conhecido
    }
  }, [])

  // Primeiro fetch no mount + reset ao trocar de rota
  React.useEffect(() => {
    fetchXP()
    mounted.current = true
  }, [fetchXP, path])

  // Evento global disparado após ganhar XP (meal, questionário, hábito)
  React.useEffect(() => {
    const onXP = () => fetchXP()
    const onFocus = () => fetchXP()
    const onVis = () => { if (document.visibilityState === 'visible') fetchXP() }
    window.addEventListener('xp-updated', onXP)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('xp-updated', onXP)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchXP])

  return (
    <>
      {/* Linha superior: eyebrow + nível em Barlow Condensed + streak pill outline */}
      <div className="sticky top-0 z-40 bg-[#0f0d0a]/95 backdrop-blur border-b border-[#2a2419] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6b6250] font-semibold">
              Nutricionista Rafael
            </span>
            <span className="p-display text-base flex items-center gap-1.5 truncate text-[#f5efe0]">
              <span className="text-lg">{data.levelEmoji}</span>
              <span className="truncate">{data.levelName}</span>
            </span>
          </div>
          <div className="p-streak-pill flex-shrink-0">
            <Flame className="h-3.5 w-3.5" />
            <NumberFlow value={data.streak} className="tabular-nums" />
            <span className="text-[#fb923c]/80 text-[11px] font-medium">dias</span>
          </div>
        </div>
      </div>

      {/* Barra XP com shimmer e gradiente brand */}
      <div className="bg-[#1a1610] border-b border-[#2a2419] px-4 py-2.5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#9a8c70]">
              {data.nextLevelName ? `Próximo: ${data.nextLevelName}` : 'Nível máximo!'}
            </span>
            <div className="flex items-baseline gap-0.5">
              <NumberFlow
                value={data.totalXP}
                className="p-display text-lg text-[#fbbf24] tabular-nums leading-none"
              />
              <span className="p-display text-[#fbbf24] text-xs ml-1">XP</span>
            </div>
          </div>
          <div className="h-2 bg-[#2a2419] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full p-shimmer transition-all duration-700 ease-out"
              style={{
                width: `${data.progress}%`,
                background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 50%, #fde047 100%)',
              }}
            />
          </div>
          {data.nextLevelName && data.xpToNext > 0 && (
            <div className="text-[10px] text-[#6b6250] mt-1 text-right">
              faltam{' '}
              <NumberFlow value={data.xpToNext} className="tabular-nums font-semibold text-[#d4c89a]" />
              {' '}XP
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Helper exportado: dispara o evento global após uma ação que deu XP
export function notifyXPGained() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xp-updated'))
  }
}
