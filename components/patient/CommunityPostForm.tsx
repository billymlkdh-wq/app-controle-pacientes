'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function CommunityPostForm() {
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, is_anonymous: anonymous }),
    })
    setLoading(false)
    if (res.ok) {
      setContent('')
      window.location.reload()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erro ao publicar')
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Compartilhe sua conquista, motivação ou dúvida com a comunidade..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={500}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch
            id="anon"
            checked={anonymous}
            onCheckedChange={setAnonymous}
          />
          <Label htmlFor="anon" className="text-sm cursor-pointer">Postar anonimamente</Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
          <Button
            size="sm"
            onClick={submit}
            disabled={loading || !content.trim()}
          >
            {loading ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
