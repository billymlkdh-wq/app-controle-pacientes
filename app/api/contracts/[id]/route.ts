// PATCH: atualizar status/notes do contrato. DELETE: cancelar (soft — status=cancelado).
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
  const body = await request.json()
  const { data, error } = await ctx.supabase.from('plan_contracts').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/financial')
  if (data?.patient_id) revalidatePath(`/patients/${data.patient_id}/financial`)
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const { data, error } = await ctx.supabase
    .from('plan_contracts')
    .update({ status: 'cancelado' })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/financial')
  if (data?.patient_id) revalidatePath(`/patients/${data.patient_id}/financial`)
  return NextResponse.json({ ok: true })
}
