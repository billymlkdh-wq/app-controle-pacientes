'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface HabitGoal {
  habit_type: string
  daily_goal: number
  unit: string
}

interface HabitLog {
  habit_type: string
  value: number
  logged_date: string
}

interface Props {
  todayLogs: HabitLog[]
  goals: HabitGoal[]
}

const HABITS = [
  { type: 'water',   label: 'Água',         emoji: '💧', unit: 'L',      defaultGoal: 3,     step: 0.25, inputType: 'number' as const },
  { type: 'steps',   label: 'Passos',        emoji: '👟', unit: 'passos', defaultGoal: 10000, step: 500,  inputType: 'number' as const },
  { type: 'cardio',  label: 'Cardio extra',  emoji: '🏃', unit: 'min',    defaultGoal: 30,    step: 5,    inputType: 'number' as const },
  { type: 'workout', label: 'Treino feito',  emoji: '💪', unit: '',       defaultGoal: 1,     step: 1,    inputType: 'number' as const },
]

export function HabitTracker({ todayLogs, goals }: Props) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [autoPost, setAutoPost] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading] = React.useState<Record<string, boolean>>({})
  const [logs, setLogs] = React.useState<HabitLog[]>(todayLogs)

  function getGoal(type: string) {
    return goals.find((g) => g.habit_type === type)
  }
  function getLog(type: string) {
    return logs.filter((l) => l.habit_type === type).reduce((s, l) => s + l.value, 0)
  }

  async function submit(type: string, value: number) {
    setLoading((p) => ({ ...p, [type]: true }))
    try {
      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_type: type, value, auto_post: autoPost[type] ?? false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogs((prev) => [...prev, { habit_type: type, value, logged_date: new Date().toISOString().split('T')[0] }])
      setValues((p) => ({ ...p, [type]: '' }))
      if (data.xp > 0) toast.success(`+${data.xp} XP${data.goalReached ? ' 🎯 Meta atingida!' : ''}`)
      else toast.success('Registrado!')
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao registrar')
    } finally {
      setLoading((p) => ({ ...p, [type]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {HABITS.map((h) => {
        const goal = getGoal(h.type)
        const goalVal = goal?.daily_goal ?? h.defaultGoal
        const unit = goal?.unit ?? h.unit
        const logged = getLog(h.type)
        const pct = goalVal > 0 ? Math.min(100, Math.round((logged / goalVal) * 100)) : 0
        const done = pct >= 100

        return (
          <Card key={h.type} className={done ? 'border-green-500/50 bg-green-500/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{h.emoji} {h.label}</span>
                <span className={`text-xs font-normal ${done ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {done ? '✓ Meta atingida!' : `${logged}${unit ? ' ' + unit : ''} / ${goalVal}${unit ? ' ' + unit : ''}`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {goalVal > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {h.type !== 'workout' ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Registrar ${unit}`}
                    value={values[h.type] ?? ''}
                    onChange={(e) => setValues((p) => ({ ...p, [h.type]: e.target.value }))}
                    step={h.step}
                    min={0}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!values[h.type] || loading[h.type]}
                    onClick={() => submit(h.type, parseFloat(values[h.type]))}
                  >
                    {loading[h.type] ? '...' : 'Registrar'}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  variant={done ? 'outline' : 'default'}
                  disabled={loading[h.type]}
                  onClick={() => submit(h.type, 1)}
                >
                  {loading[h.type] ? '...' : done ? '✓ Treino confirmado' : 'Confirmar treino feito'}
                </Button>
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPost[h.type] ?? false}
                  onChange={(e) => setAutoPost((p) => ({ ...p, [h.type]: e.target.checked }))}
                  className="rounded"
                />
                Compartilhar no feed da comunidade
              </label>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
