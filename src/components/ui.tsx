import type { ReactNode } from 'react'

export function Loading({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) return <p className="msg error">Hiba: {error}</p>
  if (loading) return <p className="msg muted">Betöltés…</p>
  return null
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Notice({ kind, children }: { kind: 'ok' | 'warn' | 'error'; children: ReactNode }) {
  return <p className={`msg ${kind}`}>{children}</p>
}
