'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Search, Send, Eye } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

export type PatientRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp_phone: string | null
  plan_type: string | null
  plan_value: number | null
  active: boolean
  questionnaire_status: 'pending' | 'responded' | null
}

interface Props {
  patients: PatientRow[]
  pendingCount: number
}

export function PatientsTable({ patients, pendingCount }: Props) {
  const [search, setSearch] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [result, setResult] = React.useState<{
    sent: number; failed: number; skipped: number; total: number
  } | null>(null)

  const filtered = React.useMemo(
    () => patients.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [patients, search],
  )

  async function sendReminders() {
    if (pendingCount === 0) { toast.info('Nenhum paciente com questionário pendente'); return }
    if (!confirm(`Enviar lembrete via WhatsApp para ${pendingCount} paciente(s) com questionário pendente?`)) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/blast-questionnaire-reminders', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setResult(json)
      toast.success(`${json.sent} enviada(s) · ${json.failed} falha(s) · ${json.skipped} sem WhatsApp`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={sendReminders}
            disabled={sending}
            className="flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Enviando…' : (
              pendingCount > 0
                ? `Lembretes (${pendingCount} pendentes)`
                : 'Lembretes'
            )}
          </Button>
        </div>
      </div>

      {/* Result strip */}
      {result && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Resultado: <span className="font-medium text-green-600">{result.sent} enviadas</span>
          {result.failed > 0 && <span className="text-destructive"> · {result.failed} falhas</span>}
          {result.skipped > 0 && <span className="text-muted-foreground"> · {result.skipped} sem WhatsApp</span>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Contato</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Plano</th>
              <th className="text-center px-4 py-2.5 font-medium">Status</th>
              <th className="text-center px-4 py-2.5 font-medium">Questionário</th>
              <th className="text-right px-4 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                {/* Nome */}
                <td className="px-4 py-3 font-medium">{p.name}</td>

                {/* Contato */}
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  <div className="truncate max-w-[180px]">{p.email ?? '—'}</div>
                  {(p.whatsapp_phone ?? p.phone) && (
                    <div className="text-xs">{p.whatsapp_phone ?? p.phone}</div>
                  )}
                </td>

                {/* Plano */}
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  <span>{p.plan_type ?? '—'}</span>
                  {p.plan_value ? <span className="ml-1 text-xs">{formatBRL(Number(p.plan_value))}</span> : null}
                </td>

                {/* Status ativo */}
                <td className="px-4 py-3 text-center">
                  <Badge variant={p.active ? 'success' : 'secondary'} className="text-[10px]">
                    {p.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>

                {/* Questionário */}
                <td className="px-4 py-3 text-center">
                  {!p.active ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : p.questionnaire_status === 'responded' ? (
                    <Badge variant="success" className="text-[10px]">✓ Respondeu</Badge>
                  ) : p.questionnaire_status === 'pending' ? (
                    <Badge variant="warning" className="text-[10px]">⏳ Pendente</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>

                {/* Ações */}
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/patients/${p.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} de {patients.length} paciente(s)
        {search && ` — busca: "${search}"`}
      </p>
    </div>
  )
}
