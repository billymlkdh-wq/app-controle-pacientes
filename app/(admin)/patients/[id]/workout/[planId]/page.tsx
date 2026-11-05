/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkoutPlanEditor, type DayRow } from '@/components/admin/WorkoutPlanEditor'

export default async function WorkoutPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>
}) {
  const { id, planId } = await params
  const supabase = await createClient()

  const [{ data: patient }, { data: plan }, { data: days }] = await Promise.all([
    supabase.from('patients').select('id, name').eq('id', id).single(),
    supabase.from('workout_plans').select('*').eq('id', planId).single(),
    supabase
      .from('workout_days')
      .select('id, name, notes, order_num, exercises:workout_exercises(id, name, notes, rest_seconds, order_num, sets:workout_sets(id, set_type, reps, target_load_kg, order_num))')
      .eq('plan_id', planId)
      .order('order_num'),
  ])
  if (!patient || !plan) notFound()

  const normalized: DayRow[] = (days ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    notes: d.notes,
    order_num: d.order_num,
    exercises: [...(d.exercises ?? [])].sort((a: any, b: any) => a.order_num - b.order_num).map((e: any) => ({
      id: e.id,
      name: e.name,
      notes: e.notes,
      rest_seconds: e.rest_seconds,
      order_num: e.order_num,
      sets: [...(e.sets ?? [])].sort((a: any, b: any) => a.order_num - b.order_num).map((s: any) => ({
        id: s.id,
        set_type: s.set_type,
        reps: s.reps,
        target_load_kg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
        order_num: s.order_num,
      })),
    })),
  }))

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <Link href={`/patients/${id}/workout`} className="text-primary hover:underline">
          ← Treinos
        </Link>
        <span className="text-muted-foreground"> · {patient.name}</span>
      </div>
      <WorkoutPlanEditor
        initialPlan={{
          id: plan.id,
          patient_id: plan.patient_id,
          name: plan.name,
          notes: plan.notes,
          active: plan.active,
        }}
        initialDays={normalized}
      />
    </div>
  )
}
