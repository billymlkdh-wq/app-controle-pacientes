// API — editar/deletar pergunta (admin)
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden', status: 403 as const }
  return { supabase }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await ctx.supabase
    .from('questionnaire_questions')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/questionnaires/questions')
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  // Soft-delete: marca como inativa (respostas já coletadas referenciam esta pergunta)
  const { error } = await ctx.supabase
    .from('questionnaire_questions')
    .update({ active: false })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/questionnaires/questions')
  return NextResponse.json({ ok: true })
}
