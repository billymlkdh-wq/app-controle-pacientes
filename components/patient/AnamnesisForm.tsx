// Formulário da anamnese inicial — perguntas fixas de lib/anamnesis/questions.ts
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ANAMNESIS_SECTIONS,
  isQuestionVisible,
  validateAnamnesis,
  type AnamnesisAnswers,
  type AnamnesisQuestion,
  type AnswerValue,
} from '@/lib/anamnesis/questions'

const DRAFT_KEY = 'anamnesis-draft-v1'

function chipClass(active: boolean) {
  return [
    'px-3 py-2 rounded-md border text-sm font-medium transition-colors text-left',
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-background hover:bg-accent border-border',
  ].join(' ')
}

export function AnamnesisForm() {
  const router = useRouter()
  const [answers, setAnswers] = React.useState<AnamnesisAnswers>({})
  const [missing, setMissing] = React.useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = React.useState(false)

  // Rascunho local: se fechar o app no meio, não perde o que já respondeu
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setAnswers(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(answers)) } catch { /* ignore */ }
  }, [answers])

  function set(id: string, v: AnswerValue | undefined) {
    setAnswers((prev) => {
      const next = { ...prev }
      if (v === undefined) delete next[id]
      else next[id] = v
      return next
    })
    setMissing((prev) => {
      if (!prev.has(id)) return prev
      const n = new Set(prev); n.delete(id); return n
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const miss = validateAnamnesis(answers)
    if (miss.length) {
      setMissing(new Set(miss))
      toast.error(`Faltam ${miss.length} resposta${miss.length > 1 ? 's' : ''}`)
      document.getElementById(`aq-${miss[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        if (Array.isArray(j.missing)) setMissing(new Set(j.missing))
        throw new Error(j.error ?? 'Erro ao enviar')
      }
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      toast.success('Anamnese enviada! Obrigado 💪')
      router.push('/portal')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setSubmitting(false)
    }
  }

  let counter = 0
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {ANAMNESIS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="pt-4 first:pt-0">
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <h2 className="text-base font-semibold text-primary">{section.title}</h2>
            </div>
          </div>
          {section.questions.filter((q) => isQuestionVisible(q, answers)).map((q) => {
            counter++
            return (
              <div
                key={q.id}
                id={`aq-${q.id}`}
                className={`rounded-md border p-4 space-y-3 ${
                  missing.has(q.id) ? 'border-destructive ring-1 ring-destructive/40' : ''
                }`}
              >
                {q.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.image} alt="" className="w-full rounded-md object-contain max-h-72" />
                )}
                <Label className="text-base leading-snug">
                  {counter}. {q.label}
                  {q.optional && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}
                </Label>
                {q.hint && <p className="text-xs text-muted-foreground">{q.hint}</p>}
                <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} disabled={submitting} />
                {missing.has(q.id) && (
                  <p className="text-xs text-destructive font-medium">Responda esta pergunta</p>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Enviar anamnese'}
      </Button>
    </form>
  )
}

function QuestionInput({
  q, value, onChange, disabled,
}: {
  q: AnamnesisQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue | undefined) => void
  disabled: boolean
}) {
  const str = typeof value === 'string' ? value : ''

  switch (q.type) {
    case 'textarea':
      return <Textarea value={str} disabled={disabled} rows={3} onChange={(e) => onChange(e.target.value)} />
    case 'text':
      return <Input value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    case 'time':
      return <Input type="time" value={str} disabled={disabled} className="max-w-[10rem]" onChange={(e) => onChange(e.target.value)} />
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number" inputMode="numeric" min={q.min} max={q.max}
            value={str} disabled={disabled} className="max-w-[8rem]"
            onChange={(e) => onChange(e.target.value)}
          />
          {q.unit && <span className="text-sm text-muted-foreground">{q.unit}</span>}
        </div>
      )
    case 'choice':
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button key={o} type="button" disabled={disabled} className={chipClass(str === o)} onClick={() => onChange(o)}>
              {o}
            </button>
          ))}
        </div>
      )
    case 'multi': {
      const arr = Array.isArray(value) ? value : []
      const toggle = (o: string) => {
        if (o === q.noneOption) return onChange(arr.includes(o) ? [] : [o])
        const base = arr.filter((x) => x !== q.noneOption)
        onChange(base.includes(o) ? base.filter((x) => x !== o) : [...base, o])
      }
      const opts = [...(q.options ?? []), ...(q.noneOption ? [q.noneOption] : [])]
      return (
        <div className="grid grid-cols-2 gap-2">
          {opts.map((o) => (
            <button key={o} type="button" disabled={disabled} className={chipClass(arr.includes(o))} onClick={() => toggle(o)}>
              {arr.includes(o) ? '✓ ' : ''}{o}
            </button>
          ))}
        </div>
      )
    }
    case 'yesno': {
      const v = value && typeof value === 'object' && !Array.isArray(value) ? value : null
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['Sim', 'Não'].map((o) => (
              <button
                key={o} type="button" disabled={disabled} className={chipClass(v?.value === o)}
                onClick={() => onChange(o === 'Sim' ? { value: 'Sim', detail: v?.detail ?? '' } : { value: 'Não' })}
              >
                {o}
              </button>
            ))}
          </div>
          {v?.value === 'Sim' && (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">{q.detailLabel ?? 'Qual?'}</Label>
              <Input
                value={v.detail ?? ''} disabled={disabled}
                onChange={(e) => onChange({ value: 'Sim', detail: e.target.value })}
              />
            </div>
          )}
        </div>
      )
    }
    case 'scale': {
      const min = q.min ?? 1
      const max = q.max ?? 10
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {nums.map((n) => (
              <button
                key={n} type="button" disabled={disabled} onClick={() => onChange(String(n))}
                className={[
                  'w-9 h-9 rounded-md border text-sm font-medium transition-colors',
                  str === String(n)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent border-border',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          {(q.minLabel || q.maxLabel) && (
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>{q.minLabel}</span>
              <span>{q.maxLabel}</span>
            </div>
          )}
        </div>
      )
    }
  }
}
