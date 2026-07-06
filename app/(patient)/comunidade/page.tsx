/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommunityPostForm } from '@/components/patient/CommunityPostForm'
import { CommunityReactButton } from '@/components/patient/CommunityReactButton'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default async function ComunidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient() as any

  const { data: currentPatient } = await admin
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()
  const myPatientId = (currentPatient as any)?.id as string | undefined

  const [{ data: posts }, { data: allReactions }] = await Promise.all([
    admin.from('community_posts')
      .select('id, content, is_anonymous, patient_id, created_at, patients(name)')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('community_reactions').select('post_id, patient_id'),
  ])

  const reactionCountByPost = new Map<string, number>()
  const myReactions = new Set<string>()
  for (const r of (allReactions ?? []) as any[]) {
    reactionCountByPost.set(r.post_id, (reactionCountByPost.get(r.post_id) ?? 0) + 1)
    if (r.patient_id === myPatientId) myReactions.add(r.post_id)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Comunidade</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compartilhar</CardTitle>
        </CardHeader>
        <CardContent>
          <CommunityPostForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {((posts ?? []) as any[]).length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma publicação ainda. Seja o primeiro a compartilhar!
            </CardContent>
          </Card>
        )}
        {((posts ?? []) as any[]).map((post: any) => {
          const patientName = post.patients?.name as string | null
          const isMe = post.patient_id === myPatientId
          const displayName = post.is_anonymous ? 'Anônimo' : (patientName?.split(' ')[0] ?? 'Paciente')
          const count = reactionCountByPost.get(post.id) ?? 0
          const reacted = myReactions.has(post.id)
          return (
            <Card key={post.id as string}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                      {displayName[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{isMe ? 'Você' : displayName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                <div className="flex justify-end">
                  {myPatientId && !isMe && (
                    <CommunityReactButton postId={post.id} initialCount={count} initialReacted={reacted} />
                  )}
                  {isMe && count > 0 && (
                    <span className="text-xs text-muted-foreground">❤️ {count}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
