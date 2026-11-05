// Linha de progressão: carga máxima do dia × data, por exercício.
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export type ProgressPoint = { date: string; max_load: number; total_reps: number; volume: number }

export function WorkoutProgressChart({ data }: { data: ProgressPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[#9a8c70] py-2">Sem registros ainda.</p>
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2419" />
          <XAxis dataKey="date" tick={{ fill: '#9a8c70', fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#fbbf24', fontSize: 11 }}
            label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#fbbf24', fontSize: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#60a5fa', fontSize: 11 }}
            label={{ value: 'reps', angle: 90, position: 'insideRight', fill: '#60a5fa', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: '#0f0d0a', border: '1px solid #2a2419', fontSize: 12 }}
            labelStyle={{ color: '#d4c89a' }}
          />
          <Line yAxisId="left" type="monotone" dataKey="max_load" stroke="#fbbf24" strokeWidth={2}
            name="Carga máx (kg)" dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="total_reps" stroke="#60a5fa" strokeWidth={2}
            name="Reps total" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
