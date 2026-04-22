// Libera manualmente o acesso ao questionário: cria um questionnaire_schedule
// com due_date = hoje e status = 'pending'. O paciente passa a ver o formulário
// na próxima visita ao portal.
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/utils'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const today = todayBR()

  // Evita duplicar se já existe um pendente aberto pra esse paciente
  const { data: existing } = await supabase
    .from('questionnaire_schedule')
    .select('id,due_date,status')
    .eq('patient_id', id)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      ok: true,
      already_open: true,
      schedule_id: existing.id,
      due_date: existing.due_date,
      status: existing.status,
    })
  }

  const { data, error } = await supabase
    .from('questionnaire_schedule')
    .insert({ patient_id: id, due_date: today, status: 'pending' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath(`/patients/${id}`)
  return NextResponse.json({ ok: true, schedule_id: data.id, due_date: data.due_date }, { status: 201 })
}
