// Formulário para editar dados cadastrais do paciente (admin).
// PATCH /api/patients/[id] — espelha campos de NewPatientPage.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Patient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp_phone: string | null
  birth_date: string | null
  sex: string | null
  objective: string | null
  health_history: string | null
  plan_type: string | null
  plan_value: number | string | null
  questionnaire_start_date: string | null
  active: boolean
}

export function EditPatientForm({ patient }: { patient: Patient }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      name: form.get('name'),
      email: form.get('email') || null,
      phone: form.get('phone') || null,
      whatsapp_phone: form.get('whatsapp_phone') || null,
      birth_date: form.get('birth_date') || null,
      sex: form.get('sex') || null,
      objective: form.get('objective') || null,
      health_history: form.get('health_history') || null,
      plan_type: form.get('plan_type') || 'avulso',
      plan_value: form.get('plan_value') ? Number(form.get('plan_value')) : null,
      questionnaire_start_date: form.get('questionnaire_start_date') || null,
      active: form.get('active') === 'on',
    }
    const res = await fetch(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Falha ao salvar')
      return
    }
    toast.success('Dados atualizados')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar dados cadastrais
      </Button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border p-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Editar dados cadastrais</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:underline">
          cancelar
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" required defaultValue={patient.name} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={patient.email ?? ''} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={patient.phone ?? ''} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="whatsapp_phone">WhatsApp (E.164)</Label>
          <Input id="whatsapp_phone" name="whatsapp_phone" placeholder="5551999990000" defaultValue={patient.whatsapp_phone ?? ''} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="birth_date">Nascimento</Label>
          <Input id="birth_date" name="birth_date" type="date" defaultValue={patient.birth_date ?? ''} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="sex">Sexo</Label>
          <select
            id="sex"
            name="sex"
            defaultValue={patient.sex ?? ''}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={loading}
          >
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <Label htmlFor="plan_type">Plano</Label>
          <select
            id="plan_type"
            name="plan_type"
            defaultValue={patient.plan_type ?? 'avulso'}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={loading}
          >
            <option value="avulso">Avulso</option>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <div>
          <Label htmlFor="plan_value">Valor do plano (R$)</Label>
          <Input
            id="plan_value"
            name="plan_value"
            type="number"
            step="0.01"
            defaultValue={patient.plan_value != null ? String(patient.plan_value) : ''}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="questionnaire_start_date">Início do ciclo de questionários</Label>
          <Input
            id="questionnaire_start_date"
            name="questionnaire_start_date"
            type="date"
            defaultValue={patient.questionnaire_start_date ?? ''}
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={patient.active}
            disabled={loading}
            className="h-4 w-4"
          />
          <Label htmlFor="active" className="cursor-pointer">Paciente ativo</Label>
        </div>
      </div>
      <div>
        <Label htmlFor="objective">Objetivo</Label>
        <Textarea id="objective" name="objective" defaultValue={patient.objective ?? ''} disabled={loading} />
      </div>
      <div>
        <Label htmlFor="health_history">Histórico de saúde</Label>
        <Textarea id="health_history" name="health_history" defaultValue={patient.health_history ?? ''} disabled={loading} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
