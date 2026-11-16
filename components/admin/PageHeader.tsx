// Header padrão das páginas admin: título + subtítulo + ações à direita.
import * as React from 'react'

export function PageHeader({
  title, subtitle, action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 pb-1">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  )
}

export function Section({
  label, children, action,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">
          {label}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
