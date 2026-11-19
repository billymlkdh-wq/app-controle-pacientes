// Página de edição de um plano alimentar específico.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MealPlanEditor } from '@/components/admin/MealPlanEditor'
import { ageFromBirthDate } from '@/lib/energy'

export default async function MealPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>
}) {
  const { id, planId } = await params
  const supabase = await createClient()

  const [{ data: patient }, { data: plan }, { data: meals }, { data: lastWeight }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('meal_plans').select('*').eq('id', planId).single(),
    supabase
      .from('meal_plan_meals')
      .select('id, name, time_hhmm, order_num, notes, items:meal_plan_items(id, food_id, custom_description, quantity_g, household_measure, measure_label, measure_grams, measure_qty, energy_kcal, protein_g, lipid_g, carb_g, fiber_g, order_num, food:food_catalog(description, source, household_measures), substitutes:meal_plan_item_substitutes(id, food_id, custom_description, quantity_g, household_measure, measure_label, measure_grams, measure_qty, energy_kcal, protein_g, lipid_g, carb_g, fiber_g, order_num, food:food_catalog(description, source, household_measures)))')
      .eq('plan_id', planId)
      .order('order_num'),
    supabase
      .from('progress_records')
      .select('weight_kg')
      .eq('patient_id', id)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!patient || !plan) notFound()

  // Normaliza meals para o shape do editor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedMeals = (meals ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    time_hhmm: m.time_hhmm,
    order_num: m.order_num,
    notes: m.notes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (m.items ?? []).sort((a: any, b: any) => a.order_num - b.order_num).map((i: any) => ({
      id: i.id,
      food_id: i.food_id,
      custom_description: i.custom_description,
      food_description: i.food?.description ?? null,
      food_source: i.food?.source ?? null,
      food_measures: Array.isArray(i.food?.household_measures) ? i.food.household_measures : [],
      quantity_g: Number(i.quantity_g ?? 0),
      household_measure: i.household_measure,
      measure_label: i.measure_label ?? null,
      measure_grams: i.measure_grams != null ? Number(i.measure_grams) : null,
      measure_qty: i.measure_qty != null ? Number(i.measure_qty) : 0,
      energy_kcal: i.energy_kcal != null ? Number(i.energy_kcal) : null,
      protein_g: i.protein_g != null ? Number(i.protein_g) : null,
      lipid_g: i.lipid_g != null ? Number(i.lipid_g) : null,
      carb_g: i.carb_g != null ? Number(i.carb_g) : null,
      fiber_g: i.fiber_g != null ? Number(i.fiber_g) : null,
      order_num: i.order_num,
      substitutes: (i.substitutes ?? []).sort((a: any, b: any) => a.order_num - b.order_num).map((s: any) => ({
        food_id: s.food_id,
        custom_description: s.custom_description,
        food_description: s.food?.description ?? null,
        food_source: s.food?.source ?? null,
        food_measures: Array.isArray(s.food?.household_measures) ? s.food.household_measures : [],
        quantity_g: Number(s.quantity_g ?? 0),
        household_measure: s.household_measure,
        measure_label: s.measure_label ?? null,
        measure_grams: s.measure_grams != null ? Number(s.measure_grams) : null,
        measure_qty: s.measure_qty != null ? Number(s.measure_qty) : 0,
        energy_kcal: s.energy_kcal != null ? Number(s.energy_kcal) : null,
        protein_g: s.protein_g != null ? Number(s.protein_g) : null,
        lipid_g: s.lipid_g != null ? Number(s.lipid_g) : null,
        carb_g: s.carb_g != null ? Number(s.carb_g) : null,
        fiber_g: s.fiber_g != null ? Number(s.fiber_g) : null,
        order_num: s.order_num,
      })),
    })),
  }))

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <Link href={`/patients/${id}/meal-plan`} className="text-primary hover:underline">
          ← Planos
        </Link>
        <span className="text-muted-foreground"> · {patient.name}</span>
      </div>
      <MealPlanEditor
        initialPlan={{
          id: plan.id,
          patient_id: plan.patient_id,
          name: plan.name,
          method: plan.method,
          qualitative_text: plan.qualitative_text,
          target_kcal: plan.target_kcal != null ? Number(plan.target_kcal) : null,
          target_protein_g: plan.target_protein_g != null ? Number(plan.target_protein_g) : null,
          target_lipid_g: plan.target_lipid_g != null ? Number(plan.target_lipid_g) : null,
          target_carb_g: plan.target_carb_g != null ? Number(plan.target_carb_g) : null,
          notes: plan.notes,
          active: plan.active,
          energy_calc: plan.energy_calc ?? null,
        }}
        initialMeals={normalizedMeals}
        energyDefaults={{
          sex: patient.sex === 'M' || patient.sex === 'F' ? patient.sex : undefined,
          age_years: ageFromBirthDate(patient.birth_date) ?? undefined,
          weight_kg: lastWeight?.weight_kg != null ? Number(lastWeight.weight_kg) : undefined,
          height_cm: patient.height_cm != null ? Number(patient.height_cm) : undefined,
        }}
      />
    </div>
  )
}
