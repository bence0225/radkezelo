import { useState, type ComponentType } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Login from './pages/Login'
import Bevetelezes from './pages/Bevetelezes'
import Kivet from './pages/Kivet'
import Keszlet from './pages/Keszlet'
import Naplo from './pages/Naplo'
import Torzsadatok from './pages/Torzsadatok'
import Riportok from './pages/Riportok'
import { Notice } from './components/ui'
import { IconStock, IconIn, IconOut, IconLog, IconReport, IconMaster, IconLogout, IconHospital, type IconProps } from './components/icons'

// Hat képernyő (spec 5. fejezet). Külön router nem kell hozzá.
const SCREENS: { key: string; label: string; Page: ComponentType; Icon: ComponentType<IconProps>; adminOnly?: boolean }[] = [
  { key: 'keszlet', label: 'Készlet', Page: Keszlet, Icon: IconStock },
  { key: 'bevet', label: 'Bevételezés', Page: Bevetelezes, Icon: IconIn },
  { key: 'kivet', label: 'Kivét', Page: Kivet, Icon: IconOut },
  { key: 'naplo', label: 'Napló', Page: Naplo, Icon: IconLog },
  { key: 'riport', label: 'Riportok és leltár', Page: Riportok, Icon: IconReport },
  { key: 'torzs', label: 'Törzsadatok', Page: Torzsadatok, Icon: IconMaster, adminOnly: true },
]

function Shell() {
  const { session, profile, loading, isAdmin, signOut } = useAuth()
  const [screen, setScreen] = useState('keszlet')

  if (loading) return <p className="msg muted">Betöltés…</p>
  if (!session) return <Login />

  if (!profile || !profile.aktiv) {
    return (
      <main className="login">
        <div className="card">
          <Notice kind="warn">
            Nincs aktív profilod a <b>users</b> táblában ehhez a fiókhoz ({session.user.email}). Kérd meg egy Admint, hogy vegyen fel.
          </Notice>
          <button onClick={signOut}>Kilépés</button>
        </div>
      </main>
    )
  }

  const visible = SCREENS.filter((s) => !s.adminOnly || isAdmin)
  const active = visible.find((s) => s.key === screen) ?? visible[0]
  const Page = active.Page

  return (
    <>
      <header className="topbar no-print">
        <div className="brand">
          <span className="brand__mark"><IconHospital /></span>
          <span className="brand__text">
            <span className="brand__eyebrow">SZTE Radiológiai Klinika</span>
            <span className="brand__name">Raktárkezelő</span>
          </span>
        </div>

        <nav className="nav" aria-label="Fő navigáció">
          {visible.map((s) => (
            <button
              key={s.key}
              className={`nav__item${s.key === active.key ? ' is-active' : ''}`}
              onClick={() => setScreen(s.key)}
              aria-current={s.key === active.key ? 'page' : undefined}
            >
              <s.Icon className="nav__icon" aria-hidden="true" />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="account">
          <span className="account__info">
            <span className="account__name">{profile.nev}</span>
            <span className="account__role">{profile.szerepkor === 'ADMIN' ? 'Admin' : 'Felhasználó'}</span>
          </span>
          <button className="account__logout" onClick={signOut} title="Kilépés" aria-label="Kilépés">
            <IconLogout />
          </button>
        </div>
      </header>
      <main className="page"><Page /></main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
