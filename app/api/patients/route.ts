// API de pacientes — listar (admin) / criar (admin + convite Auth)
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return { error: 'Forbidden', status: 403 as const }
  return { supabase, user }
}

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { data, error } = await ctx.supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  try {
    const body = await request.json()
    const { data: patient, error } = await ctx.supabase
      .from('patients')
      .insert({
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        whatsapp_phone: body.whatsapp_phone ?? null,
        birth_date: body.birth_date ?? null,
        sex: body.sex ?? null,
        objective: body.objective ?? null,
        health_history: body.health_history ?? null,
        plan_type: body.plan_type ?? 'avulso',
        plan_value: body.plan_value ?? null,
        questionnaire_start_date: body.questionnaire_start_date ?? null,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Convite de auth via admin (service role) — somente server-side
    if (body.email) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.inviteUserByEmail(body.email, {
          data: { role: 'patient', patient_id: patient.id },
        })
      } catch (inviteErr) {
        // Não falha a criação do paciente — log apenas
        console.error('Falha ao enviar convite:', inviteErr)
      }
    }

    revalidatePath('/patients')
    return NextResponse.json(patient, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro' }, { status: 500 })
  }
}
