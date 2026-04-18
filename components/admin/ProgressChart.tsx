// Gráfico de peso/medidas (progress_records)
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Record = { date: string; weight_kg: number | null; waist_cm: number | null; hip_cm: number | null }

export function ProgressChart({ records }: { records: Record[] }) {
  if (!records || records.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem medidas registradas.</p>
  }
  const data = records.map((r) => ({
    date: r.date,
    Peso: r.weight_kg != null ? Number(r.weight_kg) : null,
    Cintura: r.waist_cm != null ? Number(r.waist_cm) : null,
    Quadril: r.hip_cm != null ? Number(r.hip_cm) : null,
  }))
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend />
          <Line type="monotone" dataKey="Peso" stroke="#fbbf24" strokeWidth={2} dot connectNulls />
          <Line type="monotone" dataKey="Cintura" stroke="#60a5fa" strokeWidth={2} dot connectNulls />
          <Line type="monotone" dataKey="Quadril" stroke="#f87171" strokeWidth={2} dot connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
