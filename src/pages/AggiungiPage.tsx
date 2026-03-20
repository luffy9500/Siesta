import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays, parseISO, eachDayOfInterval, getDay, format } from 'date-fns'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

export default function AggiungiPage() {
  const { add } = useAssenze()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const [tipo, setTipo] = useState<AbsenceType>('ferie')
  const [dataInizio, setDataInizio] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dataFine, setDataFine] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [oreCustom, setOreCustom] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const oreCalcolate = useMemo(() => {
    if (!dataInizio || !dataFine) return 0
    try {
      const start = parseISO(dataInizio)
      const end = parseISO(dataFine)
      if (differenceInCalendarDays(end, start) < 0) return 0
      const days = eachDayOfInterval({ start, end })
      const lavorativi = days.filter(d => settings.giorni_lavorativi.includes(getDay(d)))
      return lavorativi.length * settings.ore_giornaliere
    } catch {
      return 0
    }
  }, [dataInizio, dataFine, settings])

  const oreTotali = oreCustom !== '' ? parseFloat(oreCustom) : oreCalcolate

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (oreTotali <= 0) { setError('Le ore devono essere maggiori di 0'); return }
    add({ tipo, data_inizio: dataInizio, data_fine: dataFine, ore: oreTotali, note: note || undefined })
    navigate('/')
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Aggiungi assenza</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPI.map(t => {
              const c = TIPO_COLORS[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition
                    ${tipo === t ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}
                  `}
                >
                  {TIPO_LABELS[t]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dal</label>
            <input
              type="date"
              required
              value={dataInizio}
              onChange={e => { setDataInizio(e.target.value); if (e.target.value > dataFine) setDataFine(e.target.value) }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Al</label>
            <input
              type="date"
              required
              min={dataInizio}
              value={dataFine}
              onChange={e => setDataFine(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ore <span className="text-gray-400 font-normal">(calcolate: {oreCalcolate}h)</span>
          </label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            placeholder={`${oreCalcolate}h — modifica se necessario`}
            value={oreCustom}
            onChange={e => setOreCustom(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
          <input
            type="text"
            placeholder="es. Visita medica"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className={`rounded-xl p-3 ${TIPO_COLORS[tipo].bg} ${TIPO_COLORS[tipo].text}`}>
          <p className="text-sm font-medium">
            {TIPO_LABELS[tipo]}: <strong>{oreTotali}h</strong>
            {oreTotali > 0 && ` — ${(oreTotali / settings.ore_giornaliere).toFixed(1)} giornate`}
          </p>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}

        <button
          type="submit"
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 rounded-2xl transition shadow-md"
        >
          Salva assenza
        </button>
      </form>
    </div>
  )
}
