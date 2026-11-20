// Wizard de execução de treino (estilo Smartfit).
// - 1 exercício por vez com ‹ › navegação
// - Grid de séries clicáveis (dot colorido por tipo)
// - Inputs grandes Peso/Reps + Concluir série (avança próxima)
// - Cronômetro total + cronômetro descanso após concluir série válida
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check, Clock, X } from 'lucide-react'
import { ExerciseVideoButton } from '@/components/patient/ExerciseVideoButton'

type SetType = 'aquecimento' | 'preparatoria' | 'valida'

// Descanso fixo entre séries válidas (2 min). Demais séries usam rest_seconds do exercício.
const VALID_SET_REST_SECONDS = 120

function restFor(ex: { rest_seconds: number | null }, set: { set_type: SetType }): number | null {
  if (set.set_type === 'valida') return VALID_SET_REST_SECONDS
  return ex.rest_seconds && ex.rest_seconds > 0 ? ex.rest_seconds : null
}

export type RunnerSet = {
  id: string
  set_type: SetType
  reps: string
  target_load_kg: number | null
  done: boolean
  load_kg: number | null
  reps_done: number | null
}

export type RunnerExercise = {
  id: string
  name: string
  notes: string | null
  rest_seconds: number | null
  video_url?: string | null
  sets: RunnerSet[]
}

