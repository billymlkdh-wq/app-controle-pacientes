// Página de login — e-mail + senha via supabase.auth.signInWithPassword
// Inclui fluxo "Esqueci minha senha" com resetPasswordForEmail
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [resetSent, setResetSent] = React.useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const role = (data.user?.user_metadata as { role?: string } | null)?.role
      toast.success('Bem-vindo!')
      router.push(role === 'admin' ? '/dashboard' : '/portal')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/set-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar e-mail')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m)
    setResetSent(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Rafael Bolson Nutricionista</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Entre com seu e-mail e senha' : 'Recuperação de senha'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ── Login ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}

          {/* ── Forgot password ── */}
          {mode === 'forgot' && !resetSent && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          )}

          {/* ── Sent confirmation ── */}
          {mode === 'forgot' && resetSent && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📧</div>
              <p className="text-sm font-medium">Link enviado!</p>
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada em <span className="font-medium text-foreground">{email}</span> e clique no link para criar uma nova senha.
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
