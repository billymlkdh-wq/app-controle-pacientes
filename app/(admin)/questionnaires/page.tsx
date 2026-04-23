// Respostas — visão agregada por paciente (estilo Google Forms "Individual").
// Cada paciente vira 1 card com contador de submissões e data do último ciclo.
// Admin clica → vai pra /questionnaires/[patientId] ver submissões individualmente.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'
import { BlastQuestionnaireRemindersButton } from '@/components/admin/BlastQuestionnaireRemindersButton'

type Row = {
  id: string
  created_at: string
  schedule_id: string | null
  patient: { id: string; name: string; active: boolean } | null
}

type Agg = {
  patient_id: string
  name: string
  active: boolean
  submissions: number
  last_at: string
  responses: number
}

export default async function QuestionnairesPage() {
  const supabase = await createClient()

  // Puxa todas as respostas + paciente (RLS admin libera tudo).
  // Pode crescer: adicionar paginação quando passar de ~5k.
  const { data } = await supabase
    .from('questionnaire_responses')
    .select('id, created_at, schedule_id, patient:patients(id, name, active)')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as Row[]

  // Agrega por paciente → conta submissões distintas (schedule_id || data do created_at)
  const map = new Map<string, Agg & { groupKeys: Set<string> }>()
  for (const r of rows) {
    if (!r.patient) continue
    const groupKey = r.schedule_id ?? r.created_at.slice(0, 10)
    const existing = map.get(r.patient.id)
    if (existing) {
      existing.responses += 1
      existing.groupKeys.add(groupKey)
      if (r.created_at > existing.last_at) existing.last_at = r.created_at
    } else {
      map.set(r.patient.id, {
        patient_id: r.patient.id,
        name: r.patient.name,
        active: r.patient.active,
        submissions: 0,
        responses: 1,
        last_at: r.created_at,
        groupKeys: new Set([groupKey]),
      })
    }
  }
  const aggregates: Agg[] = [...map.values()]
    .map((a) => ({ ...a, submissions: a.groupKeys.size }))
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Respostas</h1>
        <Link href="/questionnaires/questions" className="text-sm text-primary hover:underline">
          Gerenciar perguntas
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lembretes manuais</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Dispara WhatsApp para todos os pacientes com questionário liberado (hoje ou atrasado) e que ainda não responderam.
          </p>
          <BlastQuestionnaireRemindersButton />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Por paciente · {aggregates.length} {aggregates.length === 1 ? 'paciente' : 'pacientes'}
        </h2>
        {aggregates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta registrada ainda.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {aggregates.map((a) => (
              <Link
                key={a.patient_id}
                href={`/questionnaires/${a.patient_id}`}
                className="block rounded-md border p-4 bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Última: {formatDateBR(a.last_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">
                      {a.submissions} {a.submissions === 1 ? 'submissão' : 'submissões'}
                    </Badge>
                    {!a.active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
