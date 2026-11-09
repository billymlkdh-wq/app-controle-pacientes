// Converte HEIC/HEIF do bucket questionnaire-media em JPEG server-side.
// Chamado pelo <Media> quando detecta extensão .heic.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'   // precisa Node, não Edge (buffer/lib nativa)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.user_metadata as { role?: string } | null)?.role
  const isAdmin = role === 'admin'

  const path = request.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path obrigatório' }, { status: 400 })

  // Autorização: admin vê tudo; paciente só os próprios (path começa com seu id)
  if (!isAdmin) {
    const { data: patient } = await supabase
      .from('patients').select('id').eq('user_id', user.id).single()
    if (!patient || !path.startsWith(`${patient.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: blob, error } = await admin.storage
    .from('questionnaire-media')
    .download(path)
  if (error || !blob) {
    return NextResponse.json({ error: error?.message ?? 'Arquivo não encontrado' }, { status: 404 })
  }

  try {
    const heicConvert = (await import('heic-convert')).default
    const inputBuffer = Buffer.from(await blob.arrayBuffer())
    const outBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.85,
    })
    return new Response(outBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (e) {
    return NextResponse.json({
      error: 'Falha ao converter HEIC',
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
