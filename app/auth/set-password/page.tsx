// Define senha após clicar no convite Supabase
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [pwd, setPwd] = React.useState('')
  const [pwd2, setPwd2] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    // Sem sessão (convite expirou ou link direto) → manda pra login
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/auth/login?error=invite')
      else setReady(true)
    })
  }, [router, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwd.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres'); return }
    if (pwd !== pwd2) { toast.error('As senhas não coincidem'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Senha definida! Redirecionando...')
    // Role decide o destino
    const { data: { user } } = await supabase.auth.getUser()
    const role = (user?.user_metadata as { role?: string } | null)?.role
    router.replace(role === 'admin' ? '/dashboard' : '/portal')
    router.refresh()
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Defina sua senha</CardTitle>
          <p className="text-sm text-muted-foreground">Crie uma senha para acessar seu portal de acompanhamento.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pwd">Nova senha</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={8} required disabled={loading} />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres.</p>
            </div>
            <div>
              <Label htmlFor="pwd2">Confirme a senha</Label>
              <Input id="pwd2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} minLength={8} required disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar e continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
