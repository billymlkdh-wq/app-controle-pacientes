import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleCommunityPost } from '@/lib/gamification'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const body = await request.json() as { content?: string; is_anonymous?: boolean }
  if (!body.content?.trim()) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('community_posts').insert({
    patient_id: patient.id,
    content: body.content.trim().slice(0, 500),
    is_anonymous: body.is_anonymous ?? false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await handleCommunityPost(patient.id)
  revalidatePath('/comunidade')
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('community_posts')
    .select('id, content, is_anonymous, patient_id, created_at, is_visible')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
