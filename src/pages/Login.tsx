import { useState, type FormEvent } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { Field, Notice } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">SZTE Radiológiai Klinika</p>
        <h1>Raktárkezelő</h1>
        {!supabaseConfigured && (
          <Notice kind="warn">
            A Supabase nincs beállítva — töltsd ki a <b>VITE_SUPABASE_URL</b> és{' '}
            <b>VITE_SUPABASE_ANON_KEY</b> értékét a <b>.env.local</b> fájlban, majd indítsd újra a dev szervert.
          </Notice>
        )}
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Jelszó">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button disabled={busy}>{busy ? 'Belépés…' : 'Belépés'}</button>
      </form>
    </main>
  )
}
