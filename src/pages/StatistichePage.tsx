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

// Ring SVG component
function Ring({ value, size = 56, stroke = 6, color }: {
  value: number; size?: number; stroke?: number; color: string
}) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, value)) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" />
    </svg>
  )
}

export default function StatistichePage() {
  const { assenze }   = useAssenze()
  const { settings }  = useSettings()
  const { getLatest } = useSaldi()
  const currentYear   = new Date().getFullYear()
  const [anno, setAnno] = useState(currentYear)

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]
  const unitaOf   = (t: AbsenceType) => settings.unita_tipo[t] ?? 'ore'
  const oreG      = settings.ore_giornaliere

  const fmtVal = (t: AbsenceType, ore: number) =>
    unitaOf(t) === 'giorni' ? `${(ore / oreG).toFixed(1)}g` : `${ore}h`

  const anni = useMemo(() => {
    const set = new Set([currentYear])
    assenze.forEach(a => set.add(getYear(parseISO(a.data_inizio))))
    return [...set].sort((a, b) => b - a)
  }, [assenze, currentYear])

  const assenzeAnno = useMemo(() =>
    assenze.filter(a => getYear(parseISO(a.data_inizio)) === anno),
    [assenze, anno]
  )

  // Bug fix: distribute hours proportionally across months by working days
  const monthlyData = useMemo(() => {
    const data = {} as Record<AbsenceType, number[]>
    TIPI.forEach(t => { data[t] = Array(12).fill(0) })

    assenzeAnno.forEach(a => {
      const start = parseISO(a.data_inizio)
      const end   = parseISO(a.data_fine)

      // Get all working days in the absence range
      const days = eachDayOfInterval({ start, end })
      const workDays = days.filter(d => settings.giorni_lavorativi.includes(getDay(d)))

      if (workDays.length === 0) {
        // Fallback: attribute to start month
        data[a.tipo][getMonth(start)] += a.ore
        return
      }

      // Group working days by month
      const byMonth: Record<number, number> = {}
      workDays.forEach(d => {
        const m = getMonth(d)
        byMonth[m] = (byMonth[m] || 0) + 1
      })

      // Distribute hours proportionally
      Object.entries(byMonth).forEach(([month, count]) => {
        data[a.tipo][Number(month)] += (count / workDays.length) * a.ore
      })
    })

    return data
  }, [assenzeAnno, settings.giorni_lavorativi])

  const yearlyTotals = useMemo(() =>
    TIPI.map(tipo => ({
      tipo,
      ore:    monthlyData[tipo].reduce((s, v) => s + v, 0),
    })),
    [monthlyData]
  )

  const totaleAnno = yearlyTotals.reduce((s, t) => s + t.ore, 0)
  const maxOrePerMese = Math.max(...TIPI.flatMap(t => monthlyData[t]), 1)
  const tipiConDati   = TIPI.filter(t => monthlyData[t].some(v => v > 0))

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="page-title">Statistiche</div>
        <div className="year-tabs">
          {anni.map(a => (
            <button key={a} onClick={() => setAnno(a)}
              className={`year-tab${a === anno ? ' active' : ''}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {assenzeAnno.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--line)',
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
          {/* Year hero */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: '16px 18px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 2 }}>
                Totale {anno}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                {(totaleAnno / oreG).toFixed(1)}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: 'var(--ink-faint)', marginLeft: 4 }}>g</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', marginTop: 3 }}>
                {totaleAnno}h · {tipiConDati.length} {tipiConDati.length === 1 ? 'tipo' : 'tipi'}
              </div>
            </div>
            {/* Mini bar breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 120 }}>
              {yearlyTotals.filter(t => t.ore > 0).map(({ tipo, ore }) => {
                const c   = TIPO_OKLCH[tipo]
                const pct = totaleAnno > 0 ? (ore / totaleAnno) * 100 : 0
                return (
                  <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: c.main, flexShrink: 0 }} />
                    <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c.main, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--ink-2)', minWidth: 28, textAlign: 'right' }}>
                      {fmtVal(tipo, ore)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Type cards with ring */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {yearlyTotals.map(({ tipo, ore }) => {
              if (ore === 0) return null
              const c      = TIPO_OKLCH[tipo]
              const latest = getLatest(tipo)
              const pct    = latest && latest.ore > 0 ? ore / latest.ore : null
              const unita  = unitaOf(tipo)
              return (
                <div key={tipo} style={{
                  background: c.tint,
                  border: `1px solid ${c.tintBorder}`,
                  borderRadius: 'var(--r-card)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  {/* Ring */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring value={pct ?? 0} size={54} stroke={5} color={c.main} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.62rem', fontWeight: 800, color: c.text,
                    }}>
                      {pct !== null ? `${Math.round(pct * 100)}%` : '—'}
                    </div>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.text, marginBottom: 2 }}>
                      {tipoLabel(tipo)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', lineHeight: 1, letterSpacing: '-0.02em', color: c.text }}>
                      {fmtVal(tipo, ore)}
                    </div>
                    {unita === 'ore' && (
                      <div style={{ fontSize: '0.7rem', color: c.text, opacity: 0.7, marginTop: 2 }}>
                        {(ore / oreG).toFixed(1)} giornate
                      </div>
                    )}
                  </div>

                  {/* Budget pill */}
                  {latest && (
                    <div style={{
                      textAlign: 'right', flexShrink: 0,
                    }}>
                      <div style={{ fontSize: '0.62rem', color: c.text, opacity: 0.65, marginBottom: 2 }}>
                        su busta
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: c.text }}>
                        {fmtVal(tipo, latest.ore)}
                      </div>
                      {pct !== null && (
                        <div style={{
                          marginTop: 6, width: 64, height: 4,
                          background: `${c.main}30`,
                          borderRadius: 999, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, Math.round(pct * 100))}%`,
                            background: c.main,
                            borderRadius: 999,
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Monthly charts */}
          {tipiConDati.map(tipo => {
            const c      = TIPO_OKLCH[tipo]
            const months = monthlyData[tipo]
            const maxM   = Math.max(...months, 1)
            return (
              <div key={tipo} style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: c.text }}>
                    {tipoLabel(tipo)}
                  </div>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    background: c.tint, color: c.text,
                    border: `1px solid ${c.tintBorder}`,
                    borderRadius: 999, padding: '2px 9px',
                  }}>
                    {fmtVal(tipo, months.reduce((s, v) => s + v, 0))} tot.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                  {months.map((ore, mi) => {
                    const hasData = ore > 0
                    const pct     = hasData ? Math.max(0.08, ore / maxM) : 0
                    return (
                      <div key={mi} style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3,
                      }}>
                        {/* Value label above bar */}
                        <div style={{
                          fontSize: '0.58rem', fontWeight: 800,
                          color: c.text,
                          opacity: hasData ? 1 : 0,
                          lineHeight: 1,
                          marginBottom: 2,
                        }}>
                          {hasData ? fmtVal(tipo, Math.round(ore)) : ''}
                        </div>
                        {/* Bar */}
                        <div style={{
                          width: '100%', flex: 1,
                          display: 'flex', alignItems: 'flex-end',
                        }}>
                          <div style={{
                            width: '100%',
                            height: hasData ? `${pct * 100}%` : 2,
                            background: hasData ? c.main : 'var(--line)',
                            borderRadius: '5px 5px 2px 2px',
                            transition: 'height 0.4s ease',
                          }} />
                        </div>
                        {/* Month label */}
                        <div style={{
                          fontSize: '0.58rem',
                          color: hasData ? c.text : 'var(--ink-faint)',
                          fontWeight: hasData ? 700 : 400,
                          textTransform: 'capitalize',
                        }}>
                          {MESI_ABBR[mi]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Summary table */}
          {tipiConDati.length > 1 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-card)',
              padding: '14px 16px',
              marginBottom: 8,
              overflowX: 'auto',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
                Riepilogo {anno}
              </div>
              <table className="sum-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    {MESI_ABBR.map((m, i) => <th key={i}>{m}</th>)}
                    <th style={{ textAlign: 'right' }}>Tot.</th>
                  </tr>
                </thead>
                <tbody>
                  {tipiConDati.map(tipo => {
                    const c      = TIPO_OKLCH[tipo]
                    const totale = monthlyData[tipo].reduce((s, v) => s + v, 0)
                    return (
                      <tr key={tipo}>
                        <td style={{ color: c.text }}>{tipoLabel(tipo)}</td>
                        {monthlyData[tipo].map((ore, mi) => (
                          <td key={mi}>{ore > 0 ? fmtVal(tipo, Math.round(ore)) : '—'}</td>
                        ))}
                        <td style={{ color: c.text, textAlign: 'right' }}>
                          {fmtVal(tipo, totale)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
