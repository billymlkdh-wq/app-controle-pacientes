// Formulário do questionário — render dinâmico por tipo + upload de mídia
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

type Question = {
  id: string
  order_num: number
  question_text: string
  question_type: 'text' | 'number' | 'scale' | 'choice' | 'multiple_choice'
  is_numeric_chart: boolean
  allow_media: boolean
  options: string[] | null
}

type ResponseState = {
  text: string
  selected: string[] // para multiple_choice
  mediaUrls: string[]
  uploading: boolean
}

const MAX_FILES = 5
const MAX_SIZE_BYTES = 26214400 // 25MB

function initialState(): ResponseState {
  return { text: '', selected: [], mediaUrls: [], uploading: false }
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
  const supabase = React.useMemo(() => createClient(), [])
  const [loading, setLoading] = React.useState(false)
  const [state, setState] = React.useState<Record<string, ResponseState>>(() => {
    const init: Record<string, ResponseState> = {}
    for (const q of questions) init[q.id] = initialState()
    return init
  })

  function updateText(qid: string, v: string) {
    setState((prev) => ({ ...prev, [qid]: { ...prev[qid], text: v } }))
  }
  function toggleOption(qid: string, opt: string, multi: boolean) {
    setState((prev) => {
      const cur = prev[qid]
      let next: string[]
      if (multi) next = cur.selected.includes(opt) ? cur.selected.filter((x) => x !== opt) : [...cur.selected, opt]
      else next = [opt]
      return { ...prev, [qid]: { ...cur, selected: next } }
    })
  }

  async function handleFiles(qid: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const cur = state[qid]
    const incoming = Array.from(fileList)
    if (cur.mediaUrls.length + incoming.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos por pergunta`); return
    }
    for (const f of incoming) {
      if (f.size > MAX_SIZE_BYTES) { toast.error(`${f.name}: excede 25MB`); return }
    }
    setState((prev) => ({ ...prev, [qid]: { ...prev[qid], uploading: true } }))
    const uploadedUrls: string[] = []
    try {
      for (const f of incoming) {
        const ext = f.name.split('.').pop() || 'bin'
        const path = `${patientId}/${qid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('questionnaire-media')
          .upload(path, f, { contentType: f.type, upsert: false })
        if (upErr) throw upErr
        uploadedUrls.push(path)
      }
      setState((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], mediaUrls: [...prev[qid].mediaUrls, ...uploadedUrls], uploading: false },
      }))
      toast.success(`${uploadedUrls.length} arquivo(s) enviado(s)`)
    } catch (err) {
      console.error(err)
      toast.error('Falha no upload')
      setState((prev) => ({ ...prev, [qid]: { ...prev[qid], uploading: false } }))
    }
  }

  function removeMedia(qid: string, url: string) {
    setState((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], mediaUrls: prev[qid].mediaUrls.filter((u) => u !== url) },
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const responses = questions.map((q) => {
      const s = state[q.id]
      const isNumeric = q.question_type === 'number' || q.question_type === 'scale'
      if (q.question_type === 'multiple_choice') {
        return {
          question_id: q.id,
          response_text: s.selected.join(', ') || null,
          response_number: null,
          response_options: s.selected.length > 0 ? s.selected : null,
          media_urls: s.mediaUrls,
        }
      }
      if (q.question_type === 'choice') {
        return {
          question_id: q.id,
          response_text: s.selected[0] ?? null,
          response_number: null,
          response_options: s.selected.length > 0 ? s.selected : null,
          media_urls: s.mediaUrls,
        }
      }
      return {
        question_id: q.id,
        response_text: isNumeric ? null : s.text || null,
        response_number: isNumeric && s.text !== '' ? Number(s.text) : null,
        response_options: null,
        media_urls: s.mediaUrls,
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
      {questions.map((q) => {
        const s = state[q.id] ?? initialState()
        return (
          <div key={q.id} className="space-y-2 rounded-md border p-4">
            <Label className="text-base">{q.order_num}. {q.question_text}</Label>

            {q.question_type === 'text' && (
              <Textarea value={s.text} onChange={(e) => updateText(q.id, e.target.value)} disabled={loading} />
            )}
            {q.question_type === 'number' && (
              <Input type="number" step="0.1" value={s.text} onChange={(e) => updateText(q.id, e.target.value)} disabled={loading} />
            )}
            {q.question_type === 'scale' && (
              <Input type="number" min={1} max={10} value={s.text} onChange={(e) => updateText(q.id, e.target.value)} disabled={loading} />
            )}
            {q.question_type === 'choice' && (
              <div className="space-y-1">
                {(q.options ?? ['Sim', 'Parcialmente', 'Não']).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={`q-${q.id}`} checked={s.selected[0] === o}
                      onChange={() => toggleOption(q.id, o, false)} disabled={loading} />
                    {o}
                  </label>
                ))}
              </div>
            )}
            {q.question_type === 'multiple_choice' && (
              <div className="space-y-1">
                {(q.options ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.selected.includes(o)}
                      onChange={() => toggleOption(q.id, o, true)} disabled={loading} />
                    {o}
                  </label>
                ))}
                {(!q.options || q.options.length === 0) && (
                  <p className="text-xs text-muted-foreground">Sem opções configuradas.</p>
                )}
              </div>
            )}

            {q.allow_media && (
              <div className="mt-3 space-y-2">
                <Label className="text-sm">Anexar fotos/vídeos (até {MAX_FILES}, 25MB cada)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={loading || s.uploading || s.mediaUrls.length >= MAX_FILES}
                  onChange={(e) => { handleFiles(q.id, e.target.files); e.target.value = '' }}
                />
                {s.uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
                {s.mediaUrls.length > 0 && (
                  <ul className="text-xs space-y-1">
                    {s.mediaUrls.map((u) => (
                      <li key={u} className="flex items-center justify-between gap-2">
                        <span className="truncate">{u.split('/').pop()}</span>
                        <button type="button" className="text-red-600 hover:underline"
                          onClick={() => removeMedia(q.id, u)}>remover</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
      <Button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar respostas'}</Button>
    </form>
  )
}
