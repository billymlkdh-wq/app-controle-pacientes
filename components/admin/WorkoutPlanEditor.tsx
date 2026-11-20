// Editor de plano de treino: dias → exercícios → séries.
// Save em bulk snapshot (drop+reinsert).
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ExerciseVideoButton } from '@/components/patient/ExerciseVideoButton'
import { youtubeId, youtubeThumb } from '@/lib/youtube'

type SetType = 'aquecimento' | 'preparatoria' | 'valida'

const SET_LABEL: Record<SetType, string> = {
  aquecimento: 'Aquecimento',
  preparatoria: 'Preparatória',
  valida: 'Válida',
}
const SET_COLOR: Record<SetType, string> = {
  aquecimento: 'bg-blue-900/40 text-blue-300 border-blue-800',
  preparatoria: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  valida: 'bg-green-900/40 text-green-300 border-green-800',
}

export type SetRow = {
  id?: string
  set_type: SetType
  reps: string
  target_load_kg: number | null
  order_num: number
}

export type ExerciseRow = {
  id?: string
  name: string
  notes: string | null
  rest_seconds: number | null
  video_url: string | null
  order_num: number
  sets: SetRow[]
}

export type DayRow = {
  id?: string
  name: string
  notes: string | null
  order_num: number
  exercises: ExerciseRow[]
}

export type Plan = {
  id: string
  patient_id: string
  name: string
  notes: string | null
  active: boolean
}

function emptySet(order: number): SetRow {
  return { set_type: 'valida', reps: '10', target_load_kg: null, order_num: order }
}
function emptyExercise(order: number): ExerciseRow {
  return { name: '', notes: null, rest_seconds: 60, video_url: null, order_num: order, sets: [emptySet(0)] }
}
function emptyDay(order: number): DayRow {
  return { name: `Treino ${String.fromCharCode(65 + order)}`, notes: null, order_num: order, exercises: [] }
}

