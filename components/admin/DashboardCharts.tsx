// Gráficos do dashboard: faturamento mensal (area com gradient) +
// pacientes 12m (linhas smooth). Paleta brand, tooltip shadcn-like.
'use client'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatBRL } from '@/lib/utils'
import {
  CHART_COLORS, axisProps, gridProps, ChartTooltip, ChartLegend,
} from './chart-helpers'

export type RevenuePoint = { month: string; receita: number }
export type PatientsPoint = {
  month: string; ativos: number; novos: number; desligados: number
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem pagamentos registrados.</p>
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis
            {...axisProps}
            tickFormatter={(v) => `R$${Math.round(Number(v) / 1000)}k`}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => formatBRL(Number(v))} />}
            cursor={{ stroke: CHART_COLORS.primary, strokeOpacity: 0.3, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="receita"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PatientsChart({ data }: { data: PatientsPoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem dados de pacientes.</p>
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} width={30} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.info, strokeOpacity: 0.3, strokeWidth: 1 }} />
          <Legend content={<ChartLegend />} />
          <Line
            type="monotone"
            dataKey="ativos"
            name="Ativos (acumulado)"
            stroke={CHART_COLORS.info}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.info }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
          <Line
            type="monotone"
            dataKey="novos"
            name="Novos no mês"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.success }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
          <Line
            type="monotone"
            dataKey="desligados"
            name="Desligados no mês"
            stroke={CHART_COLORS.danger}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.danger }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
