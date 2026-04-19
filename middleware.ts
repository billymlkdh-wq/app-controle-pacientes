// Next.js middleware — proteção de rotas admin/paciente + refresh de sessão Supabase SSR
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_PREFIXES = ['/admin', '/dashboard', '/patients', '/financial', '/questionnaires']
// NB: precisa ser prefixo exato ou com "/" para não casar com /questionnaires (admin)
const PATIENT_EXACT = ['/portal', '/questionnaire', '/progress']
const PATIENT_PREFIXES_WITH_SLASH = ['/portal/', '/questionnaire/', '/progress/']
const isPatientPath = (p: string) =>
  PATIENT_EXACT.includes(p) || PATIENT_PREFIXES_WITH_SLASH.some((x) => p.startsWith(x))
const PUBLIC_PREFIXES = ['/auth', '/api/webhooks/whatsapp']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const { response, user } = await updateSession(request)

  if (!user) {
    if (pathname === '/') return response
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const role = (user.user_metadata as { role?: string } | null)?.role

  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  if (isPatientPath(pathname) && role === 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(role === 'admin' ? '/dashboard' : '/portal', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
