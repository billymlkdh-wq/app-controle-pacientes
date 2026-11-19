// Cálculo de necessidades energéticas.
// TMB (taxa metabólica basal) por Harris-Benedict (1919) ou Mifflin-St Jeor (1990);
// GET (gasto energético total) = TMB × fator atividade + ajuste (déficit/superávit).

export type EnergyFormula = 'harris_benedict' | 'mifflin'
export type EnergySex = 'M' | 'F'

export type EnergyCalc = {
  formula: EnergyFormula
  sex: EnergySex
  weight_kg: number
  height_cm: number
  age_years: number
  activity_factor: number
  adjustment_kcal: number
  tmb_kcal?: number
  get_kcal?: number
  calculated_at?: string
}

export const FORMULA_LABELS: Record<EnergyFormula, string> = {
  harris_benedict: 'Harris-Benedict (1919)',
  mifflin: 'Mifflin-St Jeor (1990)',
}

export const ACTIVITY_FACTORS: Array<{ value: number; label: string; hint: string }> = [
  { value: 1.2, label: 'Sedentário', hint: 'pouco ou nenhum exercício' },
  { value: 1.375, label: 'Levemente ativo', hint: 'exercício leve 1–3x/semana' },
  { value: 1.55, label: 'Moderadamente ativo', hint: 'exercício moderado 3–5x/semana' },
  { value: 1.725, label: 'Muito ativo', hint: 'exercício intenso 6–7x/semana' },
  { value: 1.9, label: 'Extremamente ativo', hint: 'treino 2x/dia ou trabalho físico pesado' },
]

export function tmb(formula: EnergyFormula, sex: EnergySex, weightKg: number, heightCm: number, ageYears: number): number {
  if (formula === 'harris_benedict') {
    return sex === 'M'
      ? 66.473 + 13.7516 * weightKg + 5.0033 * heightCm - 6.755 * ageYears
      : 655.0955 + 9.5634 * weightKg + 1.8496 * heightCm - 4.6756 * ageYears
  }
  // Mifflin-St Jeor
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'M' ? 5 : -161)
}

export function computeEnergy(c: Pick<EnergyCalc, 'formula' | 'sex' | 'weight_kg' | 'height_cm' | 'age_years' | 'activity_factor' | 'adjustment_kcal'>) {
  const basal = tmb(c.formula, c.sex, c.weight_kg, c.height_cm, c.age_years)
  const total = basal * c.activity_factor + (c.adjustment_kcal || 0)
  return { tmb_kcal: Math.round(basal), get_kcal: Math.round(total) }
}

export function ageFromBirthDate(birth: string | null | undefined, ref: Date = new Date()): number | null {
  if (!birth) return null
  const d = new Date(birth + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  let age = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--
  return age
}

export function isValidInput(c: Partial<EnergyCalc>): c is EnergyCalc {
  return (
    (c.sex === 'M' || c.sex === 'F') &&
    !!c.weight_kg && c.weight_kg > 0 && c.weight_kg < 400 &&
    !!c.height_cm && c.height_cm > 50 && c.height_cm < 260 &&
    !!c.age_years && c.age_years > 0 && c.age_years < 120 &&
    !!c.activity_factor && c.activity_factor >= 1 && c.activity_factor <= 2.5
  )
}
