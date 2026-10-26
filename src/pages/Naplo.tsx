import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { Movement, NewMovement, Product, Profile, UsagePlace } from '../lib/types'
import { Field, Loading, Notice } from '../components/ui'

export default function Naplo() {
  const { locations, session } = useAuth()
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [userId, setUserId] = useState('')
  const [usagePlaceId, setUsagePlaceId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const products = useQuery(() => supabase.from(T.products).select('id, nev').order('nev').returns<Pick<Product, 'id' | 'nev'>[]>(), [])
  const users = useQuery(() => supabase.from(T.users).select('id, nev').returns<Pick<Profile, 'id' | 'nev'>[]>(), [])
  const usagePlaces = useQuery(() => supabase.from(T.usagePlaces).select('id, nev').order('nev').returns<Pick<UsagePlace, 'id' | 'nev'>[]>(), [])

  // ÉÉÉÉ-HH-NN formátumnál a szöveges összehasonlítás egyben dátum-összehasonlítás is
  const rangeInvalid = !!from && !!to && from > to

  const movements = useQuery(() => {
    // Fordított időszakra nem kérdezünk le semmit — a hibaüzenet magyarázza, miért üres a lista
    if (rangeInvalid) return Promise.resolve({ data: [] as Movement[], error: null })
    let q = supabase.from(T.movements).select('*, products(nev, mertekegyseg), locations(nev), felhasznalasi_helyek(nev)')
    if (productId) q = q.eq('product_id', Number(productId))
    if (locationId) q = q.eq('location_id', Number(locationId))
    if (userId) q = q.eq('felhasznalo_id', userId)
    if (usagePlaceId) q = q.eq('felhasznalasi_hely_id', Number(usagePlaceId))
    if (from) q = q.gte('idopont', from)
    if (to) q = q.lte('idopont', `${to}T23:59:59`)
    return q.order('idopont', { ascending: false }).limit(500).returns<Movement[]>()
  }, [productId, locationId, userId, usagePlaceId, from, to])

  const rows = movements.data ?? []
  const corrected = new Set(rows.map((r) => r.javitott_mozgas_id).filter((x): x is number => x != null))
  const userName = (id: string) => users.data?.find((u) => u.id === id)?.nev ?? id.slice(0, 8)

  // Javítás = új, ellentétes előjelű sor, ami hivatkozik a hibásra. A régi sor sosem íródik át (spec 3. fejezet)
  async function correct(m: Movement) {
    if (!session || !window.confirm('Biztosan javítod (ellentétes előjelű sor kerül a naplóba)?')) return
    const row: NewMovement = {
      tipus: 'JAVITAS',
      product_id: m.product_id,
      location_id: m.location_id,
      lot: m.lot,
      lejarat: m.lejarat,
      mennyiseg: -m.mennyiseg,
      felhasznalo_id: session.user.id,
      idopont: new Date().toISOString(),
      egysegar: m.egysegar,
      megjegyzes: `Javítás (#${m.id})`,
      javitott_mozgas_id: m.id,
      felhasznalasi_hely_id: m.felhasznalasi_hely_id,
    }
    const { error } = await supabase.from(T.movements).insert(row)
    setMsg(error ? error.message : null)
    if (!error) movements.reload()
  }

  return (
    <section>
      <h2>Napló</h2>
      <div className="filters">
        <Field label="Termék">
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Összes</option>
            {products.data?.map((p) => <option key={p.id} value={p.id}>{p.nev}</option>)}
          </select>
        </Field>
        <Field label="Lerakat">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Összes</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.nev}</option>)}
          </select>
        </Field>
        <Field label="Felhasználó">
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Összes</option>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.nev}</option>)}
          </select>
        </Field>
        <Field label="Felhasználási hely">
          <select value={usagePlaceId} onChange={(e) => setUsagePlaceId(e.target.value)}>
            <option value="">Összes</option>
            {usagePlaces.data?.map((h) => <option key={h.id} value={h.id}>{h.nev}</option>)}
          </select>
        </Field>
        <Field label="Ettől"><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Eddig"><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {rangeInvalid && <Notice kind="error">Az „Ettől” dátum nem lehet későbbi, mint az „Eddig” dátum.</Notice>}
      {msg && <Notice kind="error">{msg}</Notice>}
      <Loading loading={movements.loading} error={movements.error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Időpont</th><th>Típus</th><th>Termék</th><th>Lerakat</th><th>LOT</th><th>Lejárat</th>
              <th className="num">Mennyiség</th><th>Felh. hely</th><th>Ki</th><th>Megjegyzés</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.idopont).toLocaleString('hu-HU')}</td>
                <td>{m.tipus}</td>
                <td>{m.products?.nev}</td>
                <td>{m.locations?.nev}</td>
                <td>{m.lot ?? '—'}</td>
                <td>{m.lejarat ?? '—'}</td>
                <td className="num">{m.mennyiseg > 0 ? '+' : ''}{m.mennyiseg} {m.products?.mertekegyseg}</td>
                <td>{m.felhasznalasi_helyek?.nev ?? '—'}</td>
                <td>{userName(m.felhasznalo_id)}</td>
                <td>{m.megjegyzes}</td>
                <td>
                  {m.tipus !== 'JAVITAS' && !corrected.has(m.id) && (
                    <button className="link" onClick={() => correct(m)}>Javítás</button>
                  )}
                  {corrected.has(m.id) && <span className="muted">javítva</span>}
                </td>
              </tr>
            ))}
            {!movements.loading && !rangeInvalid && !rows.length && <tr><td colSpan={11} className="muted">Nincs mozgás.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
