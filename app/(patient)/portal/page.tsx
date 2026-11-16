// Home do paciente — Dark Gamified: hero com número gigante + atalhos em row cards.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatDateBR, todayBR } from '@/lib/utils'
import { daysUntilDue, isOverdue } from '@/lib/questionnaire/schedule'
import {
  Utensils, Dumbbell, LineChart, ChevronRight, Sparkles,
  ClipboardList, Lock, AlarmClock,
} from 'lucide-react'

export default async function PortalHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: patient } = await supabase
    .from('patients').select('*').eq('user_id', user!.id).single()

  const { data: schedule } = patient
    ? await supabase
        .from('questionnaire_schedule')
        .select('*')
        .eq('patient_id', patient.id)
        .in('status', ['pending', 'overdue'])
        .is('completed_at', null)
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // Stats compactas: refeições de hoje feitas e split de treino
  let mealsDoneToday = 0
  let mealsTotalToday = 0
  let lastMealTime: string | null = null
  if (patient?.id) {
    const db = createAdminClient() as any
    // Janela do dia: [00:00 local, +24h). Supabase lê como UTC, mas comparando
    // pelo timestamp direto resolve. completed_at é timestamptz.
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    try {
      const [{ data: plans }, { data: completions }] = await Promise.all([
        db.from('meal_plans')
          .select('id, meals:meal_plan_meals(id)')
          .eq('patient_id', patient.id)
          .eq('active', true)
          .limit(1)
          .maybeSingle(),
        db.from('meal_completions')
          .select('meal_id, completed_at')
          .eq('patient_id', patient.id)
          .gte('completed_at', start.toISOString())
          .lt('completed_at', end.toISOString()),
      ])
      mealsTotalToday = plans?.meals?.length ?? 0
      mealsDoneToday = completions?.length ?? 0
      const latest = (completions ?? []).sort((a: any, b: any) =>
        String(b.completed_at ?? '').localeCompare(String(a.completed_at ?? '')),
      )[0]
      if (latest?.completed_at) {
        const d = new Date(latest.completed_at)
        lastMealTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
    } catch (e) {
      console.error('[portal] meal stats failed', e)
    }
  }

  const today = todayBR()
  const [ty, tm, td] = today.split('-').map(Number)
  const wsDate = new Date(ty, tm - 1, td - 2)
  const windowStart = `${wsDate.getFullYear()}-${String(wsDate.getMonth() + 1).padStart(2, '0')}-${String(wsDate.getDate()).padStart(2, '0')}`
  const overdue = schedule ? isOverdue(schedule.due_date) : false
  const days = schedule ? daysUntilDue(schedule.due_date) : null
  const locked  = !!schedule && schedule.due_date > today
  const expired = !!schedule && schedule.due_date < windowStart
  const canAnswer = schedule && !locked && !expired

  const heroEyebrow = schedule ? 'Próximo questionário' : 'Tudo em dia'
  const heroBigLine = !schedule
    ? 'Nada pendente'
    : expired  ? 'Prazo expirado'
    : overdue  ? `${Math.abs(daysUntilDue(schedule.due_date))} dias atrasado`
    : locked   ? `Em ${days} dias`
    : days === 0 ? 'Hoje'
    : `Em ${days} dias`
  const heroSubline = !schedule
    ? 'Volte quando o próximo for liberado.'
    : `${formatDateBR(schedule.due_date)}${canAnswer ? ' · +100 XP no prazo' : ''}`

  return (
    <div className="space-y-5">
      {/* ── Hero próximo questionário ──────────────────────────────────── */}
      <div className="p-hero p-fade rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#fbbf24]">
          {heroEyebrow}
        </div>
        <h1 className="p-display-xl text-5xl text-[#f5efe0] mt-1.5 leading-none">
          {heroBigLine}
        </h1>
        <p className="text-sm text-[#9a8c70] mt-2">{heroSubline}</p>

        {canAnswer ? (
          <Link href="/questionnaire" className="p-cta mt-4">
            Responder agora
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : expired ? (
          <button disabled className="p-cta mt-4 opacity-50 cursor-not-allowed">
            <Lock className="h-3.5 w-3.5" /> Prazo expirado
          </button>
        ) : locked ? (
          <button disabled className="p-cta mt-4 opacity-50 cursor-not-allowed">
            <AlarmClock className="h-3.5 w-3.5" /> Em espera
          </button>
        ) : null}
      </div>

      {/* ── Stats bento 2x2 ────────────────────────────────────────────── */}
      {mealsTotalToday > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-stat p-fade" style={{ animationDelay: '60ms' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[#6b6250]">
              Refeições hoje
            </div>
            <div className="p-display-xl text-3xl mt-1 flex items-baseline gap-1 text-[#fbbf24]">
              {mealsDoneToday}
              <span className="text-sm text-[#9a8c70] font-medium">/ {mealsTotalToday}</span>
            </div>
            <div className="text-[11px] text-[#9a8c70] mt-1">
              {mealsDoneToday < mealsTotalToday
                ? `+${(mealsTotalToday - mealsDoneToday) * 15} XP se completar`
                : lastMealTime ? `última às ${lastMealTime}` : 'tudo marcado!'}
            </div>
          </div>
          <div className="p-stat p-fade" style={{ animationDelay: '120ms' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[#6b6250]">
              Ganho hoje
            </div>
            <div className="p-display-xl text-3xl mt-1 flex items-baseline gap-1 text-[#22c55e]">
              {mealsDoneToday * 15}
              <span className="text-sm text-[#9a8c70] font-medium">XP</span>
            </div>
            <div className="text-[11px] text-[#9a8c70] mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#fbbf24]" />
              das refeições
            </div>
          </div>
        </div>
      )}

      {/* ── Atalhos — row cards ───────────────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#6b6250] mb-2">
          <span className="inline-block w-1 h-1 rounded-full bg-[#fbbf24] mr-1.5 align-middle" />
          Pra hoje
        </div>
        <div className="space-y-2">
          <AtalhoRow
            href="/plano"
            iconBg="bg-yellow-500/10"
            icon={<Utensils className="h-4 w-4 text-yellow-400" />}
            title="Plano alimentar"
            subtitle={mealsTotalToday > 0 ? `${mealsDoneToday} de ${mealsTotalToday} refeições hoje` : 'ver seu cardápio'}
            delay={180}
          />
          <AtalhoRow
            href="/treino"
            iconBg="bg-yellow-500/10"
            icon={<Dumbbell className="h-4 w-4 text-yellow-400" />}
            title="Treino"
            subtitle="abrir seu split"
            delay={220}
          />
          <AtalhoRow
            href="/progress"
            iconBg="bg-yellow-500/10"
            icon={<LineChart className="h-4 w-4 text-yellow-400" />}
            title="Evolução"
            subtitle="gráficos e fotos"
            delay={260}
          />
          <AtalhoRow
            href="/questionnaire"
            iconBg="bg-yellow-500/10"
            icon={<ClipboardList className="h-4 w-4 text-yellow-400" />}
            title="Questionário"
            subtitle={canAnswer ? '+100 XP respondendo' : 'ver histórico'}
            delay={300}
          />
        </div>
      </div>
    </div>
  )
}

function AtalhoRow({
  href, icon, iconBg, title, subtitle, delay,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  delay: number
}) {
  return (
    <Link
      href={href}
      className="p-fade group flex items-center gap-3 rounded-xl border border-[#2a2419] bg-[#1a1610] px-3.5 py-3 hover:border-yellow-500/40 hover:bg-[#22201a] transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`h-10 w-10 rounded-lg ${iconBg} grid place-items-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="p-display text-[15px] text-[#f5efe0] leading-tight">{title}</div>
        <div className="text-[11px] text-[#9a8c70] mt-0.5">{subtitle}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-[#6b6250] group-hover:text-yellow-400 transition-colors" />
    </Link>
  )
}
