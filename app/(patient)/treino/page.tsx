// Lista dias de treino (A, B, C, D, E) como cards.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

export default async function PatientTreinoIndex() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: patient } = await supabase
    .from('patients').select('id, name').eq('user_id', user.id).single()
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente não vinculado.</p>

  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, name')
    .eq('patient_id', patient.id)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Treino</h1>
        <Card><CardContent className="py-8 text-sm text-center text-[#9a8c70]">
          Nenhum treino ativo. Seu profissional vai liberar em breve.
        </CardContent></Card>
      </div>
    )
  }

  const { data: days } = await supabase
    .from('workout_days')
    .select('id, name, order_num, exercises:workout_exercises(id)')
    .eq('plan_id', plan.id)
    .order('order_num')

  const withCounts = (days ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    letter: d.name.replace(/[^A-Z]/gi, '').slice(0, 1).toUpperCase() || String.fromCharCode(65 + d.order_num),
    count: (d.exercises ?? []).length,
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{plan.name}</h1>
          <p className="text-xs text-[#9a8c70]">Escolha o dia de treino</p>
        </div>
        <Link href="/treino/progresso" className="text-sm text-yellow-400 hover:underline">
          📈 Progresso
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {withCounts.map((d) => (
          <Link key={d.id} href={`/treino/${d.id}`}>
            <Card className="hover:bg-[#1a1610] transition-colors border-[#2a2419] bg-[#141009] aspect-square flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-yellow-400">{d.letter}</div>
              <div className="text-sm text-[#d4c89a] mt-1">{d.name}</div>
              <div className="text-xs text-[#9a8c70] mt-0.5">{d.count} exercício{d.count === 1 ? '' : 's'}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
