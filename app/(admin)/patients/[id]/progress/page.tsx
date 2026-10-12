// Evolução do paciente — questionário (mesmo gráfico que o paciente vê) + medidas manuais.
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/admin/ProgressChart'
import { QuestionnaireEvolutionChart } from '@/components/admin/QuestionnaireEvolutionChart'
import { PhotoEvolution, type PhotoGroup } from '@/components/admin/PhotoEvolution'
import { formatDateBR } from '@/lib/utils'

const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.quicktime']
const SIGNED_URL_TTL = 60 * 60 // 1 hora

export default async function PatientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [recordsRes, responsesRes] = await Promise.all([
    supabase
      .from('progress_records')
      .select('*')
      .eq('patient_id', id)
      .order('date', { ascending: true }),
    supabase
      .from('questionnaire_responses')
      .select('response_number,created_at,schedule_id,question:questionnaire_questions(order_num,is_numeric_chart,question_text)')
      .eq('patient_id', id)
      .order('created_at', { ascending: true }),
  ])

  const records = recordsRes.data ?? []
  const responses = responsesRes.data ?? []

  // ── Fotos enviadas pelo paciente ────────────────────────────────────────
  // Ficam em questionnaire_responses.media_urls, que guarda o CAMINHO no bucket
  // privado 'questionnaire-media' — não uma URL. Precisa assinar para exibir.
  const admin = createAdminClient() as any
  const { data: mediaRows, error: mediaErr } = await admin
    .from('questionnaire_responses')
    .select('created_at, media_urls')
    .eq('patient_id', id)
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: true })

  if (mediaErr) console.error('[progress] media query FAILED', mediaErr.message)

  // Agrupa caminhos por data de envio, sem repetir o mesmo arquivo
  const pathsByDate = new Map<string, string[]>()
  const seenPaths = new Set<string>()
  for (const row of (mediaRows ?? []) as Array<{ created_at: string; media_urls: unknown }>) {
    const paths = Array.isArray(row.media_urls) ? (row.media_urls as string[]) : []
    if (paths.length === 0) continue
    const date = row.created_at.slice(0, 10)
    for (const p of paths) {
      if (typeof p !== 'string' || !p || seenPaths.has(p)) continue
      seenPaths.add(p)
      if (!pathsByDate.has(date)) pathsByDate.set(date, [])
      pathsByDate.get(date)!.push(p)
    }
  }

  // Uma chamada só para assinar tudo
  const allPaths = [...seenPaths]
  const signedByPath = new Map<string, string>()
  if (allPaths.length > 0) {
    const { data: signed, error: signErr } = await admin
      .storage.from('questionnaire-media')
      .createSignedUrls(allPaths, SIGNED_URL_TTL)
    if (signErr) {
      console.error('[progress] createSignedUrls FAILED', signErr.message)
    } else {
      for (const s of (signed ?? []) as Array<{ path: string | null; signedUrl: string | null }>) {
        if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl)
      }
    }
  }

  const photoGroups: PhotoGroup[] = [...pathsByDate.entries()]
    .map(([date, paths]) => ({
      date,
      label: formatDateBR(date),
      photos: paths
        .filter((p) => signedByPath.has(p))
        .map((p) => ({
          path: p,
          url: signedByPath.get(p)!,
          isVideo: VIDEO_EXT.some((ext) => p.toLowerCase().endsWith(ext)),
        })),
    }))
    .filter((g) => g.photos.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Evolução do paciente</h1>

      <PhotoEvolution groups={photoGroups} />

      <Card>
        <CardHeader><CardTitle>Questionário quinzenal (peso, medidas, scores)</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <QuestionnaireEvolutionChart responses={responses as any} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Medidas manuais (admin)</CardTitle></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ProgressChart records={records as any} />
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tabela de medidas manuais</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Data</th><th>Peso</th><th>Cintura</th><th>Quadril</th></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{formatDateBR(r.date)}</td>
                      <td>{r.weight_kg ?? '-'} kg</td>
                      <td>{r.waist_cm ?? '-'} cm</td>
                      <td>{r.hip_cm ?? '-'} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
