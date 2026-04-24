'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

export type PlanoReaisRow = { plano: string; valor: number }
export type PlanoQtdRow  = { plano: string; qtd: number }

export function VendasPlanoChart({ data }: { data: PlanoReaisRow[] }) {
  const filled = data.filter((d) => d.valor > 0)
  if (!filled.length) return <p className="text-sm text-muted-foreground py-4">Sem vendas no mês.</p>
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} className="text-xs" />
          <YAxis type="category" dataKey="plano" className="text-xs" width={80} />
          <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="valor" name="Receita" radius={[0, 4, 4, 0]}>
            {filled.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
        <BarChart data={filled} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" allowDecimals={false} className="text-xs" />
          <YAxis type="category" dataKey="plano" className="text-xs" width={80} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="qtd" name="Contratos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
