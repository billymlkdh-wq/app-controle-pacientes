'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PatientAvatar } from './PatientAvatar'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

interface Props { name: string; avatarUrl: string | null }

export function AvatarUpload({ name, avatarUrl }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Foto muito grande (máx 2MB)'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/patient/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      toast.success('Foto atualizada!')
      router.refresh()
    } catch {
      toast.error('Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-fit mx-auto">
      <PatientAvatar name={name} avatarUrl={avatarUrl} size="lg" className="!h-20 !w-20 !text-2xl" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 rounded-full w-7 h-7 flex items-center justify-center shadow-lg transition-colors disabled:opacity-60"
      >
        <Camera className="h-3.5 w-3.5 text-white" />
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
