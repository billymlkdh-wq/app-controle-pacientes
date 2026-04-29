// One-shot: update Bristol Scale image_url to local SVG (removes broken Google Drive link)
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const admin = createAdminClient()
  const { error, count } = await admin
    .from('questionnaire_questions')
    .update({ image_url: '/bristol-scale.svg' })
    .ilike('question_text', '%fezes%')
    .select('id', { count: 'exact', head: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: count })
}
