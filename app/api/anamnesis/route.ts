// API da anamnese — paciente (ou admin em modo paciente) responde uma vez, depois que o admin liberou
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolvePatient } from '@/lib/adminPreview'
import { ANAMNESIS_VERSION, sanitizeAnamnesis, validateAnamnesis } from '@/lib/anamnesis/questions'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = (user.app_metadata as { role?: string } | null)?.role === 'admin'
  const { patientId } = await resolvePatient(user.id, isAdmin)
  if (!patientId) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const body = await request.json().catch(() => null) as { answers?: unknown } | null
  const answers = sanitizeAnamnesis(body?.answers)
  const missing = validateAnamnesis(answers)
  if (missing.length) {
    return NextResponse.json({ error: 'Responda todas as perguntas obrigatórias', missing }, { status: 400 })
  }

  const db = createAdminClient() as any
  const { data: row } = await db
    .from('patient_anamnesis').select('id, completed_at').eq('patient_id', patientId).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Anamnese ainda não liberada' }, { status: 403 })
  if (row.completed_at) return NextResponse.json({ error: 'Anamnese já respondida' }, { status: 409 })

  const { data: updated, error } = await db.from('patient_anamnesis')
    .update({
      form_version: ANAMNESIS_VERSION,
      answers,
      submitted_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .is('completed_at', null)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Anamnese já respondida' }, { status: 409 })

  revalidatePath('/portal')
  revalidatePath(`/patients/${patientId}`)
  return NextResponse.json({ ok: true }, { status: 201 })
}
