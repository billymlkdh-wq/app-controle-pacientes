// Busca no food_catalog (TACO + TBCA). Admin only — paciente não precisa buscar.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  const onlyWithNutrition = request.nextUrl.searchParams.get('only_with_nutrition') === '1'
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 50)

  if (q.length < 2) return NextResponse.json({ items: [] })

  let query = supabase
    .from('food_catalog')
    .select('id, source, description, category, energy_kcal, protein_g, lipid_g, carb_g, fiber_g, sodium_mg, household_measures, needs_nutrition_scrape')
    .ilike('description', `%${q}%`)
    .eq('active', true)
    .limit(limit)

  if (onlyWithNutrition) {
    query = query.eq('needs_nutrition_scrape', false)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ordena: TACO primeiro (dados completos), depois match exato, depois alfabético
  const items = (data ?? []).sort((a, b) => {
    if (a.source !== b.source) return a.source === 'TACO' ? -1 : 1
    const qLow = q.toLowerCase()
    const aStart = a.description.toLowerCase().startsWith(qLow)
    const bStart = b.description.toLowerCase().startsWith(qLow)
    if (aStart !== bStart) return aStart ? -1 : 1
    return a.description.localeCompare(b.description)
  })
  return NextResponse.json({ items })
}
