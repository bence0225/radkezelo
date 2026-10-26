import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import { useAuth } from '../auth/AuthProvider'
import type { Category, Location, Product, Profile, UsagePlace } from '../lib/types'
import { Field, Loading, Notice } from '../components/ui'

// Admin-only CRUD a törzsadatokhoz (spec 4.5). A hozzáférés két szinten védett:
// (1) az App.tsx navigációja eleve csak Adminnak mutatja ezt a képernyőt,
// (2) a Supabase RLS policy-k (schema.sql) is kizárólag Adminnak engedik az
// insert/update-et ezeken a táblákon — tehát a védelem akkor is áll, ha valaki
// megkerülné a felületet.

type Status = { kind: 'ok' | 'error'; text: string }

// Törlés csak akkor sikerül, ha semmi nem hivatkozik a sorra (FK, 23503-as hiba). A napló
// visszakereshetősége miatt pl. mozgással rendelkező termék nem törölhető — ilyenkor az
// "Aktív" kikapcsolása a megoldás, ezt jelezzük is a felhasználónak.
function deleteStatus(error: { code?: string; message: string } | null, blocker: string): Status {
  if (!error) return { kind: 'ok', text: 'Törölve.' }
  if (error.code === '23503') return { kind: 'error', text: `Nem törölhető: ${blocker}. Helyette állítsd inaktívra.` }
  return { kind: 'error', text: error.message }
}

async function deleteRow(table: string, id: number, blocker: string): Promise<Status> {
  // .select() nélkül egy RLS által csendben elnyelt törlés is "sikeresnek" látszana
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id')
  if (!error && !data?.length) return { kind: 'error', text: 'A törlés nem történt meg (nincs jogosultság, vagy már nem létezik).' }
  return deleteStatus(error, blocker)
}

const TABS = [
  { key: 'products', label: 'Termékek' },
  { key: 'locations', label: 'Lerakatok' },
  { key: 'categories', label: 'Kategóriák' },
  { key: 'usagePlaces', label: 'Felhasználási helyek' },
  { key: 'users', label: 'Felhasználók' },
] as const

export default function Torzsadatok() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('products')

  return (
    <section>
      <h2>Törzsadatok</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'products' && <ProductsAdmin />}
      {tab === 'locations' && <LocationsAdmin />}
      {tab === 'categories' && <CategoriesAdmin />}
      {tab === 'usagePlaces' && <UsagePlacesAdmin />}
      {tab === 'users' && <UsersAdmin />}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Lerakatok
// ---------------------------------------------------------------------------

