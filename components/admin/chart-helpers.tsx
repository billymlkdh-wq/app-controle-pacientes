// Helpers compartilhados pros gráficos Recharts do admin:
// - Tooltip custom shadcn-like (card + borda + bullets)
// - Paleta curada (yellow/amber primary brand + emerald/sky/red/violet)
// - Axis style consistente
'use client'
import * as React from 'react'

export const CHART_COLORS = {
  primary: '#f59e0b',    // amber-500 (brand)
  primaryDark: '#d97706',
  success: '#10b981',    // emerald-500
  info:    '#0ea5e9',    // sky-500
  danger:  '#ef4444',    // red-500
  violet:  '#8b5cf6',
  slate:   '#64748b',
}

export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.info,
  CHART_COLORS.violet,
  CHART_COLORS.danger,
  CHART_COLORS.slate,
]

export const axisProps = {
  tick: { fontSize: 11, fill: 'currentColor' },
  stroke: 'currentColor',
  tickLine: false,
  axisLine: false,
  className: 'text-muted-foreground/60',
} as const

export const gridProps = {
  strokeDasharray: '3 3',
  vertical: false,
  className: 'stroke-muted',
} as const

export function ChartTooltip({
  active, payload, label, valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>
  label?: string
  valueFormatter?: (v: number, name?: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur shadow-lg px-3 py-2 text-xs min-w-[140px]">
      {label && <div className="font-medium text-foreground mb-1.5">{label}</div>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: p.color }}
              />
              <span className="text-muted-foreground">{p.name}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">
              {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string; dataKey?: string }>
}) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] mt-1">
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}
