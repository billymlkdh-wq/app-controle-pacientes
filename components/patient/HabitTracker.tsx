'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { toast } from 'sonner'
import { Camera, CheckCircle2, Upload } from 'lucide-react'

interface HabitGoal { habit_type: string; daily_goal: number; unit: string }
interface HabitLog  { habit_type: string; value: number; logged_date: string }
interface Props { todayLogs: HabitLog[]; goals: HabitGoal[] }

const HABITS = [
  { type: 'water',   label: 'Hidratação',    emoji: '💧', unit: 'L',      defaultGoal: 3,     step: 0.25, photoLabel: 'Foto da garrafa / copo' },
  { type: 'steps',   label: 'Passos',        emoji: '👟', unit: 'passos', defaultGoal: 10000, step: 500,  photoLabel: 'Foto do celular mostrando passos' },
  { type: 'cardio',  label: 'Cardio extra',  emoji: '🏃', unit: 'min',    defaultGoal: 30,    step: 5,    photoLabel: 'Foto fazendo cardio' },
  { type: 'workout', label: 'Treino feito',  emoji: '💪', unit: '',       defaultGoal: 1,     step: 1,    photoLabel: 'Foto no treino' },
]

export function HabitTracker({ todayLogs, goals }: Props) {
  const [values,   setValues]   = React.useState<Record<string, string>>({})
  const [photos,   setPhotos]   = React.useState<Record<string, File | null>>({})
  const [previews, setPreviews] = React.useState<Record<string, string>>({})
  const [loading,  setLoading]  = React.useState<Record<string, boolean>>({})
  const [autoPost, setAutoPost] = React.useState<Record<string, boolean>>({})
  const [logs,     setLogs]     = React.useState<HabitLog[]>(todayLogs)
  const fileRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  React.useEffect(() => { setLogs(todayLogs) }, [todayLogs])

  function getGoal(type: string) { return goals.find((g) => g.habit_type === type) }
  function getLogged(type: string) { return logs.filter((l) => l.habit_type === type).reduce((s, l) => s + l.value, 0) }

  function pickPhoto(type: string, file: File) {
    setPhotos((p) => ({ ...p, [type]: file }))
    const url = URL.createObjectURL(file)
    setPreviews((p) => ({ ...p, [type]: url }))
  }

  async function uploadPhoto(type: string, file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('habit_type', type)
    const res = await fetch('/api/patient/habit-photo', { method: 'POST', body: fd })
    if (!res.ok) return null
    const d = await res.json()
    return d.url as string
  }

  async function submit(type: string, rawValue?: number) {
    const goal     = getGoal(type)
    const goalVal  = goal?.daily_goal ?? HABITS.find((h) => h.type === type)?.defaultGoal ?? 1
    const value    = type === 'workout' ? 1 : (rawValue ?? parseFloat(values[type] ?? '0'))
    const photo    = photos[type]

    if (!photo) { toast.error('Envie uma foto como prova 📸'); return }
    if (type !== 'workout' && (!value || value <= 0)) { toast.error('Informe o valor'); return }

    setLoading((p) => ({ ...p, [type]: true }))
    try {
      const photoUrl = await uploadPhoto(type, photo)
      if (!photoUrl) throw new Error('Erro ao enviar foto')

      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_type: type,
          value,
          photo_url: photoUrl,
          auto_post: autoPost[type] ?? false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setLogs((prev) => [...prev, { habit_type: type, value, logged_date: new Date().toISOString().split('T')[0] }])
      setValues((p)   => ({ ...p, [type]: '' }))
      setPhotos((p)   => ({ ...p, [type]: null }))
      setPreviews((p) => ({ ...p, [type]: '' }))

      const newTotal = getLogged(type) + value
      if (data.xp > 0) toast.success(`+${data.xp} XP${newTotal >= goalVal ? ' 🎯 Meta atingida!' : ''}`)
      else toast.success('Registrado!')
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao registrar')
    } finally {
      setLoading((p) => ({ ...p, [type]: false }))
    }
  }

  return (
    <div className="space-y-3">
      {HABITS.map((h) => {
        const goal    = getGoal(h.type)
        const goalVal = goal?.daily_goal ?? h.defaultGoal
        const unit    = goal?.unit ?? h.unit
        const logged  = getLogged(h.type)
        const pct     = goalVal > 0 ? Math.min(100, Math.round((logged / goalVal) * 100)) : 0
        const done    = pct >= 100
        const photo   = photos[h.type]
        const preview = previews[h.type]
        const busy    = loading[h.type]

        return (
          <div
            key={h.type}
            className={`rounded-2xl border p-4 space-y-3 ${
              done ? 'bg-green-500/10 border-green-500/30' : 'bg-[#141528] border-[#1e2040]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{h.emoji} {h.label}</span>
              {done ? (
                <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Meta atingida!
                </span>
              ) : (
                <span className="text-[#4a5080] text-xs">
                  {logged}{unit ? ' ' + unit : ''} / {goalVal}{unit ? ' ' + unit : ''}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-[#1e2040] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${done ? 'bg-green-400' : 'bg-gradient-to-r from-pink-500 to-cyan-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Photo upload area */}
            <div>
              <p className="text-[10px] text-[#4a5080] uppercase tracking-wider mb-1.5">
                📸 Prova obrigatória — {h.photoLabel}
              </p>
              <input
                ref={(el) => { fileRefs.current[h.type] = el }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(h.type, f) }}
              />
              {preview ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#1e2040]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPhotos((p) => ({ ...p, [h.type]: null })); setPreviews((p) => ({ ...p, [h.type]: '' })) }}
                    className="absolute top-1.5 right-1.5 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white"
                  >
                    trocar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRefs.current[h.type]?.click()}
                  className="w-full border-2 border-dashed border-[#2a2b50] hover:border-pink-500/50 rounded-xl py-4 flex flex-col items-center gap-1.5 text-[#4a5080] hover:text-pink-400 transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Tirar foto ou escolher da galeria</span>
                </button>
              )}
            </div>

            {/* Value input */}
            {h.type !== 'workout' ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Valor em ${unit}`}
                  value={values[h.type] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [h.type]: e.target.value }))}
                  step={h.step}
                  min={0}
                  className="flex-1 bg-[#0b0c1a] border border-[#1e2040] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4a5080] outline-none focus:border-pink-500/50"
                />
                <button
                  disabled={!values[h.type] || !photo || busy}
                  onClick={() => submit(h.type, parseFloat(values[h.type]))}
                  className="bg-pink-500 hover:bg-pink-600 disabled:opacity-40 rounded-xl px-4 text-sm font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  {busy ? '...' : <><Upload className="h-3.5 w-3.5" /> Registrar</>}
                </button>
              </div>
            ) : (
              <button
                disabled={!photo || busy || done}
                onClick={() => submit(h.type)}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  done
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white'
                }`}
              >
                {busy ? '...' : done ? '✓ Treino confirmado' : <><Upload className="h-3.5 w-3.5" /> Confirmar treino</>}
              </button>
            )}

            {/* Auto-post */}
            <label className="flex items-center gap-2 text-xs text-[#4a5080] cursor-pointer">
              <input
                type="checkbox"
                checked={autoPost[h.type] ?? false}
                onChange={(e) => setAutoPost((p) => ({ ...p, [h.type]: e.target.checked }))}
                className="rounded accent-pink-500"
              />
              Compartilhar no feed da comunidade
            </label>
          </div>
        )
      })}
    </div>
  )
}
