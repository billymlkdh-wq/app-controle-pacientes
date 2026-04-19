// Botão de reenvio de convite Supabase para o paciente
'use client'
import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ResendInviteButton({ patientId, disabled }: { patientId: string; disabled?: boolean }) {
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    if (!confirm('Reenviar o email de convite para este paciente?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/invite`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao reenviar convite')
      } else {
        const label = data.mode === 'recovery' ? 'Link de redefinição enviado' : 'Convite enviado'
        toast.success(`${label} para ${data.email}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={disabled || loading}>
      {loading ? 'Enviando...' : 'Reenviar convite'}
    </Button>
  )
}
