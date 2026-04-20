// Garante que patients.user_id está vinculado ao auth user logado.
// Usado como fallback client-side após /auth/set-password — complementa o trigger SQL.
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('patients')
    .update({ user_id: user.id })
    .is('user_id', null)
    .ilike('email', user.email)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, linked: !!data, patient_id: data?.id ?? null })
}