function LocationsAdmin() {
  const { reloadLocations } = useAuth()
  const list = useQuery(() => supabase.from(T.locations).select('*').order('nev').returns<Location[]>(), [])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nev, setNev] = useState('')
  const [aktiv, setAktiv] = useState(true)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  function startNew() { setEditingId(null); setNev(''); setAktiv(true); setStatus(null) }
  function startEdit(l: Location) { setEditingId(l.id); setNev(l.nev); setAktiv(l.aktiv); setStatus(null) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const row = { nev: nev.trim(), aktiv }
    const { error } = editingId
      ? await supabase.from(T.locations).update(row).eq('id', editingId)
      : await supabase.from(T.locations).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else {
      setStatus({ kind: 'ok', text: 'Mentve.' })
      list.reload()
      reloadLocations() // hogy a Bevételezés/Kivét/stb. azonnal lássa az új/módosított lerakatot
      if (!editingId) startNew()
    }
    setBusy(false)
  }

  async function remove(l: Location) {
    if (!window.confirm(`Biztosan törlöd a(z) „${l.nev}” lerakatot?`)) return
    setBusy(true)
    const result = await deleteRow(T.locations, l.id, 'a lerakathoz már tartozik készlet vagy mozgás')
    if (result.kind === 'ok') { list.reload(); reloadLocations(); if (editingId === l.id) startNew() }
    setStatus(result)
    setBusy(false)
  }

  return (
    <div>
      <form className="card form" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Lerakat szerkesztése' : 'Új lerakat'}</h3>
        <Field label="Név">
          <input value={nev} onChange={(e) => setNev(e.target.value)} required />
        </Field>
        <Field label="Aktív">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button disabled={busy}>{editingId ? 'Mentés' : 'Felvétel'}</button>
          {editingId != null && <button type="button" className="link" onClick={startNew}>Mégse</button>}
        </div>
      </form>

      <Loading loading={list.loading} error={list.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>Aktív</th><th></th></tr></thead>
          <tbody>
            {list.data?.map((l) => (
              <tr key={l.id}>
                <td>{l.nev}</td>
                <td>{l.aktiv ? 'igen' : 'nem'}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="link" onClick={() => startEdit(l)}>Szerkesztés</button>
                    <button type="button" className="link danger" disabled={busy} onClick={() => remove(l)}>Törlés</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Felhasználási helyek — ahol a kivett anyagot felhasználják (pl. CT, MR). Kivételnél
// választható, a Naplóban és a Riportokban szűrhető.
// ---------------------------------------------------------------------------

function UsagePlacesAdmin() {
  const list = useQuery(() => supabase.from(T.usagePlaces).select('*').order('nev').returns<UsagePlace[]>(), [])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nev, setNev] = useState('')
  const [aktiv, setAktiv] = useState(true)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  function startNew() { setEditingId(null); setNev(''); setAktiv(true); setStatus(null) }
  function startEdit(h: UsagePlace) { setEditingId(h.id); setNev(h.nev); setAktiv(h.aktiv); setStatus(null) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const row = { nev: nev.trim(), aktiv }
    const { error } = editingId
      ? await supabase.from(T.usagePlaces).update(row).eq('id', editingId)
      : await supabase.from(T.usagePlaces).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else { setStatus({ kind: 'ok', text: 'Mentve.' }); list.reload(); if (!editingId) startNew() }
    setBusy(false)
  }

  async function remove(h: UsagePlace) {
    if (!window.confirm(`Biztosan törlöd a(z) „${h.nev}” felhasználási helyet?`)) return
    setBusy(true)
    const result = await deleteRow(T.usagePlaces, h.id, 'erre a helyre már történt kivét')
    if (result.kind === 'ok') { list.reload(); if (editingId === h.id) startNew() }
    setStatus(result)
    setBusy(false)
  }

  return (
    <div>
      <form className="card form" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Felhasználási hely szerkesztése' : 'Új felhasználási hely'}</h3>
        <Field label="Név (pl. CT, MR, átvilágító)">
          <input value={nev} onChange={(e) => setNev(e.target.value)} required />
        </Field>
        <Field label="Aktív">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button disabled={busy}>{editingId ? 'Mentés' : 'Felvétel'}</button>
          {editingId != null && <button type="button" className="link" onClick={startNew}>Mégse</button>}
        </div>
      </form>

      <Loading loading={list.loading} error={list.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>Aktív</th><th></th></tr></thead>
          <tbody>
            {list.data?.map((h) => (
              <tr key={h.id}>
                <td>{h.nev}</td>
                <td>{h.aktiv ? 'igen' : 'nem'}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="link" onClick={() => startEdit(h)}>Szerkesztés</button>
                    <button type="button" className="link danger" disabled={busy} onClick={() => remove(h)}>Törlés</button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.loading && !list.data?.length && <tr><td colSpan={3} className="muted">Még nincs felhasználási hely.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kategóriák
// ---------------------------------------------------------------------------

function CategoriesAdmin() {
  const list = useQuery(() => supabase.from(T.categories).select('*').order('nev').returns<Category[]>(), [])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nev, setNev] = useState('')
  const [lotKotelezo, setLotKotelezo] = useState(false)
  const [lejaratKotelezo, setLejaratKotelezo] = useState(false)
  const [aktiv, setAktiv] = useState(true)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  function startNew() { setEditingId(null); setNev(''); setLotKotelezo(false); setLejaratKotelezo(false); setAktiv(true); setStatus(null) }
  function startEdit(c: Category) { setEditingId(c.id); setNev(c.nev); setLotKotelezo(c.lot_kotelezo); setLejaratKotelezo(c.lejarat_kotelezo); setAktiv(c.aktiv); setStatus(null) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const row = { nev: nev.trim(), lot_kotelezo: lotKotelezo, lejarat_kotelezo: lejaratKotelezo, aktiv }
    const { error } = editingId
      ? await supabase.from(T.categories).update(row).eq('id', editingId)
      : await supabase.from(T.categories).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else { setStatus({ kind: 'ok', text: 'Mentve.' }); list.reload(); if (!editingId) startNew() }
    setBusy(false)
  }

  async function remove(c: Category) {
    if (!window.confirm(`Biztosan törlöd a(z) „${c.nev}” kategóriát?`)) return
    setBusy(true)
    const result = await deleteRow(T.categories, c.id, 'a kategóriához még tartozik termék')
    if (result.kind === 'ok') { list.reload(); if (editingId === c.id) startNew() }
    setStatus(result)
    setBusy(false)
  }

  return (
    <div>
      <form className="card form" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Kategória szerkesztése' : 'Új kategória'}</h3>
        <Field label="Név">
          <input value={nev} onChange={(e) => setNev(e.target.value)} required />
        </Field>
        <Field label="LOT kötelező">
          <input type="checkbox" checked={lotKotelezo} onChange={(e) => setLotKotelezo(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        <Field label="Lejárat kötelező">
          <input type="checkbox" checked={lejaratKotelezo} onChange={(e) => setLejaratKotelezo(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        <Field label="Aktív">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button disabled={busy}>{editingId ? 'Mentés' : 'Felvétel'}</button>
          {editingId != null && <button type="button" className="link" onClick={startNew}>Mégse</button>}
        </div>
      </form>

      <Loading loading={list.loading} error={list.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>LOT</th><th>Lejárat</th><th>Aktív</th><th></th></tr></thead>
          <tbody>
            {list.data?.map((c) => (
              <tr key={c.id}>
                <td>{c.nev}</td>
                <td>{c.lot_kotelezo ? 'kötelező' : '—'}</td>
                <td>{c.lejarat_kotelezo ? 'kötelező' : '—'}</td>
                <td>{c.aktiv ? 'igen' : 'nem'}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="link" onClick={() => startEdit(c)}>Szerkesztés</button>
                    <button type="button" className="link danger" disabled={busy} onClick={() => remove(c)}>Törlés</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Termékek
// ---------------------------------------------------------------------------

function ProductsAdmin() {
  const list = useQuery(() => supabase.from(T.products).select('*, kategoriak(*)').order('nev').returns<Product[]>(), [])
  const categories = useQuery(() => supabase.from(T.categories).select('*').eq('aktiv', true).order('nev').returns<Category[]>(), [])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [nev, setNev] = useState('')
  const [cikkszam, setCikkszam] = useState('')
  const [mertekegyseg, setMertekegyseg] = useState('')
  const [kategoriaId, setKategoriaId] = useState('')
  const [minMennyiseg, setMinMennyiseg] = useState('')
  const [aktiv, setAktiv] = useState(true)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  function startNew() {
    setEditingId(null); setNev(''); setCikkszam(''); setMertekegyseg(''); setKategoriaId(''); setMinMennyiseg(''); setAktiv(true); setStatus(null)
  }
  function startEdit(p: Product) {
    setEditingId(p.id); setNev(p.nev); setCikkszam(p.cikkszam ?? ''); setMertekegyseg(p.mertekegyseg)
    setKategoriaId(String(p.kategoria_id)); setMinMennyiseg(p.min_mennyiseg != null ? String(p.min_mennyiseg) : ''); setAktiv(p.aktiv); setStatus(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const row = {
      nev: nev.trim(),
      cikkszam: cikkszam.trim() || null,
      mertekegyseg: mertekegyseg.trim(),
      kategoria_id: Number(kategoriaId),
      min_mennyiseg: minMennyiseg ? Number(minMennyiseg) : null,
      aktiv,
    }
    const { error } = editingId
      ? await supabase.from(T.products).update(row).eq('id', editingId)
      : await supabase.from(T.products).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else { setStatus({ kind: 'ok', text: 'Mentve.' }); list.reload(); if (!editingId) startNew() }
    setBusy(false)
  }

  async function remove(p: Product) {
    if (!window.confirm(`Biztosan törlöd a(z) „${p.nev}” terméket?`)) return
    setBusy(true)
    const result = await deleteRow(T.products, p.id, 'a termékhez már tartozik készlet vagy mozgás')
    if (result.kind === 'ok') { list.reload(); if (editingId === p.id) startNew() }
    setStatus(result)
    setBusy(false)
  }

  return (
    <div>
      <form className="card form" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Termék szerkesztése' : 'Új termék'}</h3>
        <Field label="Név">
          <input value={nev} onChange={(e) => setNev(e.target.value)} required />
        </Field>
        <Field label="Cikkszám (EOS, opcionális)">
          <input value={cikkszam} onChange={(e) => setCikkszam(e.target.value)} />
        </Field>
        <Field label="Mértékegység (pl. db, ml)">
          <input value={mertekegyseg} onChange={(e) => setMertekegyseg(e.target.value)} required />
        </Field>
        <Field label="Kategória">
          <select value={kategoriaId} onChange={(e) => setKategoriaId(e.target.value)} required>
            <option value="">— válassz —</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.nev}</option>)}
          </select>
        </Field>
        <Field label="Minimum mennyiség (opcionális)">
          <input type="number" min="0" step="any" value={minMennyiseg} onChange={(e) => setMinMennyiseg(e.target.value)} />
        </Field>
        <Field label="Aktív">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 'auto' }} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button disabled={busy}>{editingId ? 'Mentés' : 'Felvétel'}</button>
          {editingId != null && <button type="button" className="link" onClick={startNew}>Mégse</button>}
        </div>
      </form>

      <Loading loading={list.loading} error={list.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>Cikkszám</th><th>Mértékegység</th><th>Kategória</th><th className="num">Minimum</th><th>Aktív</th><th></th></tr></thead>
          <tbody>
            {list.data?.map((p) => (
              <tr key={p.id}>
                <td>{p.nev}</td>
                <td>{p.cikkszam ?? '—'}</td>
                <td>{p.mertekegyseg}</td>
                <td>{p.kategoriak?.nev ?? '—'}</td>
                <td className="num">{p.min_mennyiseg ?? '—'}</td>
                <td>{p.aktiv ? 'igen' : 'nem'}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="link" onClick={() => startEdit(p)}>Szerkesztés</button>
                    <button type="button" className="link danger" disabled={busy} onClick={() => remove(p)}>Törlés</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Felhasználók — szerepkör és lerakat-hozzárendelés szerkesztése.
// Új bejelentkezés létrehozása innen NEM lehetséges (ahhoz service_role kulcsot
// használó szerver-oldali funkció kellene, amit szándékosan nem teszünk a
// böngészőbe) — az első lépés mindig a Supabase Dashboard → Authentication.
// ---------------------------------------------------------------------------

function UsersAdmin() {
  const { session } = useAuth()
  const list =useQuery(() => supabase.from(T.users).select('*').order('nev').returns<Profile[]>(), [])
  const locations = useQuery(() => supabase.from(T.locations).select('*').order('nev').returns<Location[]>(), [])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [nev, setNev] = useState('')
  const [szerepkor, setSzerepkor] = useState<'ADMIN' | 'FELHASZNALO'>('FELHASZNALO')
  const [aktiv, setAktiv] = useState(true)
  const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set())
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function startEdit(u: Profile) {
    setEditingId(u.id); setNev(u.nev); setSzerepkor(u.szerepkor); setAktiv(u.aktiv); setStatus(null)
    const { data } = await supabase.from(T.userLocations).select('location_id').eq('user_id', u.id)
    setSelectedLocations(new Set((data ?? []).map((r) => r.location_id as number)))
  }
  function cancelEdit() { setEditingId(null); setStatus(null) }

  function toggleLocation(id: number) {
    setSelectedLocations((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setBusy(true)
    setStatus(null)
    const { error: profileError } = await supabase
      .from(T.users)
      .update({ nev: nev.trim(), szerepkor, aktiv })
      .eq('id', editingId)
    // Lerakat-hozzárendelés: egyszerűen újraírjuk a sorokat a kiválasztott halmaz szerint.
    const { error: delError } = await supabase.from(T.userLocations).delete().eq('user_id', editingId)
    const rows = [...selectedLocations].map((location_id) => ({ user_id: editingId, location_id }))
    const { error: insError } = rows.length ? await supabase.from(T.userLocations).insert(rows) : { error: null }

    const error = profileError || delError || insError
    if (error) setStatus({ kind: 'error', text: error.message })
    else { setStatus({ kind: 'ok', text: 'Mentve.' }); list.reload() }
    setBusy(false)
  }

  // A bejelentkezést (auth.users) is törölni kell, különben a felhasználó továbbra is be
  // tudna lépni — ezt csak szerver-oldalon lehet, az admin_delete_user() DB-függvény végzi
  // (supabase/migration_delete_user.sql). A profil és a lerakat-hozzárendelés kaszkádolva törlődik.
  async function remove(u: Profile) {
    if (!window.confirm(`Biztosan törlöd ${u.nev} (${u.email}) felhasználót? A bejelentkezése is megszűnik.`)) return
    setBusy(true)
    const { error } = await supabase.rpc('admin_delete_user', { uid: u.id })
    const result = deleteStatus(error, 'a felhasználó már rögzített mozgást a naplóba')
    if (result.kind === 'ok') { list.reload(); if (editingId === u.id) setEditingId(null) }
    setStatus(result)
    setBusy(false)
  }

  return (
    <div>
      <Notice kind="warn">
        Új felhasználó első lépése mindig a Supabase Dashboard → Authentication → Add user — utána itt
        állítható be a szerepköre és a lerakat-hozzárendelése.
      </Notice>

      {editingId && (
        <form className="card form" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>Felhasználó szerkesztése</h3>
          <Field label="Név">
            <input value={nev} onChange={(e) => setNev(e.target.value)} required />
          </Field>
          <Field label="Szerepkör">
            <select value={szerepkor} onChange={(e) => setSzerepkor(e.target.value as 'ADMIN' | 'FELHASZNALO')}>
              <option value="FELHASZNALO">Felhasználó</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
          <Field label="Aktív">
            <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 'auto' }} />
          </Field>
          <Field label="Hozzárendelt lerakatok">
            <div className="checkbox-grid">
              {locations.data?.map((l) => (
                <label key={l.id} className="checkbox-grid__item">
                  <input type="checkbox" checked={selectedLocations.has(l.id)} onChange={() => toggleLocation(l.id)} />
                  {l.nev}
                </label>
              ))}
            </div>
          </Field>
          {status && <Notice kind={status.kind}>{status.text}</Notice>}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button disabled={busy}>Mentés</button>
            <button type="button" className="link" onClick={cancelEdit}>Mégse</button>
          </div>
        </form>
      )}

      {!editingId && status && <Notice kind={status.kind}>{status.text}</Notice>}
      <Loading loading={list.loading} error={list.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>E-mail</th><th>Szerepkör</th><th>Aktív</th><th></th></tr></thead>
          <tbody>
            {list.data?.map((u) => (
              <tr key={u.id}>
                <td>{u.nev}</td>
                <td>{u.email}</td>
                <td>{u.szerepkor === 'ADMIN' ? 'Admin' : 'Felhasználó'}</td>
                <td>{u.aktiv ? 'igen' : 'nem'}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="link" onClick={() => startEdit(u)}>Szerkesztés</button>
                    {u.id !== session?.user.id && (
                      <button type="button" className="link danger" disabled={busy} onClick={() => remove(u)}>Törlés</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
