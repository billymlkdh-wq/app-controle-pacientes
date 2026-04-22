// Formulário para criar um novo contrato de plano.
// Campos: tipo de plano, valor total, data da 1ª parcela, observações.
// Nº de parcelas é derivado do plano (avulso=1, mensal=1, trimestral=3, semestral=6, anual=12).
'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { todayBR } from '@/lib/utils'

type PlanType = 'avulso' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
type PaymentMethod = 'avista' | 'pix_parcelado' | 'credito_parcelado'
const INSTALLMENTS: Record<PlanType, number> = { avulso: 1, mensal: 1, trimestral: 3, semestral: 6, anual: 12 }

export function NewContractForm({ patientId, defaultPlan, defaultValue, onDone }: {
  patientId: string
  defaultPlan?: PlanType
  defaultValue?: number
  onDone?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [plan, setPlan] = React.useState<PlanType>(defaultPlan ?? 'mensal')
  const [value, setValue] = React.useState(defaultValue ? String(defaultValue) : '')
  const [startDate, setStartDate] = React.useState(todayBR())
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('pix_parcelado')
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Forma de pagamento à vista → 1 parcela, ignora contagem do plano
  const count = paymentMethod === 'avista' ? 1 : INSTALLMENTS[plan]
  const per = value ? (Number(value) / count) : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!value || Number(value) <= 0) return toast.error('Informe o valor total')
    setLoading(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          plan_type: plan,
          total_value: Number(value),
          start_date: startDate,
          payment_method: paymentMethod,
          notes: notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success(`Contrato criado · ${count} parcela${count > 1 ? 's' : ''}`)
      setOpen(false); setValue(''); setNotes('')
      onDone?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Novo contrato de plano</Button>

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Novo contrato</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:underline">cancelar</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Plano</Label>
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanType)} className="w-full h-9 rounded-md border px-3 text-sm bg-background">
            <option value="avulso">Avulso (1x)</option>
            <option value="mensal">Mensal (1x)</option>
            <option value="trimestral">Trimestral (3x)</option>
            <option value="semestral">Semestral (6x)</option>
            <option value="anual">Anual (12x)</option>
          </select>
        </div>
        <div>
          <Label>Valor total (R$)</Label>
          <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" required />
        </div>
        <div>
          <Label>Vencimento {paymentMethod === 'avista' ? 'do pagamento' : 'da 1ª parcela'}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <Label>Forma de pagamento</Label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full h-9 rounded-md border px-3 text-sm bg-background">
            <option value="avista">À vista</option>
            <option value="pix_parcelado">Parcelado via PIX</option>
            <option value="credito_parcelado">Parcelado no crédito</option>
          </select>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {count} parcela{count > 1 ? 's' : ''} · {per > 0 ? `R$ ${per.toFixed(2)}${count > 1 ? '/mês' : ''}` : '—'}
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Criar contrato'}</Button>
      </div>
    </form>
  )
}
