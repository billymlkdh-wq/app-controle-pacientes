'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function UnlockAllQuestionnairesButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    if (!confirm('Liberar o questionário para todos os pacientes ativos e enviar notificações agora?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/unlock-all-questionnaires', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')

      const { notified } = json as { unlocked: number; already_open: number; notified: number }
      toast.success(`Questionário liberado e notificações enviadas para ${notified} paciente(s).`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? 'Enviando...' : '🔓 Liberar questionário para todos'}
    </Button>
  )
}
