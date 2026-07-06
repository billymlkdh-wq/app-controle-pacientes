'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Goal {
  id: string
  patient_id: string
  title: string
  description: string | null
  target_value: number | null
  current_value: number | null
  unit: string | null
  goal_type: string
  deadline: string | null
  status: string
  patients?: { name: string }
}

interface Patient { id: string; name: string }

interface Props {
  patients: Patient[]
  goals: Goal[]
}

export function AdminGoalManager({ patients, goals: initialGoals }: Props) {
  const [goals, setGoals] = useState(initialGoals)
  const [showForm, setShowForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', target_value: '', current_value: '0',
    unit: '', deadline: '', goal_type: 'numeric',
  })
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function createGoal() {
    if (!selectedPatient || !form.title) return
    setSaving(true)
    const res = await fetch('/api/admin/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: selectedPatient,
        title: form.title,
        description: form.description || null,
        target_value: form.target_value ? Number(form.target_value) : null,
        current_value: Number(form.current_value) || 0,
        unit: form.unit || null,
        goal_type: form.goal_type,
        deadline: form.deadline || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const newGoal = await res.json()
      const patient = patients.find((p) => p.id === selectedPatient)
      setGoals((prev) => [{ ...newGoal, patients: { name: patient?.name ?? '' } }, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', target_value: '', current_value: '0', unit: '', deadline: '', goal_type: 'numeric' })
    }
  }

  async function updateProgress(id: string, currentValue: number) {
    setUpdatingId(id)
    await fetch('/api/admin/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, current_value: currentValue }),
    })
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, current_value: currentValue } : g))
    setUpdatingId(null)
  }

  async function markComplete(id: string, patientId: string) {
    setUpdatingId(id)
    await fetch('/api/admin/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'completed' }),
    })
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, status: 'completed' } : g))
    setUpdatingId(null)
  }

  async function deleteGoal(id: string) {
    if (!confirm('Remover esta meta?')) return
    await fetch('/api/admin/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nova meta'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Criar meta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Paciente</Label>
              <select
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">Selecionar...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Título</Label>
              <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Perder 5kg" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Meta</Label>
                <Input className="mt-1" type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} placeholder="100" />
              </div>
              <div>
                <Label>Atual</Label>
                <Input className="mt-1" type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input className="mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, km..." />
              </div>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input className="mt-1" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <Button onClick={createGoal} disabled={saving || !selectedPatient || !form.title}>
              {saving ? 'Salvando…' : 'Criar meta'}
            </Button>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Em andamento</h2>
          {active.map((g) => {
            const pct = g.target_value && g.target_value > 0
              ? Math.min(100, Math.round(((g.current_value ?? 0) / g.target_value) * 100))
              : null
            return (
              <Card key={g.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{g.patients?.name} — {g.title}</div>
                      {g.description && <div className="text-xs text-muted-foreground">{g.description}</div>}
                      {g.deadline && <div className="text-xs text-muted-foreground">Prazo: {new Date(g.deadline).toLocaleDateString('pt-BR')}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => markComplete(g.id, g.patient_id)} disabled={updatingId === g.id}>
                        ✓ Concluir
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => deleteGoal(g.id)}>
                        ×
                      </Button>
                    </div>
                  </div>
                  {pct !== null && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-7 w-24 text-xs"
                          defaultValue={g.current_value ?? 0}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (v !== g.current_value) updateProgress(g.id, v)
                          }}
                        />
                        <span className="text-xs text-muted-foreground">/ {g.target_value} {g.unit}</span>
                        <span className="text-xs font-medium ml-auto">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Concluídas</h2>
          {completed.map((g) => (
            <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm">
              <span>✅</span>
              <span className="text-muted-foreground">{g.patients?.name}</span>
              <span className="flex-1">{g.title}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => deleteGoal(g.id)}>×</Button>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma meta cadastrada. Clique em "Nova meta" para começar.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
