import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays, parseISO, eachDayOfInterval, getDay, format } from 'date-fns'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import type { AbsenceType } from '../types'
import { TIPO_LABELS, TIPO_COLORS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const QUICK_HOURS = [1, 2, 4, 8]
const QUICK_DAYS  = [1, 2, 3, 5]

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
  // valueInput stores the user-facing value in the configured unit (ore or giorni)
  const [valueInput, setValueInput] = useState<string>(() => {
    if (!editAssenza) return ''
    const u = settings.unita_tipo[editAssenza.tipo] ?? 'ore'
    return u === 'giorni'
      ? String(editAssenza.ore / settings.ore_giornaliere)
      : String(editAssenza.ore)
  })
  const [note, setNote] = useState(editAssenza?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [inputTemp, setInputTemp] = useState('')

  useEffect(() => {
    if (editAssenza) {
      setTipo(editAssenza.tipo)
      setDataInizio(editAssenza.data_inizio)
      setDataFine(editAssenza.data_fine)
      const u = settings.unita_tipo[editAssenza.tipo] ?? 'ore'
      setValueInput(u === 'giorni'
        ? String(editAssenza.ore / settings.ore_giornaliere)
        : String(editAssenza.ore))
      setNote(editAssenza.note ?? '')
    }
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]
  const unita = settings.unita_tipo[tipo] ?? 'ore'
  const oreG  = settings.ore_giornaliere

  // always in hours
  const oreCalcolate = useMemo(() => {
    if (!dataInizio || !dataFine) return 0
    try {
      const start = parseISO(dataInizio)
      const end = parseISO(dataFine)
      if (differenceInCalendarDays(end, start) < 0) return 0
      const days = eachDayOfInterval({ start, end })
      const lavorativi = days.filter(d => settings.giorni_lavorativi.includes(getDay(d)))
      return lavorativi.length * oreG
    } catch { return 0 }
  }, [dataInizio, dataFine, settings])

  // auto value displayed in current unit
  const autoLabel = unita === 'giorni'
    ? `${oreCalcolate / oreG}g`
    : `${oreCalcolate}h`

  // total hours for saving
  const oreTotali = valueInput !== ''
    ? (unita === 'giorni' ? parseFloat(valueInput) * oreG : parseFloat(valueInput))
    : oreCalcolate

  const fieldLabel = valueInput !== ''
    ? `${valueInput}${unita === 'giorni' ? 'g' : 'h'}`
    : `${autoLabel} (auto)`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (oreTotali <= 0) { setError('Il valore deve essere maggiore di 0'); return }
    if (editId) {
      update(editId, { tipo, data_inizio: dataInizio, data_fine: dataFine, ore: oreTotali, note: note || null })
    } else {
      add({ tipo, data_inizio: dataInizio, data_fine: dataFine, ore: oreTotali, note: note || undefined })
    }
    navigate(-1)
  }

  const handlePickValue = (v: number) => { setValueInput(String(v)); setShowPicker(false) }

  const handleConfirmCustom = () => {
    const v = parseFloat(inputTemp)
    if (!isNaN(v) && v > 0) setValueInput(String(v))
    setShowPicker(false)
  }

  const quickValues = unita === 'giorni' ? QUICK_DAYS : QUICK_HOURS

  return (
    <div className="p-3">
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
        {editId ? 'Modifica assenza' : 'Aggiungi assenza'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
          <div className="grid grid-cols-2 gap-1.5">
            {TIPI.map(t => {
              const c = TIPO_COLORS[t]
              return (
                <button key={t} type="button" onClick={() => { setTipo(t); setValueInput('') }}
                  className={`py-2 rounded-lg border-2 text-sm font-semibold transition
                    ${tipo === t ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 dark:bg-gray-800'}
                  `}>
                  {tipoLabel(t)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dal / Al */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: 'Dal', value: dataInizio, onChange: (v: string) => { setDataInizio(v); if (v > dataFine) setDataFine(v) }, min: undefined },
            { label: 'Al',  value: dataFine,   onChange: (v: string) => setDataFine(v), min: dataInizio },
          ] as const).map(({ label, value, onChange, min }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden">
                <div className="px-3 py-2 text-sm text-gray-800 dark:text-gray-100 pointer-events-none">
                  {format(parseISO(value), 'd MMM yyyy')}
                </div>
                <input type="date" required value={value} min={min}
                  onChange={e => onChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
          ))}
        </div>

        {/* Ore / Giorni */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {unita === 'giorni' ? 'Giorni' : 'Ore'}
          </label>
          <button type="button" onClick={() => { setInputTemp(''); setShowPicker(true) }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-left bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-between">
            <span className={valueInput !== '' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>{fieldLabel}</span>
            <span className="text-gray-400 text-sm">›</span>
          </button>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (opzionale)</label>
          <input type="text" placeholder="es. Visita medica" value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
        </div>

        {/* Riepilogo */}
        <div className={`rounded-lg p-2.5 ${TIPO_COLORS[tipo].bg} ${TIPO_COLORS[tipo].text}`}>
          <p className="text-sm font-medium">
            {tipoLabel(tipo)}: <strong>
              {unita === 'giorni'
                ? `${(oreTotali / oreG).toFixed(1)}g`
                : `${oreTotali}h — ${(oreTotali / oreG).toFixed(1)} giornate`}
            </strong>
          </p>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}

        <button type="submit"
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl transition shadow-md text-sm">
          {editId ? 'Salva modifiche' : 'Salva assenza'}
        </button>

        {editId && (
          <button type="button" onClick={() => navigate(-1)}
            className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            Annulla
          </button>
        )}
      </form>

      {/* Picker */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setShowPicker(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {unita === 'giorni' ? 'Seleziona giorni' : 'Seleziona ore'}
            </h3>

            <div className="grid grid-cols-5 gap-1.5">
              <button type="button" onClick={() => { setValueInput(''); setShowPicker(false) }}
                className="py-2 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold text-sm border-2 border-teal-200 dark:border-teal-700 col-span-1">
                {autoLabel}
                <div className="text-[10px] font-normal text-teal-500">auto</div>
              </button>
              {quickValues.map(v => (
                <button key={v} type="button" onClick={() => handlePickValue(v)}
                  className="py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm border-2 border-gray-200 dark:border-gray-600 hover:border-teal-300">
                  {v}{unita === 'giorni' ? 'g' : 'h'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input type="number" min="0.5" step={unita === 'giorni' ? '0.5' : '0.5'}
                placeholder={unita === 'giorni' ? 'Giorni personalizzati' : 'Ore personalizzate'}
                value={inputTemp}
                onChange={e => setInputTemp(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
              <button type="button" onClick={handleConfirmCustom}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-sm">
                OK
              </button>
            </div>

            <button type="button" onClick={() => setShowPicker(false)}
              className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm">
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
