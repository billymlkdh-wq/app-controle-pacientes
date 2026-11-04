// Adiciona medida caseira personalizada a um alimento. Persiste no catálogo
// pra reuso em prescrições futuras (como WebDiet).
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Measure = { label: string; grams: number }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as { label: string; grams: number }
  if (!body.label?.trim() || !(body.grams > 0)) {
    return NextResponse.json({ error: 'label e grams (>0) obrigatórios' }, { status: 400 })
  }

  const { data: food, error: fetchErr } = await supabase
    .from('food_catalog')
    .select('household_measures')
    .eq('id', id)
    .single()
  if (fetchErr || !food) return NextResponse.json({ error: 'Alimento não encontrado' }, { status: 404 })

  const current: Measure[] = Array.isArray(food.household_measures) ? food.household_measures : []
  // Evita duplicar pelo label (case-insensitive)
  const lower = body.label.trim().toLowerCase()
  if (current.some((m) => m.label?.toLowerCase() === lower)) {
    return NextResponse.json({ error: 'Já existe medida com esse nome' }, { status: 409 })
  }
  const updated: Measure[] = [...current, { label: body.label.trim(), grams: Number(body.grams) }]

  const { error: updErr } = await supabase
    .from('food_catalog')
    .update({ household_measures: updated })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

  return NextResponse.json({ ok: true, measures: updated })
}
