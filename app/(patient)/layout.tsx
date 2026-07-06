/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/patient/BottomNav'
import { LEVELS } from '@/lib/gamification'

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = (user.user_metadata as any)?.role
  const isAdmin = role === 'admin'

  const db = createAdminClient() as any

  const { data: patient } = await db
    .from('patients')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle()

  let totalXP = 0
  let streak = 0

  if (patient?.id) {
    const [{ data: pts }, { data: str }] = await Promise.all([
      db.from('patient_points').select('amount').eq('patient_id', patient.id),
      db.from('patient_streaks').select('current_streak').eq('patient_id', patient.id).maybeSingle(),
    ])
    totalXP = (pts ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
    streak = str?.current_streak ?? 0
  }

  const levelIdx = LEVELS.findIndex((l) => totalXP >= l.min && totalXP <= l.max)
  const safeLevelIdx = levelIdx === -1 ? LEVELS.length - 1 : levelIdx
  const currentLevel = LEVELS[safeLevelIdx]
  const nextLevel = safeLevelIdx < LEVELS.length - 1 ? LEVELS[safeLevelIdx + 1] : null
  const progress = nextLevel
    ? Math.min(100, ((totalXP - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100
  const xpToNext = nextLevel ? nextLevel.min - totalXP : 0
  const firstName = patient?.name?.split(' ')[0] ?? 'Paciente'

  return (
    <div className="min-h-screen bg-[#0b0c1a] text-white flex flex-col">
      {/* Admin banner */}
      {isAdmin && (
        <div className="bg-yellow-500 text-yellow-950 text-xs font-medium text-center py-1.5 flex items-center justify-center gap-3 relative z-50">
          <span>👁 Modo paciente</span>
          <Link href="/api/admin/exit-patient-view" className="underline font-bold">← Voltar ao admin</Link>
        </div>
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#0b0c1a]/95 backdrop-blur border-b border-[#1e2040] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#4a5080] uppercase tracking-widest font-medium">
              Nutricionista Rafael
            </div>
            <div className="font-semibold text-sm">Bom dia, {firstName}! 👋</div>
          </div>
          <div className="bg-[#141528] border border-[#1e2040] rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
            <span>🔥</span>
            <span className="font-semibold text-orange-400">{streak} dias</span>
          </div>
        </div>
      </header>

      {/* Level / XP bar */}
      <div className="bg-[#141528] border-b border-[#1e2040] px-4 py-2.5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold tracking-wide">
              {currentLevel.emoji} {currentLevel.name.toUpperCase()}
              {nextLevel && (
                <span className="text-[#4a5080] font-normal"> → {nextLevel.name}</span>
              )}
            </span>
            <span className="text-cyan-400 text-xs font-bold">{totalXP} XP</span>
          </div>
          <div className="h-1.5 bg-[#1e2040] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextLevel && (
            <div className="text-[10px] text-[#4a5080] mt-1 text-right">
              {xpToNext} XP para {nextLevel.name}
            </div>
          )}
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full px-4 py-4">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
