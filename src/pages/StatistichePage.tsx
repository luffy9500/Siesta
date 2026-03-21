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

  const anni = useMemo(() => {
    const set = new Set([currentYear])
    assenze.forEach(a => set.add(getYear(parseISO(a.data_inizio))))
    return [...set].sort((a, b) => b - a)
  }, [assenze, currentYear])

  const assenzeAnno = useMemo(() =>
    assenze.filter(a => getYear(parseISO(a.data_inizio)) === anno),
    [assenze, anno]
  )

  // Monthly hours per tipo
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Statistiche</h2>
        {/* Anno selector */}
        <div className="flex items-center gap-1">
          {anni.map(a => (
            <button
              key={a}
              onClick={() => setAnno(a)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                a === anno
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {assenzeAnno.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">Nessuna assenza nel {anno}</p>
        </div>
      ) : (
        <>
          {/* Totali annuali */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {yearlyTotals.map(({ tipo, ore, giorni }) => {
              if (ore === 0) return null
              const c = TIPO_COLORS[tipo]
              const latest = getLatest(tipo)
              const pct = latest && latest.ore > 0 ? Math.min(100, Math.round((ore / latest.ore) * 100)) : null
              return (
                <div key={tipo} className={`rounded-2xl p-3 ${c.bg} dark:bg-opacity-20 border ${c.border} dark:border-opacity-40`}>
                  <p className={`text-xs font-bold mb-1 ${c.text}`}>{tipoLabel(tipo)}</p>
                  <p className={`text-2xl font-black ${c.text}`}>{ore}h</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{giorni} giornate</p>
                  {pct !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pct}% del saldo busta</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grafico mensile per tipo */}
          {tipiConDati.map(tipo => {
            const c = TIPO_COLORS[tipo]
            const mesiConDati = monthlyData[tipo].some(v => v > 0)
            if (!mesiConDati) return null
            return (
              <div key={tipo} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-3">
                <p className={`text-sm font-bold mb-3 ${c.text}`}>{tipoLabel(tipo)} — mensile</p>
                <div className="flex items-end gap-1 h-20">
                  {monthlyData[tipo].map((ore, mi) => {
                    const pct = ore > 0 ? Math.max(8, (ore / maxOrePerMese) * 100) : 0
                    return (
                      <div key={mi} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                          {ore > 0 && (
                            <div
                              className={`w-full rounded-t-sm ${c.bar}`}
                              style={{ height: `${pct}%` }}
                              title={`${ore}h`}
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 capitalize">
                          {MESI_ABBR[mi]}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* Legenda valori sopra le barre */}
                <div className="flex gap-1 mt-2">
                  {monthlyData[tipo].map((ore, mi) => (
                    <div key={mi} className="flex-1 text-center">
                      {ore > 0 && (
                        <span className={`text-[9px] font-semibold ${c.text}`}>{ore}h</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Tabella riepilogativa */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Riepilogo {anno}</p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-gray-500">
                    <td className="pb-2 pr-2 font-semibold">Tipo</td>
                    {MESI_ABBR.map((m, i) => (
                      <td key={i} className="pb-2 text-center capitalize w-8">{m}</td>
                    ))}
                    <td className="pb-2 text-right font-semibold pl-2">Tot.</td>
                  </tr>
                </thead>
                <tbody>
                  {tipiConDati.map(tipo => {
                    const c = TIPO_COLORS[tipo]
                    const totale = monthlyData[tipo].reduce((s, v) => s + v, 0)
                    return (
                      <tr key={tipo} className="border-t border-gray-50 dark:border-gray-700">
                        <td className={`py-2 pr-2 font-semibold ${c.text} whitespace-nowrap`}>{tipoLabel(tipo)}</td>
                        {monthlyData[tipo].map((ore, mi) => (
                          <td key={mi} className="py-2 text-center text-gray-500 dark:text-gray-400 w-8">
                            {ore > 0 ? ore : '—'}
                          </td>
                        ))}
                        <td className={`py-2 text-right font-bold ${c.text} pl-2`}>{totale}h</td>
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
