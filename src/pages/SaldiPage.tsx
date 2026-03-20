import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { useSaldi } from '../hooks/useSaldi'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

const MESI = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM', { locale: it }),
}))

export default function SaldiPage() {
  const { user } = useAuth()
  const { saldi, upsert } = useSaldi(user?.id)

  const now = new Date()
  const [anno, setAnno] = useState(now.getFullYear())
  const [mese, setMese] = useState(now.getMonth() + 1)
  const [values, setValues] = useState<Partial<Record<AbsenceType, string>>>({})
  const [saved, setSaved] = useState(false)

  const getExisting = (tipo: AbsenceType) => {
    return saldi.find(s => s.anno === anno && s.mese === mese && s.tipo === tipo)
  }

  const handleSave = async () => {
    const promises = TIPI.map(tipo => {
      const val = values[tipo]
      if (val !== undefined && val !== '') {
        return upsert(anno, mese, tipo, parseFloat(val))
      }
      return Promise.resolve()
    })
    await Promise.all(promises)
    setValues({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = TIPI.some(t => values[t] !== undefined && values[t] !== '')

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Saldi da busta paga</h2>
      <p className="text-sm text-gray-500 mb-4">Inserisci le ore riportate in busta ogni mese.</p>

      {/* Mese / Anno selector */}
      <div className="flex gap-2 mb-6">
        <select
          value={mese}
          onChange={e => setMese(Number(e.target.value))}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 capitalize"
        >
          {MESI.map(m => (
            <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
          ))}
        </select>
        <input
          type="number"
          value={anno}
          onChange={e => setAnno(Number(e.target.value))}
          className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          min="2020"
          max="2099"
        />
      </div>

      <div className="space-y-3 mb-6">
        {TIPI.map(tipo => {
          const existing = getExisting(tipo)
          const c = TIPO_COLORS[tipo]
          return (
            <div key={tipo} className={`rounded-2xl border-2 ${c.border} ${c.bg} p-4`}>
              <label className={`block text-sm font-bold mb-2 ${c.text}`}>{TIPO_LABELS[tipo]}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder={existing ? `${existing.ore}h (attuale)` : 'es. 128'}
                  value={values[tipo] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [tipo]: e.target.value }))}
                  className="flex-1 border border-white bg-white/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-semibold text-gray-500">ore</span>
              </div>
              {existing && (
                <p className="text-xs mt-1 text-gray-500">
                  Ultimo valore: <strong>{existing.ore}h</strong>
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 rounded-2xl transition disabled:opacity-40 shadow-md"
      >
        {saved ? '✓ Salvato!' : 'Salva saldi'}
      </button>

      {/* Storico */}
      {saldi.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-600 mb-3">Storico</h3>
          <div className="space-y-2">
            {saldi.slice(0, 20).map(s => {
              const c = TIPO_COLORS[s.tipo]
              return (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{TIPO_LABELS[s.tipo]}</span>
                  <span className="text-xs text-gray-500 capitalize">
                    {MESI.find(m => m.value === s.mese)?.label} {s.anno}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{s.ore}h</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
