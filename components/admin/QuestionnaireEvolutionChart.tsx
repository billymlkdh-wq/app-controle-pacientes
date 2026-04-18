// Gráfico de evolução do questionário — LineChart multi-série (peso / aderência / energia)
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type ResponseRow = {
  response_number: number | null
  created_at: string
  question: { order_num: number; is_numeric_chart: boolean; question_text: string } | null
}

const SERIES_CONFIG: Record<number, { name: string; color: string }> = {
  1: { name: 'Peso (kg)', color: '#fbbf24' },
  2: { name: 'Aderência', color: '#34d399' },
  5: { name: 'Energia', color: '#60a5fa' },
}

export function QuestionnaireEvolutionChart({ responses }: { responses: ResponseRow[] }) {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const r of responses) {
    if (!r.question?.is_numeric_chart || r.response_number == null) continue
    const date = new Date(r.created_at).toISOString().slice(0, 10)
    const row = byDate.get(date) ?? { date }
    const s = SERIES_CONFIG[r.question.order_num]
    if (s) row[s.name] = Number(r.response_number)
    byDate.set(date, row)
  }
  const data = Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há respostas numéricas para plotar.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend />
          {Object.values(SERIES_CONFIG).map((s) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
