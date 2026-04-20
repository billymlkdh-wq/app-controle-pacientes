// Callback Supabase — suporta ambos os formatos de retorno:
// 1) PKCE → ?code=... (exchangeCodeForSession)
// 2) Implicit/hash → #access_token=...&refresh_token=... (setSession)
// useSearchParams deve ficar dentro de <Suspense/> em Next 15.
'use client'
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [msg, setMsg] = React.useState('Autenticando...')

  React.useEffect(() => {
    const supabase = createClient()
    const next = params.get('next') || '/'

    async function run() {
      try {
        const code = params.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          router.replace(next)
          return
        }
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (hash && hash.length > 1) {
          const h = new URLSearchParams(hash.substring(1))
          const access_token = h.get('access_token')
          const refresh_token = h.get('refresh_token')
          const errorDesc = h.get('error_description') || h.get('error')
          if (errorDesc) throw new Error(errorDesc)
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            router.replace(next)
            return
          }
        }
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          router.replace(next)
          return
        }
        throw new Error('Link inválido ou expirado.')
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Erro de autenticação'
        setMsg(m)
        setTimeout(() => router.replace(`/auth/login?error=${encodeURIComponent(m)}`), 2000)
      }
    }

    run()
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
      <CallbackInner />
    </React.Suspense>
  )
}
