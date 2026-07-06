'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Post {
  id: string
  content: string
  is_anonymous: boolean
  is_visible: boolean
  patient_id: string
  created_at: string
  reaction_count: number
  patients?: { name: string }
}

export function AdminCommunityModerator({ posts: initialPosts }: { posts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [updating, setUpdating] = useState<string | null>(null)

  async function toggleVisibility(post: Post) {
    setUpdating(post.id)
    const res = await fetch('/api/admin/community/moderate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, is_visible: !post.is_visible }),
    })
    setUpdating(null)
    if (res.ok) {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_visible: !p.is_visible } : p))
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `${min}m atrás`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>{posts.length} posts no total</span>
        <span>·</span>
        <span>{posts.filter((p) => !p.is_visible).length} ocultos</span>
      </div>
      {posts.map((post) => (
        <Card key={post.id} className={!post.is_visible ? 'opacity-50' : ''}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {post.is_anonymous ? 'Anônimo' : (post.patients?.name ?? 'Paciente')}
                </span>
                {post.is_anonymous && <Badge variant="secondary" className="text-xs">Anônimo</Badge>}
                {!post.is_visible && <Badge variant="destructive" className="text-xs">Oculto</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                {post.reaction_count > 0 && (
                  <span className="text-xs">❤️ {post.reaction_count}</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={updating === post.id}
                  onClick={() => toggleVisibility(post)}
                >
                  {post.is_visible ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          </CardContent>
        </Card>
      ))}
      {posts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum post na comunidade ainda.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
