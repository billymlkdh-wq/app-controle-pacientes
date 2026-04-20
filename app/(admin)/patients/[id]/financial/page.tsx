// Financeiro do paciente (admin):
// - Lista contratos de plano (ativos + encerrados) com suas parcelas
// - Botões: Novo contrato, Registrar pagamento por parcela, Renovar contrato ativo
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDateBR } from '@/lib/utils'
import { NewContractForm } from '@/components/admin/NewContractForm'
import { RegisterPaymentButton } from '@/components/admin/RegisterPaymentButton'
import { RenewContractButton } from '@/components/admin/RenewContractButton'

type PaymentRow = {
  id: string
  installment_num: number | null
  due_date: string | null
  date: string | null
  amount: number
  status: 'pago' | 'pendente' | 'atrasado'
  method: string | null
  notes: string | null
}

type ContractRow = {
  id: string
  patient_id: string
  plan_type: 'avulso' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
  total_value: number
  installments_count: number
  start_date: string
  end_date: string
  status: 'ativo' | 'encerrado' | 'cancelado'
  notes: string | null
  payments: PaymentRow[]
}

export default async function PatientFinancialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase.from('patients').select('name,plan_type,plan_value').eq('id', id).single()

  const { data: contractsRaw } = await supabase
    .from('plan_contracts')
    .select('*, payments(id,installment_num,due_date,date,amount,status,method,notes)')
    .eq('patient_id', id)
    .order('start_date', { ascending: false })

  const contracts = ((contractsRaw ?? []) as unknown as ContractRow[]).map((c) => ({
    ...c,
    payments: [...(c.payments ?? [])].sort((a, b) => (a.installment_num ?? 0) - (b.installment_num ?? 0)),
  }))

  // Pagamentos avulsos (sem contrato)
  const { data: loosePayments } = await supabase
    .from('payments')
    .select('*')
    .eq('patient_id', id)
    .is('contract_id', null)
    .order('date', { ascending: false, nullsFirst: false })

  const totalPago = contracts.flatMap((c) => c.payments).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
    + (loosePayments ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          {patient?.name && <p className="text-sm text-muted-foreground">{patient.name}</p>}
        </div>
        <div className="text-sm text-muted-foreground">Total pago: <span className="text-foreground font-medium">{formatBRL(totalPago)}</span></div>
      </div>

      <NewContractForm
        patientId={id}
        defaultPlan={patient?.plan_type as 'avulso' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | undefined}
        defaultValue={patient?.plan_value ? Number(patient.plan_value) : undefined}
      />

      <div className="space-y-4">
        {contracts.length === 0 && <p className="text-muted-foreground text-sm">Nenhum contrato ainda. Crie um acima.</p>}
        {contracts.map((c) => {
          const pagas = c.payments.filter((p) => p.status === 'pago').length
          return (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base capitalize">
                    Plano {c.plan_type} · {formatBRL(Number(c.total_value))}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {formatDateBR(c.start_date)} → {formatDateBR(c.end_date)} · {pagas}/{c.installments_count} pagas
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'ativo' ? 'success' : c.status === 'cancelado' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                  {c.status === 'ativo' && <RenewContractButton contractId={c.id} />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b text-xs text-muted-foreground">
                        <th className="py-2">#</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                        <th>Pago em</th>
                        <th>Método</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.payments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2">{p.installment_num}</td>
                          <td>{formatDateBR(p.due_date)}</td>
                          <td>{formatBRL(Number(p.amount))}</td>
                          <td>{formatDateBR(p.date)}</td>
                          <td>{p.method ?? '-'}</td>
                          <td>
                            <Badge variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'destructive' : 'warning'}>{p.status}</Badge>
                          </td>
                          <td className="text-right">
                            <RegisterPaymentButton paymentId={p.id} disabled={p.status === 'pago'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-2">Obs: {c.notes}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(loosePayments ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pagamentos avulsos (sem contrato)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(loosePayments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{formatBRL(Number(p.amount))}</div>
                  <div className="text-xs text-muted-foreground">{formatDateBR(p.date)} · {p.method ?? '-'}</div>
                </div>
                <Badge variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'destructive' : 'warning'}>{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
