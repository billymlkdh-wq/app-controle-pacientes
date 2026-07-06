/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata as any)?.role === 'admin' ? user : null
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patient_id')
  const admin = createAdminClient() as any
  const query = admin.from('patient_habit_goals').select('*')
  if (patientId) query.eq('patient_id', patientId)
  const { data } = await query.order('habit_type')
  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient() as any
  const body = await req.json()
  const { data, error } = await admin
    .from('patient_habit_goals')
    .upsert(body, { onConflict: 'patient_id,habit_type' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ goal: data })
}
