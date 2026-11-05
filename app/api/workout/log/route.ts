// Paciente registra execução de uma série (carga + reps feitas).
// Upsert por (set, patient, date).
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase
    .from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Paciente não vinculado' }, { status: 403 })

  const body = await request.json() as {
    set_id: string
    load_kg?: number | null
    reps_done?: number | null
    notes?: string | null
    performed_date?: string | null
  }
  if (!body.set_id) return NextResponse.json({ error: 'set_id obrigatório' }, { status: 400 })

  const date = body.performed_date ?? todayBR()
  // Upsert manual: check existing
  const { data: existing } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('set_id', body.set_id)
    .eq('patient_id', patient.id)
    .eq('performed_date', date)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('workout_logs')
      .update({
        load_kg: body.load_kg ?? null,
        reps_done: body.reps_done ?? null,
        notes: body.notes ?? null,
        performed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    revalidatePath('/treino')
    return NextResponse.json({ ok: true, log: data, updated: true })
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      set_id: body.set_id,
      patient_id: patient.id,
      performed_date: date,
      load_kg: body.load_kg ?? null,
      reps_done: body.reps_done ?? null,
      notes: body.notes ?? null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/treino')
  return NextResponse.json({ ok: true, log: data, created: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: patient } = await supabase
    .from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const logId = request.nextUrl.searchParams.get('id')
  if (!logId) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('workout_logs').delete()
    .eq('id', logId)
    .eq('patient_id', patient.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/treino')
  return NextResponse.json({ ok: true })
}
