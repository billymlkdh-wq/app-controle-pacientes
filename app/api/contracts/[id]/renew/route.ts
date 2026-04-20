// Renova um contrato: cria novo contrato com mesmo plano, começando no dia seguinte
// ao end_date do anterior. O contrato antigo é marcado como 'encerrado'.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type PlanType = 'avulso' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

const INSTALLMENTS_BY_PLAN: Record<PlanType, number> = {
  avulso: 1, mensal: 1, trimestral: 3, semestral: 6, anual: 12,
}

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  const out = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day))
  return out.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const out = new Date(Date.UTC(y, m - 1, d + days))
  return out.toISOString().slice(0, 10)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return { supabase }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    plan_type?: PlanType
    total_value?: number
    start_date?: string
    installments_count?: number
    notes?: string
  }

  const { data: prev, error: pErr } = await ctx.supabase.from('plan_contracts').select('*').eq('id', id).single()
  if (pErr || !prev) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  const plan_type = body.plan_type ?? (prev.plan_type as PlanType)
  const total_value = body.total_value ?? Number(prev.total_value)
  const start_date = body.start_date ?? addDays(prev.end_date, 1)
  const paymentMethod = (prev.payment_method as 'avista' | 'pix_parcelado' | 'credito_parcelado' | null) ?? 'pix_parcelado'
  const count = paymentMethod === 'avista' ? 1 : (body.installments_count ?? INSTALLMENTS_BY_PLAN[plan_type])
  const end_date = count === 1 ? start_date : addMonths(start_date, count - 1)
  const per = Math.round((total_value / count) * 100) / 100
  const installmentMethod: 'pix' | 'cartao' = paymentMethod === 'credito_parcelado' ? 'cartao' : 'pix'

  const { data: contract, error: cErr } = await ctx.supabase.from('plan_contracts').insert({
    patient_id: prev.patient_id,
    plan_type,
    total_value,
    installments_count: count,
    start_date,
    end_date,
    payment_method: paymentMethod,
    notes: body.notes ?? null,
    renewed_from_id: prev.id,
  }).select().single()
  if (cErr || !contract) return NextResponse.json({ error: cErr?.message ?? 'Falha ao renovar' }, { status: 400 })

  const rows = Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1
    const amount = isLast ? Math.round((total_value - per * (count - 1)) * 100) / 100 : per
    return {
      patient_id: prev.patient_id,
      contract_id: contract.id,
      installment_num: i + 1,
      due_date: addMonths(start_date, i),
      amount,
      method: installmentMethod,
      status: 'pendente' as const,
      date: null,
    }
  })
  const { error: insErr } = await ctx.supabase.from('payments').insert(rows)
  if (insErr) {
    await ctx.supabase.from('plan_contracts').delete().eq('id', contract.id)
    return NextResponse.json({ error: insErr.message }, { status: 400 })
  }

  await ctx.supabase.from('plan_contracts').update({ status: 'encerrado' }).eq('id', prev.id)

  revalidatePath('/financial')
  revalidatePath(`/patients/${prev.patient_id}/financial`)
  return NextResponse.json(contract, { status: 201 })
}
