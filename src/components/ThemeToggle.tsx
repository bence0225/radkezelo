import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './icons'

type Theme = 'light' | 'dark'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

// Amíg a felhasználó nem választ, a rendszer beállítását követjük
function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme
  if (t === 'light' || t === 'dark') return t
  return media().matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  // Ha nincs kézi választás, a rendszer váltását is kövesse az ikon
  useEffect(() => {
    const mq = media()
    const onChange = () => setTheme(currentTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('tema', next) } catch { /* privát mód: csak erre a munkamenetre marad */ }
    setTheme(next)
  }

  const label = theme === 'dark' ? 'Váltás világos módra' : 'Váltás sötét módra'
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  )
}
