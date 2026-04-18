// API financeira — listar (admin) / criar (admin). Paciente NÃO acessa (RLS).
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

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const patientId = request.nextUrl.searchParams.get('patient_id')
  let q = ctx.supabase.from('payments').select('*, patients(name)').order('date', { ascending: false })
  if (patientId) q = q.eq('patient_id', patientId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const body = await request.json()
  const { data, error } = await ctx.supabase.from('payments').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/financial')
  revalidatePath(`/patients/${body.patient_id}/financial`)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { id, ...updates } = body
  const { data, error } = await ctx.supabase.from('payments').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/financial')
  return NextResponse.json(data)
}
