// Next.js middleware — proteção de rotas admin/paciente + refresh de sessão Supabase SSR
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_PREFIXES = ['/admin', '/dashboard', '/patients', '/financial', '/questionnaires']
const PATIENT_PREFIXES = ['/portal', '/questionnaire', '/progress']
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

  if (PATIENT_PREFIXES.some((p) => pathname.startsWith(p)) && role === 'admin') {
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
