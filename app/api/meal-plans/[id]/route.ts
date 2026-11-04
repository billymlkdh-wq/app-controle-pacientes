// PATCH + DELETE do plano. Snapshot bulk save (plano + refeições + itens).
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PLAN_FIELDS = [
  'name', 'method', 'qualitative_text',
  'target_kcal', 'target_protein_g', 'target_lipid_g', 'target_carb_g',
  'notes', 'active',
] as const

type Patch = Partial<Record<(typeof PLAN_FIELDS)[number], unknown>>

type Snapshot = {
  plan?: Patch
  meals?: Array<{
    id?: string
    name: string
    time_hhmm?: string | null
    order_num: number
    notes?: string | null
    items: Array<{
      id?: string
      food_id?: number | null
      custom_description?: string | null
      quantity_g: number
      household_measure?: string | null
      energy_kcal?: number | null
      protein_g?: number | null
      lipid_g?: number | null
      carb_g?: number | null
      fiber_g?: number | null
      order_num: number
    }>
  }>
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as Snapshot

  // Atualiza header (whitelist)
  if (body.plan) {
    const patch: Record<string, unknown> = {}
    for (const k of PLAN_FIELDS) {
      if (k in body.plan) patch[k] = body.plan[k]
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('meal_plans').update(patch).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  // Sincroniza refeições + itens (estratégia simples: drop + reinsert)
  if (body.meals) {
    const { data: oldMeals } = await supabase
      .from('meal_plan_meals')
      .select('id')
      .eq('plan_id', id)
    const oldIds = (oldMeals ?? []).map((m) => m.id)
    if (oldIds.length > 0) {
      const { error: delErr } = await supabase.from('meal_plan_meals').delete().in('id', oldIds)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    for (const meal of body.meals) {
      const { data: newMeal, error: mErr } = await supabase
        .from('meal_plan_meals')
        .insert({
          plan_id: id,
          name: meal.name,
          time_hhmm: meal.time_hhmm ?? null,
          order_num: meal.order_num,
          notes: meal.notes ?? null,
        })
        .select()
        .single()
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 })

      if (meal.items.length > 0) {
        const rows = meal.items.map((it) => ({
          meal_id: newMeal.id,
          food_id: it.food_id ?? null,
          custom_description: it.custom_description ?? null,
          quantity_g: it.quantity_g,
          household_measure: it.household_measure ?? null,
          energy_kcal: it.energy_kcal ?? null,
          protein_g: it.protein_g ?? null,
          lipid_g: it.lipid_g ?? null,
          carb_g: it.carb_g ?? null,
          fiber_g: it.fiber_g ?? null,
          order_num: it.order_num,
        }))
        const { error: itErr } = await supabase.from('meal_plan_items').insert(rows)
        if (itErr) return NextResponse.json({ error: itErr.message }, { status: 400 })
      }
    }
  }

  const { data: patient } = await supabase
    .from('meal_plans')
    .select('patient_id')
    .eq('id', id)
    .single()
  if (patient?.patient_id) revalidatePath(`/patients/${patient.patient_id}`)
  revalidatePath('/portal/plano')

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('meal_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
