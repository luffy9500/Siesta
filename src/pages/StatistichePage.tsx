import { useState, useMemo } from 'react'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'
import { parseISO, getMonth, getYear, format } from 'date-fns'
import { it } from 'date-fns/locale'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const MESI_ABBR = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2024, i, 1), 'MMM', { locale: it })
)

export default function StatistichePage() {
  const { assenze } = useAssenze()
  const { settings } = useSettings()
  const { getLatest } = useSaldi()
  const currentYear = new Date().getFullYear()
  const [anno, setAnno] = useState(currentYear)

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]
  const unitaOf   = (t: AbsenceType) => settings.unita_tipo[t] ?? 'ore'
  const oreG      = settings.ore_giornaliere
  const fmtVal    = (t: AbsenceType, ore: number) =>
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

  const monthlyData = useMemo(() => {
    const data = {} as Record<AbsenceType, number[]>
    TIPI.forEach(t => { data[t] = Array(12).fill(0) })
    assenzeAnno.forEach(a => {
      const m = getMonth(parseISO(a.data_inizio))
      data[a.tipo][m] += a.ore
    })
    return data
  }, [assenzeAnno])

  const yearlyTotals = useMemo(() =>
    TIPI.map(tipo => ({
      tipo,
      ore:    monthlyData[tipo].reduce((s, v) => s + v, 0),
      giorni: +(monthlyData[tipo].reduce((s, v) => s + v, 0) / oreG).toFixed(1),
    })),
    [monthlyData, oreG]
  )

  const maxOrePerMese  = Math.max(...TIPI.flatMap(t => monthlyData[t]), 1)
  const tipiConDati    = TIPI.filter(t => monthlyData[t].some(v => v > 0))

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: '0.88rem' }}>Nessuna assenza nel {anno}</div>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            {yearlyTotals.map(({ tipo, ore, giorni }) => {
              if (ore === 0) return null
              const c      = TIPO_OKLCH[tipo]
              const latest = getLatest(tipo)
              const pct    = latest && latest.ore > 0
                ? Math.min(100, Math.round((ore / latest.ore) * 100))
                : null
              return (
                <div key={tipo} className="stat-card"
                  style={{ background: c.tint, borderColor: c.tintBorder }}>
                  <div className="stat-type" style={{ color: c.text }}>{tipoLabel(tipo)}</div>
                  <div className="stat-num" style={{ color: c.text }}>{fmtVal(tipo, ore)}</div>
                  {unitaOf(tipo) === 'ore' && (
                    <div className="stat-sub">{giorni} giornate</div>
                  )}
                  {pct !== null && (
                    <>
                      <div className="stat-progress">
                        <div className="stat-fill" style={{ width: `${pct}%`, background: c.main }} />
                      </div>
                      <div className="stat-sub" style={{ marginTop: 4 }}>{pct}% del saldo busta</div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {tipiConDati.map(tipo => {
            const c = TIPO_OKLCH[tipo]
            return (
              <div key={tipo} className="chart-card">
                <div className="chart-label" style={{ color: c.text }}>
                  {tipoLabel(tipo)} — mensile
                </div>
                <div className="chart-bars">
                  {monthlyData[tipo].map((ore, mi) => {
                    const h = ore > 0 ? Math.max(8, (ore / maxOrePerMese) * 56) : 0
                    return (
                      <div key={mi} className="chart-col">
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                          {ore > 0 && (
                            <div className="chart-bar"
                              style={{ height: h, background: c.main }} />
                          )}
                        </div>
                        <span className="chart-month">{MESI_ABBR[mi]}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {monthlyData[tipo].map((ore, mi) => (
                    <div key={mi} style={{ flex: 1, textAlign: 'center' }}>
                      {ore > 0 && (
                        <span className="chart-val" style={{ color: c.text }}>
                          {fmtVal(tipo, ore)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="chart-card" style={{ overflowX: 'auto' }}>
            <div className="chart-label" style={{ color: 'var(--ink)', marginBottom: 8 }}>
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
                        <td key={mi}>{ore > 0 ? fmtVal(tipo, ore) : '—'}</td>
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
        </>
      )}
    </div>
  )
}
