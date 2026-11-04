// Modal "Novo plano alimentar" — escolhe nome + método.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewMealPlanButton({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [method, setMethod] = React.useState<'por_alimentos' | 'qualitativo'>('por_alimentos')
  const [saving, setSaving] = React.useState(false)

  async function create() {
    if (!name.trim()) { toast.error('Dê um nome ao plano'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, name: name.trim(), method }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Erro')
      toast.success('Plano criado.')
      router.push(`/patients/${patientId}/meal-plan/${j.plan.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo plano alimentar</Button>
  }
  return (
    <div className="border rounded-md p-4 bg-card space-y-3 w-full max-w-md">
      <div className="space-y-1">
        <Label>Nome do plano</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Cardápio novembro" autoFocus />
      </div>
      <div className="space-y-1">
        <Label>Método</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={method === 'por_alimentos' ? 'default' : 'outline'}
            onClick={() => setMethod('por_alimentos')}>
            Por alimentos
          </Button>
          <Button type="button" variant={method === 'qualitativo' ? 'default' : 'outline'}
            onClick={() => setMethod('qualitativo')}>
            Qualitativo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {method === 'por_alimentos'
            ? 'Monta refeições com alimentos da base TACO/TBCA e calcula macro automaticamente.'
            : 'Texto livre — ideal para cardápios prontos sem cálculo nutricional.'}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button onClick={create} disabled={saving}>{saving ? 'Criando…' : 'Criar e abrir'}</Button>
      </div>
    </div>
  )
}
