/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminCommunityModerator } from '@/components/admin/AdminCommunityModerator'

export default async function AdminComunidadePage() {
  const admin = createAdminClient() as any

  const { data: posts } = await admin
    .from('community_posts')
    .select('id, content, is_anonymous, is_visible, patient_id, created_at, patients(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: reactions } = await admin
    .from('community_reactions')
    .select('post_id')

  const reactionCount = new Map<string, number>()
  for (const r of (reactions ?? []) as any[]) {
    reactionCount.set(r.post_id, (reactionCount.get(r.post_id) ?? 0) + 1)
  }

  const postsWithCount = ((posts ?? []) as any[]).map((p: any) => ({
    ...p,
    reaction_count: reactionCount.get(p.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Moderação da Comunidade</h1>
      <AdminCommunityModerator posts={postsWithCount} />
    </div>
  )
}
