/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export default async function VerComoPacientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = (user.user_metadata as any)?.role
  if (role !== 'admin') redirect('/portal')

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

  redirect('/portal')
}
