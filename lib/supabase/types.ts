// Supabase types — placeholder. Regenerar com `npm run types:gen` após aplicar a migration.
// Estes tipos refletem o schema de supabase/migrations/0001_init.sql.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string | null
          phone: string | null
          whatsapp_phone: string | null
          birth_date: string | null
          sex: 'M' | 'F' | 'outro' | null
          objective: string | null
          health_history: string | null
          plan_type: 'avulso' | 'mensal'
          plan_value: number | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['patients']['Row']> & { name: string }
        Update: Partial<Database['public']['Tables']['patients']['Row']>
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          date: string
          next_appointment: string | null
          notes: string | null
          meal_plan: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['appointments']['Row']> & { patient_id: string; date: string }
        Update: Partial<Database['public']['Tables']['appointments']['Row']>
      }
      progress_records: {
        Row: {
          id: string
          patient_id: string
          date: string
          weight_kg: number | null
          waist_cm: number | null
          hip_cm: number | null
          notes: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['progress_records']['Row']> & { patient_id: string; date: string }
        Update: Partial<Database['public']['Tables']['progress_records']['Row']>
      }
      payments: {
        Row: {
          id: string
          patient_id: string
          date: string
          due_date: string | null
          amount: number
          method: 'pix' | 'cartao' | 'dinheiro' | 'transferencia' | 'boleto' | null
          status: 'pago' | 'pendente' | 'atrasado'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & { patient_id: string; date: string; amount: number }
        Update: Partial<Database['public']['Tables']['payments']['Row']>
      }
      questionnaire_questions: {
        Row: {
          id: string
          order_num: number
          question_text: string
          question_type: 'text' | 'number' | 'scale' | 'choice'
          options: Json | null
          is_numeric_chart: boolean
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['questionnaire_questions']['Row']> & { order_num: number; question_text: string }
        Update: Partial<Database['public']['Tables']['questionnaire_questions']['Row']>
      }
      questionnaire_responses: {
        Row: {
          id: string
          patient_id: string
          question_id: string
          schedule_id: string | null
          response_text: string | null
          response_number: number | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['questionnaire_responses']['Row']> & { patient_id: string; question_id: string }
        Update: Partial<Database['public']['Tables']['questionnaire_responses']['Row']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'questionnaire_due_soon' | 'questionnaire_overdue' | 'patient_questionnaire_late' | 'payment_overdue' | 'appointment_reminder' | 'system'
          title: string
          message: string
          channel: 'in_app' | 'whatsapp' | 'both'
          related_patient_id: string | null
          related_entity_id: string | null
          whatsapp_sent_at: string | null
          whatsapp_status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read' | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & { user_id: string; type: Database['public']['Tables']['notifications']['Row']['type']; title: string; message: string }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
      }
      questionnaire_schedule: {
        Row: {
          id: string
          patient_id: string
          due_date: string
          completed_at: string | null
          status: 'pending' | 'completed' | 'overdue' | 'skipped'
          reminder_d2_sent: boolean
          reminder_d1_sent: boolean
          reminder_d3_sent: boolean
          reminder_d7_sent: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['questionnaire_schedule']['Row']> & { patient_id: string; due_date: string }
        Update: Partial<Database['public']['Tables']['questionnaire_schedule']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
