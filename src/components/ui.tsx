import { useEffect, useRef, type ReactNode } from 'react'

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

// Ki/be kapcsoló csúszka: a felirat és a kapcsoló egy sorban, a teljes sor kattintható.
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

// Felugró ablak a natív <dialog> elemre építve: a böngésző adja a fókuszcsapdát és az Esc-re
// zárást. A háttérre kattintás szándékosan NEM zár be, hogy egy félig kitöltött űrlap ne vesszen el.
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      d.querySelector<HTMLElement>('.modal__body input, .modal__body select')?.focus()
    } else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="modal-title">
      {open && (
        <>
          <div className="modal__head">
            <h3 id="modal-title">{title}</h3>
            <button type="button" className="modal__close" aria-label="Bezárás" onClick={onClose}>×</button>
          </div>
          <div className="modal__body">{children}</div>
        </>
      )}
    </dialog>
  )
}
