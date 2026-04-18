// Formulário do questionário quinzenal — render dinâmico por tipo de pergunta
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Question = {
  id: string
  order_num: number
  question_text: string
  question_type: 'text' | 'number' | 'scale' | 'choice'
  is_numeric_chart: boolean
  options: string[] | null
}

export function QuestionnaireForm({
  patientId,
  scheduleId,
  questions,
}: {
  patientId: string
  scheduleId: string | null
  questions: Question[]
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [values, setValues] = React.useState<Record<string, string>>({})

  function update(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const responses = questions.map((q) => {
      const raw = values[q.id] ?? ''
      const isNumeric = q.question_type === 'number' || q.question_type === 'scale'
      return {
        question_id: q.id,
        response_text: isNumeric ? null : raw || null,
        response_number: isNumeric && raw !== '' ? Number(raw) : null,
      }
    })
    const res = await fetch('/api/questionnaire/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, schedule_id: scheduleId, responses }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Falha ao enviar'); return }
    toast.success('Respostas enviadas! Obrigado.')
    router.push('/portal')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label>{q.order_num}. {q.question_text}</Label>
          {q.question_type === 'text' && (
            <Textarea value={values[q.id] ?? ''} onChange={(e) => update(q.id, e.target.value)} disabled={loading} />
          )}
          {q.question_type === 'number' && (
            <Input type="number" step="0.1" value={values[q.id] ?? ''} onChange={(e) => update(q.id, e.target.value)} disabled={loading} />
          )}
          {q.question_type === 'scale' && (
            <Input type="number" min={1} max={10} value={values[q.id] ?? ''} onChange={(e) => update(q.id, e.target.value)} disabled={loading} />
          )}
          {q.question_type === 'choice' && (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values[q.id] ?? ''}
              onChange={(e) => update(q.id, e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione</option>
              {(q.options ?? ['Sim', 'Parcialmente', 'Não']).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        </div>
      ))}
      <Button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar respostas'}</Button>
    </form>
  )
}
