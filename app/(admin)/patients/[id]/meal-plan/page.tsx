// Lista planos alimentares do paciente + criar novo.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'
import { NewMealPlanButton } from '@/components/admin/NewMealPlanButton'

export default async function PatientMealPlanListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', id)
    .single()
  if (!patient) notFound()

  const { data: plans } = await supabase
    .from('meal_plans')
    .select('id, name, method, target_kcal, active, created_at, updated_at')
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
          <p className="text-sm text-muted-foreground">Planos alimentares</p>
        </div>
        <NewMealPlanButton patientId={id} />
      </div>

      {(plans ?? []).length === 0 ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">
          Nenhum plano criado. Clique em &quot;Novo plano&quot; para começar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {plans!.map((p) => (
            <Link key={p.id} href={`/patients/${id}/meal-plan/${p.id}`}>
              <Card className="hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                    <span>{p.name}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {p.method === 'por_alimentos' ? 'Por alimentos' : 'Qualitativo'}
                      </Badge>
                      <Badge variant={p.active ? 'success' : 'secondary'}>
                        {p.active ? 'Ativo' : 'Arquivado'}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex gap-4">
                  <span>Criado: {formatDateBR(p.created_at)}</span>
                  <span>Atualizado: {formatDateBR(p.updated_at)}</span>
                  {p.target_kcal && <span>Meta: {p.target_kcal} kcal</span>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
