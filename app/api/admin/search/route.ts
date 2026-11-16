// Busca pacientes para a paleta ⌘K do admin.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.app_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

  const query = supabase
    .from('patients')
    .select('id, name, email, phone')
    .order('name', { ascending: true })
    .limit(20)

  const { data, error } = q.length > 0
    ? await query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    : await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ patients: data ?? [] })
}
