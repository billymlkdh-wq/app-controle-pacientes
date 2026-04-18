// Criar paciente — formulário simples
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewPatientPage() {
  const router = useRouter()
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
    }
    const res = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setLoading(false)
    if (!res.ok) { toast.error('Falha ao criar paciente'); return }
    toast.success('Paciente criado!')
    router.push('/patients')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Novo paciente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label htmlFor="name">Nome *</Label><Input id="name" name="name" required disabled={loading} /></div>
              <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" disabled={loading} /></div>
              <div><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" disabled={loading} /></div>
              <div><Label htmlFor="whatsapp_phone">WhatsApp (E.164)</Label><Input id="whatsapp_phone" name="whatsapp_phone" placeholder="5551999990000" disabled={loading} /></div>
              <div><Label htmlFor="birth_date">Nascimento</Label><Input id="birth_date" name="birth_date" type="date" disabled={loading} /></div>
              <div><Label htmlFor="sex">Sexo</Label>
                <select id="sex" name="sex" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={loading}>
                  <option value="">—</option><option value="M">M</option><option value="F">F</option><option value="outro">Outro</option>
                </select>
              </div>
              <div><Label htmlFor="plan_type">Plano</Label>
                <select id="plan_type" name="plan_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={loading}>
                  <option value="avulso">Avulso</option><option value="mensal">Mensal</option>
                </select>
              </div>
              <div><Label htmlFor="plan_value">Valor do plano (R$)</Label><Input id="plan_value" name="plan_value" type="number" step="0.01" disabled={loading} /></div>
            </div>
            <div><Label htmlFor="objective">Objetivo</Label><Textarea id="objective" name="objective" disabled={loading} /></div>
            <div><Label htmlFor="health_history">Histórico de saúde</Label><Textarea id="health_history" name="health_history" disabled={loading} /></div>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar paciente'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
