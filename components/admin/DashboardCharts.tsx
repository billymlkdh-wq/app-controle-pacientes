// Gráficos do dashboard: faturamento mensal + movimento de pacientes.
// Inputs são pré-processados no server (page.tsx) — componente só renderiza.
'use client'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatBRL } from '@/lib/utils'

export type RevenuePoint = { month: string; receita: number }
export type PatientsPoint = { month: string; ativos: number; novos: number; desligados: number }

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem pagamentos registrados.</p>
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" tickFormatter={(v) => `R$${Math.round(Number(v) / 1000)}k`} />
          <Tooltip
            formatter={(v: number) => formatBRL(Number(v))}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
          <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PatientsChart({ data }: { data: PatientsPoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem dados de pacientes.</p>
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend />
          <Line type="monotone" dataKey="ativos" name="Ativos (acumulado)" stroke="#3b82f6" strokeWidth={2} dot />
          <Line type="monotone" dataKey="novos" name="Novos no mês" stroke="#22c55e" strokeWidth={2} dot />
          <Line type="monotone" dataKey="desligados" name="Desligados no mês" stroke="#ef4444" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
