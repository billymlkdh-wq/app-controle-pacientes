'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
// Grid de cards de pacientes — opção 2 do redesign UI.
// Cada card: avatar (foto ou inicial) + nome + plano + pills de status
// (Ativo/Inativo, questionário, streak, XP) + ações rápidas (WhatsApp, Ver).
// Mantém a mesma busca, sort e blast de lembretes da antiga PatientsTable.
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Search, Send, Eye, MessageCircle, Flame, Sparkles,
  CheckCircle2, Clock, Minus, HeartHandshake, Undo2,
} from 'lucide-react'
import { formatBRL } from '@/lib/utils'

export type PatientCard = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp_phone: string | null
  plan_type: string | null
  plan_value: number | null
  active: boolean
  avatar_url: string | null
  questionnaire_status: 'pending' | 'responded' | null
  wa_link: string | null
  total_xp: number
  streak: number
  /** ISO timestamp do check-up desta semana (seg → dom), ou null. */
  checkup_this_week: string | null
  /** wa.me link pré-formado com a mensagem de check-up. */
  checkup_wa_link: string | null
}

type SortKey = 'name' | 'xp' | 'streak' | 'plan' | 'checkup'
type Filter = 'all' | 'pending' | 'responded' | 'inactive' | 'checkup_todo'

const PLAN_RANK: Record<string, number> = {
  anual: 1, semestral: 2, trimestral: 3, mensal: 4, avulso: 5,
}