const SET_DOT: Record<SetType, string> = {
  aquecimento: 'bg-red-500',
  preparatoria: 'bg-yellow-400',
  valida: 'bg-green-500',
}
const SET_RING: Record<SetType, string> = {
  aquecimento: 'ring-red-500',
  preparatoria: 'ring-yellow-400',
  valida: 'ring-green-500',
}
const SET_LABEL: Record<SetType, string> = {
  aquecimento: 'Aquecimento',
  preparatoria: 'Preparatórias',
  valida: 'Válidas',
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function ordinalIdx(sets: RunnerSet[], i: number): number {
  // Posição dentro do tipo (1ª preparatória, 2ª preparatória, etc)
  const type = sets[i].set_type
  let n = 0
  for (let k = 0; k <= i; k++) if (sets[k].set_type === type) n++
  return n
}

export function WorkoutRunner({
  dayId, dayName, exercises,
}: {
  dayId: string
  dayName: string
  exercises: RunnerExercise[]
}) {
  const router = useRouter()
  const [exIdx, setExIdx] = React.useState(0)
  const [state, setState] = React.useState<RunnerExercise[]>(exercises)
  const [startedAt] = React.useState(() => Date.now())
  const [now, setNow] = React.useState(Date.now())
  const [restRemaining, setRestRemaining] = React.useState<number | null>(null)
  const [activeSetIdx, setActiveSetIdx] = React.useState(() => {
    const firstUndone = exercises[0]?.sets.findIndex((s) => !s.done) ?? 0
    return firstUndone === -1 ? 0 : firstUndone
  })

  // Quando troca de exercício, aponta pra primeira série não concluída
  React.useEffect(() => {
    const cur = state[exIdx]
    if (!cur) return
    const firstUndone = cur.sets.findIndex((s) => !s.done)
    setActiveSetIdx(firstUndone === -1 ? 0 : firstUndone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIdx])
  const [savingSet, setSavingSet] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    if (restRemaining == null) return
    if (restRemaining <= 0) { setRestRemaining(null); return }
    const t = setTimeout(() => setRestRemaining((r) => (r ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [restRemaining])

  if (exercises.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-[#9a8c70]">Esse dia ainda não tem exercícios.</p>
        <Link href={`/treino/${dayId}`} className="text-yellow-400 underline text-sm mt-4 inline-block">
          ← Voltar
        </Link>
      </div>
    )
  }

  const ex = state[exIdx]
  const activeSet = ex.sets[activeSetIdx]
  const doneCount = ex.sets.filter((s) => s.done).length
  const totalSecs = Math.floor((now - startedAt) / 1000)

  function updateSetLocal(setId: string, patch: Partial<RunnerSet>) {
    setState((all) => all.map((e) => ({
      ...e,
      sets: e.sets.map((s) => s.id === setId ? { ...s, ...patch } : s),
    })))
  }

  async function concludeSet() {
    if (activeSet.load_kg == null && activeSet.reps_done == null) {
      toast.error('Informe peso ou repetições')
      return
    }
    setSavingSet(activeSet.id)
    try {
      const r = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set_id: activeSet.id,
          load_kg: activeSet.load_kg,
          reps_done: activeSet.reps_done,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Erro')
      updateSetLocal(activeSet.id, { done: true })
      toast.success('Série concluída')
      // Inicia descanso
      const rest = restFor(ex, activeSet)
      if (rest) {
        setRestRemaining(rest)
      }
      // Avança próxima série
      if (activeSetIdx + 1 < ex.sets.length) {
        setActiveSetIdx(activeSetIdx + 1)
      } else if (exIdx + 1 < state.length) {
        // Exercício terminado — vai pro próximo
        setTimeout(() => {
          setExIdx(exIdx + 1)
          setActiveSetIdx(0)
          setRestRemaining(null)
        }, 500)
      } else {
        toast.success('Treino concluído! 💪')
        setTimeout(() => router.push(`/treino/${dayId}`), 1200)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSavingSet(null)
    }
  }

  function goPrev() {
    if (exIdx > 0) { setExIdx(exIdx - 1); setActiveSetIdx(0); setRestRemaining(null) }
  }
  function goNext() {
    if (exIdx < state.length - 1) { setExIdx(exIdx + 1); setActiveSetIdx(0); setRestRemaining(null) }
  }

  const progressPct = Math.round(((exIdx + doneCount / Math.max(ex.sets.length, 1)) / state.length) * 100)

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Top: progress + timer + cancel */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 h-2 bg-[#2a2419] rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#9a8c70] uppercase tracking-wider">Tempo total</div>
          <div className="text-sm font-semibold text-white">{fmtSecs(totalSecs)}</div>
        </div>
        <button onClick={() => { if (confirm('Cancelar treino?')) router.push(`/treino/${dayId}`) }}
          className="text-red-400 text-xs font-medium hover:text-red-300">
          Cancelar<br />treino
        </button>
      </div>

      {/* Rest timer overlay */}
      {restRemaining != null && (
        <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-300">
            <Clock className="h-5 w-5" />
            <span className="text-sm">Descanso</span>
          </div>
          <div className="text-2xl font-bold text-blue-200 tabular-nums">{fmtSecs(restRemaining)}</div>
          <button onClick={() => setRestRemaining(null)}
            className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
            <X className="h-3 w-3" /> pular
          </button>
        </div>
      )}

      {/* Exercise name */}
      <h1 className="text-center text-xl font-bold text-white px-2">{ex.name}</h1>
      {ex.notes && <p className="text-xs text-center text-[#9a8c70] italic -mt-2">{ex.notes}</p>}
      {ex.video_url && (
        <div className="flex justify-center -mt-1">
          <ExerciseVideoButton url={ex.video_url} title={ex.name} size="md" />
        </div>
      )}

      {/* Legenda */}
      <div className="text-center text-sm space-y-0.5">
        {(['aquecimento', 'preparatoria', 'valida'] as SetType[]).map((type) => {
          const count = ex.sets.filter((s) => s.set_type === type).length
          if (count === 0) return null
          return (
            <div key={type} className="flex items-center justify-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${SET_DOT[type]}`} />
              <span className="text-white">{SET_LABEL[type]} <strong>{count}</strong></span>
            </div>
          )
        })}
        <div className="text-xs text-[#d4c89a] mt-1">
          Reps <strong>{activeSet.reps}</strong>
          {restFor(ex, activeSet) && <> · Intervalo <strong>{Math.round(restFor(ex, activeSet)! / 60)}min</strong></>}
        </div>
        <div className="text-xs text-[#9a8c70]">
          ☐ Exercício · <strong>{doneCount}/{ex.sets.length}</strong>
        </div>
      </div>

      {/* Card central com séries + inputs */}
      <div className="bg-[#1a1610] border border-[#2a2419] rounded-xl p-4 space-y-4 relative">
        {/* Navegação lateral entre exercícios */}
        <button onClick={goPrev} disabled={exIdx === 0}
          className="absolute -left-2 top-1/2 -translate-y-1/2 text-[#9a8c70] hover:text-white disabled:opacity-30">
          <ChevronLeft className="h-8 w-8" />
        </button>
        <button onClick={goNext} disabled={exIdx === state.length - 1}
          className="absolute -right-2 top-1/2 -translate-y-1/2 text-[#9a8c70] hover:text-white disabled:opacity-30">
          <ChevronRight className="h-8 w-8" />
        </button>

        {/* Dots de séries (clicáveis pra navegar) */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {ex.sets.map((s, i) => {
            const n = ordinalIdx(ex.sets, i)
            const active = i === activeSetIdx
            return (
              <button
                key={s.id}
                onClick={() => setActiveSetIdx(i)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium inline-flex items-center gap-1 transition
                  ${active ? `ring-2 ${SET_RING[s.set_type]} ring-offset-2 ring-offset-[#1a1610]` : ''}
                  ${s.done ? 'bg-[#2a2419] text-[#9a8c70] border-[#3a2f1f]' : 'bg-[#0f0d0a] text-white border-[#2a2419]'}
                `}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${SET_DOT[s.set_type]}`} />
                {n}ª
                {s.done && <Check className="h-3 w-3 text-green-400" />}
              </button>
            )
          })}
        </div>

        {/* Inputs Peso + Reps */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-yellow-400/60 rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#9a8c70] uppercase tracking-wider">Peso</div>
            <input
              type="number" inputMode="decimal" step="0.5"
              className="w-full bg-transparent text-center text-3xl font-bold text-white outline-none mt-1"
              placeholder="—"
              value={activeSet.load_kg ?? ''}
              onChange={(e) => updateSetLocal(activeSet.id, {
                load_kg: e.target.value ? Number(e.target.value) : null,
              })}
            />
            <div className="text-[10px] text-[#9a8c70]">kg</div>
          </div>
          <div className="border border-yellow-400/60 rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#9a8c70] uppercase tracking-wider">Reps feitas</div>
            <input
              type="number" inputMode="numeric"
              className="w-full bg-transparent text-center text-3xl font-bold text-white outline-none mt-1"
              placeholder="—"
              value={activeSet.reps_done ?? ''}
              onChange={(e) => updateSetLocal(activeSet.id, {
                reps_done: e.target.value ? Number(e.target.value) : null,
              })}
            />
            <div className="text-[10px] text-[#9a8c70]">reps</div>
          </div>
        </div>

        {/* Botão concluir série */}
        <button
          onClick={concludeSet}
          disabled={savingSet === activeSet.id}
          className="w-full bg-yellow-400 text-[#0f0d0a] font-semibold py-3 rounded-lg hover:bg-yellow-300 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          {savingSet === activeSet.id ? 'Salvando…' : activeSet.done ? 'Atualizar série' : 'Concluir série'}
        </button>
      </div>

      {/* Rodapé — obs/esforço (placeholder sem back) */}
      <div className="text-center text-xs text-[#9a8c70]">
        Exercício {exIdx + 1} de {state.length}
      </div>
    </div>
  )
}
