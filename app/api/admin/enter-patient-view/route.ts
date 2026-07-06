/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url))

  const role = (user.user_metadata as any)?.role
  if (role !== 'admin') return NextResponse.redirect(new URL('/portal', request.url))

  const admin = createAdminClient() as any

  const { data: existing } = await admin
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    const name = (user.user_metadata as any)?.name || user.email?.split('@')[0] || 'Rafael Bolson'
    await admin.from('patients').insert({
      user_id: user.id,
      name,
      email: user.email,
      active: true,
    })
  }

  const res = NextResponse.redirect(new URL('/portal', request.url))
  res.cookies.set('admin_patient_mode', '1', { path: '/', httpOnly: true, sameSite: 'lax' })
  return res
}
