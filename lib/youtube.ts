// Extrai o ID de vídeo de links do YouTube (watch, youtu.be, shorts, embed, live, m.).
// Retorna null se não for um link válido do YouTube.
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const raw = url.trim()
  if (/^[\w-]{11}$/.test(raw)) return raw
  let u: URL
  try {
    u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/)
      if (m) id = m[2]
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null
}

// Início do vídeo em segundos a partir de ?t=1m30s / ?t=90 / ?start=90.
export function youtubeStart(url: string | null | undefined): number {
  if (!url) return 0
  try {
    const u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`)
    const t = u.searchParams.get('t') ?? u.searchParams.get('start')
    if (!t) return 0
    if (/^\d+$/.test(t)) return Number(t)
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/)
    if (!m) return 0
    return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  } catch {
    return 0
  }
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  if (!id) return null
  const start = youtubeStart(url)
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${start ? `&start=${start}` : ''}`
}

export function youtubeThumb(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null
}

export function youtubeWatchUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  if (!id) return null
  const start = youtubeStart(url)
  return `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`
}
