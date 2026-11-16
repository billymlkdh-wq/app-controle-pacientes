/* eslint-disable @typescript-eslint/no-explicit-any */
// Layout paciente — header de XP CLIENT (auto-refresh) + bottom nav.
// Mantém SSR com valores iniciais pra evitar flash em 0, mas é o CLIENT
// XPHeaderFull que mostra e revalida (resolve bug do XP não atualizar).
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/patient/BottomNav'
import { XPHeaderFull } from '@/components/patient/XPHeader'
import { LEVELS, getLevelName } from '@/lib/gamification'

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = (user.app_metadata as any)?.role
  const isAdmin = role === 'admin'

  const db = createAdminClient() as any

  const { data: patient } = await db
    .from('patients')
    .select('id, sex, last_seen_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Last-seen (base pros nudges). Só grava se >15 min desde o último hit.
  if (patient?.id && !isAdmin) {
    const last = patient.last_seen_at as string | null
    const stale = !last || Date.now() - new Date(last).getTime() > 15 * 60 * 1000
    if (stale) {
      const { error } = await db.from('patients')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', patient.id)
      if (error) console.error('[last_seen] update FAILED', error.message)
    }
  }

  // Valores iniciais apenas pra SSR sem flash. XPHeaderFull re-fetch no mount.
  let initial = undefined
  if (patient?.id) {
    const [{ data: pts }, { data: str }] = await Promise.all([
      db.from('patient_points').select('amount').eq('patient_id', patient.id),
      db.from('patient_streaks').select('current_streak').eq('patient_id', patient.id).maybeSingle(),
    ])
    const totalXP = (pts ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
    const streak = str?.current_streak ?? 0
    const idx = LEVELS.findIndex((l) => totalXP >= l.min && totalXP <= l.max)
    const safe = idx === -1 ? LEVELS.length - 1 : idx
    const current = LEVELS[safe]
    const next = safe < LEVELS.length - 1 ? LEVELS[safe + 1] : null
    const progress = next
      ? Math.min(100, ((totalXP - current.min) / (next.min - current.min)) * 100)
      : 100
    initial = {
      totalXP, streak,
      levelEmoji: current.emoji,
      levelName: getLevelName(current, patient.sex),
      nextLevelName: next ? getLevelName(next, patient.sex) : null,
      progress,
      xpToNext: next ? next.min - totalXP : 0,
    }
  }

  return (
    <div data-patient="true" className="min-h-screen bg-[#0f0d0a] text-white flex flex-col">
      {isAdmin && (
        <div className="bg-yellow-500 text-yellow-950 text-xs font-medium text-center py-1.5 flex items-center justify-center gap-3 relative z-50">
          <span>👁 Modo paciente</span>
          <form action="/api/admin/exit-patient-view" method="post" className="inline">
            <button type="submit" className="underline font-bold">← Voltar ao admin</button>
          </form>
        </div>
      )}

      <XPHeaderFull initial={initial} />

      <main className="flex-1 pb-24 max-w-lg mx-auto w-full px-4 py-4">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
