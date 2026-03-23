import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSaldi } from '../hooks/useSaldi'
import { useSettings } from '../hooks/useSettings'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

const MESI = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM', { locale: it }),
}))

export default function SaldiPage() {
  const { saldi, upsert } = useSaldi()
  const { settings } = useSettings()
  const now = new Date()
  const [anno, setAnno] = useState(now.getFullYear())
  const [mese, setMese] = useState(now.getMonth() + 1)
  const [values, setValues] = useState<Partial<Record<AbsenceType, string>>>({})
  const [saved, setSaved] = useState(false)

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]

  const getExisting = (tipo: AbsenceType) =>
    saldi.find(s => s.anno === anno && s.mese === mese && s.tipo === tipo)

  const handleSave = () => {
    TIPI.forEach(tipo => {
      const val = values[tipo]
      if (val !== undefined && val !== '') upsert(anno, mese, tipo, parseFloat(val))
    })
    setValues({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = TIPI.some(t => values[t] !== undefined && values[t] !== '')

  return (
    <div className="p-3">
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-0.5">Saldi da busta paga</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Inserisci le ore riportate in busta ogni mese.</p>

      <div className="flex gap-2 mb-4">
        <select value={mese} onChange={e => setMese(Number(e.target.value))}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 capitalize bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
          {MESI.map(m => (
            <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
          ))}
        </select>
        <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))}
          className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          min="2020" max="2099" />
      </div>

      <div className="space-y-2 mb-4">
        {TIPI.map(tipo => {
          const existing = getExisting(tipo)
          const c = TIPO_COLORS[tipo]
          return (
            <div key={tipo} className={`rounded-xl border-2 ${c.border} ${c.bg} px-3 py-2.5`}>
              <label className={`block text-xs font-bold mb-1.5 ${c.text}`}>{tipoLabel(tipo)}</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.5"
                  placeholder={existing ? `${existing.ore}h (attuale)` : 'es. 128'}
                  value={values[tipo] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [tipo]: e.target.value }))}
                  className="flex-1 border border-white bg-white/80 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <span className="text-xs font-semibold text-gray-500">ore</span>
              </div>
              {existing && (
                <p className="text-xs mt-1 text-gray-500">Ultimo: <strong>{existing.ore}h</strong></p>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={handleSave} disabled={!hasChanges}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-40 shadow-md text-sm">
        {saved ? '✓ Salvato!' : 'Salva saldi'}
      </button>

      {saldi.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Storico</h3>
          <div className="space-y-1.5">
            {saldi.slice(0, 20).map(s => {
              const c = TIPO_COLORS[s.tipo]
              return (
                <div key={s.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{tipoLabel(s.tipo)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {MESI.find(m => m.value === s.mese)?.label} {s.anno}
                  </span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{s.ore}h</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
