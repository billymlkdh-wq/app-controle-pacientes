// Badge de status de pagamento
import { Badge } from '@/components/ui/badge'

export function PaymentStatusBadge({ status }: { status: 'pago' | 'pendente' | 'atrasado' }) {
  if (status === 'pago') return <Badge variant="success">Pago</Badge>
  if (status === 'atrasado') return <Badge variant="destructive">Atrasado</Badge>
  return <Badge variant="warning">Pendente</Badge>
}
