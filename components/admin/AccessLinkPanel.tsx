// Painel de acesso do paciente — gera link de criação/redefinição de senha,
// permite copiar e compartilhar por WhatsApp.
'use client'
import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Result = {
  url: string
  mode: 'invite' | 'recovery'
  email: string
  whatsapp_phone: string | null
  name: string
}

function onlyDigits(s: string | null | undefined) {
  return (s ?? '').replace(/\D+/g, '')
}

function buildWhatsAppHref(phoneDigits: string, name: string, url: string, mode: 'invite' | 'recovery') {
  const intro = mode === 'invite'
    ? `Olá, ${name}! Esse é o link para você criar sua senha e acessar seu acompanhamento:`
    : `Olá, ${name}! Esse é um novo link para você redefinir sua senha e acessar seu acompanhamento:`
  const text = `${intro}\n\n${url}\n\n(Link válido por tempo limitado — use assim que puder.)`
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export function AccessLinkPanel({ patientId, hasEmail }: { patientId: string; hasEmail: boolean }) {
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<Result | null>(null)

  async function generate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/patients/${patientId}/invite`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao gerar link')
        return
      }
      setResult(data as Result)
      toast.success(data.mode === 'recovery' ? 'Link de redefinição gerado' : 'Link de convite gerado')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.url)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar — selecione manualmente')
    }
  }

  const whatsappHref = result
    ? buildWhatsAppHref(onlyDigits(result.whatsapp_phone), result.name, result.url, result.mode)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acesso do paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Gere um link para o paciente criar (ou redefinir) a senha. Você pode copiar o link ou
          abrir o WhatsApp já com a mensagem pronta.
        </p>
        {!hasEmail && (
          <p className="text-xs text-destructive">
            Paciente sem email cadastrado. Adicione um email antes de gerar o link.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={generate} disabled={loading || !hasEmail}>
            {loading ? 'Gerando...' : result ? 'Gerar novo link' : 'Gerar link de acesso'}
          </Button>
        </div>

        {result && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Tipo: <strong>{result.mode === 'invite' ? 'Primeiro acesso (convite)' : 'Redefinir senha'}</strong>
              {' · '}Email: <strong>{result.email}</strong>
              {result.whatsapp_phone
                ? <> · WhatsApp: <strong>{result.whatsapp_phone}</strong></>
                : <> · <span className="text-destructive">sem WhatsApp cadastrado</span></>}
            </div>
            <Input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copy}>Copiar link</Button>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  Enviar no WhatsApp
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Este link é pessoal e expira. Se o paciente não usar a tempo, gere um novo aqui.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
