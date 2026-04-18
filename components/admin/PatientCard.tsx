// Card resumido do paciente
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PatientCard({ patient }: { patient: { id: string; name: string; email: string | null; active: boolean } }) {
  return (
    <Link href={`/patients/${patient.id}`}>
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="truncate">{patient.name}</span>
            <Badge variant={patient.active ? 'success' : 'secondary'}>{patient.active ? 'Ativo' : 'Inativo'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{patient.email ?? 'sem e-mail'}</CardContent>
      </Card>
    </Link>
  )
}
