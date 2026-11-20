// PATCH snapshot bulk + DELETE do plano de treino.
// Estratégia simples: drop all days (cascade deleta tudo) + reinsert.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PLAN_FIELDS = ['name', 'notes', 'active'] as const
type Patch = Partial<Record<(typeof PLAN_FIELDS)[number], unknown>>

type Snapshot = {
  plan?: Patch
  days?: Array<{
    name: string
    notes?: string | null
    order_num: number
    exercises: Array<{
      name: string
      notes?: string | null
      rest_seconds?: number | null
      video_url?: string | null
      order_num: number
      sets: Array<{
        set_type: 'aquecimento' | 'preparatoria' | 'valida'
        reps: string
        target_load_kg?: number | null
        order_num: number
      }>
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

  if (body.plan) {
    const patch: Record<string, unknown> = {}
    for (const k of PLAN_FIELDS) if (k in body.plan) patch[k] = body.plan[k]
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('workout_plans').update(patch).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  if (body.days) {
    const { data: oldDays } = await supabase.from('workout_days').select('id').eq('plan_id', id)
    const oldIds = (oldDays ?? []).map((d) => d.id)
    if (oldIds.length > 0) {
      const { error: delErr } = await supabase.from('workout_days').delete().in('id', oldIds)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    for (const day of body.days) {
      const { data: newDay, error: dErr } = await supabase
        .from('workout_days')
        .insert({ plan_id: id, name: day.name, notes: day.notes ?? null, order_num: day.order_num })
        .select().single()
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 })

      for (const ex of day.exercises) {
        const { data: newEx, error: eErr } = await supabase
          .from('workout_exercises')
          .insert({
            day_id: newDay.id,
            name: ex.name,
            notes: ex.notes ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            video_url: ex.video_url?.trim() || null,
            order_num: ex.order_num,
          })
          .select().single()
        if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 })

        if (ex.sets.length > 0) {
          const rows = ex.sets.map((s) => ({
            exercise_id: newEx.id,
            set_type: s.set_type,
            reps: s.reps,
            target_load_kg: s.target_load_kg ?? null,
            order_num: s.order_num,
          }))
          const { error: sErr } = await supabase.from('workout_sets').insert(rows)
          if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 })
        }
      }
    }
  }

  const { data: plan } = await supabase
    .from('workout_plans').select('patient_id').eq('id', id).single()
  if (plan?.patient_id) revalidatePath(`/patients/${plan.patient_id}`)
  revalidatePath('/treino')
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
  const { error } = await supabase.from('workout_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
