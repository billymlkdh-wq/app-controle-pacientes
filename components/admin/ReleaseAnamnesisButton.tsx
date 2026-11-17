// Botão do admin: libera a anamnese pro paciente, cancela a liberação ou libera pra refazer.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Status = 'none' | 'released' | 'completed'

export function ReleaseAnamnesisButton({ patientId, status }: { patientId: string; status: Status }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const url = `/api/patients/${patientId}/release-anamnesis`

  async function call(method: 'POST' | 'DELETE') {
    const res = await fetch(url, { method })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? 'Erro')
    return json
  }

  async function onClick() {
    if (status === 'released' && !confirm('Cancelar a liberação da anamnese? O paciente deixa de ver o questionário.')) return
    if (status === 'completed' && !confirm('Liberar a anamnese de novo? As respostas atuais serão apagadas.')) return
    setLoading(true)
    try {
      if (status === 'none') {
        const j = await call('POST')
        if (j.already) toast.info('A anamnese já estava liberada pra esse paciente.')
        else toast.success(j.whatsapp?.ok ? 'Anamnese liberada e paciente avisado no WhatsApp.' : 'Anamnese liberada.')
      } else if (status === 'released') {
        await call('DELETE')
        toast.success('Liberação cancelada.')
      } else {
        await call('DELETE')
        await call('POST')
        toast.success('Anamnese liberada de novo.')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const label = status === 'none' ? 'Liberar anamnese' : status === 'released' ? 'Cancelar anamnese' : 'Refazer anamnese'
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
      {loading ? '…' : label}
    </Button>
  )
}
