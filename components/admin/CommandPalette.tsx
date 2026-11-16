'use client'
// Paleta ⌘K estilo Linear: abre com Cmd/Ctrl+K, busca paciente + atalhos.
// Baseada em cmdk (Paco Coursey) — padrão do vídeo "Ban the AI Look".
import * as React from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import {
  Search, Users, Wallet, ClipboardList, LayoutDashboard,
  Trophy, Target, MessageSquare, Flame, Swords, Bell, Eye,
} from 'lucide-react'

type Patient = { id: string; name: string; email: string | null; phone: string | null }

const SHORTCUTS: { label: string; href: string; Icon: typeof Users }[] = [
  { label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { label: 'Pacientes', href: '/patients', Icon: Users },
  { label: 'Financeiro', href: '/financial', Icon: Wallet },
  { label: 'Questionários', href: '/questionnaires', Icon: ClipboardList },
  { label: 'Ranking', href: '/admin/ranking', Icon: Trophy },
  { label: 'Metas', href: '/admin/metas', Icon: Target },
  { label: 'Desafios', href: '/admin/desafios', Icon: Swords },
  { label: 'Hábitos', href: '/admin/habitos', Icon: Flame },
  { label: 'Comunidade', href: '/admin/comunidade', Icon: MessageSquare },
  { label: 'Notificações', href: '/notifications', Icon: Bell },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(false)

  // Hotkey Cmd/Ctrl+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Debounced fetch
  React.useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!r.ok) return
        const j = await r.json()
        setPatients(j.patients ?? [])
      } catch {}
      finally { setLoading(false) }
    }, 150)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, open])

  const go = React.useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  if (!open) return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Abrir busca (⌘K)"
      className="hidden sm:inline-flex items-center gap-2 text-xs text-muted-foreground border rounded-md px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Buscar…</span>
      <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
      >
        <Command label="Comandos" shouldFilter={false} className="flex flex-col max-h-[70vh]">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder="Buscar paciente, telefone, email, página…"
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
          </div>
          <Command.List className="overflow-y-auto p-1">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {loading ? 'Buscando…' : 'Nada encontrado.'}
            </Command.Empty>

            {patients.length > 0 && (
              <Command.Group heading="Pacientes" className="text-xs text-muted-foreground px-2 py-1.5">
                {patients.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`patient-${p.id}-${p.name}`}
                    onSelect={() => go(`/patients/${p.id}`)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {p.phone ?? p.email ?? '—'}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Ir para" className="text-xs text-muted-foreground px-2 py-1.5">
              {SHORTCUTS.filter((s) =>
                q.length === 0 || s.label.toLowerCase().includes(q.toLowerCase()),
              ).map((s) => (
                <Command.Item
                  key={s.href}
                  value={`nav-${s.href}`}
                  onSelect={() => go(s.href)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground cursor-pointer"
                >
                  <s.Icon className="h-4 w-4 text-muted-foreground" />
                  {s.label}
                </Command.Item>
              ))}
              <Command.Item
                value="view-as-patient"
                onSelect={() => {
                  setOpen(false)
                  const form = document.createElement('form')
                  form.method = 'POST'
                  form.action = '/api/admin/enter-patient-view'
                  document.body.appendChild(form)
                  form.submit()
                }}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-yellow-600 aria-selected:bg-accent cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                Ver como paciente
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
