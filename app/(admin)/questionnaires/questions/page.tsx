// Gerenciar perguntas do questionário — CRUD completo
'use client'
import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Question = {
  id: string
  order_num: number
  question_text: string
  question_type: 'text' | 'number' | 'scale' | 'choice' | 'multiple_choice'
  options: string[] | null
  is_numeric_chart: boolean
  allow_media: boolean
  active: boolean
}

type Draft = Omit<Question, 'id'> & { id?: string }

const QUESTION_TYPE_LABEL: Record<Question['question_type'], string> = {
  text: 'Texto livre',
  number: 'Número',
  scale: 'Escala 1-10',
  choice: 'Escolha única',
  multiple_choice: 'Múltipla escolha',
}

function emptyDraft(nextOrder: number): Draft {
  return {
    order_num: nextOrder,
    question_text: '',
    question_type: 'text',
    options: null,
    is_numeric_chart: false,
    allow_media: false,
    active: true,
  }
}

export default function QuestionsPage() {
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<Draft | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function reload() {
    setLoading(true)
    const res = await fetch('/api/questionnaire')
    const data = await res.json()
    setQuestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  React.useEffect(() => { reload() }, [])

  const nextOrder = Math.max(0, ...questions.map((q) => q.order_num)) + 1

  function startNew() { setEditing(emptyDraft(nextOrder)) }
  function startEdit(q: Question) { setEditing({ ...q }) }
  function cancel() { setEditing(null) }

  async function save() {
    if (!editing || !editing.question_text.trim()) { toast.error('Texto da pergunta é obrigatório'); return }
    const needsOptions = editing.question_type === 'choice' || editing.question_type === 'multiple_choice'
    if (needsOptions && (!editing.options || editing.options.length < 2)) {
      toast.error('Adicione pelo menos 2 opções'); return
    }
    setSaving(true)
    const payload = {
      order_num: editing.order_num,
      question_text: editing.question_text.trim(),
      question_type: editing.question_type,
      options: needsOptions ? editing.options : null,
      is_numeric_chart: editing.is_numeric_chart,
      allow_media: editing.allow_media,
      active: editing.active,
    }
    const url = editing.id ? `/api/questionnaire/${editing.id}` : '/api/questionnaire'
    const method = editing.id ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (!res.ok) { toast.error('Falha ao salvar'); return }
    toast.success('Pergunta salva')
    setEditing(null)
    await reload()
  }

  async function remove(q: Question) {
    if (!confirm(`Remover "${q.question_text}"? (marcada como inativa, respostas antigas preservadas)`)) return
    const res = await fetch(`/api/questionnaire/${q.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Falha ao remover'); return }
    toast.success('Removida')
    await reload()
  }

  async function move(q: Question, direction: -1 | 1) {
    const sorted = [...questions].sort((a, b) => a.order_num - b.order_num)
    const idx = sorted.findIndex((x) => x.id === q.id)
    const other = sorted[idx + direction]
    if (!other) return
    // swap order_num
    await fetch(`/api/questionnaire/${q.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_num: other.order_num }),
    })
    await fetch(`/api/questionnaire/${other.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_num: q.order_num }),
    })
    await reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Perguntas do questionário</h1>
        {!editing && <Button onClick={startNew}>+ Nova pergunta</Button>}
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Editar pergunta' : 'Nova pergunta'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Texto da pergunta *</Label>
              <Textarea
                value={editing.question_text}
                onChange={(e) => setEditing({ ...editing, question_text: e.target.value })}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.question_type}
                  onChange={(e) => setEditing({ ...editing, question_type: e.target.value as Question['question_type'] })}
                >
                  {Object.entries(QUESTION_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={editing.order_num}
                  onChange={(e) => setEditing({ ...editing, order_num: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.allow_media}
                    onChange={(e) => setEditing({ ...editing, allow_media: e.target.checked })} />
                  Permitir anexar fotos/vídeos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_numeric_chart}
                    onChange={(e) => setEditing({ ...editing, is_numeric_chart: e.target.checked })} />
                  Incluir no gráfico de evolução (numérica)
                </label>
              </div>
            </div>

            {(editing.question_type === 'choice' || editing.question_type === 'multiple_choice') && (
              <div>
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  rows={4}
                  value={(editing.options ?? []).join('\n')}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  onChange={(e) => setEditing({ ...editing, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              <Button variant="outline" onClick={cancel} disabled={saving}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {questions.length === 0 && (
            <Card><CardContent className="py-6 text-sm text-muted-foreground">
              Nenhuma pergunta ainda. Clique em <strong>+ Nova pergunta</strong> para começar.
            </CardContent></Card>
          )}
          {questions.map((q) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-4 text-base">
                  <span className="flex-1"><span className="text-muted-foreground mr-2">#{q.order_num}</span>{q.question_text}</span>
                  <div className="flex gap-1 shrink-0 items-center">
                    <Badge variant="outline">{QUESTION_TYPE_LABEL[q.question_type] ?? q.question_type}</Badge>
                    {q.is_numeric_chart && <Badge variant="default">Gráfico</Badge>}
                    {q.allow_media && <Badge variant="secondary">Anexos</Badge>}
                    {!q.active && <Badge variant="secondary">Inativa</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => move(q, -1)}>↑</Button>
                <Button size="sm" variant="outline" onClick={() => move(q, 1)}>↓</Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(q)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => remove(q)}>Remover</Button>
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="w-full text-xs text-muted-foreground mt-2">
                    Opções: {q.options.join(' · ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
