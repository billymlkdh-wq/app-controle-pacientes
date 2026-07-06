/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const habitType = (formData.get('habit_type') as string) ?? 'habit'
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Max 10MB' }, { status: 400 })

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${habitType}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const db = createAdminClient() as any
  const { error } = await db.storage.from('habit-photos').upload(path, bytes, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('habit-photos').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
