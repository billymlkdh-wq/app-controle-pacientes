// sonner toaster wrapper com tema
'use client'
import { useTheme } from 'next-themes'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  const { theme = 'system' } = useTheme()
  return <SonnerToaster theme={theme as 'light' | 'dark' | 'system'} position="top-right" richColors />
}
