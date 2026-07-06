import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleGoalCompleted } from '@/lib/gamification'
import { revalidatePath } from 'next/cache'

function assertAdmin(user: { user_metadata?: { role?: string } } | null) {
  return (user?.user_metadata as { role?: string } | undefined)?.role === 'admin'
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !assertAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patientId = request.nextUrl.searchParams.get('patient_id')
  const admin = createAdminClient()
  let q = admin.from('patient_goals').select('*').order('created_at', { ascending: false })
  if (patientId) q = q.eq('patient_id', patientId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !assertAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    patient_id: string
    title: string
    description?: string
    target_value?: number
    current_value?: number
    unit?: string
    goal_type?: string
    deadline?: string
  }
  if (!body.patient_id || !body.title) return NextResponse.json({ error: 'patient_id e title obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('patient_goals').insert({
    patient_id: body.patient_id,
    title: body.title,
    description: body.description ?? null,
    target_value: body.target_value ?? null,
    current_value: body.current_value ?? 0,
    unit: body.unit ?? null,
    goal_type: body.goal_type ?? 'numeric',
    deadline: body.deadline ?? null,
    status: 'active',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/metas')
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !assertAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    id: string
    current_value?: number
    status?: string
    title?: string
    description?: string
    target_value?: number
    deadline?: string
  }
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.current_value !== undefined) updates.current_value = body.current_value
  if (body.status !== undefined) updates.status = body.status
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.target_value !== undefined) updates.target_value = body.target_value
  if (body.deadline !== undefined) updates.deadline = body.deadline

  const { data: goal, error } = await admin.from('patient_goals').update(updates).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Gamification: award points when goal is marked completed
  if (body.status === 'completed' && goal?.patient_id) {
    handleGoalCompleted(goal.patient_id).catch(console.error)
  }
  revalidatePath('/metas')
  return NextResponse.json(goal)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !assertAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('patient_goals').delete().eq('id', id)
  revalidatePath('/metas')
  return NextResponse.json({ ok: true })
}
