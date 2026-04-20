// Verifica o hashed_token gerado pelo admin (bypass do PKCE).
// Chama supabase.auth.verifyOtp no cliente → cria a sessão → vai pro next.
'use client'
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type OtpType = 'invite' | 'recovery' | 'signup' | 'email_change' | 'magiclink'

export default function VerifyPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [msg, setMsg] = React.useState('Validando seu link...')

  React.useEffect(() => {
    const supabase = createClient()
    const token_hash = params.get('token_hash')
    const type = (params.get('type') || 'invite') as OtpType
    const next = params.get('next') || '/'

    async function run() {
      if (!token_hash) {
        setMsg('Link inválido (sem token).')
        setTimeout(() => router.replace('/auth/login?error=link_invalido'), 1500)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.auth.verifyOtp({ token_hash, type } as any)
      if (error) {
        setMsg(`Falha ao validar: ${error.message}`)
        setTimeout(() => router.replace(`/auth/login?error=${encodeURIComponent(error.message)}`), 2500)
        return
      }
      router.replace(next)
    }

    run()
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  )
}
