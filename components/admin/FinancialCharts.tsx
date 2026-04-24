'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import {
  VENDAS_PLANO_REAIS,
  VENDAS_ORIGEM_REAIS,
  VENDAS_ORIGEM_QTD,
} from '@/lib/financial-data'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function VendasPlanoChart() {
  const data = VENDAS_PLANO_REAIS.map(({ plano, jan }) => ({ plano, valor: jan }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} className="text-xs" />
          <YAxis type="category" dataKey="plano" className="text-xs" width={80} />
          <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="valor" name="Receita Jan/26" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VendasOrigemChart() {
  const data = VENDAS_ORIGEM_REAIS.filter((d) => d.jan > 0).map(({ origem, jan }) => ({ origem, valor: jan }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="valor"
            nameKey="origem"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VendasOrigemQtdChart() {
  const data = VENDAS_ORIGEM_QTD.map(({ origem, jan }) => ({ origem, qtd: jan }))
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" allowDecimals={false} className="text-xs" />
          <YAxis type="category" dataKey="origem" className="text-xs" width={80} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="qtd" name="Vendas Jan/26" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
