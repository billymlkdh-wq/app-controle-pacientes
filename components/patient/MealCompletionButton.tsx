// Botão por refeição: marca feita + opcional foto. Mostra XP ao marcar.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toastXP } from './XPToast'
import { notifyXPGained } from './XPHeader'

export function MealCompletionButton({
  mealId,
  patientId,
  initialCompleted,
  initialPhotoUrl,
}: {
  mealId: string
  patientId: string
  initialCompleted: boolean
  initialPhotoUrl: string | null
}) {
  const router = useRouter()
  const [completed, setCompleted] = React.useState(initialCompleted)
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(initialPhotoUrl)
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function markDone(photoPath?: string | null) {
    setSaving(true)
    try {
      const r = await fetch('/api/meal-plans/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: mealId, photo_path: photoPath ?? null }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Erro')
      setCompleted(true)
      if (j.xp_awarded > 0) {
        toastXP(j.xp_awarded, 'Refeição marcada!')
        notifyXPGained()
      } else {
        toast.success('Foto atualizada.')
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function undo() {
    if (!confirm('Desmarcar refeição? Você perde o XP.')) return
    setSaving(true)
    try {
      const r = await fetch(`/api/meal-plans/complete?meal_id=${mealId}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Erro')
      setCompleted(false)
      setPhotoUrl(null)
      toast.success('Desmarcada.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function pickPhoto(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${patientId}/${mealId}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('meal-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      // Cria URL assinada (24h) pra exibir
      const { data: signed } = await supabase.storage
        .from('meal-photos').createSignedUrl(path, 86400)
      setPhotoUrl(signed?.signedUrl ?? null)
      await markDone(path)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <span className="inline-flex items-center gap-1 text-xs bg-green-900/40 text-green-300 border border-green-800 px-2 py-1 rounded">
          <Check className="h-3.5 w-3.5" /> Feito hoje
        </span>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="foto da refeição" className="h-12 w-12 object-cover rounded border border-[#2a2419]" />
        )}
        <button type="button" onClick={undo} disabled={saving}
          className="text-xs text-[#9a8c70] hover:text-red-400 inline-flex items-center gap-1">
          <X className="h-3 w-3" /> desfazer
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <button
        type="button"
        onClick={() => markDone()}
        disabled={saving}
        className="text-xs inline-flex items-center gap-1 bg-yellow-500 text-yellow-950 font-semibold px-3 py-1.5 rounded hover:bg-yellow-400 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" /> Marquei como feita (+15 XP)
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || saving}
        className="text-xs inline-flex items-center gap-1 border border-[#2a2419] text-[#d4c89a] px-3 py-1.5 rounded hover:bg-[#1a1610]"
      >
        <Camera className="h-3.5 w-3.5" /> {uploading ? 'Enviando…' : 'Foto + feita'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) pickPhoto(f)
        }}
      />
    </div>
  )
}
