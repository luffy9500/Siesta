import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

interface Props {
  tipo: AbsenceType
  saldoBusta: number | null
  oreUsate: number
  orePianificate: number
}

export default function BalanceCard({ tipo, saldoBusta, oreUsate, orePianificate }: Props) {
  const c = TIPO_COLORS[tipo]
  const hasData = saldoBusta !== null
  const oreDisponibili = hasData ? Math.max(0, saldoBusta - oreUsate - orePianificate) : 0

  const pctUsate       = hasData && saldoBusta > 0 ? Math.min(100, (oreUsate / saldoBusta) * 100) : 0
  const pctPianificate = hasData && saldoBusta > 0 ? Math.min(100 - pctUsate, (orePianificate / saldoBusta) * 100) : 0

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Top accent strip */}
      <div className={`h-1 ${c.accent}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`font-bold text-base ${c.text}`}>{TIPO_LABELS[tipo]}</span>
          {hasData && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.pill}`}>
              busta: {saldoBusta}h
            </span>
          )}
        </div>

        {!hasData ? (
          <p className="text-sm text-gray-400 italic py-1">Nessun saldo inserito</p>
        ) : (
          <>
            {/* Main figure */}
            <div className="mb-3 flex items-baseline gap-2">
              <span className={`text-3xl font-black ${c.text}`}>{oreDisponibili}h</span>
              <span className="text-xs text-gray-400">disponibili</span>
            </div>

            {/* Progress bar: usate | pianificate | remaining */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-full flex">
                <div className={`${c.bar} transition-all duration-500`} style={{ width: `${pctUsate}%` }} />
                <div className="bg-amber-400 transition-all duration-500" style={{ width: `${pctPianificate}%` }} />
              </div>
            </div>

            {/* Stats chips */}
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-xl py-2 text-center">
                <div className="text-sm font-bold text-gray-600">{oreUsate}h</div>
                <div className="text-xs text-gray-400">usate</div>
              </div>
              <div className="flex-1 bg-amber-50 rounded-xl py-2 text-center">
                <div className="text-sm font-bold text-amber-600">{orePianificate}h</div>
                <div className="text-xs text-gray-400">pianificate</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
