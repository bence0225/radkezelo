import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { Movement, Product, StockRow, UsagePlace } from '../lib/types'
import { Field, Loading } from '../components/ui'
import MovementChart from '../components/MovementChart'

const monthAgo = () => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
const today = () => new Date().toISOString().slice(0, 10)

export default function Riportok() {
  const { locations } = useAuth()
  const [locationId, setLocationId] = useState('')
  const [usagePlaceId, setUsagePlaceId] = useState('')
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)

  // --- Készletmozgás diagram ---
  const products = useQuery(() => supabase.from(T.products).select('*').eq('aktiv', true).order('nev').returns<Product[]>(), [])
  const [chartProductId, setChartProductId] = useState('')
  const [chartLocationId, setChartLocationId] = useState('')
  const chartProduct = products.data?.find((p) => String(p.id) === chartProductId)

  // --- Időszakos statisztika ---
  const usagePlaces = useQuery(() => supabase.from(T.usagePlaces).select('*').order('nev').returns<UsagePlace[]>(), [])
  const usage = useQuery(() => {
    let q = supabase
      .from(T.movements)
      .select('product_id, mennyiseg, egysegar, products(nev, mertekegyseg)')
      .eq('tipus', 'KIVET')
      .gte('idopont', from)
      .lte('idopont', `${to}T23:59:59`)
    if (locationId) q = q.eq('location_id', Number(locationId))
    if (usagePlaceId) q = q.eq('felhasznalasi_hely_id', Number(usagePlaceId))
    return q.returns<Pick<Movement, 'product_id' | 'mennyiseg' | 'egysegar' | 'products'>[]>()
  }, [locationId, usagePlaceId, from, to])

  // A mennyiség mindig beleszámít, a költség csak ahol van egységár (spec 4.6).
  // TODO: az egységár a BEVET soron van — a KIVET sorok árát a trigger/riport-lekérdezés kösse a LOT bevételi árához.
  const byProduct = new Map<number, { nev: string; unit: string; qty: number; cost: number }>()
  for (const m of usage.data ?? []) {
    const cur = byProduct.get(m.product_id) ?? { nev: m.products?.nev ?? String(m.product_id), unit: m.products?.mertekegyseg ?? '', qty: 0, cost: 0 }
    cur.qty += Math.abs(m.mennyiseg)
    if (m.egysegar != null) cur.cost += Math.abs(m.mennyiseg) * m.egysegar
    byProduct.set(m.product_id, cur)
  }

  // --- Leltár ív ---
  const [sheetLoc, setSheetLoc] = useState('')
  const sheet = useQuery(
    () =>
      sheetLoc
        ? supabase
            .from(T.stock)
            .select('*, products(nev, mertekegyseg, cikkszam)')
            .eq('location_id', Number(sheetLoc))
            .order('product_id')
            .returns<StockRow[]>()
        : Promise.resolve({ data: [] as StockRow[], error: null }),
    [sheetLoc],
  )

  return (
    <section>
      <h2>Riportok és leltár</h2>

      <h3>Készletmozgás diagram</h3>
      <div className="filters">
        <Field label="Termék">
          <select value={chartProductId} onChange={(e) => setChartProductId(e.target.value)}>
            <option value="">— válassz —</option>
            {products.data?.map((p) => <option key={p.id} value={p.id}>{p.nev}</option>)}
          </select>
        </Field>
        <Field label="Lerakat">
          <select value={chartLocationId} onChange={(e) => setChartLocationId(e.target.value)}>
            <option value="">— válassz —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.nev}</option>)}
          </select>
        </Field>
      </div>
      {chartProductId && chartLocationId ? (
        <MovementChart
          productId={Number(chartProductId)}
          locationId={Number(chartLocationId)}
          unit={chartProduct?.mertekegyseg ?? ''}
        />
      ) : (
        <p className="msg muted">Válassz terméket és lerakatot a diagram megjelenítéséhez.</p>
      )}

      <h3>Időszakos statisztika (felhasználás)</h3>
      <div className="filters">
        <Field label="Lerakat">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Összes</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.nev}</option>)}
          </select>
        </Field>
        <Field label="Felhasználási hely">
          <select value={usagePlaceId} onChange={(e) => setUsagePlaceId(e.target.value)}>
            <option value="">Összes</option>
            {usagePlaces.data?.map((h) => <option key={h.id} value={h.id}>{h.nev}</option>)}
          </select>
        </Field>
        <Field label="Ettől"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Eddig"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <Loading loading={usage.loading} error={usage.error} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Termék</th><th className="num">Felhasznált</th><th className="num">Költség</th></tr></thead>
          <tbody>
            {[...byProduct.values()].map((r) => (
              <tr key={r.nev}>
                <td>{r.nev}</td>
                <td className="num">{r.qty} {r.unit}</td>
                <td className="num">{r.cost ? r.cost.toLocaleString('hu-HU') : '—'}</td>
              </tr>
            ))}
            {!usage.loading && !byProduct.size && <tr><td colSpan={3} className="muted">Nincs adat az időszakban.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3>Leltár ív</h3>
      <div className="filters no-print">
        <Field label="Lerakat">
          <select value={sheetLoc} onChange={(e) => setSheetLoc(e.target.value)}>
            <option value="">— válassz —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.nev}</option>)}
          </select>
        </Field>
        <button disabled={!sheet.data?.length} onClick={() => window.print()}>Nyomtatás</button>
      </div>
      <Loading loading={sheet.loading} error={sheet.error} />
      {!!sheet.data?.length && (
        <div className="table-wrap print-area">
          <table>
            <thead><tr><th>Termék</th><th>Cikkszám</th><th>LOT</th><th>Lejárat</th><th className="num">Könyv szerint</th><th className="count">Számlált</th></tr></thead>
            <tbody>
              {sheet.data.map((r) => (
                <tr key={`${r.product_id}-${r.lot}-${r.lejarat}`}>
                  <td>{r.products?.nev}</td><td>{r.products?.cikkszam ?? ''}</td><td>{r.lot ?? '—'}</td><td>{r.lejarat ?? '—'}</td>
                  <td className="num">{r.mennyiseg} {r.products?.mertekegyseg}</td><td className="count"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
