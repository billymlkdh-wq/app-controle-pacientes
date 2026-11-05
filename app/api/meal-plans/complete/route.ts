// Paciente marca uma refeição como feita + opcional foto já no bucket.
// Dispara XP (patient_points) uma vez por refeição por dia.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'

const XP_PER_MEAL = 15

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!patient) return NextResponse.json({ error: 'Paciente não vinculado' }, { status: 403 })

  const body = await request.json() as {
    meal_id: string
    photo_path?: string | null  // caminho no bucket meal-photos
    notes?: string | null
  }
  if (!body.meal_id) return NextResponse.json({ error: 'meal_id obrigatório' }, { status: 400 })

  // Verifica se já marcou hoje (uma marca por refeição por dia conta XP)
  const today = todayBR()
  const { data: existing } = await supabase
    .from('meal_completions')
    .select('id, xp_awarded')
    .eq('meal_id', body.meal_id)
    .eq('patient_id', patient.id)
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)
    .maybeSingle()

  if (existing) {
    // Já marcou hoje — permite atualizar foto/notas sem repetir XP
    const { error } = await supabase
      .from('meal_completions')
      .update({
        photo_url: body.photo_path ?? undefined,
        notes: body.notes ?? undefined,
      })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    revalidatePath('/plano')
    return NextResponse.json({ ok: true, updated: true, xp_awarded: 0 })
  }

  // Insere + concede XP
  const { data: completion, error: insErr } = await supabase
    .from('meal_completions')
    .insert({
      meal_id: body.meal_id,
      patient_id: patient.id,
      photo_url: body.photo_path ?? null,
      notes: body.notes ?? null,
      xp_awarded: XP_PER_MEAL,
    })
    .select()
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  await supabase.from('patient_points').insert({
    patient_id: patient.id,
    amount: XP_PER_MEAL,
    reason: 'meal_completed',
  })

  revalidatePath('/plano')
  return NextResponse.json({ ok: true, completion, xp_awarded: XP_PER_MEAL })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase
    .from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const mealId = request.nextUrl.searchParams.get('meal_id')
  if (!mealId) return NextResponse.json({ error: 'meal_id obrigatório' }, { status: 400 })

  const today = todayBR()
  const { data: existing } = await supabase
    .from('meal_completions')
    .select('id, xp_awarded')
    .eq('meal_id', mealId)
    .eq('patient_id', patient.id)
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Nada pra desfazer' }, { status: 404 })

  const { error } = await supabase.from('meal_completions').delete().eq('id', existing.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Revert XP (subtrai)
  if (existing.xp_awarded > 0) {
    await supabase.from('patient_points').insert({
      patient_id: patient.id,
      amount: -existing.xp_awarded,
      reason: 'meal_uncompleted',
    })
  }

  revalidatePath('/plano')
  return NextResponse.json({ ok: true })
}
