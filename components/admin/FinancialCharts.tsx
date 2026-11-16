// Gráficos horizontais de vendas por plano — barras arredondadas,
// paleta brand + sky/emerald/violet/red cycle, tooltip card.
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  CHART_COLORS, CHART_SERIES, axisProps, gridProps, ChartTooltip,
} from './chart-helpers'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export type PlanoReaisRow = { plano: string; valor: number }
export type PlanoQtdRow  = { plano: string; qtd: number }

export function VendasPlanoChart({ data }: { data: PlanoReaisRow[] }) {
  const filled = data.filter((d) => d.valor > 0)
  if (!filled.length) return <p className="text-sm text-muted-foreground py-4">Sem vendas no mês.</p>
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid {...gridProps} horizontal={false} vertical={true} />
          <XAxis
            type="number"
            tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
            {...axisProps}
          />
          <YAxis type="category" dataKey="plano" width={84} {...axisProps} />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => formatBRL(v)} />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar dataKey="valor" name="Receita" radius={[0, 6, 6, 0]}>
            {filled.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VendasPlanoQtdChart({ data }: { data: PlanoQtdRow[] }) {
  const filled = data.filter((d) => d.qtd > 0)
  if (!filled.length) return <p className="text-sm text-muted-foreground py-4">Sem vendas no mês.</p>
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="qtd-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART_COLORS.info} stopOpacity={0.8} />
              <stop offset="100%" stopColor={CHART_COLORS.info} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} horizontal={false} vertical={true} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="plano" width={84} {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <Bar dataKey="qtd" name="Contratos" fill="url(#qtd-fill)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
