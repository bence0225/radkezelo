import { useState, type FormEvent } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { Field, Notice } from '../components/ui'

// A Supabase angol hibaüzeneteit lefordítjuk. Szándékosan nem áruljuk el, hogy az e-mail
// létezik-e — a rossz e-mail és a rossz jelszó ugyanazt az üzenetet adja.
function loginError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case 'invalid_credentials': return 'Hibás e-mail-cím vagy jelszó.'
    case 'email_not_confirmed': return 'Az e-mail-cím még nincs megerősítve. Kérd meg egy Admint, hogy erősítse meg a fiókot.'
    case 'user_banned': return 'Ez a fiók le van tiltva.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'Túl sok próbálkozás. Várj egy kicsit, majd próbáld újra.'
    default: return error.message
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(loginError(error))
    setBusy(false)
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">SZTE Radiológiai Klinika</p>
        <h1>Raktárkezelő</h1>
        {!supabaseConfigured && (
          <Notice kind="warn">
            A Supabase nincs beállítva a telepített alkalmazáshoz. Add meg a{' '}
            <b>VITE_SUPABASE_URL</b> és <b>VITE_SUPABASE_ANON_KEY</b> változókat a Cloudflare Pages projekt{' '}
            <b>Settings → Environment variables</b> beállításainál a Production környezethez, majd indíts új
            deploymentet.
          </Notice>
        )}
        <Field label="E-mail">
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Jelszó">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button disabled={busy}>{busy ? 'Belépés…' : 'Belépés'}</button>
      </form>
    </main>
  )
}
