import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../lib/useNotifications'
import type { Ertesites } from '../lib/types'
import { IconBell } from './icons'

const TIPUS_CIMKE: Record<Ertesites['tipus'], string> = {
  NEGATIV: 'Negatív készlet',
  ELFOGYOTT: 'Elfogyott',
  ALACSONY: 'Alacsony készlet',
}

function formatIdo(iso: string) {
  return new Date(iso).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// A figyelmeztető buborék belépésenként egyszer jelenik meg. A kulcsban a bejelentkezés
// időpontja van, így oldalfrissítéskor nem jön újra, a következő belépéskor viszont igen.
function hintAlreadyShown(key: string) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
function rememberHint(key: string) {
  try { localStorage.setItem(key, '1') } catch { /* privát mód: legfeljebb újra megjelenik */ }
}

export function NotificationBell({ userId, loginKey, onOpenItem }: { userId: string; loginKey: string; onOpenItem: (n: Ertesites) => void }) {
  const [toast, setToast] = useState<Ertesites | null>(null)
  const { items, unread, loaded, markRead, markAllRead } = useNotifications(userId, (n) => { setHint(false); setToast(n) })
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Élőben érkezett értesítés: felugró kártya a csengő alatt, 8 mp után eltűnik
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 8000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const key = `ertesites-hint:${userId}:${loginKey}`
    if (!loaded || unread === 0 || hintAlreadyShown(key)) return
    rememberHint(key)
    setHint(true)
    const t = window.setTimeout(() => setHint(false), 10000)
    return () => window.clearTimeout(t)
    // csak az első betöltéskor döntünk róla, a később érkező értesítések nem hozzák elő újra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Kattintás a panelen kívül vagy Esc: bezárás
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  function toggle() { setHint(false); setToast(null); setOpen((o) => !o) }

  function openItem(n: Ertesites) {
    markRead(n.id)
    setOpen(false)
    onOpenItem(n)
  }

  const label = unread ? `Értesítések, ${unread} olvasatlan` : 'Értesítések'

  return (
    <div className="bell" ref={wrapRef}>
      <button type="button" className="bell__button" onClick={toggle} aria-label={label} title="Értesítések" aria-expanded={open}>
        <IconBell />
        {unread > 0 && <span className="bell__badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {toast && !open && (
        <div className={`bell__hint bell__toast bell__toast--${toast.tipus.toLowerCase()}`} role="alert">
          <button type="button" className="bell__toast-body" onClick={toggle}>
            <span className="bell__type">Új értesítés: {TIPUS_CIMKE[toast.tipus]}</span>
            <span>{toast.uzenet}</span>
          </button>
          <button type="button" className="bell__hint-close" aria-label="Bezárás" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {hint && !toast && !open && (
        <div className="bell__hint" role="status">
          <span>
            {unread === 1 ? 'Van egy olvasatlan értesítésed.' : `${unread} olvasatlan értesítésed van.`} Nézd meg a csengőnél!
          </span>
          <button type="button" className="bell__hint-close" aria-label="Bezárás" onClick={() => setHint(false)}>×</button>
        </div>
      )}

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Értesítések">
          <div className="bell__head">
            <strong>Értesítések</strong>
            {unread > 0 && <button type="button" className="link" onClick={markAllRead}>Mind olvasott</button>}
          </div>
          {items.length === 0 ? (
            <p className="bell__empty muted">Nincs értesítésed.</p>
          ) : (
            <ul className="bell__list">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`bell__item${n.olvasva ? '' : ' is-unread'}`} onClick={() => openItem(n)}>
                    <span className={`bell__dot bell__dot--${n.tipus.toLowerCase()}`} aria-hidden="true" />
                    <span className="bell__text">
                      <span className="bell__type">{TIPUS_CIMKE[n.tipus]}</span>
                      <span>{n.uzenet}</span>
                      <span className="bell__time">{formatIdo(n.letrehozva)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
