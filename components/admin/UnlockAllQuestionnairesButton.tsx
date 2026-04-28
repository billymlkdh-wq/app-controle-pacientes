'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function UnlockAllQuestionnairesButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    if (!confirm('Liberar o questionário para todos os pacientes ativos agora?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/unlock-all-questionnaires', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')

      const { unlocked, already_open } = json as { unlocked: number; already_open: number }
      if (unlocked === 0) {
        toast.info(
          already_open > 0
            ? `Todos os ${already_open} paciente(s) ativo(s) já têm questionário em aberto.`
            : 'Nenhum paciente ativo encontrado.'
        )
      } else {
        toast.success(
          `Questionário liberado para ${unlocked} paciente(s).` +
          (already_open > 0 ? ` ${already_open} já tinham acesso.` : '')
        )
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? 'Liberando...' : '🔓 Liberar questionário para todos'}
    </Button>
  )
}
