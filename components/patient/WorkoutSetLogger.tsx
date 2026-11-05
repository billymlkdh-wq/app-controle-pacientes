// Inputs inline por série: carga kg + reps feitas. Salva no blur.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

export function WorkoutSetLogger({
  setId,
  initialLoad,
  initialReps,
}: {
  setId: string
  initialLoad: number | null
  initialReps: number | null
}) {
  const router = useRouter()
  const [load, setLoad] = React.useState<string>(initialLoad != null ? String(initialLoad) : '')
  const [reps, setReps] = React.useState<string>(initialReps != null ? String(initialReps) : '')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(initialLoad != null || initialReps != null)

  async function save() {
    if (load === '' && reps === '') return
    setSaving(true)
    try {
      const r = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set_id: setId,
          load_kg: load === '' ? null : Number(load),
          reps_done: reps === '' ? null : Number(reps),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Erro')
      setSaved(true)
      toast.success('Registrado.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        className="w-16 h-8 rounded border border-[#2a2419] bg-[#1a1610] px-2 text-xs text-center text-white"
        placeholder="kg"
        value={load}
        onChange={(e) => setLoad(e.target.value)}
        onBlur={save}
      />
      <span className="text-[10px] text-[#9a8c70]">×</span>
      <input
        type="number"
        inputMode="numeric"
        className="w-14 h-8 rounded border border-[#2a2419] bg-[#1a1610] px-2 text-xs text-center text-white"
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={save}
      />
      {saving ? (
        <span className="text-[10px] text-[#9a8c70] w-4">…</span>
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <span className="w-4" />
      )}
    </div>
  )
}