export function WorkoutPlanEditor({
  initialPlan, initialDays,
}: {
  initialPlan: Plan
  initialDays: DayRow[]
}) {
  const router = useRouter()
  const [plan, setPlan] = React.useState<Plan>(initialPlan)
  const [days, setDays] = React.useState<DayRow[]>(initialDays)
  const [saving, setSaving] = React.useState(false)

  function updateDay(di: number, patch: Partial<DayRow>) {
    setDays((ds) => ds.map((d, i) => i === di ? { ...d, ...patch } : d))
  }
  function addDay() {
    setDays((ds) => [...ds, emptyDay(ds.length)])
  }
  function removeDay(di: number) {
    if (!confirm('Remover esse dia inteiro?')) return
    setDays((ds) => ds.filter((_, i) => i !== di).map((d, i) => ({ ...d, order_num: i })))
  }
  function addExercise(di: number) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d, exercises: [...d.exercises, emptyExercise(d.exercises.length)],
    }))
  }
  function updateExercise(di: number, ei: number, patch: Partial<ExerciseRow>) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d,
      exercises: d.exercises.map((e, j) => j === ei ? { ...e, ...patch } : e),
    }))
  }
  function removeExercise(di: number, ei: number) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d,
      exercises: d.exercises.filter((_, j) => j !== ei).map((e, j) => ({ ...e, order_num: j })),
    }))
  }
  function addSet(di: number, ei: number) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d,
      exercises: d.exercises.map((e, j) => j !== ei ? e : {
        ...e, sets: [...e.sets, emptySet(e.sets.length)],
      }),
    }))
  }
  function updateSet(di: number, ei: number, si: number, patch: Partial<SetRow>) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d,
      exercises: d.exercises.map((e, j) => j !== ei ? e : {
        ...e,
        sets: e.sets.map((s, k) => k === si ? { ...s, ...patch } : s),
      }),
    }))
  }
  function removeSet(di: number, ei: number, si: number) {
    setDays((ds) => ds.map((d, i) => i !== di ? d : {
      ...d,
      exercises: d.exercises.map((e, j) => j !== ei ? e : {
        ...e,
        sets: e.sets.filter((_, k) => k !== si).map((s, k) => ({ ...s, order_num: k })),
      }),
    }))
  }

  async function save() {
    // Valida: cada exercício precisa nome
    for (const d of days) for (const e of d.exercises) {
      if (!e.name.trim()) { toast.error('Exercício sem nome'); return }
      if (e.video_url && !youtubeId(e.video_url)) {
        toast.error(`Link de vídeo inválido em "${e.name}". Use um link do YouTube.`); return
      }
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/workout-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: { name: plan.name, notes: plan.notes, active: plan.active },
          days,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Erro')
      toast.success('Treino salvo.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header plano */}
      <Card>
        <CardHeader><CardTitle className="text-base">Plano de treino</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome do plano</Label>
            <Input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex gap-2 items-center h-10">
              <Badge variant={plan.active ? 'success' : 'secondary'}>
                {plan.active ? 'Ativo' : 'Arquivado'}
              </Badge>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setPlan({ ...plan, active: !plan.active })}>
                {plan.active ? 'Arquivar' : 'Ativar'}
              </Button>
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={plan.notes ?? ''}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value || null })} />
          </div>
        </CardContent>
      </Card>

      {/* Dias */}
      {days.map((day, di) => (
        <Card key={di}>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Input className="w-40" value={day.name}
                onChange={(e) => updateDay(di, { name: e.target.value })} />
              <span className="text-xs text-muted-foreground">{day.exercises.length} exercícios</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => removeDay(di)}>
                Remover dia
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.exercises.map((ex, ei) => (
              <div key={ei} className="border rounded-md p-3 space-y-2 bg-muted/20">
                <div className="flex gap-2 items-start flex-wrap">
                  <Input className="flex-1 min-w-[220px] font-medium"
                    placeholder="Nome do exercício (ex: Supino reto com barra)"
                    value={ex.name}
                    onChange={(e) => updateExercise(di, ei, { name: e.target.value })} />
                  <Input className="w-28" type="number" placeholder="descanso s"
                    value={ex.rest_seconds ?? ''}
                    onChange={(e) => updateExercise(di, ei, {
                      rest_seconds: e.target.value ? Number(e.target.value) : null,
                    })} />
                  <Button variant="outline" size="sm" onClick={() => removeExercise(di, ei)}>×</Button>
                </div>
                <Input placeholder="Observações do exercício (opcional)"
                  value={ex.notes ?? ''}
                  onChange={(e) => updateExercise(di, ei, { notes: e.target.value || null })} />
                <VideoField
                  value={ex.video_url}
                  title={ex.name || 'Exercício'}
                  onChange={(v) => updateExercise(di, ei, { video_url: v })} />

                {/* Séries */}
                <div className="space-y-1">
                  {ex.sets.map((s, si) => (
                    <div key={si} className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-muted-foreground w-6">#{si + 1}</span>
                      <select
                        className={`h-9 rounded-md border bg-background px-2 text-xs w-36 ${SET_COLOR[s.set_type]}`}
                        value={s.set_type}
                        onChange={(e) => updateSet(di, ei, si, { set_type: e.target.value as SetType })}
                      >
                        <option value="aquecimento">Aquecimento</option>
                        <option value="preparatoria">Preparatória</option>
                        <option value="valida">Válida</option>
                      </select>
                      <Input className="w-24 h-9" placeholder="reps (10, 8-12)"
                        value={s.reps}
                        onChange={(e) => updateSet(di, ei, si, { reps: e.target.value })} />
                      <Input className="w-24 h-9" type="number" placeholder="carga kg"
                        value={s.target_load_kg ?? ''}
                        onChange={(e) => updateSet(di, ei, si, {
                          target_load_kg: e.target.value ? Number(e.target.value) : null,
                        })} />
                      <Button variant="outline" size="sm" onClick={() => removeSet(di, ei, si)}>×</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addSet(di, ei)}>
                    + série
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => addExercise(di)} className="w-full">
              + Adicionar exercício
            </Button>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addDay} className="w-full">
        + Novo dia de treino
      </Button>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-background border-t py-3 -mx-6 px-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar treino'}
        </Button>
      </div>
    </div>
  )
}

// Campo do link do YouTube com miniatura e pré-visualização.
function VideoField({
  value, title, onChange,
}: {
  value: string | null
  title: string
  onChange: (v: string | null) => void
}) {
  const valid = !!youtubeId(value)
  const thumb = youtubeThumb(value)
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <Input
        className={`flex-1 min-w-[220px] ${value && !valid ? 'border-red-500' : ''}`}
        placeholder="Link do vídeo no YouTube (opcional) · ex: https://youtu.be/…"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.trim() || null)} />
      {value && !valid && <span className="text-xs text-red-400">Link do YouTube inválido</span>}
      {valid && thumb && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="h-9 w-16 rounded object-cover border" />
          <ExerciseVideoButton url={value} title={title} />
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>Remover vídeo</Button>
        </>
      )}
    </div>
  )
}
