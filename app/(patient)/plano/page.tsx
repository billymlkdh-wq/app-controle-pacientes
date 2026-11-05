// Visualização do plano alimentar ativo do paciente.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/patient/PrintButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function PatientPlanoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: patient } = await supabase
    .from('patients').select('id, name').eq('user_id', user.id).single()
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente não vinculado.</p>

  // Plano ativo mais recente
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, name, method, qualitative_text, target_kcal, target_protein_g, target_lipid_g, target_carb_g, notes, updated_at')
    .eq('patient_id', patient.id)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Plano alimentar</h1>
        <Card><CardContent className="py-8 text-sm text-center text-[#9a8c70]">
          Ainda não há plano alimentar prescrito. Seu nutricionista vai liberar em breve.
        </CardContent></Card>
      </div>
    )
  }

  const { data: meals } = await supabase
    .from('meal_plan_meals')
    .select('id, name, time_hhmm, order_num, notes, items:meal_plan_items(id, food_id, custom_description, quantity_g, household_measure, energy_kcal, protein_g, lipid_g, carb_g, fiber_g, order_num, food:food_catalog(description), substitutes:meal_plan_item_substitutes(id, food_id, custom_description, quantity_g, household_measure, order_num, food:food_catalog(description)))')
    .eq('plan_id', plan.id)
    .order('order_num')

  // Totais
  const totals = { kcal: 0, prot: 0, lip: 0, carb: 0, fib: 0 }
  for (const m of meals ?? []) for (const it of (m as any).items ?? []) {
    totals.kcal += Number(it.energy_kcal ?? 0)
    totals.prot += Number(it.protein_g ?? 0)
    totals.lip += Number(it.lipid_g ?? 0)
    totals.carb += Number(it.carb_g ?? 0)
    totals.fib += Number(it.fiber_g ?? 0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{plan.name}</h1>
          <p className="text-xs text-[#9a8c70]">
            {plan.method === 'por_alimentos' ? 'Plano por alimentos' : 'Cardápio prescrito'}
          </p>
        </div>
        <PrintButton />
      </div>

      {plan.method === 'qualitativo' ? (
        <Card>
          <CardContent className="py-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {plan.qualitative_text ?? '(sem conteúdo)'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Totais */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Totais do dia</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-5 gap-2 text-center text-xs">
              <Macro label="Kcal" value={totals.kcal.toFixed(0)} target={plan.target_kcal} />
              <Macro label="Prot (g)" value={totals.prot.toFixed(1)} target={plan.target_protein_g} />
              <Macro label="Lip (g)" value={totals.lip.toFixed(1)} target={plan.target_lipid_g} />
              <Macro label="Carb (g)" value={totals.carb.toFixed(1)} target={plan.target_carb_g} />
              <Macro label="Fibra (g)" value={totals.fib.toFixed(1)} target={null} />
            </CardContent>
          </Card>

          {/* Refeições */}
          {(meals ?? []).map((m: any) => {
            const mealKcal = (m.items ?? []).reduce((s: number, i: any) => s + Number(i.energy_kcal ?? 0), 0)
            const sortedItems = [...(m.items ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)
            return (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>
                      {m.time_hhmm ? <span className="text-[#9a8c70] mr-2">{m.time_hhmm}</span> : null}
                      {m.name}
                    </span>
                    <Badge variant="outline">{mealKcal.toFixed(0)} kcal</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedItems.length === 0 ? (
                    <p className="text-xs text-[#9a8c70]">Sem itens.</p>
                  ) : sortedItems.map((it: any) => {
                    const subs = [...((it.substitutes ?? []) as any[])].sort((a: any, b: any) => a.order_num - b.order_num)
                    return (
                      <div key={it.id} className="text-sm border-l-2 border-[#2a2419] pl-3">
                        <div className="font-medium">
                          {it.food?.description ?? it.custom_description ?? '—'}
                        </div>
                        <div className="text-xs text-[#9a8c70]">
                          {Number(it.quantity_g).toFixed(0)} g
                          {it.household_measure && ` · ${it.household_measure}`}
                          {it.energy_kcal != null && ` · ${Number(it.energy_kcal).toFixed(0)} kcal`}
                        </div>
                        {subs.length > 0 && (
                          <div className="mt-1 ml-2 space-y-0.5 border-l border-[#2a2419] pl-2">
                            <div className="text-[10px] uppercase tracking-wider text-[#9a8c70]">
                              ou substituir por
                            </div>
                            {subs.map((s: any) => (
                              <div key={s.id} className="text-xs text-[#d4c89a]">
                                <span className="text-[#9a8c70] mr-1">↔</span>
                                {s.food?.description ?? s.custom_description ?? '—'}
                                <span className="text-[#9a8c70]">
                                  {' — '}{Number(s.quantity_g).toFixed(0)} g
                                  {s.household_measure && ` · ${s.household_measure}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {m.notes && (
                    <p className="text-xs italic text-[#9a8c70] mt-2">{m.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      {plan.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{plan.notes}</p></CardContent>
        </Card>
      )}
    </div>
  )
}

function Macro({ label, value, target }: { label: string; value: string; target: number | null }) {
  return (
    <div>
      <div className="text-[10px] text-[#9a8c70]">{label}</div>
      <div className="font-semibold">{value}</div>
      {target != null && <div className="text-[9px] text-[#6a5e45]">/ {target}</div>}
    </div>
  )
}
