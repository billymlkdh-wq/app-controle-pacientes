// API de respostas do questionário — paciente envia, admin lista
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const patientId = request.nextUrl.searchParams.get('patient_id')
  let q = supabase
    .from('questionnaire_responses')
    .select('*, question:questionnaire_questions(*)')
    .order('created_at', { ascending: false })
  if (patientId) q = q.eq('patient_id', patientId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    patient_id: string
    schedule_id?: string
    responses: Array<{
      question_id: string
      response_text?: string | null
      response_number?: number | null
      response_options?: string[] | null
      media_urls?: string[]
    }>
  }
  if (!body.patient_id || !Array.isArray(body.responses)) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const rows = body.responses.map((r) => ({
    patient_id: body.patient_id,
    question_id: r.question_id,
    schedule_id: body.schedule_id ?? null,
    response_text: r.response_text ?? null,
    response_number: r.response_number ?? null,
    response_options: r.response_options ?? null,
    media_urls: r.media_urls ?? [],
  }))

  const { error: insertErr } = await supabase.from('questionnaire_responses').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 })

  // Marca schedule como completed (trigger cria próximo +15d)
  if (body.schedule_id) {
    const now = new Date().toISOString()
    const { error: updErr } = await supabase
      .from('questionnaire_schedule')
      .update({ status: 'completed', completed_at: now })
      .eq('id', body.schedule_id)
    if (updErr) console.error('Falha ao fechar schedule:', updErr)
  }

  revalidatePath('/portal')
  revalidatePath('/questionnaires')
  revalidatePath('/patients')
  return NextResponse.json({ ok: true, count: rows.length }, { status: 201 })
}
