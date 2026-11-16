// Gráfico de peso/medidas (progress_records). Linhas smooth, formato
// de data pt-BR no eixo, tooltip custom.
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import {
  CHART_COLORS, axisProps, gridProps, ChartTooltip, ChartLegend,
} from './chart-helpers'

type Record = {
  date: string
  weight_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function ProgressChart({ records }: { records: Record[] }) {
  if (!records || records.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem medidas registradas.</p>
  }
  const data = records.map((r) => ({
    date: shortDate(r.date),
    Peso: r.weight_kg != null ? Number(r.weight_kg) : null,
    Cintura: r.waist_cm != null ? Number(r.waist_cm) : null,
    Quadril: r.hip_cm != null ? Number(r.hip_cm) : null,
  }))
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} width={32} />
          <Tooltip content={<ChartTooltip valueFormatter={(v, n) => n === 'Peso' ? `${v} kg` : `${v} cm`} />} cursor={{ stroke: CHART_COLORS.primary, strokeOpacity: 0.3, strokeWidth: 1 }} />
          <Legend content={<ChartLegend />} />
          <Line
            type="monotone"
            dataKey="Peso"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.primary }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="Cintura"
            stroke={CHART_COLORS.info}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.info }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="Quadril"
            stroke={CHART_COLORS.danger}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.danger }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
