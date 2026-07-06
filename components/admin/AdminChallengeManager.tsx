'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Challenge {
  id: string
  title: string
  description: string | null
  challenge_type: string
  target_value: number | null
  unit: string | null
  start_date: string
  end_date: string
  xp_reward: number
  prize: string | null
  is_active: boolean
  patient_challenge_participants?: { count: number }[]
}

const TYPES = [
  { value: 'steps',   label: 'Passos 👟' },
  { value: 'water',   label: 'Água 💧' },
  { value: 'workout', label: 'Treinos 💪' },
  { value: 'custom',  label: 'Personalizado' },
]

const DEFAULT_UNITS: Record<string, string> = { steps: 'passos', water: 'L', workout: 'treinos', custom: '' }

export function AdminChallengeManager({ initialChallenges }: { initialChallenges: Challenge[] }) {
  const [challenges, setChallenges] = React.useState(initialChallenges)
  const [showForm, setShowForm] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '', description: '', challenge_type: 'steps',
    target_value: '', unit: 'passos', start_date: '', end_date: '',
    xp_reward: '100', prize: '', is_active: true,
  })

  function setField(k: string, v: any) {
    setForm((p) => {
      const next = { ...p, [k]: v }
      if (k === 'challenge_type') next.unit = DEFAULT_UNITS[v] ?? ''
      return next
    })
  }

  async function create() {
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error('Preencha título, datas de início e fim')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          challenge_type: form.challenge_type,
          target_value: form.target_value ? parseFloat(form.target_value) : null,
          unit: form.unit || null,
          start_date: form.start_date,
          end_date: form.end_date,
          xp_reward: parseInt(form.xp_reward) || 100,
          prize: form.prize || null,
          is_active: form.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChallenges((p) => [data.challenge, ...p])
      setShowForm(false)
      setForm({ title: '', description: '', challenge_type: 'steps', target_value: '', unit: 'passos', start_date: '', end_date: '', xp_reward: '100', prize: '', is_active: true })
      toast.success('Desafio criado!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setChallenges((p) => p.map((c) => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function remove(id: string) {
    if (!confirm('Excluir este desafio?')) return
    await fetch('/api/admin/challenges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setChallenges((p) => p.filter((c) => c.id !== id))
    toast.success('Desafio excluído')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Desafios</h2>
        <Button size="sm" onClick={() => setShowForm((p) => !p)}>
          {showForm ? 'Cancelar' : '+ Novo desafio'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Novo desafio</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Ex: Desafio de Passos de Julho" />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Detalhes do desafio..." />
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={form.challenge_type} onChange={(e) => setField('challenge_type', e.target.value)}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Meta ({form.unit || 'unidade'})</Label>
                <Input type="number" value={form.target_value} onChange={(e) => setField('target_value', e.target.value)} placeholder="Ex: 50000" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="passos, L, treinos..." />
              </div>
              <div>
                <Label>XP de recompensa</Label>
                <Input type="number" value={form.xp_reward} onChange={(e) => setField('xp_reward', e.target.value)} />
              </div>
              <div>
                <Label>Início *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
              </div>
              <div>
                <Label>Fim *</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Prêmio (opcional)</Label>
                <Input value={form.prize} onChange={(e) => setField('prize', e.target.value)} placeholder="Ex: 500g de Creatina" />
              </div>
            </div>
            <Button onClick={create} disabled={saving} className="w-full">
              {saving ? 'Criando...' : 'Criar desafio'}
            </Button>
          </CardContent>
        </Card>
      )}

      {challenges.length === 0 && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Nenhum desafio criado ainda.</CardContent></Card>
      )}

      {challenges.map((c) => {
        const count = c.patient_challenge_participants?.[0]?.count ?? 0
        const isActive = c.is_active && c.start_date <= today && c.end_date >= today
        return (
          <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
            <CardContent className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.title}</span>
                  {isActive && <Badge className="text-xs">Ativo</Badge>}
                  {!c.is_active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                  <Badge variant="secondary" className="text-xs">+{c.xp_reward} XP</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.start_date} → {c.end_date} · {count} participantes
                  {c.target_value && ` · Meta: ${c.target_value} ${c.unit}`}
                  {c.prize && ` · 🏆 ${c.prize}`}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => toggleActive(c.id, c.is_active)}>
                  {c.is_active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>Excluir</Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
