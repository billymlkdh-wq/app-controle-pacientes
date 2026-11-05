// Cria plano de treino (admin) + lista planos de um paciente.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patientId = request.nextUrl.searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id obrigatório' }, { status: 400 })

  const { data } = await supabase
    .from('workout_plans')
    .select('id, name, active, created_at, updated_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as { patient_id: string; name: string }
  if (!body.patient_id || !body.name?.trim()) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { data: plan, error } = await supabase
    .from('workout_plans')
    .insert({ patient_id: body.patient_id, name: body.name.trim(), active: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Cria 3 dias default (Treino A/B/C)
  await supabase.from('workout_days').insert([
    { plan_id: plan.id, name: 'Treino A', order_num: 0 },
    { plan_id: plan.id, name: 'Treino B', order_num: 1 },
    { plan_id: plan.id, name: 'Treino C', order_num: 2 },
  ])

  revalidatePath(`/patients/${body.patient_id}`)
  return NextResponse.json({ plan }, { status: 201 })
}
