/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleChallengeJoined, handleChallengeCompleted } from '@/lib/gamification'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user.id).maybeSingle()

  const today = new Date().toISOString().split('T')[0]
  const { data: challenges } = await admin
    .from('patient_challenges')
    .select('*')
    .eq('is_active', true)
    .gte('end_date', today)
    .order('start_date', { ascending: true })

  const { data: participants } = await admin
    .from('patient_challenge_participants')
    .select('*, patients(name)')
    .in('challenge_id', (challenges ?? []).map((c: any) => c.id))

  const myParticipations = patient
    ? (participants ?? []).filter((p: any) => p.patient_id === patient.id)
    : []

  return NextResponse.json({
    challenges: challenges ?? [],
    participants: participants ?? [],
    myPatientId: patient?.id ?? null,
    myParticipations,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data: patient } = await admin
    .from('patients').select('id').eq('user_id', user.id).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { action, challenge_id, current_value } = body

  if (action === 'join') {
    const { error } = await admin.from('patient_challenge_participants').insert({
      challenge_id,
      patient_id: patient.id,
      current_value: 0,
    })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    await handleChallengeJoined(patient.id).catch(console.error)
    return NextResponse.json({ success: true })
  }

  if (action === 'update_progress') {
    const { data: challenge } = await admin
      .from('patient_challenges').select('target_value').eq('id', challenge_id).maybeSingle()

    const isComplete = challenge?.target_value && current_value >= challenge.target_value

    await admin.from('patient_challenge_participants').update({
      current_value,
      completed_at: isComplete ? new Date().toISOString() : null,
    }).eq('challenge_id', challenge_id).eq('patient_id', patient.id)

    if (isComplete) {
      await handleChallengeCompleted(patient.id).catch(console.error)
    }

    return NextResponse.json({ success: true, completed: isComplete })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
