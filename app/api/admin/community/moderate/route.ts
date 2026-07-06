import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = (user?.user_metadata as { role?: string } | null)?.role
  if (!user || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, is_visible } = await request.json() as { id?: string; is_visible?: boolean }
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('community_posts').update({ is_visible }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
