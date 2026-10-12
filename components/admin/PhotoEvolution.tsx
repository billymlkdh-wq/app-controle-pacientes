'use client'
// Galeria de fotos enviadas pelo paciente + comparação lado a lado entre duas datas.
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, ImageOff, X } from 'lucide-react'

export type PhotoItem = {
  url: string          // URL assinada (expira)
  path: string         // caminho no bucket, usado como key estável
  isVideo: boolean
}

export type PhotoGroup = {
  date: string         // YYYY-MM-DD
  label: string        // data formatada pt-BR
  photos: PhotoItem[]
}

function Media({ item, alt }: { item: PhotoItem; alt: string }) {
  if (item.isVideo) {
    return (
      <video
        src={item.url}
        controls
        className="w-full rounded-lg border bg-black"
        preload="metadata"
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={alt}
      loading="lazy"
      className="w-full rounded-lg border object-cover bg-muted"
    />
  )
}

export function PhotoEvolution({ groups }: { groups: PhotoGroup[] }) {
  // Datas ordenadas da mais antiga para a mais recente
  const [leftDate, setLeftDate] = React.useState(groups[0]?.date ?? '')
  const [rightDate, setRightDate] = React.useState(
    groups.length > 1 ? groups[groups.length - 1].date : groups[0]?.date ?? '',
  )
  const [lightbox, setLightbox] = React.useState<{ item: PhotoItem; label: string } | null>(null)

  const left = groups.find((g) => g.date === leftDate)
  const right = groups.find((g) => g.date === rightDate)

  // Fecha o lightbox com Esc
  React.useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Fotos enviadas pelo paciente</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <ImageOff className="h-4 w-4" />
            Nenhuma foto enviada até agora. As fotos aparecem aqui quando o paciente
            anexa mídia ao responder o questionário.
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPhotos = groups.reduce((s, g) => s + g.photos.length, 0)

  function swap() {
    setLeftDate(rightDate)
    setRightDate(leftDate)
  }

  return (
    <>
      {/* ── Comparação lado a lado ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Comparar duas datas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Antes
              <select
                value={leftDate}
                onChange={(e) => setLeftDate(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm text-foreground min-w-[150px]"
              >
                {groups.map((g) => (
                  <option key={g.date} value={g.date}>
                    {g.label} ({g.photos.length})
                  </option>
                ))}
              </select>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={swap}
              className="mb-0.5"
              title="Inverter as duas datas"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Depois
              <select
                value={rightDate}
                onChange={(e) => setRightDate(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm text-foreground min-w-[150px]"
              >
                {groups.map((g) => (
                  <option key={g.date} value={g.date}>
                    {g.label} ({g.photos.length})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {leftDate === rightDate && (
            <p className="text-xs text-amber-600">
              As duas datas são iguais — escolha datas diferentes para comparar.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {[left, right].map((g, side) => (
              <div key={side} className="space-y-2">
                <div className="text-sm font-medium flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {side === 0 ? 'Antes' : 'Depois'}
                  </span>
                  {g?.label ?? '—'}
                </div>
                {!g || g.photos.length === 0 ? (
                  <div className="text-xs text-muted-foreground border rounded-lg py-8 text-center">
                    Sem foto nesta data
                  </div>
                ) : (
                  <div className={g.photos.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
                    {g.photos.map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => setLightbox({ item: p, label: g.label })}
                        className="block w-full cursor-zoom-in"
                      >
                        <Media item={p} alt={`Foto de ${g.label}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Galeria completa por data ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            Fotos enviadas pelo paciente{' '}
            <span className="text-muted-foreground font-normal text-xs">
              {totalPhotos} arquivo(s) em {groups.length} data(s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...groups].reverse().map((g) => (
            <div key={g.date} className="space-y-2">
              <div className="text-sm font-medium border-b pb-1">{g.label}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {g.photos.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => setLightbox({ item: p, label: g.label })}
                    className="block w-full cursor-zoom-in"
                  >
                    <Media item={p} alt={`Foto de ${g.label}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Lightbox ───────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 text-white text-sm">
              <span>{lightbox.label}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-md p-1 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Media item={lightbox.item} alt={`Foto de ${lightbox.label}`} />
          </div>
        </div>
      )}
    </>
  )
}
