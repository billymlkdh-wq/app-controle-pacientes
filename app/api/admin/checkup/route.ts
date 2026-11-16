// Check-up semanal do admin.
//   POST { patient_id, note? } → marca check-up desta semana
//   DELETE ?patient_id=...    → desmarca (apaga check-up desta semana)
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { weekRange } from '@/lib/notifications/checkup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null }
  const role = (user.app_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null }
  return { error: null, user }
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAdmin()
  if (error) return error
  const body = await req.json().catch(() => ({})) as { patient_id?: string; note?: string }
  if (!body.patient_id) return NextResponse.json({ error: 'patient_id obrigatório' }, { status: 400 })

  const admin = createAdminClient() as any
  const { start, end } = weekRange()
  // Se já tem check-up esta semana, não cria duplicado — apenas retorna existente.
  const { data: existing } = await admin
    .from('patient_checkups')
    .select('id, checked_at')
    .eq('patient_id', body.patient_id)
    .gte('checked_at', start.toISOString())
    .lt('checked_at', end.toISOString())
    .limit(1)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, checkup: existing, duplicate: true })

  const { data, error: insErr } = await admin
    .from('patient_checkups')
    .insert({ patient_id: body.patient_id, checked_by: user!.id, note: body.note ?? null })
    .select('id, checked_at')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, checkup: data })
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  const patient_id = req.nextUrl.searchParams.get('patient_id')
  if (!patient_id) return NextResponse.json({ error: 'patient_id obrigatório' }, { status: 400 })

  const admin = createAdminClient() as any
  const { start, end } = weekRange()
  const { error: delErr } = await admin
    .from('patient_checkups')
    .delete()
    .eq('patient_id', patient_id)
    .gte('checked_at', start.toISOString())
    .lt('checked_at', end.toISOString())
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
