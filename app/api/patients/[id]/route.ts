// API de paciente individual — GET / PATCH / DELETE (admin)
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function guardAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return { supabase, user }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const { data, error } = await ctx.supabase.from('patients').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

const ALLOWED_FIELDS = [
  'name', 'email', 'phone', 'whatsapp_phone', 'birth_date', 'sex',
  'objective', 'health_history', 'plan_type', 'plan_value',
  'questionnaire_start_date', 'active',
] as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const body = await request.json()
  // Whitelist — evita paciente injetar campos sensíveis (user_id, created_at, etc.)
  const patch: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo permitido' }, { status: 400 })
  }
  const { data, error } = await ctx.supabase.from('patients').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const { error } = await ctx.supabase.from('patients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/patients')
  return NextResponse.json({ ok: true })
}
