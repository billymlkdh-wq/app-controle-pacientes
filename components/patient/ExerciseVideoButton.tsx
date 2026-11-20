// Botão "Ver execução": abre o vídeo do YouTube do exercício numa janela
// sobre a tela (o paciente não sai do app). Some se o exercício não tem vídeo.
'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { PlayCircle, X, ExternalLink } from 'lucide-react'
import { youtubeEmbedUrl, youtubeWatchUrl } from '@/lib/youtube'

export function ExerciseVideoButton({
  url,
  title,
  size = 'sm',
}: {
  url: string | null | undefined
  title: string
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = React.useState(false)
  const embed = youtubeEmbedUrl(url)
  const watch = youtubeWatchUrl(url)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!embed) return null

  const btnCls = size === 'md'
    ? 'inline-flex items-center gap-2 rounded-full border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/20'
    : 'inline-flex items-center gap-1.5 rounded-full border border-orange-500/60 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/20'

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className={btnCls}
        aria-label={`Ver vídeo de execução: ${title}`}
      >
        <PlayCircle className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        Ver execução
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Vídeo: ${title}`}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white line-clamp-2">{title}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Fechar vídeo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={`${embed}&autoplay=1`}
                title={title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            {watch && (
              <a
                href={watch}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#d4c89a] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir no YouTube
              </a>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
