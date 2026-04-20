// Botão "Renovar": cria novo contrato começando no dia seguinte ao fim deste.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function RenewContractButton({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    if (!confirm('Renovar este contrato? Um novo contrato será criado começando no dia seguinte ao fim deste, e este será marcado como encerrado.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/renew`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success('Contrato renovado')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>{loading ? '…' : 'Renovar'}</Button>
}
