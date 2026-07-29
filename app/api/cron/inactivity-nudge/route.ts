/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'

// Runs daily via Vercel Cron (see vercel.json)
// Sends a motivational WhatsApp to active patients with no app interaction
// for 7+ days. Max one nudge per patient every 7 days.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient() as any

  const now = new Date()
  const d7ago = new Date(now.getTime() - 7 * 864e5)
  const d7agoISO = d7ago.toISOString()
  const d7agoDate = d7agoISO.slice(0, 10)

  const [{ data: patients, error: patErr }, habits, resps, posts] = await Promise.all([
    db.from('patients')
      .select('id, name, phone, last_seen_at, last_nudge_at')
      .eq('active', true),
    db.from('patient_habit_logs').select('patient_id').gte('logged_date', d7agoDate),
    db.from('questionnaire_responses').select('patient_id').gte('created_at', d7agoISO),
    db.from('community_posts').select('patient_id').gte('created_at', d7agoISO),
  ])

  if (patErr) {
    console.error('[inactivity-nudge] patients query FAILED (migration 0014 pendente?)', patErr.message)
    return NextResponse.json({ ok: false, error: patErr.message }, { status: 500 })
  }

  const recentlyActive = new Set([
    ...(habits.data ?? []).map((r: any) => r.patient_id as string),
    ...(resps.data ?? []).map((r: any) => r.patient_id as string),
    ...(posts.data ?? []).map((r: any) => r.patient_id as string),
  ])

  const results: any[] = []
  let sent = 0

  for (const p of (patients ?? []) as any[]) {
    const isInactive =
      !recentlyActive.has(p.id) &&
      (!p.last_seen_at || p.last_seen_at < d7agoISO)
    if (!isInactive) continue

    // No máximo 1 nudge a cada 7 dias
    if (p.last_nudge_at && p.last_nudge_at >= d7agoISO) {
      results.push({ patient_id: p.id, status: 'nudge_recente' })
      continue
    }

    if (!p.phone) {
      results.push({ patient_id: p.id, status: 'sem_telefone' })
      continue
    }

    const firstName = (p.name ?? '').split(' ')[0] || 'paciente'
    const message =
      `Oi ${firstName}, tudo bem? Percebi que faz uns dias que voce nao aparece no app, ` +
      `e queria te lembrar que o processo nao precisa ser perfeito pra funcionar, ` +
      `precisa só continuar. Cada registro de agua, treino ou refeicao conta ponto ` +
      `e te aproxima do resultado que voce buscou quando comecou.\n\n` +
      `Entra la hoje, marca um habito qualquer, e ja voltou pro jogo. ` +
      `Qualquer dificuldade me chama por aqui que a gente resolve junto. 💪`

    try {
      const result = await sendWhatsAppText({ to: p.phone, message })
      if (result.ok) {
        sent++
        const { error: updErr } = await db
          .from('patients')
          .update({ last_nudge_at: now.toISOString() })
          .eq('id', p.id)
        if (updErr) console.error('[inactivity-nudge] last_nudge_at FAILED', { id: p.id, error: updErr.message })
        results.push({ patient_id: p.id, status: 'enviado' })
      } else {
        console.error('[inactivity-nudge] send FAILED', { id: p.id, status: result.status })
        results.push({ patient_id: p.id, status: 'falha_envio', http: result.status })
      }
    } catch (err) {
      console.error('[inactivity-nudge] send ERROR', { id: p.id, error: err instanceof Error ? err.message : err })
      results.push({ patient_id: p.id, status: 'erro', error: err instanceof Error ? err.message : 'unknown' })
    }
  }

  return NextResponse.json({ ok: true, sent, results })
}
