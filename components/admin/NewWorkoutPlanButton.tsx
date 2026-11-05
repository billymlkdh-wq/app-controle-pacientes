'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewWorkoutPlanButton({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function create() {
    if (!name.trim()) { toast.error('Dê um nome ao treino'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/workout-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, name: name.trim() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Erro')
      toast.success('Treino criado.')
      router.push(`/patients/${patientId}/workout/${j.plan.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Novo plano de treino</Button>
  return (
    <div className="border rounded-md p-4 bg-card space-y-3 w-full max-w-md">
      <div className="space-y-1">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hipertrofia Novembro" autoFocus />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button onClick={create} disabled={saving}>{saving ? 'Criando…' : 'Criar e abrir'}</Button>
      </div>
    </div>
  )
}
