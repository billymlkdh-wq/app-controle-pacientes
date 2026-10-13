'use client'
// Galeria de fotos enviadas pelo paciente + comparação de UMA foto do "antes"
// com UMA foto do "depois", escolhidas individualmente.
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

function Media({
  item, alt, className = '',
}: { item: PhotoItem; alt: string; className?: string }) {
  if (item.isVideo) {
    return <video src={item.url} controls preload="metadata" className={className} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.url} alt={alt} loading="lazy" className={className} />
}

/** Uma coluna da comparação: data, foto grande e tira de miniaturas para escolher. */
function CompareSide({
  side, groups, date, index, onDateChange, onIndexChange, onZoom,
}: {
  side: 'antes' | 'depois'
  groups: PhotoGroup[]
  date: string
  index: number
  onDateChange: (d: string) => void
  onIndexChange: (i: number) => void
  onZoom: (item: PhotoItem, label: string) => void
}) {
  const group = groups.find((g) => g.date === date)
  const photos = group?.photos ?? []
  const selected = photos[index]

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide font-medium">{side}</span>
        <select
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm text-foreground"
        >
          {groups.map((g) => (
            <option key={g.date} value={g.date}>
              {g.label} ({g.photos.length} foto{g.photos.length > 1 ? 's' : ''})
            </option>
          ))}
        </select>
      </label>

      {/* Foto escolhida */}
      {!selected ? (
        <div className="text-xs text-muted-foreground border rounded-lg py-16 text-center">
          Sem foto nesta data
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onZoom(selected, group!.label)}
          className="block w-full cursor-zoom-in"
          title="Clique para ampliar"
        >
          <Media
            item={selected}
            alt={`Foto de ${group?.label}`}
            className="w-full h-[460px] object-contain rounded-lg border bg-muted/40"
          />
        </button>
      )}

      {/* Miniaturas: escolhe QUAL foto desta data entra na comparação */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.path}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Selecionar foto ${i + 1} de ${group?.label}`}
              aria-pressed={i === index}
              className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                i === index
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Media
                item={p}
                alt={`Miniatura ${i + 1}`}
                className="h-20 w-16 object-cover bg-muted"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PhotoEvolution({ groups }: { groups: PhotoGroup[] }) {
  const firstDate = groups[0]?.date ?? ''
  const lastDate = groups.length > 1 ? groups[groups.length - 1].date : firstDate

  const [leftDate, setLeftDate] = React.useState(firstDate)
  const [rightDate, setRightDate] = React.useState(lastDate)
  const [leftIdx, setLeftIdx] = React.useState(0)
  const [rightIdx, setRightIdx] = React.useState(0)
  const [lightbox, setLightbox] = React.useState<{ item: PhotoItem; label: string } | null>(null)

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

  // Trocar os lados leva junto a foto escolhida em cada um
  function swap() {
    setLeftDate(rightDate); setRightDate(leftDate)
    setLeftIdx(rightIdx);   setRightIdx(leftIdx)
  }

  const openZoom = React.useCallback(
    (item: PhotoItem, label: string) => setLightbox({ item, label }), [],
  )

  return (
    <>
      {/* ── Comparação ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Comparar duas fotos</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha a data de cada lado e, nas miniaturas, qual foto entra na comparação.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <CompareSide
              side="antes"
              groups={groups}
              date={leftDate}
              index={leftIdx}
              onDateChange={(d) => { setLeftDate(d); setLeftIdx(0) }}
              onIndexChange={setLeftIdx}
              onZoom={openZoom}
            />
            <CompareSide
              side="depois"
              groups={groups}
              date={rightDate}
              index={rightIdx}
              onDateChange={(d) => { setRightDate(d); setRightIdx(0) }}
              onIndexChange={setRightIdx}
              onZoom={openZoom}
            />
          </div>

          <div className="flex items-center justify-center">
            <Button variant="outline" size="sm" onClick={swap} className="gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Inverter lados
            </Button>
          </div>

          {leftDate === rightDate && (
            <p className="text-xs text-amber-600 text-center">
              As duas datas são iguais — escolha datas diferentes para comparar a evolução.
            </p>
          )}
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
                    onClick={() => openZoom(p, g.label)}
                    className="block w-full cursor-zoom-in"
                  >
                    <Media
                      item={p}
                      alt={`Foto de ${g.label}`}
                      className="w-full h-44 object-cover rounded-lg border bg-muted"
                    />
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
            <Media
              item={lightbox.item}
              alt={`Foto de ${lightbox.label}`}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  )
}
