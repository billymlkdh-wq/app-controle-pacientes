// Lista planos de treino do paciente.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'
import { NewWorkoutPlanButton } from '@/components/admin/NewWorkoutPlanButton'

export default async function PatientWorkoutListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: patient } = await supabase
    .from('patients').select('id, name').eq('id', id).single()
  if (!patient) notFound()

  const { data: plans } = await supabase
    .from('workout_plans')
    .select('id, name, active, created_at, updated_at')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href={`/patients/${id}`} className="text-sm text-primary hover:underline">
            ← Perfil
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">Planos de treino</p>
        </div>
        <NewWorkoutPlanButton patientId={id} />
      </div>

      {(plans ?? []).length === 0 ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">
          Nenhum treino criado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {plans!.map((p) => (
            <Link key={p.id} href={`/patients/${id}/workout/${p.id}`}>
              <Card className="hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                    <span>{p.name}</span>
                    <Badge variant={p.active ? 'success' : 'secondary'}>
                      {p.active ? 'Ativo' : 'Arquivado'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex gap-4">
                  <span>Criado: {formatDateBR(p.created_at)}</span>
                  <span>Atualizado: {formatDateBR(p.updated_at)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
