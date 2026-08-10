import { useState, useMemo } from 'react'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'
import { parseISO, getMonth, getYear, getDay, format, eachDayOfInterval } from 'date-fns'
import { it } from 'date-fns/locale'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const MESI_ABBR = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2024, i, 1), 'MMM', { locale: it })
)

// ── SVG helpers ─────────────────────────────────────────────────────────────

function Ring({ value, size = 48, stroke = 5, color }: {
  value: number; size?: number; stroke?: number; color: string
}) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, value)) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

function DonutChart({ segments, size = 130, stroke = 22 }: {
  segments: { value: number; color: string }[]
  size?: number; stroke?: number
}) {
  const r     = (size - stroke) / 2
  const circ  = 2 * Math.PI * r
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  let cum = 0
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const fraction = seg.value / total
        const dashLen  = fraction * circ
        const offset   = circ * (1 - cum)
        cum += fraction
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={offset}
            strokeLinecap="butt" />
        )
      })}
    </svg>
  )
}

function StackedBarChart({ monthlyData, tipi }: {
  monthlyData: Record<AbsenceType, number[]>
  tipi: AbsenceType[]
}) {
  const COLS   = 12
  const CHART_H = 96
  const BAR_W  = 14
  const GAP    = 4
  const LABEL_H = 14
  const W      = COLS * (BAR_W + GAP) - GAP
  const H      = CHART_H + LABEL_H + 6

  const monthlySums = Array.from({ length: COLS }, (_, m) =>
    tipi.reduce((sum, t) => sum + (monthlyData[t][m] ?? 0), 0)
  )
  const maxSum = Math.max(...monthlySums, 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        {Array.from({ length: COLS }, (_, m) => {
          const barH = (monthlySums[m] / maxSum) * CHART_H
          if (barH < 1) return null
          return (
            <clipPath key={m} id={`bc-${m}`}>
              <rect x={m * (BAR_W + GAP)} y={CHART_H - barH} width={BAR_W} height={barH} rx={3} />
            </clipPath>
          )
        })}
      </defs>

      {Array.from({ length: COLS }, (_, m) => {
        const x     = m * (BAR_W + GAP)
        const total = monthlySums[m]

        // Build segments bottom → top
        let curY = CHART_H
        const segs: { tipo: AbsenceType; y: number; h: number }[] = []
        tipi.forEach(tipo => {
          const ore = monthlyData[tipo][m]
          if (!ore) return
          const h = (ore / maxSum) * CHART_H
          curY -= h
          segs.push({ tipo, y: curY, h })
        })

        return (
          <g key={m}>
            {total > 0 ? (
              <g clipPath={`url(#bc-${m})`}>
                {segs.map(({ tipo, y, h }) => (
                  <rect key={tipo} x={x} y={y} width={BAR_W} height={h}
                    fill={TIPO_OKLCH[tipo].main} />
                ))}
              </g>
            ) : (
              <rect x={x} y={CHART_H - 2} width={BAR_W} height={2}
                fill="var(--line)" rx={1} />
            )}
            <text x={x + BAR_W / 2} y={H - 1} textAnchor="middle"
              style={{ fontSize: 7.5, fill: 'var(--ink-faint)', fontFamily: 'var(--font-ui)' }}>
              {MESI_ABBR[m]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function StatistichePage() {
  const { assenze }   = useAssenze()
  const { settings }  = useSettings()
  const { getLatest } = useSaldi()
  const currentYear   = new Date().getFullYear()
  const [anno, setAnno] = useState(currentYear)

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]
  const oreG      = settings.ore_giornaliere
  const unita     = settings.unita

  const fmt = (ore: number) =>
    unita === 'giorni' ? `${(ore / oreG).toFixed(1)}g` : `${ore}h`

  const anni = useMemo(() => {
    const set = new Set([currentYear])
    assenze.forEach(a => set.add(getYear(parseISO(a.data_inizio))))
    return [...set].sort((a, b) => b - a)
  }, [assenze, currentYear])

  const assenzeAnno = useMemo(() =>
    assenze.filter(a => getYear(parseISO(a.data_inizio)) === anno),
    [assenze, anno]
  )

  const monthlyData = useMemo(() => {
    const data = {} as Record<AbsenceType, number[]>
    TIPI.forEach(t => { data[t] = Array(12).fill(0) })
    assenzeAnno.forEach(a => {
      const start    = parseISO(a.data_inizio)
      const end      = parseISO(a.data_fine)
      const days     = eachDayOfInterval({ start, end })
      const workDays = days.filter(d => settings.giorni_lavorativi.includes(getDay(d)))
      if (workDays.length === 0) { data[a.tipo][getMonth(start)] += a.ore; return }
      const byMonth: Record<number, number> = {}
      workDays.forEach(d => { const m = getMonth(d); byMonth[m] = (byMonth[m] || 0) + 1 })
      Object.entries(byMonth).forEach(([month, count]) => {
        data[a.tipo][Number(month)] += (count / workDays.length) * a.ore
      })
    })
    return data
  }, [assenzeAnno, settings.giorni_lavorativi])

  const yearlyTotals = useMemo(() =>
    TIPI.map(tipo => ({ tipo, ore: monthlyData[tipo].reduce((s, v) => s + v, 0) })),
    [monthlyData]
  )

  const totaleAnno  = yearlyTotals.reduce((s, t) => s + t.ore, 0)
  const tipiConDati = TIPI.filter(t => monthlyData[t].some(v => v > 0))

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="page-title">Statistiche</div>
        <div className="year-tabs">
          {anni.map(a => (
            <button key={a} onClick={() => setAnno(a)}
              className={`year-tab${a === anno ? ' active' : ''}`}>{a}</button>
          ))}
        </div>
      </div>

      {assenzeAnno.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            Nessuna assenza nel {anno}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
            Le assenze che registri appariranno qui
          </div>
        </div>
      ) : (
        <>
          {/* Hero: donut + legend */}
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-card)',
            padding: '16px 18px', marginBottom: 10,
            boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            {/* Donut */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutChart
                segments={yearlyTotals.filter(t => t.ore > 0).map(({ tipo, ore }) => ({
                  value: ore, color: TIPO_OKLCH[tipo].main,
                }))}
              />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                  {(totaleAnno / oreG).toFixed(0)}
                </div>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-faint)', marginTop: 2 }}>
                  giornate
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {yearlyTotals.filter(t => t.ore > 0).map(({ tipo, ore }) => {
                const c   = TIPO_OKLCH[tipo]
                const pct = totaleAnno > 0 ? (ore / totaleAnno) * 100 : 0
                return (
                  <div key={tipo}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: c.main, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-2)' }}>
                          {tipoLabel(tipo)}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--ink)' }}>
                        {fmt(ore)}
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c.main, borderRadius: 999, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stacked monthly chart */}
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r-card)',
            padding: '14px 16px 12px', marginBottom: 10,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink)' }}>
                Distribuzione mensile
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                {tipiConDati.map(tipo => (
                  <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1.5, background: TIPO_OKLCH[tipo].main }} />
                    <span style={{ fontSize: '0.62rem', color: 'var(--ink-faint)', fontWeight: 500 }}>
                      {tipoLabel(tipo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <StackedBarChart monthlyData={monthlyData} tipi={tipiConDati} />
          </div>

          {/* Type cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {yearlyTotals.map(({ tipo, ore }) => {
              if (ore === 0) return null
              const c      = TIPO_OKLCH[tipo]
              const latest = getLatest(tipo)
              const pct    = latest && latest.ore > 0 ? ore / latest.ore : null
              return (
                <div key={tipo} style={{
                  background: c.tint, borderRadius: 'var(--r-card)',
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: `0 1px 3px ${c.main}22`,
                }}>
                  {/* Ring */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring value={pct ?? 0} size={50} stroke={5} color={c.main} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.58rem', fontWeight: 800, color: c.text,
                    }}>
                      {pct !== null ? `${Math.round(pct * 100)}%` : '—'}
                    </div>
                  </div>

                  {/* Label + value */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.text, opacity: 0.8, marginBottom: 1 }}>
                      {tipoLabel(tipo)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.02em', color: c.text }}>
                      {fmt(ore)}
                    </div>
                    {unita === 'ore' && (
                      <div style={{ fontSize: '0.65rem', color: c.text, opacity: 0.6, marginTop: 2 }}>
                        {(ore / oreG).toFixed(1)} giornate
                      </div>
                    )}
                  </div>

                  {/* Budget */}
                  {latest && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.6rem', color: c.text, opacity: 0.6, marginBottom: 2 }}>su busta</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: c.text }}>{fmt(latest.ore)}</div>
                      {pct !== null && (
                        <div style={{
                          marginTop: 5, width: 56, height: 3,
                          background: `${c.main}28`, borderRadius: 999, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${Math.min(100, Math.round(pct * 100))}%`,
                            background: c.main, borderRadius: 999,
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
