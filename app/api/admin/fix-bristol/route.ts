// One-shot: update Google Drive image_urls to local SVGs
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const UPDATES = [
  {
    image_url: '/bristol-scale.svg',
    match: '%fezes%',
    field: 'question_text',
  },
  {
    image_url: '/trajes-foto.svg',
    match: '%fotos atuais%',
    field: 'question_text',
  },
]

export async function POST() {
  const admin = createAdminClient()
  const results = []

  for (const u of UPDATES) {
    const { error, count } = await admin
      .from('questionnaire_questions')
      .update({ image_url: u.image_url })
      .ilike(u.field as 'question_text', u.match)
      .select('id', { count: 'exact', head: true })

    results.push({ image_url: u.image_url, updated: count, error: error?.message })
  }

  const hasError = results.some((r) => r.error)
  return NextResponse.json({ ok: !hasError, results }, { status: hasError ? 500 : 200 })
}
