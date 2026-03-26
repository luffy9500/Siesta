import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'
import { useSettings } from '../hooks/useSettings'

interface Props {
  tipo: AbsenceType
  saldoBusta: number | null
  oreUsate: number
  orePianificate: number
}

function toGiorni(ore: number, oreGiornaliere: number): string {
  const g = ore / oreGiornaliere
  return g % 1 === 0 ? `${g}g` : `${g.toFixed(1)}g`
}

function formatVal(ore: number, unita: 'ore' | 'giorni', oreG: number): string {
  if (unita === 'giorni') return toGiorni(ore, oreG)
  return `${ore}h`
}

export default function BalanceCard({ tipo, saldoBusta, oreUsate, orePianificate }: Props) {
  const { settings } = useSettings()
  const c = TIPO_COLORS[tipo]
  const label = settings.tipo_labels[tipo] ?? TIPO_LABELS[tipo]
  const oreG = settings.ore_giornaliere
  const unita = settings.unita_tipo[tipo] ?? 'ore'
  const hasData = saldoBusta !== null
  const oreDisponibili = hasData ? Math.max(0, saldoBusta - oreUsate - orePianificate) : 0
  const sogliaAttiva = settings.soglia_saldo_basso > 0
  const saldoBasso = hasData && sogliaAttiva && oreDisponibili <= settings.soglia_saldo_basso

  const pctUsate       = hasData && saldoBusta > 0 ? Math.min(100, (oreUsate / saldoBusta) * 100) : 0
  const pctPianificate = hasData && saldoBusta > 0 ? Math.min(100 - pctUsate, (orePianificate / saldoBusta) * 100) : 0

  const bustaPill = hasData ? (unita === 'giorni' ? toGiorni(saldoBusta!, oreG) : `${saldoBusta}h`) : ''

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border ${saldoBasso ? 'border-orange-300 dark:border-orange-500' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className={`h-0.5 ${saldoBasso ? 'bg-orange-400' : c.accent}`} />

      <div className="px-3 py-2.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`font-bold text-sm ${c.text}`}>{label}</span>
          <div className="flex items-center gap-1.5">
            {saldoBasso && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                ⚠️ Basso
              </span>
            )}
            {hasData && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.pill}`}>
                busta: {bustaPill}
              </span>
            )}
          </div>
        </div>

        {!hasData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic py-0.5">Nessun saldo inserito</p>
        ) : (
          <>
            {/* Disponibili */}
            <div className="mb-1.5 flex items-baseline gap-1.5">
              <span className={`text-xl font-black ${saldoBasso ? 'text-orange-500' : c.text}`}>
                {formatVal(oreDisponibili, unita, oreG)}
              </span>
              {unita === 'ore' && (
                <span className={`text-sm font-semibold ${saldoBasso ? 'text-orange-400' : c.text} opacity-70`}>
                  {toGiorni(oreDisponibili, oreG)}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">disponibili</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
              <div className="h-full flex">
                <div className={`${c.bar} transition-all duration-500`} style={{ width: `${pctUsate}%` }} />
                <div className="bg-amber-400 transition-all duration-500" style={{ width: `${pctPianificate}%` }} />
              </div>
            </div>

            {/* Chips usate / pianificate */}
            <div className="flex gap-1.5">
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg py-1 px-1 text-center">
                <div className="text-sm font-bold text-gray-600 dark:text-gray-300 leading-tight">{formatVal(oreUsate, unita, oreG)}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">usate</div>
              </div>
              <div className="flex-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg py-1 px-1 text-center">
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-tight">{formatVal(orePianificate, unita, oreG)}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">pian.</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
