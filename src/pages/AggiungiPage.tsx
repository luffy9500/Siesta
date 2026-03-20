import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays, parseISO, eachDayOfInterval, getDay, format } from 'date-fns'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const QUICK_HOURS = [1, 2, 4, 8]

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
  const [showOrePicker, setShowOrePicker] = useState(false)
  const [oreInputTemp, setOreInputTemp] = useState('')

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

  const handlePickOre = (h: number) => {
    setOreCustom(String(h))
    setShowOrePicker(false)
  }

  const handleConfirmCustomOre = () => {
    const v = parseFloat(oreInputTemp)
    if (!isNaN(v) && v > 0) setOreCustom(String(v))
    setShowOrePicker(false)
  }

  const oreLabel = oreCustom !== '' ? `${oreCustom}h` : `${oreCalcolate}h (auto)`

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Aggiungi assenza</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
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

        {/* Dal / Al — stacked to avoid overflow */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dal</label>
            <input
              type="date"
              required
              value={dataInizio}
              onChange={e => { setDataInizio(e.target.value); if (e.target.value > dataFine) setDataFine(e.target.value) }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Ore — tap to open picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ore</label>
          <button
            type="button"
            onClick={() => { setOreInputTemp(''); setShowOrePicker(true) }}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base text-left bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-between"
          >
            <span className={oreCustom !== '' ? 'text-gray-800' : 'text-gray-400'}>{oreLabel}</span>
            <span className="text-gray-400 text-sm">›</span>
          </button>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
          <input
            type="text"
            placeholder="es. Visita medica"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Riepilogo */}
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

      {/* Ore picker bottom sheet */}
      {showOrePicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
          onClick={() => setShowOrePicker(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800">Seleziona ore</h3>

            {/* Quick picks */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePickOre(oreCalcolate)}
                className="py-3 rounded-xl bg-teal-50 text-teal-700 font-semibold text-sm border-2 border-teal-200"
              >
                {oreCalcolate}h
                <div className="text-xs font-normal text-teal-500">auto</div>
              </button>
              {QUICK_HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handlePickOre(h)}
                  className="py-3 rounded-xl bg-gray-50 text-gray-700 font-semibold text-sm border-2 border-gray-200 hover:border-teal-300"
                >
                  {h}h
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="Ore personalizzate"
                value={oreInputTemp}
                onChange={e => setOreInputTemp(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleConfirmCustomOre}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm"
              >
                OK
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOrePicker(false)}
              className="w-full py-2.5 text-gray-500 text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
