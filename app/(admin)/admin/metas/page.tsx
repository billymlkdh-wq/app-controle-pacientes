/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminGoalManager } from '@/components/admin/AdminGoalManager'
import { PageHeader } from '@/components/admin/PageHeader'

export default async function AdminMetasPage() {
  const admin = createAdminClient() as any

  const { data: patients } = await admin.from('patients').select('id, name').eq('active', true).order('name')
  const { data: goals } = await admin
    .from('patient_goals')
    .select('*, patients(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader title="Metas dos pacientes" subtitle="Acompanhamento de objetivos individuais" />
      <AdminGoalManager
        patients={(patients ?? []) as { id: string; name: string }[]}
        goals={(goals ?? []) as any[]}
      />
    </div>
  )
}
