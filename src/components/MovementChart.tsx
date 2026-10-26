import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import { useQuery } from '../lib/useQuery'
import type { Movement } from '../lib/types'
import { Loading } from './ui'

interface Props {
  productId: number
  locationId: number
  unit: string
}

type Point = {
  t: number // idopont, ms
  level: number // készletszint ez után a mozgás után
  m: Pick<Movement, 'tipus' | 'mennyiseg' | 'lot' | 'idopont'>
}

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
const fmtDateTime = (ms: number) => new Date(ms).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// Néhány "kerek" tengelyosztás a min/max tartományból (nincs d3-függőség).
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min, min + 1]
  const range = max - min
  const rawStep = range / count
  const mag = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / mag
  const niceStep = residual > 5 ? 10 * mag : residual > 2 ? 5 * mag : residual > 1 ? 2 * mag : mag
  const niceMin = Math.floor(min / niceStep) * niceStep
  const niceMax = Math.ceil(max / niceStep) * niceStep
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + 1e-9; v += niceStep) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

const W = 640
const H = 220
const PAD = { top: 16, right: 16, bottom: 24, left: 44 }

export default function MovementChart({ productId, locationId, unit }: Props) {
  const [asTable, setAsTable] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const query = useQuery(
    () =>
      supabase
        .from(T.movements)
        .select('tipus, mennyiseg, lot, idopont')
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .order('idopont', { ascending: true })
        .returns<Pick<Movement, 'tipus' | 'mennyiseg' | 'lot' | 'idopont'>[]>(),
    [productId, locationId],
  )

  // Futó összeg a mozgásokból — ugyanaz a logika, mint ami a stock táblát is építi.
  const points: Point[] = useMemo(
    () =>
      (query.data ?? []).reduce<Point[]>((acc, m) => {
        const level = (acc.length ? acc[acc.length - 1].level : 0) + m.mennyiseg
        acc.push({ t: new Date(m.idopont).getTime(), level, m })
        return acc
      }, []),
    [query.data],
  )

  if (query.loading || query.error) return <Loading loading={query.loading} error={query.error} />
  if (!points.length) return <p className="msg muted">Nincs még mozgás ehhez a termék/lerakat párhoz.</p>

  const minT = points[0].t
  const maxT = points[points.length - 1].t
  const spanT = Math.max(maxT - minT, 1)
  const levels = points.map((p) => p.level)
  const yTicks = niceTicks(Math.min(0, ...levels), Math.max(0, ...levels))
  const minY = yTicks[0]
  const maxY = yTicks[yTicks.length - 1]
  const spanY = Math.max(maxY - minY, 1)

  const x = (t: number) => PAD.left + ((t - minT) / spanT) * (W - PAD.left - PAD.right)
  const y = (v: number) => H - PAD.bottom - ((v - minY) / spanY) * (H - PAD.top - PAD.bottom)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.level).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(maxT).toFixed(1)},${y(0).toFixed(1)} L${x(minT).toFixed(1)},${y(0).toFixed(1)} Z`

  const last = points[points.length - 1]
  const hovered = hover != null ? points[hover] : null

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const t = minT + ((px - PAD.left) / (W - PAD.left - PAD.right)) * spanT
    let nearest = 0
    let best = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.t - t)
      if (d < best) { best = d; nearest = i }
    })
    setHover(nearest)
  }

  if (asTable) {
    return (
      <>
        <button className="link chart-toggle" onClick={() => setAsTable(false)}>Grafikonként</button>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Időpont</th><th>Típus</th><th className="num">Változás</th><th className="num">Szint utána</th><th>LOT</th></tr></thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i}>
                  <td>{fmtDateTime(p.t)}</td>
                  <td>{p.m.tipus}</td>
                  <td className="num">{p.m.mennyiseg > 0 ? '+' : ''}{p.m.mennyiseg} {unit}</td>
                  <td className="num">{p.level} {unit}</td>
                  <td>{p.m.lot ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <div className="viz-root">
      <button className="link chart-toggle" onClick={() => setAsTable(true)}>Táblázatként</button>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Készletszint alakulása, jelenleg ${last.level} ${unit}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="viz-grid" />
            <text x={PAD.left - 8} y={y(t)} className="viz-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        <text x={x(minT)} y={H - 6} className="viz-axis" textAnchor="start">{fmtDate(minT)}</text>
        <text x={x(maxT)} y={H - 6} className="viz-axis" textAnchor="end">{fmtDate(maxT)}</text>

        <path d={areaPath} className="viz-area" />
        <path d={linePath} className="viz-line" />

        {points.map((p, i) => (
          <circle key={i} cx={x(p.t)} cy={y(p.level)} r={4} className="viz-dot" />
        ))}

        {/* végpont direkt felirat — csak az utolsó értéket címkézzük */}
        <text x={x(last.t)} y={y(last.level) - 10} textAnchor="end" className="viz-endlabel">
          {last.level} {unit}
        </text>

        {hovered && (
          <g pointerEvents="none">
            <line x1={x(hovered.t)} x2={x(hovered.t)} y1={PAD.top} y2={H - PAD.bottom} className="viz-crosshair" />
            <circle cx={x(hovered.t)} cy={y(hovered.level)} r={6} className="viz-dot-hover" />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="viz-tooltip"
          style={{ left: `${(x(hovered.t) / W) * 100}%` }}
        >
          <strong>{hovered.level} {unit}</strong>
          <span>{fmtDateTime(hovered.t)} · {hovered.m.tipus}{hovered.m.lot ? ` · LOT ${hovered.m.lot}` : ''}</span>
        </div>
      )}
    </div>
  )
}
