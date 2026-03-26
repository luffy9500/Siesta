import { useState, useMemo } from 'react'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import type { AbsenceType } from '../types'
import { TIPO_COLORS, TIPO_LABELS } from '../types'
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
  const unitaOf = (t: AbsenceType) => settings.unita_tipo[t] ?? 'ore'
  const oreG = settings.ore_giornaliere
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
      ore: monthlyData[tipo].reduce((s, v) => s + v, 0),
      giorni: +(monthlyData[tipo].reduce((s, v) => s + v, 0) / settings.ore_giornaliere).toFixed(1),
    })),
    [monthlyData, settings.ore_giornaliere]
  )

  const maxOrePerMese = Math.max(...TIPI.flatMap(t => monthlyData[t]), 1)
  const tipiConDati = TIPI.filter(t => monthlyData[t].some(v => v > 0))

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Statistiche</h2>
        <div className="flex items-center gap-1">
          {anni.map(a => (
            <button key={a} onClick={() => setAnno(a)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                a === anno
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {assenzeAnno.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">Nessuna assenza nel {anno}</p>
        </div>
      ) : (
        <>
          {/* Totali annuali */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {yearlyTotals.map(({ tipo, ore, giorni }) => {
              if (ore === 0) return null
              const c = TIPO_COLORS[tipo]
              const latest = getLatest(tipo)
              const pct = latest && latest.ore > 0 ? Math.min(100, Math.round((ore / latest.ore) * 100)) : null
              return (
                <div key={tipo} className={`rounded-xl p-2.5 ${c.bg} border ${c.border}`} style={{ opacity: 0.9 }}>
                  <p className={`text-xs font-bold mb-0.5 ${c.text}`}>{tipoLabel(tipo)}</p>
                  <p className={`text-xl font-black ${c.text}`}>{fmtVal(tipo, ore)}</p>
                  {unitaOf(tipo) === 'ore' && <p className="text-xs text-gray-500 dark:text-gray-400">{giorni} giornate</p>}
                  {pct !== null && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{pct}% del saldo busta</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grafici mensili */}
          {tipiConDati.map(tipo => {
            const c = TIPO_COLORS[tipo]
            return (
              <div key={tipo} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 mb-2">
                <p className={`text-xs font-bold mb-2 ${c.text}`}>{tipoLabel(tipo)} — mensile</p>
                <div className="flex items-end gap-0.5 h-16">
                  {monthlyData[tipo].map((ore, mi) => {
                    const pct = ore > 0 ? Math.max(8, (ore / maxOrePerMese) * 100) : 0
                    return (
                      <div key={mi} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex items-end justify-center" style={{ height: '48px' }}>
                          {ore > 0 && (
                            <div className={`w-full rounded-t-sm ${c.bar}`} style={{ height: `${pct}%` }} title={fmtVal(tipo, ore)} />
                          )}
                        </div>
                        <span className="text-[8px] text-gray-400 dark:text-gray-500 capitalize">{MESI_ABBR[mi]}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {monthlyData[tipo].map((ore, mi) => (
                    <div key={mi} className="flex-1 text-center">
                      {ore > 0 && <span className={`text-[8px] font-semibold ${c.text}`}>{fmtVal(tipo, ore)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Tabella riepilogativa */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Riepilogo {anno}</p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-gray-500">
                    <td className="pb-1.5 pr-2 font-semibold">Tipo</td>
                    {MESI_ABBR.map((m, i) => (
                      <td key={i} className="pb-1.5 text-center capitalize w-7">{m}</td>
                    ))}
                    <td className="pb-1.5 text-right font-semibold pl-1">Tot.</td>
                  </tr>
                </thead>
                <tbody>
                  {tipiConDati.map(tipo => {
                    const c = TIPO_COLORS[tipo]
                    const totale = monthlyData[tipo].reduce((s, v) => s + v, 0)
                    return (
                      <tr key={tipo} className="border-t border-gray-50 dark:border-gray-700">
                        <td className={`py-1.5 pr-2 font-semibold ${c.text} whitespace-nowrap`}>{tipoLabel(tipo)}</td>
                        {monthlyData[tipo].map((ore, mi) => (
                          <td key={mi} className="py-1.5 text-center text-gray-500 dark:text-gray-400 w-7">
                            {ore > 0 ? fmtVal(tipo, ore) : '—'}
                          </td>
                        ))}
                        <td className={`py-1.5 text-right font-bold ${c.text} pl-1`}>{fmtVal(tipo, totale)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
