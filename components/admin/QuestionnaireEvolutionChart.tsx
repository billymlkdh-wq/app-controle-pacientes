// Gráfico de evolução do questionário — dois LineCharts separados:
// 1) Medidas físicas: Peso (kg) e Abdômen (cm)
// 2) Scores semanais (0-10): alimentação, sono, motivação, etc.
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type ResponseRow = {
  response_number: number | null
  created_at: string
  question: { order_num: number; is_numeric_chart: boolean; question_text: string } | null
}

// Medidas físicas — escala grande (kg / cm)
const PHYSICAL_SERIES: Record<number, { name: string; color: string }> = {
  19: { name: 'Peso (kg)', color: '#fbbf24' },
  20: { name: 'Abdômen (cm)', color: '#f87171' },
}

// Scores semanais — escala 0-10
const SCORE_SERIES: Record<number, { name: string; color: string }> = {
  2:  { name: 'Água', color: '#60a5fa' },
  9:  { name: 'Alim. semana', color: '#34d399' },
  10: { name: 'Alim. fds', color: '#a78bfa' },
  11: { name: 'Saciedade', color: '#fb923c' },
  16: { name: 'Sono', color: '#38bdf8' },
  17: { name: 'Ansiedade', color: '#f472b6' },
  23: { name: 'Motivação', color: '#4ade80' },
  24: { name: 'Satisfação', color: '#e879f9' },
}

function buildData(
  responses: ResponseRow[],
  config: Record<number, { name: string; color: string }>,
) {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const r of responses) {
    if (!r.question?.is_numeric_chart || r.response_number == null) continue
    const s = config[r.question.order_num]
    if (!s) continue
    const date = new Date(r.created_at).toISOString().slice(0, 10)
    const row = byDate.get(date) ?? { date }
    row[s.name] = Number(r.response_number)
    byDate.set(date, row)
  }
  return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function Chart({
  data,
  config,
  height = 240,
}: {
  data: Record<string, number | string>[]
  config: Record<number, { name: string; color: string }>
  height?: number
}) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground py-2">Sem dados ainda.</p>
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
          <YAxis className="text-xs" tick={{ fontSize: 11 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {Object.values(config).map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function QuestionnaireEvolutionChart({ responses }: { responses: ResponseRow[] }) {
  const physicalData = buildData(responses, PHYSICAL_SERIES)
  const scoreData    = buildData(responses, SCORE_SERIES)

  const hasAny = physicalData.length > 0 || scoreData.length > 0
  if (!hasAny) {
    return <p className="text-sm text-muted-foreground">Ainda não há respostas numéricas para plotar.</p>
  }

  return (
    <div className="space-y-6">
      {physicalData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Medidas físicas</p>
          <Chart data={physicalData} config={PHYSICAL_SERIES} height={200} />
        </div>
      )}
      {scoreData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Scores semanais (0–10)</p>
          <Chart data={scoreData} config={SCORE_SERIES} height={260} />
        </div>
      )}
    </div>
  )
}
