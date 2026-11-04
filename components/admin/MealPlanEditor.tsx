// Editor de plano alimentar — método "Por alimentos" com cálculo macro automático
// e "Qualitativo" (texto livre). Save em bloco via PATCH snapshot.
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type Food = {
  id: number
  source: 'TACO' | 'TBCA' | 'CUSTOM'
  description: string
  category: string | null
  energy_kcal: number | null
  protein_g: number | null
  lipid_g: number | null
  carb_g: number | null
  fiber_g: number | null
  needs_nutrition_scrape: boolean
}

type Item = {
  id?: string
  food_id: number | null
  custom_description: string | null
  food_description?: string | null   // display only
  food_source?: string | null
  quantity_g: number
  household_measure: string | null
  energy_kcal: number | null
  protein_g: number | null
  lipid_g: number | null
  carb_g: number | null
  fiber_g: number | null
  order_num: number
}

type Meal = {
  id?: string
  name: string
  time_hhmm: string | null
  order_num: number
  notes: string | null
  items: Item[]
}

type Plan = {
  id: string
  patient_id: string
  name: string
  method: 'por_alimentos' | 'qualitativo'
  qualitative_text: string | null
  target_kcal: number | null
  target_protein_g: number | null
  target_lipid_g: number | null
  target_carb_g: number | null
  notes: string | null
  active: boolean
}

function emptyItem(order: number): Item {
  return {
    food_id: null, custom_description: null, quantity_g: 0,
    household_measure: null, energy_kcal: 0, protein_g: 0,
    lipid_g: 0, carb_g: 0, fiber_g: 0, order_num: order,
  }
}

function scaleFood(food: Food, grams: number): Partial<Item> {
  const factor = grams / 100
  return {
    energy_kcal: food.energy_kcal != null ? +(food.energy_kcal * factor).toFixed(1) : null,
    protein_g: food.protein_g != null ? +(food.protein_g * factor).toFixed(2) : null,
    lipid_g: food.lipid_g != null ? +(food.lipid_g * factor).toFixed(2) : null,
    carb_g: food.carb_g != null ? +(food.carb_g * factor).toFixed(2) : null,
    fiber_g: food.fiber_g != null ? +(food.fiber_g * factor).toFixed(2) : null,
  }
}

