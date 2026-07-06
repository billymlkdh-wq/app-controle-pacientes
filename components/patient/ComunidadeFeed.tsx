'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PatientAvatar } from './PatientAvatar'
import { toast } from 'sonner'
import { Heart, MessageCircle, Send } from 'lucide-react'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

const TYPE_LABELS: Record<string, string> = {
  water: '💧 Água',
  steps: '👟 Passos',
  cardio: '🏃 Cardio',
  workout: '💪 Treino',
  manual: '✍️ Compartilhamento',
  goal: '🎯 Meta',
}

const FILTERS = [
  { value: 'todos',   label: '⭐ Todos'   },
  { value: 'workout', label: '💪 Treinos'  },
  { value: 'water',   label: '💧 Água'     },
  { value: 'cardio',  label: '🏃 Cardio'  },
]

interface Post {
  id: string
  content: string
  postType: string
  isAnonymous: boolean
  patientId: string
  createdAt: string
  patientName: string | null
  avatarUrl: string | null
  reactionCount: number
  iReacted: boolean
}

interface Props {
  posts: Post[]
  myPatientId: string | null
  myName: string
  myAvatarUrl: string | null
  currentTipo: string
}

export function ComunidadeFeed({ posts, myPatientId, myName, myAvatarUrl, currentTipo }: Props) {
  const router = useRouter()
  const [localPosts, setLocalPosts] = React.useState(posts)
  const [newText, setNewText] = React.useState('')
  const [posting, setPosting] = React.useState(false)
  const [commenting, setCommenting] = React.useState<string | null>(null)
  const [commentText, setCommentText] = React.useState('')

  React.useEffect(() => { setLocalPosts(posts) }, [posts])

  async function submitPost() {
    if (!newText.trim() || !myPatientId) return
    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newText.trim(), is_anonymous: false }),
      })
      if (!res.ok) throw new Error()
      setNewText('')
      toast.success('Publicado!')
      router.refresh()
    } catch {
      toast.error('Erro ao publicar.')
    } finally {
      setPosting(false)
    }
  }

  async function toggleReact(postId: string, iReacted: boolean) {
    if (!myPatientId) return
    setLocalPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, iReacted: !iReacted, reactionCount: p.reactionCount + (iReacted ? -1 : 1) }
        : p
    ))
    await fetch('/api/community/reactions', {
      method: iReacted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    })
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <p className="text-[10px] text-[#4a5080] uppercase tracking-widest font-medium">
        Feed da Comunidade ✨
      </p>

      {/* New post box */}
      {myPatientId && (
        <div className="bg-[#141528] border border-[#1e2040] rounded-2xl p-3 flex gap-3">
          <PatientAvatar name={myName} avatarUrl={myAvatarUrl} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitPost())}
              placeholder="Compartilhe sua conquista…"
              className="flex-1 bg-[#0b0c1a] border border-[#1e2040] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4a5080] outline-none focus:border-pink-500/50"
            />
            <button
              onClick={submitPost}
              disabled={posting || !newText.trim()}
              className="bg-pink-500 hover:bg-pink-600 disabled:opacity-40 rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => router.push(`/comunidade?tipo=${f.value}`)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTipo === f.value
                ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.35)]'
                : 'bg-[#1a1b30] text-[#8892b0] border border-[#2a2b50] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {localPosts.length === 0 && (
        <div className="text-center py-12 text-[#4a5080] text-sm">
          Nenhuma publicação ainda. Seja o primeiro!
        </div>
      )}

      {localPosts.map((post) => {
        const isMe = post.patientId === myPatientId
        const displayName = post.isAnonymous ? 'Anônimo' : (post.patientName?.split(' ')[0] ?? 'Paciente')
        const typeLabel = TYPE_LABELS[post.postType] ?? '📝 Post'

        return (
          <div
            key={post.id}
            className="bg-[#141528] border border-[#1e2040] rounded-2xl overflow-hidden border-l-2 border-l-pink-500/40"
          >
            {/* Post header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <PatientAvatar
                  name={post.isAnonymous ? '?' : (post.patientName ?? '?')}
                  avatarUrl={post.isAnonymous ? null : post.avatarUrl}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-semibold leading-tight">{isMe ? 'Você' : displayName}</p>
                  <p className="text-[10px] text-[#4a5080]">{timeAgo(post.createdAt)}</p>
                </div>
              </div>
              <span className="text-[10px] bg-[#0b0c1a] border border-[#1e2040] rounded-full px-2 py-0.5 text-[#4a5080]">
                {typeLabel}
              </span>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
              <p className="text-sm text-[#c0c8e0] whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Reactions */}
            <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-[#1e2040]">
              <button
                onClick={() => toggleReact(post.id, post.iReacted)}
                disabled={!myPatientId || isMe}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.iReacted ? 'text-pink-400' : 'text-[#4a5080] hover:text-pink-400'
                } disabled:opacity-40`}
              >
                <Heart className={`h-4 w-4 ${post.iReacted ? 'fill-pink-400' : ''}`} />
                <span>{post.reactionCount}</span>
              </button>
              <button
                onClick={() => setCommenting(commenting === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-xs text-[#4a5080] hover:text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>0</span>
              </button>
            </div>

            {/* Comment input */}
            {commenting === post.id && (
              <div className="flex gap-2 px-4 pb-3">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Comentar…"
                  className="flex-1 bg-[#0b0c1a] border border-[#1e2040] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4a5080] outline-none focus:border-pink-500/50"
                />
                <button className="bg-pink-500 rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <Send className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
