// Perfil do paciente — dados + tabs de navegação
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'
import { QuestionnaireEvolutionChart } from '@/components/admin/QuestionnaireEvolutionChart'
import { AccessLinkPanel } from '@/components/admin/AccessLinkPanel'
import { UnlockQuestionnaireButton } from '@/components/admin/UnlockQuestionnaireButton'
import { EditPatientForm } from '@/components/admin/EditPatientForm'
import { PageHeader } from '@/components/admin/PageHeader'
import { AnamnesisCard } from '@/components/admin/AnamnesisCard'
import { ReleaseAnamnesisButton } from '@/components/admin/ReleaseAnamnesisButton'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: p } = await supabase.from('patients').select('*').eq('id', id).single()
  if (!p) notFound()

  const { data: responses } = await supabase
    .from('questionnaire_responses')
    .select('response_number,created_at,schedule_id,question:questionnaire_questions(order_num,is_numeric_chart,question_text)')
    .eq('patient_id', id)
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Lê via service role (a policy de admin consulta auth.users, que o role authenticated não acessa)
  const { data: anamnesis } = await (createAdminClient() as any)
    .from('patient_anamnesis')
    .select('answers, completed_at, released_at')
    .eq('patient_id', id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.name}
        subtitle={p.email ?? 'sem e-mail'}
        action={<Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <PatientTab href={`/patients/${id}/progress`}>Evolução</PatientTab>
        <PatientTab href={`/patients/${id}/appointments`}>Consultas</PatientTab>
        <PatientTab href={`/patients/${id}/financial`}>Financeiro</PatientTab>
        <PatientTab href={`/patients/${id}/meal-plan`}>Plano alimentar</PatientTab>
        <PatientTab href={`/patients/${id}/workout`}>Treino</PatientTab>
        <UnlockQuestionnaireButton patientId={id} />
        <ReleaseAnamnesisButton
          patientId={id}
          status={!anamnesis ? 'none' : anamnesis.completed_at ? 'completed' : 'released'}
        />
      </div>

      <EditPatientForm patient={p} />

      <AccessLinkPanel patientId={id} hasEmail={!!p.email} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="admin-card"><CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Telefone: {p.phone ?? '-'}</div>
            <div>WhatsApp: {p.whatsapp_phone ?? '-'}</div>
            <div>Nascimento: {formatDateBR(p.birth_date)}</div>
            <div>Sexo: {p.sex ?? '-'}</div>
            <div>Plano: {p.plan_type} {p.plan_value ? `· ${formatBRL(Number(p.plan_value))}` : ''}</div>
            <div>Início do ciclo quinzenal: {formatDateBR(p.questionnaire_start_date) || '-'}</div>
          </CardContent></Card>
        <Card className="admin-card"><CardHeader><CardTitle>Objetivo & histórico</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Objetivo:</span> {p.objective ?? '-'}</div>
            <div><span className="text-muted-foreground">Histórico:</span> {p.health_history ?? '-'}</div>
          </CardContent></Card>
      </div>

      <AnamnesisCard anamnesis={anamnesis ?? null} />

      <Card className="admin-card">
        <CardHeader><CardTitle>Evolução do questionário</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <QuestionnaireEvolutionChart responses={(responses ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  )
}

function PatientTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent hover:border-primary/30 hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  )
}