export function MealPlanEditor({
  initialPlan,
  initialMeals,
}: {
  initialPlan: Plan
  initialMeals: Meal[]
}) {
  const router = useRouter()
  const [plan, setPlan] = React.useState<Plan>(initialPlan)
  const [meals, setMeals] = React.useState<Meal[]>(initialMeals)
  const [saving, setSaving] = React.useState(false)

  // Totais calculados
  const totals = React.useMemo(() => {
    const t = { kcal: 0, prot: 0, lip: 0, carb: 0, fib: 0 }
    for (const m of meals) for (const it of m.items) {
      t.kcal += it.energy_kcal ?? 0
      t.prot += it.protein_g ?? 0
      t.lip += it.lipid_g ?? 0
      t.carb += it.carb_g ?? 0
      t.fib += it.fiber_g ?? 0
    }
    return t
  }, [meals])

  function updateMeal(idx: number, patch: Partial<Meal>) {
    setMeals((ms) => ms.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }
  function addMeal() {
    setMeals((ms) => [...ms, {
      name: 'Nova refeição', time_hhmm: null, order_num: ms.length,
      notes: null, items: [],
    }])
  }
  function removeMeal(idx: number) {
    setMeals((ms) => ms.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order_num: i })))
  }
  function addItem(mealIdx: number) {
    setMeals((ms) => ms.map((m, i) =>
      i === mealIdx ? { ...m, items: [...m.items, emptyItem(m.items.length)] } : m
    ))
  }
  function updateItem(mealIdx: number, itemIdx: number, patch: Partial<Item>) {
    setMeals((ms) => ms.map((m, i) =>
      i !== mealIdx ? m : {
        ...m,
        items: m.items.map((it, j) => j === itemIdx ? { ...it, ...patch } : it),
      }
    ))
  }
  function removeItem(mealIdx: number, itemIdx: number) {
    setMeals((ms) => ms.map((m, i) =>
      i !== mealIdx ? m : {
        ...m,
        items: m.items.filter((_, j) => j !== itemIdx).map((it, j) => ({ ...it, order_num: j })),
      }
    ))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: {
            name: plan.name,
            method: plan.method,
            qualitative_text: plan.qualitative_text,
            target_kcal: plan.target_kcal,
            target_protein_g: plan.target_protein_g,
            target_lipid_g: plan.target_lipid_g,
            target_carb_g: plan.target_carb_g,
            notes: plan.notes,
            active: plan.active,
          },
          meals: plan.method === 'por_alimentos' ? meals : [],
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      toast.success('Plano salvo.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header ────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Plano alimentar</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome do plano</Label>
            <Input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex gap-2 items-center h-10">
              <Badge variant={plan.active ? 'success' : 'secondary'}>
                {plan.active ? 'Ativo (paciente vê)' : 'Arquivado'}
              </Badge>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setPlan({ ...plan, active: !plan.active })}>
                {plan.active ? 'Arquivar' : 'Ativar'}
              </Button>
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={plan.notes ?? ''}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value || null })} />
          </div>

          {plan.method === 'por_alimentos' && (
            <>
              <div className="space-y-1">
                <Label>Meta kcal/dia</Label>
                <Input type="number" value={plan.target_kcal ?? ''}
                  onChange={(e) => setPlan({ ...plan, target_kcal: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="grid grid-cols-3 gap-2 md:col-span-1">
                <div className="space-y-1">
                  <Label className="text-xs">P (g)</Label>
                  <Input type="number" value={plan.target_protein_g ?? ''}
                    onChange={(e) => setPlan({ ...plan, target_protein_g: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">L (g)</Label>
                  <Input type="number" value={plan.target_lipid_g ?? ''}
                    onChange={(e) => setPlan({ ...plan, target_lipid_g: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">C (g)</Label>
                  <Input type="number" value={plan.target_carb_g ?? ''}
                    onChange={(e) => setPlan({ ...plan, target_carb_g: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Qualitativo ─────────────────────────────── */}
      {plan.method === 'qualitativo' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cardápio (texto livre)</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              rows={20}
              value={plan.qualitative_text ?? ''}
              onChange={(e) => setPlan({ ...plan, qualitative_text: e.target.value })}
              placeholder="Café da manhã:&#10;- 2 fatias de pão integral&#10;- 1 ovo mexido&#10;- 1 fruta&#10;&#10;Almoço:&#10;..."
            />
          </CardContent>
        </Card>
      )}

      {/* Por alimentos — refeições ─────────────── */}
      {plan.method === 'por_alimentos' && (
        <>
          {meals.map((meal, mi) => (
            <MealCard
              key={mi}
              meal={meal}
              onUpdate={(patch) => updateMeal(mi, patch)}
              onRemove={() => removeMeal(mi)}
              onAddItem={() => addItem(mi)}
              onUpdateItem={(ii, patch) => updateItem(mi, ii, patch)}
              onRemoveItem={(ii) => removeItem(mi, ii)}
            />
          ))}
          <Button variant="outline" onClick={addMeal} className="w-full">
            + Nova refeição
          </Button>

          {/* Totais ──────────────────────────── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Totais do dia (prescrito)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 text-center">
                <Totals label="Kcal" value={totals.kcal.toFixed(0)} target={plan.target_kcal} />
                <Totals label="Prot (g)" value={totals.prot.toFixed(1)} target={plan.target_protein_g} />
                <Totals label="Lip (g)" value={totals.lip.toFixed(1)} target={plan.target_lipid_g} />
                <Totals label="Carb (g)" value={totals.carb.toFixed(1)} target={plan.target_carb_g} />
                <Totals label="Fibra (g)" value={totals.fib.toFixed(1)} target={null} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save bar ───────────────────────────────── */}
      <div className="sticky bottom-0 bg-background border-t py-3 -mx-6 px-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar plano'}
        </Button>
      </div>
    </div>
  )
}

function Totals({ label, value, target }: { label: string; value: string; target: number | null }) {
  const diff = target != null ? Number(value) - target : null
  const diffColor = diff == null ? ''
    : Math.abs(diff) <= Math.max(5, (target ?? 1) * 0.05) ? 'text-green-600'
    : diff > 0 ? 'text-orange-600' : 'text-blue-600'
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {target != null && (
        <div className={`text-xs ${diffColor}`}>
          meta {target} ({diff! >= 0 ? '+' : ''}{diff!.toFixed(0)})
        </div>
      )}
    </div>
  )
}

function MealCard({
  meal, onUpdate, onRemove, onAddItem, onUpdateItem, onRemoveItem,
}: {
  meal: Meal
  onUpdate: (p: Partial<Meal>) => void
  onRemove: () => void
  onAddItem: () => void
  onUpdateItem: (idx: number, p: Partial<Item>) => void
  onRemoveItem: (idx: number) => void
}) {
  const mealKcal = meal.items.reduce((s, i) => s + (i.energy_kcal ?? 0), 0)
  const mealProt = meal.items.reduce((s, i) => s + (i.protein_g ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Input className="w-20" value={meal.time_hhmm ?? ''}
            placeholder="07:00"
            onChange={(e) => onUpdate({ time_hhmm: e.target.value || null })} />
          <Input className="flex-1 min-w-[150px]" value={meal.name}
            onChange={(e) => onUpdate({ name: e.target.value })} />
          <div className="text-sm text-muted-foreground">
            {mealKcal.toFixed(0)} kcal · {mealProt.toFixed(1)}g prot
          </div>
          <Button variant="outline" size="sm" onClick={onRemove}>Remover</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {meal.items.map((item, ii) => (
          <ItemRow
            key={ii}
            item={item}
            onChange={(p) => onUpdateItem(ii, p)}
            onRemove={() => onRemoveItem(ii)}
          />
        ))}
        <Button variant="outline" size="sm" onClick={onAddItem} className="w-full">
          + Adicionar alimento
        </Button>
      </CardContent>
    </Card>
  )
}

function ItemRow({
  item, onChange, onRemove,
}: {
  item: Item
  onChange: (p: Partial<Item>) => void
  onRemove: () => void
}) {
  const [query, setQuery] = React.useState(item.food_description ?? item.custom_description ?? '')
  const [results, setResults] = React.useState<Food[]>([])
  const [showDrop, setShowDrop] = React.useState(false)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2 || item.food_id) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      const r = await fetch(`/api/food-catalog/search?q=${encodeURIComponent(query)}&only_with_nutrition=1&limit=10`)
      const j = await r.json()
      setResults(j.items ?? [])
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, item.food_id])

  function pickFood(food: Food) {
    const scaled = scaleFood(food, 100)
    onChange({
      food_id: food.id,
      food_description: food.description,
      food_source: food.source,
      custom_description: null,
      quantity_g: 100,
      ...scaled,
    })
    setQuery(food.description)
    setShowDrop(false)
  }

  function onQuantityChange(g: number) {
    // Recalcula com base no snapshot do food original (não temos — reusa ratio atual)
    if (item.food_id && item.quantity_g > 0 && item.energy_kcal != null) {
      const ratio = g / item.quantity_g
      onChange({
        quantity_g: g,
        energy_kcal: +(item.energy_kcal * ratio).toFixed(1),
        protein_g: item.protein_g != null ? +(item.protein_g * ratio).toFixed(2) : null,
        lipid_g: item.lipid_g != null ? +(item.lipid_g * ratio).toFixed(2) : null,
        carb_g: item.carb_g != null ? +(item.carb_g * ratio).toFixed(2) : null,
        fiber_g: item.fiber_g != null ? +(item.fiber_g * ratio).toFixed(2) : null,
      })
    } else {
      onChange({ quantity_g: g })
    }
  }

  function clearFood() {
    onChange({
      food_id: null, food_description: null, food_source: null,
      energy_kcal: 0, protein_g: 0, lipid_g: 0, carb_g: 0, fiber_g: 0,
    })
    setQuery('')
  }

  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex gap-2 items-start flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowDrop(true)
              if (item.food_id) clearFood()
              else onChange({ custom_description: e.target.value || null })
            }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 200)}
            placeholder="Busque alimento ou escreva livre"
          />
          {showDrop && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto border rounded-md bg-popover shadow-lg">
              {results.map((f) => (
                <button key={f.id} type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => pickFood(f)}>
                  <div className="font-medium">{f.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.source} · {f.category ?? ''} · {f.energy_kcal ?? '-'} kcal/100g
                  </div>
                </button>
              ))}
            </div>
          )}
          {item.food_source && (
            <div className="text-xs text-muted-foreground mt-1">
              Base: {item.food_source}
            </div>
          )}
        </div>
        <Input className="w-24" type="number" value={item.quantity_g}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          placeholder="gramas" />
        <Input className="w-32" value={item.household_measure ?? ''}
          onChange={(e) => onChange({ household_measure: e.target.value || null })}
          placeholder="medida caseira" />
        <Button variant="outline" size="sm" onClick={onRemove}>×</Button>
      </div>
      <div className="text-xs text-muted-foreground grid grid-cols-5 gap-2">
        <span>{(item.energy_kcal ?? 0).toFixed(0)} kcal</span>
        <span>P {(item.protein_g ?? 0).toFixed(1)}g</span>
        <span>L {(item.lipid_g ?? 0).toFixed(1)}g</span>
        <span>C {(item.carb_g ?? 0).toFixed(1)}g</span>
        <span>F {(item.fiber_g ?? 0).toFixed(1)}g</span>
      </div>
    </div>
  )
}
