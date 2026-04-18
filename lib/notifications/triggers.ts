// Helpers para criar notificações (in_app + whatsapp)
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type NotificationType = Database['public']['Tables']['notifications']['Row']['type']

export async function createNotification(
  supabase: SupabaseClient<Database>,
  input: {
    user_id: string
    type: NotificationType
    title: string
    message: string
    channel?: 'in_app' | 'whatsapp' | 'both'
    related_patient_id?: string | null
    related_entity_id?: string | null
  },
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: input.channel ?? 'in_app',
      related_patient_id: input.related_patient_id ?? null,
      related_entity_id: input.related_entity_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
