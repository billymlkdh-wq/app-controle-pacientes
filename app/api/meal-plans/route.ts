// Cria plano alimentar (admin only). Lista planos de um paciente.
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

  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, name, method, target_kcal, active, created_at, updated_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    patient_id: string
    name: string
    method: 'por_alimentos' | 'qualitativo'
    target_kcal?: number
    target_protein_g?: number
    target_lipid_g?: number
    target_carb_g?: number
  }
  if (!body.patient_id || !body.name || !['por_alimentos', 'qualitativo'].includes(body.method)) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // Cria plano + refeições default (café/almoço/jantar) pro método por_alimentos
  const { data: plan, error: planErr } = await supabase
    .from('meal_plans')
    .insert({
      patient_id: body.patient_id,
      name: body.name,
      method: body.method,
      target_kcal: body.target_kcal ?? null,
      target_protein_g: body.target_protein_g ?? null,
      target_lipid_g: body.target_lipid_g ?? null,
      target_carb_g: body.target_carb_g ?? null,
      active: true,
    })
    .select()
    .single()
  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 400 })

  if (body.method === 'por_alimentos') {
    await supabase.from('meal_plan_meals').insert([
      { plan_id: plan.id, name: 'Café da manhã', time_hhmm: '07:00', order_num: 0 },
      { plan_id: plan.id, name: 'Almoço', time_hhmm: '12:00', order_num: 1 },
      { plan_id: plan.id, name: 'Lanche da tarde', time_hhmm: '16:00', order_num: 2 },
      { plan_id: plan.id, name: 'Jantar', time_hhmm: '19:30', order_num: 3 },
    ])
  }

  revalidatePath(`/patients/${body.patient_id}`)
  return NextResponse.json({ plan }, { status: 201 })
}
