import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { StockRow } from '../lib/types'
import { Field, Loading } from '../components/ui'

export default function Keszlet() {
  const { locations } = useAuth()
  const [locationId, setLocationId] = useState('')

  const stock = useQuery(() => {
    let q = supabase.from(T.stock).select('*, products(nev, mertekegyseg, min_mennyiseg, cikkszam), locations(nev)')
    if (locationId) q = q.eq('location_id', Number(locationId))
    return q.order('product_id').returns<StockRow[]>()
  }, [locationId])

  const rows = stock.data ?? []
  // Termék+lerakat összmennyiség a minimumhoz képest (spec 4.3)
  const totals = new Map<string, number>()
  for (const r of rows) {
    const k = `${r.product_id}:${r.location_id}`
    totals.set(k, (totals.get(k) ?? 0) + r.mennyiseg)
  }
  const isLow = (r: StockRow) => {
    const min = r.products?.min_mennyiseg
    return min != null && (totals.get(`${r.product_id}:${r.location_id}`) ?? 0) < min
  }

  return (
    <section>
      <h2>Készlet</h2>
      <Field label="Lerakat">
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Összes</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.nev}</option>
          ))}
        </select>
      </Field>
      <Loading loading={stock.loading} error={stock.error} />
      <div className="table-wrap table-wrap--stack">
        <table className="table-stack">
          <thead>
            <tr><th>Termék</th><th>Lerakat</th><th>LOT</th><th>Lejárat</th><th className="num">Mennyiség</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.product_id}-${r.location_id}-${r.lot}-${r.lejarat}`} className={isLow(r) ? 'low' : undefined}>
                <td className="stack-title" data-label="Termék">{r.products?.nev}</td>
                <td data-label="Lerakat">{r.locations?.nev}</td>
                <td data-label="LOT">{r.lot ?? '—'}</td>
                <td data-label="Lejárat">{r.lejarat ?? '—'}</td>
                <td className="num" data-label="Mennyiség">{r.mennyiseg} {r.products?.mertekegyseg}</td>
              </tr>
            ))}
            {!stock.loading && !rows.length && <tr><td colSpan={5} className="muted">Nincs készletsor.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
