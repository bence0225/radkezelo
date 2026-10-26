import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { NewMovement, Product } from '../lib/types'
import { Field, Loading, Notice } from '../components/ui'

export default function Bevetelezes() {
  const { locations, session } = useAuth()
  const products = useQuery(
    () => supabase.from(T.products).select('*, kategoriak(*)').eq('aktiv', true).order('nev').returns<Product[]>(),
    [],
  )

  const [locationId, setLocationId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [lot, setLot] = useState('')
  const [lejarat, setLejarat] = useState('')
  const [egysegar, setEgysegar] = useState('')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const product = products.data?.find((p) => String(p.id) === productId)
  // A LOT/lejárat kötelezettség a termék kategóriáján dől el (spec 4.1)
  const lotRequired = product?.kategoriak?.lot_kotelezo ?? false
  const lejaratRequired = product?.kategoriak?.lejarat_kotelezo ?? false

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true)
    setStatus(null)
    const row: NewMovement = {
      tipus: 'BEVET',
      product_id: Number(productId),
      location_id: Number(locationId),
      lot: lot.trim() || null,
      lejarat: lejarat || null,
      mennyiseg: Math.abs(Number(qty)), // bevét: +
      felhasznalo_id: session.user.id,
      idopont: new Date().toISOString(),
      egysegar: egysegar ? Number(egysegar) : null,
      megjegyzes: megjegyzes.trim() || null,
      javitott_mozgas_id: null,
      felhasznalasi_hely_id: null,
    }
    // A stock tábla frissítését az adatbázis-trigger végzi (spec 5. fejezet)
    const { error } = await supabase.from(T.movements).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else {
      setStatus({ kind: 'ok', text: 'Bevételezve.' })
      setQty('')
      setLot('')
      setLejarat('')
      setEgysegar('')
      setMegjegyzes('')
    }
    setBusy(false)
  }

  return (
    <section>
      <h2>Bevételezés</h2>
      <Loading loading={products.loading} error={products.error} />
      <form className="card form" onSubmit={submit}>
        <Field label="Lerakat">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <option value="">— válassz —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.nev}</option>
            ))}
          </select>
        </Field>
        <Field label="Termék">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">— válassz —</option>
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nev}{p.cikkszam ? ` (${p.cikkszam})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Mennyiség${product ? ` (${product.mertekegyseg})` : ''}`}>
          <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>
        <Field label={`LOT${lotRequired ? ' *' : ''}`}>
          <input value={lot} onChange={(e) => setLot(e.target.value)} required={lotRequired} />
        </Field>
        <Field label={`Lejárat${lejaratRequired ? ' *' : ''}`}>
          <input type="date" value={lejarat} onChange={(e) => setLejarat(e.target.value)} required={lejaratRequired} />
        </Field>
        <Field label="Egységár (opcionális)">
          <input type="number" min="0" step="any" value={egysegar} onChange={(e) => setEgysegar(e.target.value)} />
        </Field>
        <Field label="Megjegyzés">
          <input value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <button disabled={busy}>Bevételezés</button>
      </form>
    </section>
  )
}
