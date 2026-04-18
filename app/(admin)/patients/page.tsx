// Lista de pacientes
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: patients, error } = await supabase.from('patients').select('*').order('name')
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <Button asChild><Link href="/patients/new">Novo paciente</Link></Button>
      </div>
      {error && <p className="text-destructive">{error.message}</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(patients ?? []).map((p) => (
          <Link key={p.id} href={`/patients/${p.id}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{p.name}</span>
                  <Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>{p.email ?? 'sem e-mail'}</div>
                <div>Plano: {p.plan_type} {p.plan_value ? `· ${formatBRL(Number(p.plan_value))}` : ''}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(patients ?? []).length === 0 && <p className="text-muted-foreground">Nenhum paciente ainda.</p>}
      </div>
    </div>
  )
}
