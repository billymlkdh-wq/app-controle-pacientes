// Botão "Liberar questionário agora" — cria um schedule pending com due_date=hoje.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function UnlockQuestionnaireButton({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/unlock-questionnaire`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      if (json.already_open) {
        toast.info('Já existe um questionário em aberto pra esse paciente.')
      } else {
        toast.success('Questionário liberado. O paciente já pode responder.')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
      {loading ? '…' : 'Liberar questionário agora'}
    </Button>
  )
}
