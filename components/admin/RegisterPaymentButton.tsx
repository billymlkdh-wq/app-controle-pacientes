// Botão/modal para registrar pagamento de uma parcela (payment id).
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { todayBR } from '@/lib/utils'

type Method = 'pix' | 'cartao' | 'dinheiro' | 'transferencia' | 'boleto'

export function RegisterPaymentButton({ paymentId, disabled }: { paymentId: string; disabled?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(todayBR())
  const [method, setMethod] = React.useState<Method>('pix')
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'pago', date, method, notes: notes || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success('Pagamento registrado')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  if (disabled) return <span className="text-xs text-muted-foreground">—</span>
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Registrar pagamento</Button>

  return (
    <div className="rounded-md border p-3 bg-card space-y-2">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Data do pagamento</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Método</Label>
          <select value={method} onChange={(e) => setMethod(e.target.value as Method)} className="w-full h-9 rounded-md border px-3 text-sm bg-background">
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="boleto">Boleto</option>
          </select>
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={loading}>{loading ? 'Salvando…' : 'Confirmar'}</Button>
      </div>
    </div>
  )
}
