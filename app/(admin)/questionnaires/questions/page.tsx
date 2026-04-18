// Gerenciar perguntas do questionário
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: questions } = await supabase
    .from('questionnaire_questions')
    .select('*')
    .order('order_num', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Perguntas do questionário</h1>
      <div className="space-y-2">
        {(questions ?? []).map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{q.order_num}. {q.question_text}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{q.question_type}</Badge>
                  {q.is_numeric_chart && <Badge variant="default">Gráfico</Badge>}
                  {!q.active && <Badge variant="secondary">Inativa</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
