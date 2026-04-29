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

// Maps Google Drive file IDs → local public assets (Drive URLs are unreliable)
const DRIVE_IMAGE_MAP: Record<string, string> = {
  '1QJkJF86LxfDl3JhNK8xvK80G5-Fpik7sJQXsVPUMrPsp_Bo': '/bristol-scale.svg',   // Bristol Scale
  '1Jzd0U2DnAmjEu0ztGDeYEVnn5hsqurL3vdkVCbvJ0ciYKSY': '/trajes-foto.svg',     // Trajes para avaliação física
}

function resolveImageUrl(url: string): string {
  const match = url.match(/\/d\/([\w-]+)/)
  if (match) {
    const local = DRIVE_IMAGE_MAP[match[1]]
    if (local) return local
  }
  return url
}

type ScaleOptions = { min: number; max: number; minLabel: string; maxLabel: string }

type Question = {
  id: string
  order_num: number
  question_text: string
  question_type: 'text' | 'number' | 'scale' | 'choice' | 'multiple_choice' | 'section'
  subtitle: string | null
  image_url: string | null
  is_numeric_chart: boolean
  allow_media: boolean
  options: string[] | ScaleOptions | null
}

type ResponseState = {
  text: string
  selected: string[]
  mediaUrls: string[]
  uploading: boolean
}

const MAX_FILES = 5
const MAX_SIZE_BYTES = 26214400 // 25 MB

function initialState(): ResponseState {
  return { text: '', selected: [], mediaUrls: [], uploading: false }
}

function parseScaleOptions(opts: unknown): ScaleOptions {
  if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
    const o = opts as Record<string, unknown>
    return {
      min: Number(o.min ?? 0),
      max: Number(o.max ?? 10),
      minLabel: String(o.minLabel ?? ''),
      maxLabel: String(o.maxLabel ?? ''),
    }
  }
  return { min: 0, max: 10, minLabel: '', maxLabel: '' }
}

// ── Scale button group ────────────────────────────────────────────────────────
function ScaleButtons({
  opts,
  value,
  onChange,
  disabled,
}: {
  opts: ScaleOptions
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const nums = Array.from({ length: opts.max - opts.min + 1 }, (_, i) => opts.min + i)
  const selected = value !== '' ? Number(value) : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(n))}
            className={[
              'w-9 h-9 rounded-md border text-sm font-medium transition-colors',
              selected === n
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-accent border-border',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>
      {(opts.minLabel || opts.maxLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground px-0.5">
          <span>{opts.minLabel}</span>
          <span>{opts.maxLabel}</span>
        </div>
      )}
    </div>
  )
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
    for (const q of questions) {
      if (q.question_type !== 'section') init[q.id] = initialState()
    }
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
      else next = cur.selected[0] === opt ? [] : [opt]
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
    const answerable = questions.filter((q) => q.question_type !== 'section')
    const responses = answerable.map((q) => {
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
    // Full navigation to bust Next.js Router Cache — ensures portal re-fetches fresh schedule data
    window.location.href = '/portal'
  }

  // Track display order num (sections don't count)
  let questionCounter = 0

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {questions.map((q) => {
        // ── Section header ──────────────────────────────────────────────────
        if (q.question_type === 'section') {
          return (
            <div key={q.id} className="pt-4 first:pt-0">
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <h2 className="text-base font-semibold text-primary">{q.question_text}</h2>
              </div>
            </div>
          )
        }

        questionCounter++
        const s = state[q.id] ?? initialState()
        const scaleOpts = q.question_type === 'scale' ? parseScaleOptions(q.options) : null
        const choiceOpts = (q.question_type === 'choice' || q.question_type === 'multiple_choice')
          ? (Array.isArray(q.options) ? (q.options as string[]) : ['Sim', 'Não'])
          : []

        return (
          <div key={q.id} className="rounded-md border p-4 space-y-3">
            {/* Image (above question text) */}
            {q.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageUrl(q.image_url)}
                alt="Imagem ilustrativa"
                className="w-full rounded-md object-contain max-h-72"
                loading="lazy"
              />
            )}

            {/* Question text */}
            <Label className="text-base leading-snug">
              {questionCounter}. {q.question_text}
            </Label>

            {/* Subtitle / description */}
            {q.subtitle && (
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {q.subtitle}
              </p>
            )}

            {/* ── Scale ── */}
            {q.question_type === 'scale' && scaleOpts && (
              <ScaleButtons
                opts={scaleOpts}
                value={s.text}
                onChange={(v) => updateText(q.id, v)}
                disabled={loading}
              />
            )}

            {/* ── Number ── */}
            {q.question_type === 'number' && (
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={s.text}
                onChange={(e) => updateText(q.id, e.target.value)}
                disabled={loading}
                className="max-w-xs"
              />
            )}

            {/* ── Text (long) ── */}
            {q.question_type === 'text' && (
              <Textarea
                placeholder="Sua resposta..."
                value={s.text}
                onChange={(e) => updateText(q.id, e.target.value)}
                disabled={loading}
                rows={3}
              />
            )}

            {/* ── Choice (radio) ── */}
            {q.question_type === 'choice' && (
              <div className="space-y-2">
                {choiceOpts.map((o) => (
                  <label key={o} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={s.selected[0] === o}
                      onChange={() => toggleOption(q.id, o, false)}
                      disabled={loading}
                      className="accent-primary"
                    />
                    {o}
                  </label>
                ))}
              </div>
            )}

            {/* ── Multiple choice (checkbox) ── */}
            {q.question_type === 'multiple_choice' && (
              <div className="space-y-2">
                {choiceOpts.map((o) => (
                  <label key={o} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.selected.includes(o)}
                      onChange={() => toggleOption(q.id, o, true)}
                      disabled={loading}
                      className="accent-primary"
                    />
                    {o}
                  </label>
                ))}
              </div>
            )}

            {/* ── Media upload ── */}
            {q.allow_media && (
              <div className="space-y-2 pt-1">
                <Label className="text-sm text-muted-foreground">
                  Anexar fotos/vídeos (até {MAX_FILES}, 25MB cada)
                </Label>
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
                        <button
                          type="button"
                          className="text-destructive hover:underline shrink-0"
                          onClick={() => removeMedia(q.id, u)}
                        >
                          remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Enviando...' : 'Enviar respostas'}
      </Button>
    </form>
  )
}
