'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Search, Send, Eye, ArrowUp, ArrowDown, ChevronsUpDown, MessageCircle, Loader2 } from 'lucide-react'
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

type SortKey = 'name' | 'plan' | 'status' | 'questionnaire'
type SortDir = 'asc' | 'desc'

// Ordem de valor dos planos — do maior compromisso ao menor
const PLAN_RANK: Record<string, number> = {
  anual: 1, semestral: 2, trimestral: 3, mensal: 4, avulso: 5,
}
// Pendente primeiro: é o que exige ação
const QUEST_RANK: Record<string, number> = { pending: 1, responded: 2, none: 3 }

export function PatientsTable({ patients, pendingCount }: Props) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>('name')
  const [sortDir, setSortDir] = React.useState<SortDir>('asc')
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [remindingId, setRemindingId] = React.useState<string | null>(null)
  // Quem já recebeu lembrete nesta sessão — evita mandar duas vezes sem perceber
  const [remindedIds, setRemindedIds] = React.useState<Set<string>>(new Set())
  // Estado otimista: id -> active. Some quando o refresh do servidor confirma.
  const [optimisticActive, setOptimisticActive] = React.useState<Record<string, boolean>>({})
  const [result, setResult] = React.useState<{
    sent: number; failed: number; skipped: number; total: number
  } | null>(null)

  // Limpa o estado otimista quando os dados do servidor chegam iguais
  React.useEffect(() => {
    setOptimisticActive((prev) => {
      if (Object.keys(prev).length === 0) return prev
      const next: Record<string, boolean> = {}
      for (const [id, val] of Object.entries(prev)) {
        const server = patients.find((p) => p.id === id)
        if (server && server.active !== val) next[id] = val
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [patients])

  function isActive(p: PatientRow) {
    return optimisticActive[p.id] ?? p.active
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const visible = React.useMemo(() => {
    const term = search.toLowerCase()
    const rows = patients.filter((p) => p.name.toLowerCase().includes(term))

    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'pt-BR')
          break
        case 'plan': {
          const ra = PLAN_RANK[a.plan_type ?? ''] ?? 99
          const rb = PLAN_RANK[b.plan_type ?? ''] ?? 99
          cmp = ra - rb || Number(b.plan_value ?? 0) - Number(a.plan_value ?? 0)
          break
        }
        case 'status':
          // Ativos primeiro no asc
          cmp = Number(isActive(b)) - Number(isActive(a))
          break
        case 'questionnaire': {
          const ka = !isActive(a) ? 'none' : a.questionnaire_status ?? 'none'
          const kb = !isActive(b) ? 'none' : b.questionnaire_status ?? 'none'
          cmp = QUEST_RANK[ka] - QUEST_RANK[kb]
          break
        }
      }
      // Desempate estável por nome
      return cmp !== 0 ? cmp * dir : a.name.localeCompare(b.name, 'pt-BR')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, search, sortKey, sortDir, optimisticActive])

  async function toggleActive(p: PatientRow) {
    const next = !isActive(p)
    if (!next && !confirm(`Tornar ${p.name} inativo? O paciente perde acesso aos questionários.`)) return

    setTogglingId(p.id)
    setOptimisticActive((prev) => ({ ...prev, [p.id]: next }))
    try {
      const res = await fetch(`/api/patients/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao atualizar')
      toast.success(`${p.name} agora está ${next ? 'ativo' : 'inativo'}`)
      router.refresh()
    } catch (err: any) {
      setOptimisticActive((prev) => {
        const copy = { ...prev }
        delete copy[p.id]
        return copy
      })
      toast.error(err.message ?? 'Erro ao atualizar status')
    } finally {
      setTogglingId(null)
    }
  }

  async function sendOneReminder(p: PatientRow) {
    const phone = p.whatsapp_phone ?? p.phone
    if (!confirm(`Enviar lembrete de questionário para ${p.name} no WhatsApp ${phone}?`)) return

    setRemindingId(p.id)
    try {
      const res = await fetch(`/api/patients/${p.id}/questionnaire-reminder`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar')
      setRemindedIds((prev) => new Set(prev).add(p.id))
      toast.success(`Lembrete enviado para ${p.name}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar lembrete')
    } finally {
      setRemindingId(null)
    }
  }

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

  function SortHeader({
    label, sortkey, className,
  }: { label: string; sortkey: SortKey; className?: string }) {
    const activeSort = sortKey === sortkey
    const Icon = !activeSort ? ChevronsUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={className}>
        <button
          type="button"
          onClick={() => toggleSort(sortkey)}
          className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
            activeSort ? 'text-foreground font-semibold' : ''
          }`}
        >
          {label}
          <Icon className={`h-3 w-3 ${activeSort ? 'opacity-100' : 'opacity-40'}`} />
        </button>
      </th>
    )
  }

  const activeCount = visible.filter(isActive).length

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
              <SortHeader label="Nome" sortkey="name" className="text-left px-4 py-2.5 font-medium" />
              <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Contato</th>
              <SortHeader label="Plano" sortkey="plan" className="text-left px-4 py-2.5 font-medium hidden md:table-cell" />
              <SortHeader label="Status" sortkey="status" className="text-center px-4 py-2.5 font-medium" />
              <SortHeader label="Questionário" sortkey="questionnaire" className="text-center px-4 py-2.5 font-medium" />
              <th className="text-right px-4 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}
                </td>
              </tr>
            )}
            {visible.map((p) => {
              const active = isActive(p)
              return (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                    active ? '' : 'opacity-60'
                  }`}
                >
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
                    <span className="capitalize">{p.plan_type ?? '—'}</span>
                    {p.plan_value ? <span className="ml-1 text-xs">{formatBRL(Number(p.plan_value))}</span> : null}
                  </td>

                  {/* Status ativo — editável */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={active}
                        onCheckedChange={() => toggleActive(p)}
                        aria-label={`Status de ${p.name}`}
                        className={togglingId === p.id ? 'opacity-50 pointer-events-none' : ''}
                      />
                      <span className={`text-xs w-11 text-left ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>

                  {/* Questionário */}
                  <td className="px-4 py-3 text-center">
                    {!active ? (
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(() => {
                        const pending = active && p.questionnaire_status === 'pending'
                        const hasPhone = Boolean(p.whatsapp_phone ?? p.phone)
                        const busy = remindingId === p.id
                        const done = remindedIds.has(p.id)
                        const title = !pending
                          ? 'Sem questionário pendente'
                          : !hasPhone
                            ? 'Paciente sem telefone cadastrado'
                            : done
                              ? 'Lembrete já enviado agora há pouco'
                              : 'Enviar lembrete no WhatsApp'
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            title={title}
                            aria-label={title}
                            disabled={!pending || !hasPhone || busy}
                            onClick={() => sendOneReminder(p)}
                            className={done ? 'text-emerald-600' : pending && hasPhone ? 'text-green-600' : ''}
                          >
                            {busy
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <MessageCircle className="h-3.5 w-3.5" />}
                          </Button>
                        )
                      })()}
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/patients/${p.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {visible.length} de {patients.length} paciente(s) — {activeCount} ativo(s)
        {search && ` · busca: "${search}"`}
      </p>
    </div>
  )
}
