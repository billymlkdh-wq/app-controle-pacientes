// Libera o questionário para TODOS os pacientes ativos de uma vez.
// Insere questionnaire_schedule pending hoje apenas para quem ainda não tem aberto.
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = todayBR()

  // Busca IDs de pacientes ativos que JÁ têm questionário em aberto (pending ou overdue)
  const { data: withOpen } = await supabase
    .from('questionnaire_schedule')
    .select('patient_id')
    .in('status', ['pending', 'overdue'])

  const alreadyOpenIds = new Set((withOpen ?? []).map((r) => r.patient_id))

  // Busca todos os pacientes ativos
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id')
    .eq('active', true)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 })

  // Filtra quem ainda não tem aberto
  const toUnlock = (patients ?? []).filter((p) => !alreadyOpenIds.has(p.id))

  if (toUnlock.length === 0) {
    return NextResponse.json({ ok: true, unlocked: 0, already_open: alreadyOpenIds.size })
  }

  const rows = toUnlock.map((p) => ({ patient_id: p.id, due_date: today, status: 'pending' }))
  const { error: insErr } = await supabase.from('questionnaire_schedule').insert(rows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  revalidatePath('/patients')
  revalidatePath('/questionnaires')

  return NextResponse.json({
    ok: true,
    unlocked: toUnlock.length,
    already_open: alreadyOpenIds.size,
  })
}
