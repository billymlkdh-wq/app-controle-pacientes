// Contratos de plano — cria um contrato + N parcelas em payments (status=pendente).
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type PlanType = 'avulso' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

const INSTALLMENTS_BY_PLAN: Record<PlanType, number> = {
  avulso: 1,
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return { supabase }
}

// Soma N meses preservando o dia (aproximação simples; clamp no último dia do mês).
function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  const out = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day))
  return out.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const patientId = request.nextUrl.searchParams.get('patient_id')
  let q = ctx.supabase
    .from('plan_contracts')
    .select('*, payments(id,installment_num,due_date,date,amount,status,method,notes)')
    .order('start_date', { ascending: false })
  if (patientId) q = q.eq('patient_id', patientId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const body = await request.json() as {
    patient_id: string
    plan_type: PlanType
    total_value: number
    start_date: string          // vencimento da 1ª parcela (YYYY-MM-DD)
    installments_count?: number // opcional; default = INSTALLMENTS_BY_PLAN
    notes?: string
    renewed_from_id?: string
  }

  if (!body.patient_id || !body.plan_type || !body.total_value || !body.start_date) {
    return NextResponse.json({ error: 'patient_id, plan_type, total_value, start_date obrigatórios' }, { status: 400 })
  }

  const count = body.installments_count ?? INSTALLMENTS_BY_PLAN[body.plan_type]
  if (!count || count < 1) return NextResponse.json({ error: 'installments_count inválido' }, { status: 400 })

  const end_date = count === 1 ? body.start_date : addMonths(body.start_date, count - 1)
  const per = Math.round((Number(body.total_value) / count) * 100) / 100

  // Cria contrato
  const { data: contract, error: cErr } = await ctx.supabase.from('plan_contracts').insert({
    patient_id: body.patient_id,
    plan_type: body.plan_type,
    total_value: body.total_value,
    installments_count: count,
    start_date: body.start_date,
    end_date,
    notes: body.notes ?? null,
    renewed_from_id: body.renewed_from_id ?? null,
  }).select().single()
  if (cErr || !contract) return NextResponse.json({ error: cErr?.message ?? 'Falha ao criar contrato' }, { status: 400 })

  // Gera parcelas. Ajusta a última pra fechar o total exato (evita erro de arredondamento).
  const rows = Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1
    const amount = isLast ? Math.round((Number(body.total_value) - per * (count - 1)) * 100) / 100 : per
    return {
      patient_id: body.patient_id,
      contract_id: contract.id,
      installment_num: i + 1,
      due_date: addMonths(body.start_date, i),
      amount,
      status: 'pendente' as const,
      date: null,
    }
  })
  const { error: pErr } = await ctx.supabase.from('payments').insert(rows)
  if (pErr) {
    // rollback
    await ctx.supabase.from('plan_contracts').delete().eq('id', contract.id)
    return NextResponse.json({ error: pErr.message }, { status: 400 })
  }

  // Se for renovação, encerra o contrato anterior
  if (body.renewed_from_id) {
    await ctx.supabase.from('plan_contracts').update({ status: 'encerrado' }).eq('id', body.renewed_from_id)
  }

  revalidatePath('/financial')
  revalidatePath(`/patients/${body.patient_id}/financial`)
  return NextResponse.json(contract, { status: 201 })
}
