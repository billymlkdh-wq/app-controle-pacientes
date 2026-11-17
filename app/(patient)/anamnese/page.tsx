// Anamnese — questionário secundário, liberado pelo admin e respondido uma vez
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolvePatient } from '@/lib/adminPreview'
import { AnamnesisForm } from '@/components/patient/AnamnesisForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/utils'

export default async function AnamnesePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isAdmin = (user.app_metadata as { role?: string } | null)?.role === 'admin'
  const { patientId } = await resolvePatient(user.id, isAdmin)
  if (!patientId) {
    return <p className="text-muted-foreground">Paciente não vinculado. Contate o admin.</p>
  }

  const db = createAdminClient() as any
  const { data: done } = await db
    .from('patient_anamnesis').select('completed_at').eq('patient_id', patientId).maybeSingle()

  if (!done) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Anamnese</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sua anamnese ainda não foi liberada. Quando o seu nutricionista liberar, ela aparece aqui e no início do app.
            </p>
            <Button asChild variant="outline"><Link href="/portal">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done.completed_at) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Anamnese</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você já respondeu sua anamnese em <strong>{formatDateBR(done.completed_at)}</strong>. Obrigado!
            </p>
            <Button asChild variant="outline"><Link href="/portal">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anamnese</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quero te conhecer melhor pra ajustar seu acompanhamento. Responde com calma, leva uns 10 minutos e você só faz isso uma vez.
          </p>
        </CardHeader>
        <CardContent>
          <AnamnesisForm />
        </CardContent>
      </Card>
    </div>
  )
}
