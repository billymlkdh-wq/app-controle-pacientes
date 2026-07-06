'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Challenge {
  id: string
  title: string
  description: string | null
  challenge_type: string
  target_value: number | null
  unit: string | null
  start_date: string
  end_date: string
  xp_reward: number
  prize: string | null
  is_active: boolean
}

interface Participant {
  id: string
  challenge_id: string
  patient_id: string
  current_value: number
  completed_at: string | null
  patients: { name: string } | null
}

interface Props {
  challenge: Challenge
  participants: Participant[]
  myPatientId: string | null
  isJoined: boolean
  myProgress: number
}

export function ChallengeCard({ challenge, participants, myPatientId, isJoined, myProgress }: Props) {
  const [joined, setJoined] = React.useState(isJoined)
  const [progress, setProgress] = React.useState(myProgress)
  const [newValue, setNewValue] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const sorted = [...participants].sort((a, b) => b.current_value - a.current_value)
  const isComplete = challenge.target_value && progress >= challenge.target_value
  const pct = challenge.target_value && challenge.target_value > 0
    ? Math.min(100, Math.round((progress / challenge.target_value) * 100))
    : 0

  const today = new Date().toISOString().split('T')[0]
  const isActive = challenge.start_date <= today && challenge.end_date >= today

  async function join() {
    setLoading(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', challenge_id: challenge.id }),
      })
      if (!res.ok) throw new Error('Erro ao entrar')
      setJoined(true)
      toast.success('Você entrou no desafio! 🏆')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateProgress() {
    const val = parseFloat(newValue)
    if (isNaN(val) || val <= progress) {
      toast.error('Valor deve ser maior que o atual')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_progress', challenge_id: challenge.id, current_value: val }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProgress(val)
      setNewValue('')
      if (data.completed) toast.success(`Desafio concluído! +${challenge.xp_reward} XP 🎉`)
      else toast.success('Progresso atualizado!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={isComplete ? 'border-green-500/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{challenge.title}</CardTitle>
          <div className="flex gap-1 shrink-0">
            {isActive && <Badge variant="default" className="text-xs">Ativo</Badge>}
            <Badge variant="outline" className="text-xs">+{challenge.xp_reward} XP</Badge>
          </div>
        </div>
        {challenge.description && (
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
        )}
        {challenge.prize && (
          <p className="text-xs font-medium text-yellow-500">🏆 Prêmio: {challenge.prize}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(challenge.start_date).toLocaleDateString('pt-BR')} → {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Leaderboard */}
        {sorted.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Ranking</p>
            {sorted.slice(0, 5).map((p, i) => {
              const isMe = p.patient_id === myPatientId
              const pPct = challenge.target_value
                ? Math.min(100, Math.round((p.current_value / challenge.target_value) * 100))
                : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={p.id} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${isMe ? 'bg-primary/10 font-medium' : 'bg-muted/40'}`}>
                  <span className="w-5 text-center">{i < 3 ? medals[i] : `#${i + 1}`}</span>
                  <span className="flex-1">{isMe ? 'Você' : (p.patients?.name?.split(' ')[0] ?? 'Paciente')}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pPct}%` }} />
                  </div>
                  <span className="w-14 text-right">{p.current_value} {challenge.unit}</span>
                  {p.completed_at && <span>✅</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* Meu progresso */}
        {joined && challenge.target_value && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Meu progresso</span>
              <span>{progress} / {challenge.target_value} {challenge.unit} ({pct}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Ações */}
        {isActive && !joined && myPatientId && (
          <Button className="w-full" onClick={join} disabled={loading}>
            {loading ? '...' : 'Participar do desafio'}
          </Button>
        )}
        {isActive && joined && !isComplete && challenge.target_value && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={`Meu total de ${challenge.unit}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              min={progress}
            />
            <Button size="sm" onClick={updateProgress} disabled={loading || !newValue}>
              {loading ? '...' : 'Atualizar'}
            </Button>
          </div>
        )}
        {isComplete && (
          <p className="text-center text-sm text-green-500 font-medium">✅ Desafio concluído!</p>
        )}
      </CardContent>
    </Card>
  )
}
