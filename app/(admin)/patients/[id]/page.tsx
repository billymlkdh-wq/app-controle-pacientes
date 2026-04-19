// Perfil do paciente — dados + tabs de navegação
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'
import { QuestionnaireEvolutionChart } from '@/components/admin/QuestionnaireEvolutionChart'
import { AccessLinkPanel } from '@/components/admin/AccessLinkPanel'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: p } = await supabase.from('patients').select('*').eq('id', id).single()
  if (!p) notFound()

  const { data: responses } = await supabase
    .from('questionnaire_responses')
    .select('response_number,created_at,question:questionnaire_questions(order_num,is_numeric_chart,question_text)')
    .eq('patient_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.email ?? 'sem e-mail'}</p>
        </div>
        <Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Link href={`/patients/${id}/progress`} className="rounded-md border px-3 py-1 text-sm hover:bg-accent">Evolução</Link>
        <Link href={`/patients/${id}/appointments`} className="rounded-md border px-3 py-1 text-sm hover:bg-accent">Consultas</Link>
        <Link href={`/patients/${id}/financial`} className="rounded-md border px-3 py-1 text-sm hover:bg-accent">Financeiro</Link>
      </div>

      <AccessLinkPanel patientId={id} hasEmail={!!p.email} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Telefone: {p.phone ?? '-'}</div>
            <div>WhatsApp: {p.whatsapp_phone ?? '-'}</div>
            <div>Nascimento: {formatDateBR(p.birth_date)}</div>
            <div>Sexo: {p.sex ?? '-'}</div>
            <div>Plano: {p.plan_type} {p.plan_value ? `· ${formatBRL(Number(p.plan_value))}` : ''}</div>
            <div>Início do ciclo quinzenal: {formatDateBR(p.questionnaire_start_date) || '-'}</div>
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Objetivo & histórico</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Objetivo:</span> {p.objective ?? '-'}</div>
            <div><span className="text-muted-foreground">Histórico:</span> {p.health_history ?? '-'}</div>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Evolução do questionário</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <QuestionnaireEvolutionChart responses={(responses ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  )
}
