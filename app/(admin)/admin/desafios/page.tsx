/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminChallengeManager } from '@/components/admin/AdminChallengeManager'

export default async function AdminDesafiosPage() {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('patient_challenges')
    .select('*, patient_challenge_participants(count)')
    .order('created_at', { ascending: false })
  return (
    <div className="max-w-3xl mx-auto">
      <AdminChallengeManager initialChallenges={data ?? []} />
    </div>
  )
}
