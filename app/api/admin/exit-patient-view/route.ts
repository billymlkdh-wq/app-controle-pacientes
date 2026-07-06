import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/dashboard', request.url))
  res.cookies.set('admin_patient_mode', '', { path: '/', maxAge: 0 })
  return res
}
