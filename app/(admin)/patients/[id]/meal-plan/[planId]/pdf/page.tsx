// Página print-friendly do plano alimentar. Usuário usa "Imprimir → Salvar PDF"
// do navegador. Layout limpo pra dieta formal com cabeçalho do nutri.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDateBR, todayBR } from '@/lib/utils'
import { PrintButton } from '@/components/patient/PrintButton'

export default async function MealPlanPdfPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>
}) {
  const { id, planId } = await params
  const supabase = await createClient()

  const [{ data: patient }, { data: plan }, { data: meals }] = await Promise.all([
    supabase.from('patients').select('id, name, birth_date, sex, email, whatsapp_phone').eq('id', id).single(),
    supabase.from('meal_plans').select('*').eq('id', planId).single(),
    supabase
      .from('meal_plan_meals')
      .select('id, name, time_hhmm, order_num, notes, items:meal_plan_items(id, food_id, custom_description, quantity_g, household_measure, energy_kcal, protein_g, lipid_g, carb_g, fiber_g, order_num, food:food_catalog(description), substitutes:meal_plan_item_substitutes(id, food_id, custom_description, quantity_g, household_measure, order_num, food:food_catalog(description)))')
      .eq('plan_id', planId)
      .order('order_num'),
  ])
  if (!patient || !plan) notFound()

  const totals = { kcal: 0, prot: 0, lip: 0, carb: 0, fib: 0 }
  for (const m of meals ?? []) for (const it of (m as any).items ?? []) {
    totals.kcal += Number(it.energy_kcal ?? 0)
    totals.prot += Number(it.protein_g ?? 0)
    totals.lip += Number(it.lipid_g ?? 0)
    totals.carb += Number(it.carb_g ?? 0)
    totals.fib += Number(it.fiber_g ?? 0)
  }

  return (
    <div className="pdf-root bg-white text-black mx-auto max-w-[800px] p-8 print:p-0 print:max-w-none">
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        .pdf-root * { color: #0a0a0a; }
        .pdf-root h1, .pdf-root h2 { color: #0a0a0a; }
      `}</style>

      {/* Toolbar (no-print) */}
      <div className="no-print flex justify-between items-center mb-6 print:hidden">
        <h2 className="text-lg font-semibold">Pré-visualização do PDF</h2>
        <PrintButton />
      </div>

      {/* Cabeçalho */}
      <header className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rafael Bolson Nutricionista</h1>
            <p className="text-sm">Plano Alimentar Personalizado</p>
          </div>
          <div className="text-right text-xs">
            <div>Emitido em {formatDateBR(todayBR())}</div>
          </div>
        </div>
      </header>

      {/* Dados do paciente */}
      <section className="mb-6">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Paciente</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Nome:</strong> {patient.name}</div>
          <div><strong>Data nasc.:</strong> {patient.birth_date ? formatDateBR(patient.birth_date) : '-'}</div>
          <div><strong>Sexo:</strong> {patient.sex ?? '-'}</div>
          <div><strong>E-mail:</strong> {patient.email ?? '-'}</div>
        </div>
      </section>

      {/* Metadados plano */}
      <section className="mb-6">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">
          {plan.name}
        </h2>
        {plan.method === 'por_alimentos' && (
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div><strong>Meta kcal:</strong> {plan.target_kcal ?? '-'}</div>
            <div><strong>Prot:</strong> {plan.target_protein_g ?? '-'} g</div>
            <div><strong>Lip:</strong> {plan.target_lipid_g ?? '-'} g</div>
            <div><strong>Carb:</strong> {plan.target_carb_g ?? '-'} g</div>
          </div>
        )}
        {plan.notes && (
          <p className="text-sm mt-2 italic whitespace-pre-wrap">{plan.notes}</p>
        )}
      </section>

      {/* Cardápio */}
      {plan.method === 'qualitativo' ? (
        <section>
          <pre className="whitespace-pre-wrap text-sm font-sans">
            {plan.qualitative_text ?? ''}
          </pre>
        </section>
      ) : (
        <>
          {(meals ?? []).map((m: any) => {
            const items = [...(m.items ?? [])].sort((a: any, b: any) => a.order_num - b.order_num)
            const mealKcal = items.reduce((s: number, i: any) => s + Number(i.energy_kcal ?? 0), 0)
            return (
              <section key={m.id} className="mb-5 break-inside-avoid">
                <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">
                  {m.time_hhmm && <span className="mr-2">{m.time_hhmm}</span>}
                  {m.name}
                  <span className="float-right text-xs font-normal">{mealKcal.toFixed(0)} kcal</span>
                </h2>
                <ul className="space-y-2 text-sm">
                  {items.map((it: any) => {
                    const subs = [...((it.substitutes ?? []) as any[])].sort((a: any, b: any) => a.order_num - b.order_num)
                    return (
                      <li key={it.id} className="pl-2 border-l-2 border-gray-400">
                        <div>
                          <strong>{it.food?.description ?? it.custom_description ?? '—'}</strong>
                          {' — '}
                          {Number(it.quantity_g).toFixed(0)} g
                          {it.household_measure && ` (${it.household_measure})`}
                        </div>
                        {subs.length > 0 && (
                          <ul className="ml-4 mt-1 text-xs text-gray-700">
                            {subs.map((s: any) => (
                              <li key={s.id}>
                                ↔ {s.food?.description ?? s.custom_description ?? '—'}
                                {' — '}
                                {Number(s.quantity_g).toFixed(0)} g
                                {s.household_measure && ` (${s.household_measure})`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {m.notes && <p className="text-xs italic mt-2">{m.notes}</p>}
              </section>
            )
          })}

          {/* Totais do dia */}
          <section className="mt-6 pt-3 border-t-2 border-black break-inside-avoid">
            <h2 className="text-base font-semibold mb-2">Totais prescritos do dia</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Kcal</th>
                  <th className="text-left py-1">Proteína</th>
                  <th className="text-left py-1">Lipídios</th>
                  <th className="text-left py-1">Carboidratos</th>
                  <th className="text-left py-1">Fibras</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">{totals.kcal.toFixed(0)}</td>
                  <td className="py-1">{totals.prot.toFixed(1)} g</td>
                  <td className="py-1">{totals.lip.toFixed(1)} g</td>
                  <td className="py-1">{totals.carb.toFixed(1)} g</td>
                  <td className="py-1">{totals.fib.toFixed(1)} g</td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* Rodapé */}
      <footer className="mt-10 pt-4 border-t text-xs text-gray-600 text-center">
        <p>Rafael Bolson — Nutricionista · CRN {process.env.NEXT_PUBLIC_CRN ?? '—'}</p>
        <p className="mt-1">Plano gerado automaticamente. Em caso de dúvida, procure atendimento direto.</p>
      </footer>

      {/* dummy use so formatBRL import não quebra se não usar */}
      <div className="hidden">{formatBRL(0)}</div>
    </div>
  )
}
