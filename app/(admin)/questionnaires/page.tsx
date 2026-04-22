// Todas as respostas dos questionários
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateBR } from '@/lib/utils'
import { BlastQuestionnaireRemindersButton } from '@/components/admin/BlastQuestionnaireRemindersButton'

export default async function QuestionnairesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('questionnaire_responses')
    .select('id,response_text,response_number,created_at,patient:patients(id,name),question:questionnaire_questions(question_text,order_num)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Respostas</h1>
        <Link href="/questionnaires/questions" className="text-sm text-primary hover:underline">Gerenciar perguntas</Link>
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
      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((data ?? []) as any[]).map((r) => (
          <Card key={r.id}>
            <CardHeader><CardTitle className="text-sm">{r.patient?.name ?? '-'} · {formatDateBR(r.created_at)}</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="text-muted-foreground">{r.question?.question_text}</div>
              <div>{r.response_text ?? (r.response_number != null ? String(r.response_number) : '-')}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
