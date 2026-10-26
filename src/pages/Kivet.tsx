import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { NewMovement, Product, StockRow, UsagePlace } from '../lib/types'
import { Field, Loading, Notice } from '../components/ui'

export default function Kivet() {
  const { locations, session } = useAuth()
  const products = useQuery(
    () => supabase.from(T.products).select('*').eq('aktiv', true).order('nev').returns<Product[]>(),
    [],
  )
  const usagePlaces = useQuery(
    () => supabase.from(T.usagePlaces).select('*').eq('aktiv', true).order('nev').returns<UsagePlace[]>(),
    [],
  )

  const [locationId, setLocationId] = useState('')
  const [productId, setProductId] = useState('')
  const [stockKey, setStockKey] = useState('')
  const [usagePlaceId, setUsagePlaceId] = useState('')
  const [qty, setQty] = useState('')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Készletsorok a kiválasztott termék + lerakat párra, legkorábbi lejárat elöl (FIFO javaslat)
  const stock = useQuery(
    () =>
      locationId && productId
        ? supabase
            .from(T.stock)
            .select('*')
            .eq('location_id', Number(locationId))
            .eq('product_id', Number(productId))
            .order('lejarat', { ascending: true, nullsFirst: false })
            .returns<StockRow[]>()
        : Promise.resolve({ data: [] as StockRow[], error: null }),
    [locationId, productId],
  )
  const rows = stock.data ?? []
  const selected = rows[Number(stockKey)] as StockRow | undefined
  const product = products.data?.find((p) => String(p.id) === productId)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const amount = Math.abs(Number(qty))
    // Túlvétel: figyelmeztet, de nem tilt (spec 4.2)
    if (selected && amount > selected.mennyiseg) {
      const ok = window.confirm(
        `A nyilvántartás szerint csak ${selected.mennyiseg} van ebből a tételből. Biztosan kiveszed? A készlet negatívba fog menni.`,
      )
      if (!ok) return
    }
    setBusy(true)
    setStatus(null)
    const row: NewMovement = {
      tipus: 'KIVET',
      product_id: Number(productId),
      location_id: Number(locationId),
      lot: selected?.lot ?? null,
      lejarat: selected?.lejarat ?? null,
      mennyiseg: -amount, // kivét: −
      felhasznalo_id: session.user.id,
      idopont: new Date().toISOString(),
      egysegar: null,
      megjegyzes: megjegyzes.trim() || null,
      javitott_mozgas_id: null,
      felhasznalasi_hely_id: usagePlaceId ? Number(usagePlaceId) : null,
    }
    const { error } = await supabase.from(T.movements).insert(row)
    if (error) setStatus({ kind: 'error', text: error.message })
    else {
      setStatus({ kind: 'ok', text: 'Kivéve.' })
      setQty('')
      setMegjegyzes('')
      stock.reload()
    }
    setBusy(false)
  }

  return (
    <section>
      <h2>Kivét</h2>
      <Loading loading={products.loading} error={products.error} />
      <form className="card form" onSubmit={submit}>
        <Field label="Lerakat">
          <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setStockKey('') }} required>
            <option value="">— válassz —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.nev}</option>
            ))}
          </select>
        </Field>
        <Field label="Termék">
          <select value={productId} onChange={(e) => { setProductId(e.target.value); setStockKey('') }} required>
            <option value="">— válassz —</option>
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>{p.nev}</option>
            ))}
          </select>
        </Field>
        <Field label="Tétel (LOT / lejárat)">
          <select value={stockKey} onChange={(e) => setStockKey(e.target.value)} disabled={!rows.length}>
            <option value="">{rows.length ? '— válassz —' : 'nincs készletsor'}</option>
            {rows.map((r, i) => (
              <option key={`${r.lot}-${r.lejarat}`} value={i}>
                {i === 0 && rows.length > 1 ? '★ FIFO javasolt · ' : ''}
                LOT: {r.lot ?? '—'} · lejárat: {r.lejarat ?? '—'} · készlet: {r.mennyiseg}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Mennyiség${product ? ` (${product.mertekegyseg})` : ''}`}>
          <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>
        <Field label="Felhasználási hely">
          <select value={usagePlaceId} onChange={(e) => setUsagePlaceId(e.target.value)} required>
            <option value="">— válassz —</option>
            {usagePlaces.data?.map((h) => (
              <option key={h.id} value={h.id}>{h.nev}</option>
            ))}
          </select>
        </Field>
        {usagePlaces.data && !usagePlaces.data.length && (
          <Notice kind="warn">Még nincs aktív felhasználási hely — az Admin a Törzsadatok → Felhasználási helyek fülön veheti fel.</Notice>
        )}
        <Field label="Megjegyzés">
          <input value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} />
        </Field>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
        <button disabled={busy}>Kivét</button>
      </form>
    </section>
  )
}