export function PatientsGrid({
  patients, pendingCount,
}: { patients: PatientCard[]; pendingCount: number }) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [sortKey, setSortKey] = React.useState<SortKey>('name')
  const [filter, setFilter] = React.useState<Filter>('all')
  const [sending, setSending] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [remindedIds, setRemindedIds] = React.useState<Set<string>>(new Set())
  const [optimisticActive, setOptimisticActive] = React.useState<Record<string, boolean>>({})
  // Estado otimista do check-up: id → ISO string ou null (destildado)
  const [optimisticCheckup, setOptimisticCheckup] = React.useState<Record<string, string | null>>({})
  const [checkupBusyId, setCheckupBusyId] = React.useState<string | null>(null)

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

  // Limpa o optimistic do check-up quando o server já reflete o estado.
  // Evita "fantasma" onde o fetch retornou ok mas o optimistic mascara o novo valor.
  React.useEffect(() => {
    setOptimisticCheckup((prev) => {
      if (Object.keys(prev).length === 0) return prev
      const next: Record<string, string | null> = {}
      for (const [id, val] of Object.entries(prev)) {
        const server = patients.find((p) => p.id === id)
        if (!server) continue
        // Match: ambos "feito" (truthy) ou ambos pendentes (falsy) → descarta entrada
        const serverHas = !!server.checkup_this_week
        const optHas = !!val
        if (serverHas !== optHas) next[id] = val
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [patients])

  const isActive = React.useCallback(
    (p: PatientCard) => optimisticActive[p.id] ?? p.active,
    [optimisticActive],
  )

  const checkupAt = React.useCallback(
    (p: PatientCard): string | null => (
      p.id in optimisticCheckup ? optimisticCheckup[p.id] : p.checkup_this_week
    ),
    [optimisticCheckup],
  )

  async function markCheckup(p: PatientCard) {
    setCheckupBusyId(p.id)
    const prev = checkupAt(p)
    const nowIso = new Date().toISOString()
    // Optimistic: marca como feito agora
    setOptimisticCheckup((s) => ({ ...s, [p.id]: nowIso }))
    try {
      const res = await fetch('/api/admin/checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: p.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`Check-up registrado: ${p.name.split(' ')[0]}`)
      router.refresh()
    } catch (err: any) {
      setOptimisticCheckup((s) => ({ ...s, [p.id]: prev }))
      // Mensagem clara quando a tabela ainda não existe (migration 0026 não rodada)
      const msg: string = err.message ?? 'Erro'
      const friendly = /patient_checkups|relation.*does not exist/i.test(msg)
        ? 'Rode a migration 0026_patient_checkups.sql no Supabase'
        : msg
      toast.error(friendly)
    } finally {
      setCheckupBusyId(null)
    }
  }

  async function unmarkCheckup(p: PatientCard) {
    if (!confirm(`Desmarcar check-up de ${p.name} desta semana?`)) return
    setCheckupBusyId(p.id)
    const prev = checkupAt(p)
    setOptimisticCheckup((s) => ({ ...s, [p.id]: null }))
    try {
      const res = await fetch(`/api/admin/checkup?patient_id=${p.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      toast.success('Check-up desmarcado')
      router.refresh()
    } catch (err: any) {
      setOptimisticCheckup((s) => ({ ...s, [p.id]: prev }))
      toast.error(err.message ?? 'Erro ao desmarcar')
    } finally {
      setCheckupBusyId(null)
    }
  }

  const visible = React.useMemo(() => {
    const term = search.toLowerCase().trim()
    let rows = patients.filter((p) => p.name.toLowerCase().includes(term))

    if (filter === 'pending')      rows = rows.filter((p) => isActive(p) && p.questionnaire_status === 'pending')
    if (filter === 'responded')    rows = rows.filter((p) => isActive(p) && p.questionnaire_status === 'responded')
    if (filter === 'inactive')     rows = rows.filter((p) => !isActive(p))
    if (filter === 'checkup_todo') rows = rows.filter((p) => isActive(p) && !checkupAt(p))

    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':    cmp = a.name.localeCompare(b.name, 'pt-BR'); break
        case 'xp':      cmp = b.total_xp - a.total_xp; break
        case 'streak':  cmp = b.streak - a.streak; break
        case 'plan':    cmp = (PLAN_RANK[a.plan_type ?? ''] ?? 99) - (PLAN_RANK[b.plan_type ?? ''] ?? 99); break
        case 'checkup':
          // Pendentes primeiro, depois feitos (mais antigo → mais novo)
          cmp = Number(!!checkupAt(a)) - Number(!!checkupAt(b))
          if (cmp === 0 && checkupAt(a)) cmp = (checkupAt(a) ?? '').localeCompare(checkupAt(b) ?? '')
          break
      }
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [patients, search, filter, sortKey, isActive, checkupAt])

  // Progresso do check-up semanal
  const activePatients = patients.filter(isActive)
  const checkupDone = activePatients.filter((p) => checkupAt(p)).length
  const checkupTotal = activePatients.length
  const checkupPending = checkupTotal - checkupDone
  const checkupPct = checkupTotal === 0 ? 0 : Math.round((checkupDone / checkupTotal) * 100)

  async function toggleActive(p: PatientCard) {
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
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success(`${p.name} agora está ${next ? 'ativo' : 'inativo'}`)
      router.refresh()
    } catch (err: any) {
      setOptimisticActive((prev) => {
        const copy = { ...prev }; delete copy[p.id]; return copy
      })
      toast.error(err.message ?? 'Erro ao atualizar')
    } finally {
      setTogglingId(null)
    }
  }

  async function sendReminders() {
    if (pendingCount === 0) { toast.info('Nenhum paciente com questionário pendente'); return }
    if (!confirm(`Enviar lembrete via WhatsApp para ${pendingCount} paciente(s)?`)) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/blast-questionnaire-reminders', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success(`${json.sent} enviada(s) · ${json.failed} falha(s) · ${json.skipped} sem WhatsApp`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const activeCount = visible.filter(isActive).length

  return (
    <div className="space-y-4">
      {/* ── Check-up semanal: progresso + ação pra ir direto na lista ── */}
      <CheckupWeekBanner
        done={checkupDone}
        total={checkupTotal}
        pct={checkupPct}
        pending={checkupPending}
        onFilterTodo={() => setFilter('checkup_todo')}
        active={filter === 'checkup_todo'}
      />

      {/* Toolbar: busca + filtros chips + ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-md border bg-background px-2 text-sm text-foreground"
            aria-label="Ordenar por"
          >
            <option value="name">Nome</option>
            <option value="checkup">Check-up pendente</option>
            <option value="xp">Mais XP</option>
            <option value="streak">Maior streak</option>
            <option value="plan">Plano</option>
          </select>
        </div>
        <Button
          variant="outline" size="sm" onClick={sendReminders} disabled={sending}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? 'Enviando…' : (pendingCount > 0 ? `Lembretes (${pendingCount})` : 'Lembretes')}
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Chip label={`Todos · ${patients.length}`} active={filter === 'all'} onClick={() => setFilter('all')} />
        <Chip label={`Pendentes · ${pendingCount}`} active={filter === 'pending'} onClick={() => setFilter('pending')} tone="warning" />
        <Chip
          label={`Responderam · ${patients.filter(p => isActive(p) && p.questionnaire_status === 'responded').length}`}
          active={filter === 'responded'} onClick={() => setFilter('responded')} tone="success"
        />
        <Chip
          label={`Check-up pendente · ${checkupPending}`}
          active={filter === 'checkup_todo'} onClick={() => setFilter('checkup_todo')} tone="checkup"
        />
        <Chip
          label={`Inativos · ${patients.filter(p => !isActive(p)).length}`}
          active={filter === 'inactive'} onClick={() => setFilter('inactive')} tone="muted"
        />
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="admin-card py-16 text-center text-sm text-muted-foreground">
          {search || filter !== 'all' ? 'Nenhum paciente com esses filtros.' : 'Nenhum paciente cadastrado.'}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p, i) => (
            <PatientCardItem
              key={p.id}
              patient={p}
              active={isActive(p)}
              delay={Math.min(i * 30, 300)}
              toggling={togglingId === p.id}
              onToggle={() => toggleActive(p)}
              reminded={remindedIds.has(p.id)}
              onReminded={() => setRemindedIds((prev) => new Set(prev).add(p.id))}
              checkupAt={checkupAt(p)}
              checkupBusy={checkupBusyId === p.id}
              onMarkCheckup={() => markCheckup(p)}
              onUnmarkCheckup={() => unmarkCheckup(p)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {visible.length} de {patients.length} paciente(s) — {activeCount} ativo(s)
        {search && ` · busca: "${search}"`}
      </p>
    </div>
  )
}

function Chip({
  label, active, onClick, tone = 'primary',
}: {
  label: string
  active: boolean
  onClick: () => void
  tone?: 'primary' | 'success' | 'warning' | 'muted' | 'checkup'
}) {
  const toneRing: Record<string, string> = {
    primary: 'ring-primary/40 bg-primary/10 text-foreground',
    success: 'ring-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'ring-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    muted:   'ring-muted-foreground/30 bg-muted text-muted-foreground',
    checkup: 'ring-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        active
          ? `ring-2 ring-inset ${toneRing[tone]} border-transparent`
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {label}
    </button>
  )
}

function PatientCardItem({
  patient: p, active, delay, toggling, onToggle, reminded, onReminded,
  checkupAt, checkupBusy, onMarkCheckup, onUnmarkCheckup,
}: {
  patient: PatientCard
  active: boolean
  delay: number
  toggling: boolean
  onToggle: () => void
  reminded: boolean
  onReminded: () => void
  checkupAt: string | null
  checkupBusy: boolean
  onMarkCheckup: () => void
  onUnmarkCheckup: () => void
}) {
  const initial = p.name.charAt(0).toUpperCase()
  const phoneNice = p.whatsapp_phone ?? p.phone

  return (
    <div
      className={`admin-card admin-fade group p-4 flex flex-col gap-3 ${active ? '' : 'opacity-70'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header: avatar + nome + plano */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-primary/10 text-primary grid place-items-center text-base font-semibold flex-shrink-0 border border-primary/20 overflow-hidden">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
          ) : initial}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/patients/${p.id}`}
            className="font-semibold text-sm leading-tight hover:text-primary transition-colors block truncate"
          >
            {p.name}
          </Link>
          <div className="text-[11px] text-muted-foreground truncate">
            {p.plan_type ? (
              <span className="capitalize">{p.plan_type}</span>
            ) : <span>sem plano</span>}
            {p.plan_value ? <span className="ml-1">· {formatBRL(Number(p.plan_value))}</span> : null}
          </div>
        </div>
        <Switch
          checked={active}
          onCheckedChange={onToggle}
          aria-label={`Status de ${p.name}`}
          className={`scale-90 origin-right ${toggling ? 'opacity-50 pointer-events-none' : ''}`}
        />
      </div>

      {/* Pills: status + streak + XP */}
      <div className="flex flex-wrap gap-1.5">
        {!active ? (
          <StatusPill icon={Minus} label="Inativo" tone="muted" />
        ) : p.questionnaire_status === 'responded' ? (
          <StatusPill icon={CheckCircle2} label="Respondeu" tone="success" />
        ) : p.questionnaire_status === 'pending' ? (
          <StatusPill icon={Clock} label="Pendente" tone="warning" />
        ) : (
          <StatusPill icon={Minus} label="—" tone="muted" />
        )}

        {active && p.streak > 0 && (
          <StatusPill icon={Flame} label={`${p.streak}d`} tone="orange" />
        )}
        {active && p.total_xp > 0 && (
          <StatusPill icon={Sparkles} label={`${formatCompact(p.total_xp)} XP`} tone="primary" />
        )}
        {active && checkupAt && (
          <StatusPill
            icon={HeartHandshake}
            label={`Check-up ${formatWeekday(checkupAt)}`}
            tone="pink"
          />
        )}
      </div>

      {/* Contato (só quando houver) */}
      {phoneNice && (
        <div className="text-[11px] text-muted-foreground truncate border-t pt-2">
          {phoneNice}
        </div>
      )}

      {/* ── Check-up semanal (ação principal) ──
          Quando pendente: botão rosa abre WhatsApp + marca feito.
          Quando feito: texto discreto com botão desfazer.                 */}
      {active && (
        checkupAt ? (
          <div className="flex items-center justify-between gap-2 text-xs text-pink-700 dark:text-pink-300 bg-pink-500/5 border border-pink-500/20 rounded-lg px-2.5 py-1.5">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <HeartHandshake className="h-3.5 w-3.5" />
              Check-up feito {formatWeekday(checkupAt)}
            </span>
            <button
              type="button"
              onClick={onUnmarkCheckup}
              disabled={checkupBusy}
              aria-label="Desmarcar check-up"
              title="Desmarcar"
              className="text-muted-foreground hover:text-destructive disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : p.checkup_wa_link ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={checkupBusy}
            className="h-9 border-pink-500/40 text-pink-700 dark:text-pink-300 hover:bg-pink-500/10 hover:text-pink-700 dark:hover:text-pink-200"
          >
            <a
              href={p.checkup_wa_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onMarkCheckup}
            >
              <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
              Check-up semanal
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-9 border-pink-500/20 text-muted-foreground"
            title="Sem telefone cadastrado"
          >
            <HeartHandshake className="h-3.5 w-3.5 mr-1.5 opacity-50" />
            Check-up (sem telefone)
          </Button>
        )
      )}

      {/* Ações secundárias */}
      <div className="flex items-center gap-1.5 mt-auto">
        <Button asChild variant="outline" size="sm" className="flex-1 h-8">
          <Link href={`/patients/${p.id}`}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Ver
          </Link>
        </Button>
        {active && p.wa_link ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`h-8 px-2 ${reminded ? 'text-emerald-600 border-emerald-500/40' : 'text-green-600 border-green-500/40 hover:bg-green-500/5'}`}
          >
            <a
              href={p.wa_link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp — lembrete de questionário"
              title="Lembrete de questionário"
              onClick={onReminded}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <Button
            variant="outline" size="sm" disabled className="h-8 px-2"
            aria-label={p.questionnaire_status !== 'pending' ? 'Sem questionário pendente' : 'Sem telefone'}
            title={p.questionnaire_status !== 'pending' ? 'Sem questionário pendente' : 'Sem telefone'}
          >
            <MessageCircle className="h-3.5 w-3.5 opacity-40" />
          </Button>
        )}
      </div>
    </div>
  )
}

/** Banner de progresso do check-up semanal. Monday → Sunday. */
function CheckupWeekBanner({
  done, total, pct, pending, onFilterTodo, active,
}: {
  done: number
  total: number
  pct: number
  pending: number
  onFilterTodo: () => void
  active: boolean
}) {
  const complete = total > 0 && pending === 0
  return (
    <div className={`admin-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 ${
      complete ? 'border-emerald-500' : 'border-pink-500'
    }`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`h-10 w-10 rounded-lg grid place-items-center flex-shrink-0 ${
          complete ? 'bg-emerald-500/10 text-emerald-600' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
        }`}>
          <HeartHandshake className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">
            Check-up semanal {complete && '— concluído!'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {complete
              ? `Você falou com todos os ${total} pacientes ativos esta semana.`
              : `${done} de ${total} pacientes ativos · falta${pending > 1 ? 'm' : ''} ${pending}`}
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                complete ? 'bg-emerald-500' : 'bg-pink-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      {!complete && (
        <Button
          variant={active ? 'default' : 'outline'}
          size="sm"
          onClick={onFilterTodo}
          className="sm:self-center whitespace-nowrap"
        >
          Ver pendentes ({pending})
        </Button>
      )}
    </div>
  )
}

function formatWeekday(iso: string): string {
  const d = new Date(iso)
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${days[d.getDay()]} ${hh}:${mm}`
}

function StatusPill({
  icon: Icon, label, tone,
}: {
  icon: typeof Flame
  label: string
  tone: 'success' | 'warning' | 'orange' | 'primary' | 'muted' | 'pink'
}) {
  const toneClass: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    orange:  'bg-orange-500/10 text-orange-700 dark:text-orange-300',
    primary: 'bg-primary/10 text-primary',
    muted:   'bg-muted text-muted-foreground',
    pink:    'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass[tone]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k`
  return String(n)
}
