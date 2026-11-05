// Busca no food_catalog com unaccent + similarity.
// Chama RPC search_food (Postgres) pra achar mesmo com acento/digitação parcial.
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

  if (q.length < 1) return NextResponse.json({ items: [] })

  const { data, error } = await supabase.rpc('search_food', {
    q,
    only_with_nutrition: onlyWithNutrition,
    lim: limit,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // RPC retorna linhas completas de food_catalog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    source: r.source,
    description: r.description,
    category: r.category,
    energy_kcal: r.energy_kcal,
    protein_g: r.protein_g,
    lipid_g: r.lipid_g,
    carb_g: r.carb_g,
    fiber_g: r.fiber_g,
    sodium_mg: r.sodium_mg,
    household_measures: r.household_measures ?? [],
    needs_nutrition_scrape: r.needs_nutrition_scrape,
  }))
  return NextResponse.json({ items })
}
