// Sai do modo paciente. POST — é uma ação que muda estado, e como GET o
// prefetch de <Link> do Next disparava a rota sozinho, limpando o cookie
// antes de qualquer clique do usuário.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 303: o navegador refaz a navegação como GET
  const res = NextResponse.redirect(new URL('/dashboard', request.url), 303)
  res.cookies.set('admin_patient_mode', '', { path: '/', maxAge: 0 })
  return res
}
