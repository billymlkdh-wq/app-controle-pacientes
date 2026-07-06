'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  postId: string
  initialCount: number
  initialReacted: boolean
}

export function CommunityReactButton({ postId, initialCount, initialReacted }: Props) {
  const [reacted, setReacted] = useState(initialReacted)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const res = await fetch('/api/community/reactions', {
      method: reacted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    })
    setLoading(false)
    if (res.ok) {
      if (reacted) {
        setReacted(false)
        setCount((c) => c - 1)
      } else {
        setReacted(true)
        setCount((c) => c + 1)
      }
    }
  }

  return (
    <Button
      variant={reacted ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="h-7 px-2 text-xs gap-1"
    >
      ❤️ {count}
    </Button>
  )
}
