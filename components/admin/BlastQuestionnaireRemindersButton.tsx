// Botão admin — dispara WhatsApp em massa para pacientes com questionário pendente.
'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type ResultDetail = {
  patient_id: string | null
  name: string | null
  phone: string | null
  status: 'sent' | 'failed' | 'skipped_no_phone' | 'skipped_inactive'
  reason?: string
}

export function BlastQuestionnaireRemindersButton() {
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<{
    total: number
    sent: number
    failed: number
    skipped: number
    details: ResultDetail[]
  } | null>(null)

  async function onClick() {
    if (!confirm('Enviar lembrete via WhatsApp para todos os pacientes com questionário pendente ou atrasado?')) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/blast-questionnaire-reminders', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setResult(json)
      toast.success(`${json.sent} enviadas · ${json.failed} falhas · ${json.skipped} sem WhatsApp`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={onClick} disabled={loading} variant="outline" size="sm">
        {loading ? 'Enviando…' : 'Enviar lembretes WhatsApp'}
      </Button>
      {result && (
        <div className="rounded-md border bg-card p-3 text-xs space-y-2">
          <div className="font-medium">
            Resultado: {result.sent}/{result.total} enviadas · {result.failed} falhas · {result.skipped} sem WhatsApp
          </div>
          {result.details.length > 0 && (
            <ul className="space-y-1 max-h-64 overflow-auto">
              {result.details.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-t pt-1 first:border-t-0 first:pt-0">
                  <span className="truncate">{d.name ?? '-'} · {d.phone ?? 'sem número'}</span>
                  <span className={
                    d.status === 'sent' ? 'text-green-600' :
                    d.status === 'failed' ? 'text-destructive' :
                    'text-muted-foreground'
                  }>
                    {d.status === 'sent' ? '✓ enviada' :
                     d.status === 'failed' ? `✗ ${d.reason ?? 'falhou'}` :
                     'sem WhatsApp'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
