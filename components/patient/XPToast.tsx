'use client'
// Toast customizado com NumberFlow animado — usado quando paciente ganha XP.
import NumberFlow from '@number-flow/react'
import { toast } from 'sonner'
import * as React from 'react'

function XPToastContent({ xp, message }: { xp: number; message: string }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    const t = setTimeout(() => setV(xp), 60)
    return () => clearTimeout(t)
  }, [xp])
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-lg shadow-lg shadow-yellow-500/30">
        🔥
      </div>
      <div className="flex flex-col">
        <div className="text-sm font-semibold text-foreground">{message}</div>
        <div className="text-xs text-muted-foreground flex items-baseline gap-0.5">
          <span>+</span>
          <NumberFlow value={v} className="text-yellow-500 font-bold tabular-nums" />
          <span className="text-yellow-500 font-bold ml-0.5">XP</span>
        </div>
      </div>
    </div>
  )
}

export function toastXP(xp: number, message = 'Refeição marcada!') {
  toast.custom(() => <XPToastContent xp={xp} message={message} />, {
    duration: 3500,
  })
}
