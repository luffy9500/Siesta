import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

interface Props {
  tipo: AbsenceType
  saldoBusta: number | null   // ore da busta paga
  oreUsate: number            // ore usate dal mese del saldo ad oggi
  oreResidue: number          // calcolato
  orePianificate: number      // assenze future
}

export default function BalanceCard({ tipo, saldoBusta, oreUsate, oreResidue, orePianificate }: Props) {
  const c = TIPO_COLORS[tipo]
  const hasData = saldoBusta !== null

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-bold text-base ${c.text}`}>{TIPO_LABELS[tipo]}</span>
        {hasData && (
          <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${c.text}`}>
            da busta: {saldoBusta}h
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-500 italic">Nessun saldo inserito</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className={`text-2xl font-bold ${c.text}`}>{oreResidue}h</div>
            <div className="text-xs text-gray-500 mt-0.5">residue</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600">{oreUsate}h</div>
            <div className="text-xs text-gray-500 mt-0.5">usate</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber-600">{orePianificate}h</div>
            <div className="text-xs text-gray-500 mt-0.5">pianificate</div>
          </div>
        </div>
      )}
    </div>
  )
}
