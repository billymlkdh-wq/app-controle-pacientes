// Card do admin com status e respostas da anamnese do paciente
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'
import {
  ANAMNESIS_SECTIONS, formatAnswer, isQuestionVisible, type AnamnesisAnswers,
} from '@/lib/anamnesis/questions'

export function AnamnesisCard({
  anamnesis,
}: {
  anamnesis: { answers: AnamnesisAnswers; completed_at: string | null; released_at: string } | null
}) {
  const completed = !!anamnesis?.completed_at
  return (
    <Card className="admin-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Anamnese</CardTitle>
        {completed
          ? <Badge variant="success">Respondida em {formatDateBR(anamnesis!.completed_at)}</Badge>
          : anamnesis
            ? <Badge variant="secondary">Liberada em {formatDateBR(anamnesis.released_at)}, aguardando</Badge>
            : <Badge variant="secondary">Não liberada</Badge>}
      </CardHeader>
      <CardContent>
        {!anamnesis ? (
          <p className="text-sm text-muted-foreground">
            Use o botão &quot;Liberar anamnese&quot; acima pra enviar o questionário a esse paciente.
          </p>
        ) : !completed ? (
          <p className="text-sm text-muted-foreground">
            Liberada. Aparece no início do app do paciente até ele responder.
          </p>
        ) : (
          <div className="space-y-5">
            {ANAMNESIS_SECTIONS.map((section) => {
              const qs = section.questions.filter((q) => isQuestionVisible(q, anamnesis.answers))
              if (!qs.length) return null
              return (
                <div key={section.title}>
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                    {section.title}
                  </h3>
                  <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2 text-sm">
                    {qs.map((q) => (
                      <div key={q.id}>
                        <dt className="text-muted-foreground">{q.label}</dt>
                        <dd className="font-medium whitespace-pre-line">{formatAnswer(q, anamnesis.answers[q.id])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
