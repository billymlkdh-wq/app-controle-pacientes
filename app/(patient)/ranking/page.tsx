/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLevel } from '@/lib/gamification'
import { RankingPeriodTabs } from '@/components/patient/RankingPeriodTabs'
import { PatientAvatar } from '@/components/patient/PatientAvatar'

function periodSince(period: string): Date | null {
  const now = new Date()
  if (period === 'semana') { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
  if (period === 'mes')    { const d = new Date(now); d.setDate(d.getDate() - 30); return d }
  return null
}

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-500']
const MEDAL_RING   = ['ring-yellow-400', 'ring-gray-400',  'ring-amber-600']
const MEDAL_BG     = ['bg-[#1e1a08] border-yellow-500/30', 'bg-[#141528] border-[#2a2b50]', 'bg-[#1a1208] border-[#2a2b50]']

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = params.period ?? 'semana'
  const since = periodSince(period)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient() as any

  const { data: currentPatient } = await db
    .from('patients').select('id').eq('user_id', user!.id).maybeSingle()
  const myId = (currentPatient as any)?.id as string | undefined

  const [{ data: patients }, allTimeResult] = await Promise.all([
    db.from('patients').select('id, name, avatar_url').eq('active', true),
    db.from('patient_points').select('patient_id, amount'),
  ])

  let periodData = allTimeResult.data
  if (since) {
    const { data } = await db.from('patient_points').select('patient_id, amount').gte('created_at', since.toISOString())
    periodData = data
  }

  const periodPts = new Map<string, number>()
  for (const p of (periodData ?? []) as any[]) {
    periodPts.set(p.patient_id, (periodPts.get(p.patient_id) ?? 0) + p.amount)
  }
  const allTimePts = new Map<string, number>()
  for (const p of (allTimeResult.data ?? []) as any[]) {
    allTimePts.set(p.patient_id, (allTimePts.get(p.patient_id) ?? 0) + p.amount)
  }

  const ranking = ((patients ?? []) as any[])
    .map((p: any) => ({
      id: p.id as string,
      name: p.name as string,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      periodXP: periodPts.get(p.id) ?? 0,
      totalXP: allTimePts.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.periodXP - a.periodXP)

  const top3 = ranking.slice(0, 3)
  const rest  = ranking.slice(3)
  const myPos = myId ? ranking.findIndex((r) => r.id === myId) : -1
  // podium order: 2nd | 1st | 3rd
  const podium = [top3[1], top3[0], top3[2]]

  return (
    <div className="space-y-5">
      <p className="text-[10px] text-[#4a5080] uppercase tracking-widest font-medium">Ranking Global</p>

      <Suspense>
        <RankingPeriodTabs current={period} />
      </Suspense>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-2 pt-2 pb-1">
          {podium.map((r, col) => {
            const rankIdx = col === 0 ? 1 : col === 1 ? 0 : 2 // 2nd | 1st | 3rd
            const medals = ['🥇','🥈','🥉']
            const elevated = rankIdx === 0
            if (!r) return <div key={col} />
            return (
              <div key={r.id} className={`flex flex-col items-center gap-1 ${elevated ? '' : 'pb-4'}`}>
                <div className={`ring-2 ${MEDAL_RING[rankIdx]} rounded-full p-0.5 ${elevated ? 'shadow-[0_0_20px_rgba(250,204,21,0.25)]' : ''}`}>
                  <PatientAvatar
                    name={r.name}
                    avatarUrl={r.avatarUrl}
                    size={elevated ? 'lg' : 'md'}
                  />
                </div>
                <p className={`text-xs font-semibold text-center leading-tight ${elevated ? '' : 'text-[#c0c8e0]'}`}>
                  {r.name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-[#4a5080]">{getLevel(r.totalXP).name}</p>
                <div className={`w-full rounded-xl py-2 text-center border ${MEDAL_BG[rankIdx]}`}>
                  <div className={elevated ? 'text-xl' : 'text-base'}>{medals[rankIdx]}</div>
                  <div className={`font-bold ${elevated ? 'text-lg' : 'text-sm'} ${MEDAL_COLORS[rankIdx]}`}>{r.periodXP}</div>
                  <div className="text-[9px] text-[#4a5080] uppercase tracking-wider">XP</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My position if outside top 3 */}
      {myPos >= 3 && (
        <div className="rounded-xl bg-pink-500/10 border border-pink-500/30 px-4 py-3 flex items-center gap-3">
          <span className="text-pink-400 font-bold text-sm w-7">#{myPos + 1}</span>
          <PatientAvatar name={ranking[myPos].name} avatarUrl={ranking[myPos].avatarUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Você</p>
            <p className="text-[10px] text-[#4a5080]">
              {getLevel(ranking[myPos].totalXP).emoji} {getLevel(ranking[myPos].totalXP).name}
            </p>
          </div>
          <span className="text-cyan-400 text-sm font-bold">{ranking[myPos].periodXP} XP</span>
        </div>
      )}

      {/* Rest #4+ */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((r, i) => {
            const pos = i + 4
            const isMe = r.id === myId
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                  isMe ? 'bg-pink-500/10 border-pink-500/30' : 'bg-[#141528] border-[#1e2040]'
                }`}
              >
                <span className="text-[#4a5080] text-sm font-medium w-7">#{pos}</span>
                <PatientAvatar name={r.name} avatarUrl={r.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{isMe ? 'Você' : r.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-[#4a5080]">
                    {getLevel(r.totalXP).emoji} {getLevel(r.totalXP).name}
                  </p>
                </div>
                <span className="text-cyan-400 text-sm font-bold">{r.periodXP} XP</span>
              </div>
            )
          })}
        </div>
      )}

      {ranking.length === 0 && (
        <div className="text-center py-12 text-[#4a5080] text-sm">
          Nenhum dado ainda. Registre seus hábitos!
        </div>
      )}
    </div>
  )
}
