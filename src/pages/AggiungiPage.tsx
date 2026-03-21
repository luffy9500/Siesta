import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays, parseISO, eachDayOfInterval, getDay, format } from 'date-fns'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const QUICK_HOURS = [1, 2, 4, 8]

export default function AggiungiPage() {
  const { assenze, add, update } = useAssenze()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const editId = searchParams.get('edit')
  const dataParam = searchParams.get('data')
  const editAssenza = editId ? assenze.find(a => a.id === editId) ?? null : null

  const defaultDate = dataParam ?? format(new Date(), 'yyyy-MM-dd')

  const [tipo, setTipo] = useState<AbsenceType>(editAssenza?.tipo ?? 'ferie')
  const [dataInizio, setDataInizio] = useState(editAssenza?.data_inizio ?? defaultDate)
  const [dataFine, setDataFine] = useState(editAssenza?.data_fine ?? defaultDate)
  const [oreCustom, setOreCustom] = useState(editAssenza ? String(editAssenza.ore) : '')
  const [note, setNote] = useState(editAssenza?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [showOrePicker, setShowOrePicker] = useState(false)
  const [oreInputTemp, setOreInputTemp] = useState('')

  // When editAssenza loads (async nav), sync state
  useEffect(() => {
    if (editAssenza) {
      setTipo(editAssenza.tipo)
      setDataInizio(editAssenza.data_inizio)
      setDataFine(editAssenza.data_fine)
      setOreCustom(String(editAssenza.ore))
      setNote(editAssenza.note ?? '')
    }
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]

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
    if (editId) {
      update(editId, { tipo, data_inizio: dataInizio, data_fine: dataFine, ore: oreTotali, note: note || null })
    } else {
      add({ tipo, data_inizio: dataInizio, data_fine: dataFine, ore: oreTotali, note: note || undefined })
    }
    navigate(-1)
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
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
        {editId ? 'Modifica assenza' : 'Aggiungi assenza'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPI.map(t => {
              const c = TIPO_COLORS[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition
                    ${tipo === t ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:bg-gray-800'}
                  `}
                >
                  {tipoLabel(t)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dal / Al */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { label: 'Dal', value: dataInizio, onChange: (v: string) => { setDataInizio(v); if (v > dataFine) setDataFine(v) }, min: undefined },
            { label: 'Al',  value: dataFine,   onChange: (v: string) => setDataFine(v),                                         min: dataInizio },
          ] as const).map(({ label, value, onChange, min }) => (
            <div key={label} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 overflow-hidden">
                <div className="px-3 py-2.5 text-base text-gray-800 dark:text-gray-100 pointer-events-none">
                  {format(parseISO(value), 'd MMM yyyy')}
                </div>
                <input
                  type="date"
                  required
                  value={value}
                  min={min}
                  onChange={e => onChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Ore */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ore</label>
          <button
            type="button"
            onClick={() => { setOreInputTemp(''); setShowOrePicker(true) }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-base text-left bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-between"
          >
            <span className={oreCustom !== '' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>{oreLabel}</span>
            <span className="text-gray-400 text-sm">›</span>
          </button>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (opzionale)</label>
          <input
            type="text"
            placeholder="es. Visita medica"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Riepilogo */}
        <div className={`rounded-xl p-3 ${TIPO_COLORS[tipo].bg} ${TIPO_COLORS[tipo].text}`}>
          <p className="text-sm font-medium">
            {tipoLabel(tipo)}: <strong>{oreTotali}h</strong>
            {oreTotali > 0 && ` — ${(oreTotali / settings.ore_giornaliere).toFixed(1)} giornate`}
          </p>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}

        <button
          type="submit"
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 rounded-2xl transition shadow-md"
        >
          {editId ? 'Salva modifiche' : 'Salva assenza'}
        </button>

        {editId && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full py-3 text-gray-500 dark:text-gray-400 text-sm font-medium"
          >
            Annulla
          </button>
        )}
      </form>

      {/* Ore picker bottom sheet */}
      {showOrePicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
          onClick={() => setShowOrePicker(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Seleziona ore</h3>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setOreCustom(''); setShowOrePicker(false) }}
                className="py-3 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold text-sm border-2 border-teal-200 dark:border-teal-700"
              >
                {oreCalcolate}h
                <div className="text-xs font-normal text-teal-500">auto</div>
              </button>
              {QUICK_HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handlePickOre(h)}
                  className="py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm border-2 border-gray-200 dark:border-gray-600 hover:border-teal-300"
                >
                  {h}h
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="Ore personalizzate"
                value={oreInputTemp}
                onChange={e => setOreInputTemp(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
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
              className="w-full py-2.5 text-gray-500 dark:text-gray-400 text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
