// Landing — middleware redireciona conforme role; fallback para /auth/login
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/auth/login')
}
