'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const HABIT_TYPES = [
  { type: 'water',   label: 'Água',         defaultGoal: 3,     unit: 'L'      },
  { type: 'steps',   label: 'Passos',        defaultGoal: 10000, unit: 'passos' },
  { type: 'cardio',  label: 'Cardio',        defaultGoal: 30,    unit: 'min'    },
  { type: 'workout', label: 'Treino',        defaultGoal: 1,     unit: 'treino' },
]

interface Patient { id: string; name: string }
interface Goal { id?: string; patient_id: string | null; habit_type: string; daily_goal: number; unit: string; xp_reward: number }

export function AdminHabitGoalsManager({ patients, goals }: { patients: Patient[]; goals: Goal[] }) {
  const [selectedPatient, setSelectedPatient] = React.useState<string>('global')
  const [localGoals, setLocalGoals] = React.useState<Goal[]>(goals)
  const [saving, setSaving] = React.useState(false)

  const effectiveGoals = HABIT_TYPES.map((h) => {
    const patientSpecific = localGoals.find(
      (g) => g.patient_id === selectedPatient && g.habit_type === h.type
    )
    const globalDefault = localGoals.find(
      (g) => (g.patient_id === null || g.patient_id === 'null') && g.habit_type === h.type
    )
    return patientSpecific ?? globalDefault ?? { patient_id: null, habit_type: h.type, daily_goal: h.defaultGoal, unit: h.unit, xp_reward: 5 }
  })

  async function save(habitType: string, daily_goal: number, xp_reward: number, unit: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/habit-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient === 'global' ? null : selectedPatient,
          habit_type: habitType,
          daily_goal,
          unit,
          xp_reward,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalGoals((prev) => {
        const filtered = prev.filter(
          (g) => !(g.habit_type === habitType && (
            selectedPatient === 'global' ? (g.patient_id === null || g.patient_id === 'null') : g.patient_id === selectedPatient
          ))
        )
        return [...filtered, data.goal]
      })
      toast.success('Meta salva!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Metas de hábitos</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Configurar metas para:</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm mt-1"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="global">Padrão global (todos os pacientes)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          {effectiveGoals.map((goal, i) => {
            const h = HABIT_TYPES[i]
            const [goalVal, setGoalVal] = React.useState(String(goal.daily_goal))
            const [xp, setXp] = React.useState(String(goal.xp_reward))
            const [unit, setUnit] = React.useState(goal.unit)
            return (
              <div key={h.type} className="flex items-center gap-2">
                <div className="w-20 text-sm font-medium">{h.label}</div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    value={goalVal}
                    onChange={(e) => setGoalVal(e.target.value)}
                    placeholder="Meta"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Unidade"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    value={xp}
                    onChange={(e) => setXp(e.target.value)}
                    placeholder="XP"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => save(h.type, parseFloat(goalVal), parseInt(xp), unit)}
                  className="h-8"
                >
                  Salvar
                </Button>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Meta · Unidade · XP por atingir</p>
      </CardContent>
    </Card>
  )
}
