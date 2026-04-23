// Dispara verificação de expirações de plano (admin-only).
// • Envia alerta ao admin pra contratos a <= 30 dias do vencimento
// • Encerra contratos vencidos
// • Desativa pacientes sem contrato ativo
// Mesmo job deve ser chamado pelo cron diário (notify-cron).
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.rpc('check_plan_expirations')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/patients')
  revalidatePath('/notifications')
  return NextResponse.json(data ?? { ok: true })
}
