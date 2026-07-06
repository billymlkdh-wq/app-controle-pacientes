/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ComunidadeFeed } from '@/components/patient/ComunidadeFeed'

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const params = await searchParams
  const tipo = params.tipo ?? 'todos'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient() as any

  const { data: currentPatient } = await db
    .from('patients').select('id, name, avatar_url').eq('user_id', user!.id).maybeSingle()
  const myPatientId = (currentPatient as any)?.id as string | undefined

  let postsQuery = db
    .from('community_posts')
    .select('id, content, post_type, is_anonymous, patient_id, created_at, patients(name, avatar_url)')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(60)

  if (tipo !== 'todos') postsQuery = postsQuery.eq('post_type', tipo)

  const [{ data: posts }, { data: allReactions }] = await Promise.all([
    postsQuery,
    db.from('community_reactions').select('post_id, patient_id'),
  ])

  const reactionCount = new Map<string, number>()
  const myReactions   = new Set<string>()
  for (const r of (allReactions ?? []) as any[]) {
    reactionCount.set(r.post_id, (reactionCount.get(r.post_id) ?? 0) + 1)
    if (r.patient_id === myPatientId) myReactions.add(r.post_id)
  }

  const enriched = ((posts ?? []) as any[]).map((p: any) => ({
    id: p.id as string,
    content: p.content as string,
    postType: (p.post_type ?? 'manual') as string,
    isAnonymous: p.is_anonymous as boolean,
    patientId: p.patient_id as string,
    createdAt: p.created_at as string,
    patientName: (p.patients?.name as string | null) ?? null,
    avatarUrl: (p.patients?.avatar_url as string | null) ?? null,
    reactionCount: reactionCount.get(p.id) ?? 0,
    iReacted: myReactions.has(p.id),
  }))

  return (
    <ComunidadeFeed
      posts={enriched}
      myPatientId={myPatientId ?? null}
      myName={(currentPatient as any)?.name ?? ''}
      myAvatarUrl={(currentPatient as any)?.avatar_url ?? null}
      currentTipo={tipo}
    />
  )
}
