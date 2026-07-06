import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

const COOKIE = 'admin_preview_patient'

export async function getPreviewPatientId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}

// Returns { patientId, patientName, isAdminPreview }
// If admin + preview cookie → uses that patient
// If regular patient → looks up their own record
export async function resolvePatient(userId: string, isAdmin: boolean): Promise<{
  patientId: string | null
  patientName: string | null
  isAdminPreview: boolean
  previewPatientId: string | null
}> {
  const admin = createAdminClient() as any

  if (isAdmin) {
    const previewId = await getPreviewPatientId()
    if (previewId) {
      const { data } = await admin.from('patients').select('id, name').eq('id', previewId).maybeSingle()
      return { patientId: data?.id ?? null, patientName: data?.name ?? null, isAdminPreview: true, previewPatientId: previewId }
    }
    return { patientId: null, patientName: null, isAdminPreview: true, previewPatientId: null }
  }

  const { data } = await admin.from('patients').select('id, name').eq('user_id', userId).maybeSingle()
  return { patientId: data?.id ?? null, patientName: data?.name ?? null, isAdminPreview: false, previewPatientId: null }
}

export async function getAllPatientsForPreview() {
  const admin = createAdminClient() as any
  const { data } = await admin.from('patients').select('id, name').eq('active', true).order('name')
  return (data ?? []) as { id: string; name: string }[]
}
