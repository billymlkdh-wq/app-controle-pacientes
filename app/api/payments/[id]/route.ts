// PATCH: atualizar uma parcela/pagamento (p.ex. marcar como paga).
// DELETE: remover (só pagamentos avulsos; parcelas de contrato não deveriam ser apagadas).
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return { supabase }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const body = await request.json() as {
    status?: 'pago' | 'pendente' | 'atrasado'
    date?: string | null
    method?: string | null
    notes?: string | null
    amount?: number
    due_date?: string | null
  }

  // Auto: marcando como "pago" sem data, usa hoje.
  if (body.status === 'pago' && !body.date) {
    body.date = new Date().toISOString().slice(0, 10)
  }

  const { data, error } = await ctx.supabase.from('payments').update(body).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath('/financial')
  if (data?.patient_id) revalidatePath(`/patients/${data.patient_id}/financial`)
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const { data: row } = await ctx.supabase.from('payments').select('patient_id,contract_id').eq('id', id).single()
  if (row?.contract_id) {
    return NextResponse.json({ error: 'Parcela vinculada a contrato. Cancele o contrato.' }, { status: 400 })
  }
  const { error } = await ctx.supabase.from('payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/financial')
  if (row?.patient_id) revalidatePath(`/patients/${row.patient_id}/financial`)
  return NextResponse.json({ ok: true })
}
