/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ACHIEVEMENTS, getLevel, getLevelName } from '@/lib/gamification'
import { AvatarUpload } from '@/components/patient/AvatarUpload'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient() as any

  const { data: patient } = await db
    .from('patients').select('id, name, sex, avatar_url, objective, birth_date').eq('user_id', user!.id).maybeSingle()

  const patientId = (patient as any)?.id as string | undefined

  const [{ data: earnedRaw }, { data: pointsRaw }, { data: streakRaw }] = await Promise.all([
    db.from('patient_achievements').select('achievement_key, earned_at').eq('patient_id', patientId ?? ''),
    db.from('patient_points').select('amount').eq('patient_id', patientId ?? ''),
    db.from('patient_streaks').select('current_streak, longest_streak').eq('patient_id', patientId ?? '').maybeSingle(),
  ])

  const earnedMap = new Map(
    ((earnedRaw ?? []) as any[]).map((a: any) => [a.achievement_key as string, a.earned_at as string])
  )
  const totalXP = ((pointsRaw ?? []) as any[]).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
  const level = getLevel(totalXP)
  const sex = (patient as any)?.sex as string | null
  const streak = (streakRaw as any)?.current_streak ?? 0
  const longestStreak = (streakRaw as any)?.longest_streak ?? 0
  const name = (patient as any)?.name ?? 'Paciente'
  const avatarUrl = (patient as any)?.avatar_url ?? null

  return (
    <div className="space-y-6">
      <p className="text-[10px] text-[#4a5080] uppercase tracking-widest font-medium">Perfil</p>

      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3">
        <AvatarUpload name={name} avatarUrl={avatarUrl} />
        <div className="text-center">
          <p className="font-bold text-lg">{name}</p>
          <p className="text-[#4a5080] text-sm">{level.emoji} {getLevelName(level, sex)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'XP Total', value: totalXP, color: 'text-cyan-400' },
          { label: 'Streak',   value: `${streak}🔥`, color: 'text-orange-400' },
          { label: 'Conquistas', value: earnedMap.size, color: 'text-pink-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#141528] border border-[#1e2040] rounded-xl py-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#4a5080] uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Objetivo */}
      {(patient as any)?.objective && (
        <div className="bg-[#141528] border border-[#1e2040] rounded-xl px-4 py-3">
          <p className="text-[10px] text-[#4a5080] uppercase tracking-widest mb-1">Objetivo</p>
          <p className="text-sm">{(patient as any).objective}</p>
        </div>
      )}

      {/* Conquistas */}
      <div>
        <p className="text-[10px] text-[#4a5080] uppercase tracking-widest font-medium mb-3">
          Conquistas & Medalhas
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ACHIEVEMENTS).map(([key, ach]) => {
            const earned = earnedMap.has(key)
            const earnedAt = earnedMap.get(key)
            return (
              <div
                key={key}
                className={`rounded-xl px-3 py-3 border text-center transition-all ${
                  earned
                    ? 'bg-[#141528] border-pink-500/30'
                    : 'bg-[#0d0e1c] border-[#1e2040] opacity-40'
                }`}
              >
                <div className="text-2xl mb-1">{earned ? ach.emoji : '🔒'}</div>
                <p className="text-xs font-semibold leading-tight">{ach.label}</p>
                <p className="text-[10px] text-[#4a5080] mt-0.5">{ach.description}</p>
                {earned && earnedAt && (
                  <p className="text-[10px] text-pink-400 mt-1">
                    {new Date(earnedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Logout */}
      <form action="/auth/logout" method="post" className="pt-2">
        <button
          type="submit"
          className="w-full bg-[#141528] border border-[#1e2040] hover:border-[#2a2b50] text-[#8892b0] hover:text-white rounded-xl py-3 text-sm font-medium transition-colors uppercase tracking-wider"
        >
          Sair da conta
        </button>
      </form>
    </div>
  )
}
