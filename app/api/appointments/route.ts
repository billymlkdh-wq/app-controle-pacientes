// API de consultas — listar por paciente / criar (admin)
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patientId = request.nextUrl.searchParams.get('patient_id')
  let query = supabase.from('appointments').select('*').order('date', { ascending: false })
  if (patientId) query = query.eq('patient_id', patientId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase.from('appointments').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath(`/patients/${body.patient_id}/appointments`)
  return NextResponse.json(data, { status: 201 })
}
