// Respostas do paciente — visualização individual estilo Google Forms.
// Sidebar lista todas as submissões (ciclos). Seleção via ?s=<groupKey>.
// Cada submissão mostra todas as perguntas+respostas daquela data.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/utils'

type ResponseRow = {
  id: string
  created_at: string
  schedule_id: string | null
  response_text: string | null
  response_number: number | string | null
  response_options: string[] | null
  media_urls: string[] | null
  question: {
    id: string
    question_text: string
    question_type: string
    order_num: number
    is_numeric_chart: boolean
  } | null
}

function groupKeyOf(r: ResponseRow): string {
  return r.schedule_id ?? r.created_at.slice(0, 10)
}

function formatAnswer(r: ResponseRow): string {
  if (r.response_text && r.response_text.length > 0) return r.response_text
  if (r.response_number != null) return String(r.response_number)
  if (r.response_options && r.response_options.length) return r.response_options.join(', ')
  return '—'
}

export default async function PatientResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>
  searchParams: Promise<{ s?: string }>
}) {
  const { patientId } = await params
  const { s: selected } = await searchParams
  const supabase = await createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, active, email')
    .eq('id', patientId)
    .single()
  if (!patient) notFound()

  const { data: responsesData } = await supabase
    .from('questionnaire_responses')
    .select(`
      id, created_at, schedule_id, response_text, response_number, response_options, media_urls,
      question:questionnaire_questions(id, question_text, question_type, order_num, is_numeric_chart)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  const responses = (responsesData ?? []) as unknown as ResponseRow[]

  // Agrupa por ciclo (schedule_id ou data)
  const submissionsMap = new Map<string, { key: string; date: string; items: ResponseRow[] }>()
  for (const r of responses) {
    const k = groupKeyOf(r)
    const existing = submissionsMap.get(k)
    if (existing) {
      existing.items.push(r)
      if (r.created_at > existing.date) existing.date = r.created_at
    } else {
      submissionsMap.set(k, { key: k, date: r.created_at, items: [r] })
    }
  }
  const submissions = [...submissionsMap.values()].sort((a, b) => (a.date < b.date ? 1 : -1))

  const currentKey = selected && submissionsMap.has(selected) ? selected : submissions[0]?.key
  const current = currentKey ? submissionsMap.get(currentKey) : undefined

  const currentIdx = current ? submissions.findIndex((s) => s.key === current.key) : -1
  const prev = currentIdx > 0 ? submissions[currentIdx - 1] : null // anterior = mais recente
  const next = currentIdx >= 0 && currentIdx < submissions.length - 1 ? submissions[currentIdx + 1] : null

  // Ordena Q&A pela ordem original da pergunta
  const sortedItems = current
    ? [...current.items].sort((a, b) => (a.question?.order_num ?? 0) - (b.question?.order_num ?? 0))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/questionnaires" className="text-sm text-primary hover:underline">
              ← Respostas
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mt-1">{patient.name}</h1>
          <p className="text-xs text-muted-foreground">
            {submissions.length} {submissions.length === 1 ? 'submissão' : 'submissões'}
            {!patient.active && ' · paciente inativo'}
          </p>
        </div>
        <Link
          href={`/patients/${patient.id}`}
          className="text-sm text-primary hover:underline"
        >
          Perfil completo →
        </Link>
      </div>

      {submissions.length === 0 ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">
          Nenhuma resposta registrada para este paciente.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          {/* Sidebar: lista de submissões */}
          <aside className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Submissões
            </div>
            {submissions.map((s, i) => {
              const active = current?.key === s.key
              return (
                <Link
                  key={s.key}
                  href={`/questionnaires/${patient.id}?s=${encodeURIComponent(s.key)}`}
                  className={`block rounded-md border px-3 py-2 text-sm ${
                    active ? 'bg-accent border-primary' : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">#{submissions.length - i}</div>
                  <div className="text-xs text-muted-foreground">{formatDateBR(s.date)}</div>
                </Link>
              )
            })}
          </aside>

          {/* Main: detalhe */}
          <div className="space-y-4">
            {current && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Submissão {submissions.length - currentIdx} de {submissions.length}
                    </div>
                    <div className="text-base font-medium">
                      {formatDateBR(current.date)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {prev ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/questionnaires/${patient.id}?s=${encodeURIComponent(prev.key)}`}>
                          ← Anterior
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>← Anterior</Button>
                    )}
                    {next ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/questionnaires/${patient.id}?s=${encodeURIComponent(next.key)}`}>
                          Próxima →
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Próxima →</Button>
                    )}
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Respostas</span>
                      <Badge variant="outline">{sortedItems.length} perguntas</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sortedItems.map((r) => (
                      <div key={r.id} className="border-l-2 border-muted pl-3">
                        <div className="text-xs text-muted-foreground">
                          {r.question?.order_num != null ? `${r.question.order_num}. ` : ''}
                          {r.question?.question_text ?? '(pergunta removida)'}
                        </div>
                        <div className="mt-1 text-sm whitespace-pre-wrap">
                          {formatAnswer(r)}
                        </div>
                        {r.media_urls && r.media_urls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {r.media_urls.map((u, i) => (
                              <a
                                key={i}
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                mídia {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
