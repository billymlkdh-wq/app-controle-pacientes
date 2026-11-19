// Calculadora de necessidade energética do paciente (TMB × fator atividade).
// Fórmulas: Harris-Benedict (1919) e Mifflin-St Jeor (1990). Mostra as duas
// lado a lado e permite aplicar o GET escolhido como meta kcal do plano.
'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ACTIVITY_FACTORS, FORMULA_LABELS, computeEnergy, isValidInput,
  type EnergyCalc, type EnergyFormula, type EnergySex,
} from '@/lib/energy'

export type EnergyDraft = Partial<EnergyCalc>

const selectCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function num(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function EnergyCalculator({
  value,
  onChange,
  onApply,
  currentTargetKcal,
}: {
  value: EnergyDraft
  onChange: (v: EnergyDraft) => void
  onApply: (kcal: number) => void
  currentTargetKcal: number | null
}) {
  const set = (patch: EnergyDraft) => onChange({ ...value, ...patch })
  const formula: EnergyFormula = value.formula ?? 'mifflin'
  const factor = value.activity_factor ?? 1.2
  const isPreset = ACTIVITY_FACTORS.some((f) => f.value === factor)
  const [customFactor, setCustomFactor] = React.useState(!isPreset)

  const input = { ...value, formula, activity_factor: factor, adjustment_kcal: value.adjustment_kcal ?? 0 }
  const valid = isValidInput(input)
  const results = valid
    ? (['harris_benedict', 'mifflin'] as EnergyFormula[]).map((f) => ({ f, ...computeEnergy({ ...input, formula: f }) }))
    : []
  const chosen = results.find((r) => r.f === formula)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cálculo energético</CardTitle>
        <p className="text-xs text-muted-foreground">
          TMB pela fórmula escolhida × fator atividade (+ ajuste) = GET (gasto energético total).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Sexo</Label>
            <select className={selectCls} value={value.sex ?? ''}
              onChange={(e) => set({ sex: (e.target.value || undefined) as EnergySex | undefined })}>
              <option value="">Selecione</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Idade (anos)</Label>
            <Input type="number" inputMode="numeric" value={value.age_years ?? ''}
              onChange={(e) => set({ age_years: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Peso (kg)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={value.weight_kg ?? ''}
              onChange={(e) => set({ weight_kg: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Altura (cm)</Label>
            <Input type="number" inputMode="decimal" step="0.5" value={value.height_cm ?? ''}
              onChange={(e) => set({ height_cm: num(e.target.value) })} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Fórmula</Label>
            <select className={selectCls} value={formula}
              onChange={(e) => set({ formula: e.target.value as EnergyFormula })}>
              {(Object.keys(FORMULA_LABELS) as EnergyFormula[]).map((f) => (
                <option key={f} value={f}>{FORMULA_LABELS[f]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Fator atividade</Label>
            <select className={selectCls} value={customFactor ? 'custom' : String(factor)}
              onChange={(e) => {
                if (e.target.value === 'custom') { setCustomFactor(true); return }
                setCustomFactor(false)
                set({ activity_factor: Number(e.target.value) })
              }}>
              {ACTIVITY_FACTORS.map((f) => (
                <option key={f.value} value={String(f.value)}>{f.value} · {f.label} ({f.hint})</option>
              ))}
              <option value="custom">Personalizado…</option>
            </select>
            {customFactor && (
              <Input type="number" inputMode="decimal" step="0.01" min={1} max={2.5} className="mt-2"
                placeholder="ex: 1.45" value={value.activity_factor ?? ''}
                onChange={(e) => set({ activity_factor: num(e.target.value) })} />
            )}
          </div>
          <div className="space-y-1">
            <Label>Ajuste (kcal/dia)</Label>
            <Input type="number" inputMode="numeric" step="50" placeholder="ex: -500 déficit, +300 superávit"
              value={value.adjustment_kcal ?? ''}
              onChange={(e) => set({ adjustment_kcal: num(e.target.value) })} />
          </div>
        </div>

        {!valid ? (
          <p className="text-sm text-muted-foreground">
            Preencha sexo, idade, peso, altura e fator atividade (1,0 a 2,5) para calcular.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((r) => {
                const active = r.f === formula
                return (
                  <button key={r.f} type="button" onClick={() => set({ formula: r.f })}
                    className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <div className="text-xs text-muted-foreground">{FORMULA_LABELS[r.f]}{active ? ' · selecionada' : ''}</div>
                    <div className="mt-1 flex items-baseline gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">TMB</div>
                        <div className="text-lg font-semibold tabular-nums">{r.tmb_kcal} kcal</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">GET</div>
                        <div className="text-2xl font-bold tabular-nums">{r.get_kcal} kcal</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {chosen && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {chosen.tmb_kcal} × {factor}
                  {input.adjustment_kcal ? ` ${input.adjustment_kcal > 0 ? '+' : '−'} ${Math.abs(input.adjustment_kcal)}` : ''}
                  {' '}= <strong className="text-foreground">{chosen.get_kcal} kcal/dia</strong>
                  {currentTargetKcal != null ? ` · meta atual: ${currentTargetKcal} kcal` : ''}
                </p>
                <Button type="button" size="sm" onClick={() => onApply(chosen.get_kcal)}
                  disabled={currentTargetKcal === chosen.get_kcal}>
                  Usar {chosen.get_kcal} kcal como meta
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
