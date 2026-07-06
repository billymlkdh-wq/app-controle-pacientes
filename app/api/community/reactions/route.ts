import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { post_id } = await request.json() as { post_id?: string }
  if (!post_id) return NextResponse.json({ error: 'post_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('community_reactions').upsert(
    { post_id, patient_id: patient.id, reaction: 'heart' },
    { onConflict: 'post_id,patient_id', ignoreDuplicates: true },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { post_id } = await request.json() as { post_id?: string }
  if (!post_id) return NextResponse.json({ error: 'post_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('community_reactions').delete().eq('post_id', post_id).eq('patient_id', patient.id)
  return NextResponse.json({ ok: true })
}
