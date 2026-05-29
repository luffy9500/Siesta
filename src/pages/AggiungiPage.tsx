import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays, parseISO, eachDayOfInterval, getDay, format } from 'date-fns'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const QUICK_HOURS = [1, 2, 4, 8]
const QUICK_DAYS  = [1, 2, 3, 5]

export default function AggiungiPage() {
  const { assenze, add, update } = useAssenze()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const editId     = searchParams.get('edit')
  const dataParam  = searchParams.get('data')
  const editAssenza = editId ? assenze.find(a => a.id === editId) ?? null : null

  const defaultDate = dataParam ?? format(new Date(), 'yyyy-MM-dd')

  const [tipo, setTipo]           = useState<AbsenceType>(editAssenza?.tipo ?? 'ferie')
  const [dataInizio, setDataInizio] = useState(editAssenza?.data_inizio ?? defaultDate)
  const [dataFine, setDataFine]   = useState(editAssenza?.data_fine ?? defaultDate)
  const [valueInput, setValueInput] = useState<string>(() => {
    if (!editAssenza) return ''
    const u = settings.unita_tipo[editAssenza.tipo] ?? 'ore'
    return u === 'giorni'
      ? String(editAssenza.ore / settings.ore_giornaliere)
      : String(editAssenza.ore)
  })
  const [note, setNote]           = useState(editAssenza?.note ?? '')
  const [error, setError]         = useState<string | null>(null)
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
  const unita   = settings.unita_tipo[tipo] ?? 'ore'
  const oreG    = settings.ore_giornaliere
  const c       = TIPO_OKLCH[tipo]

  const oreCalcolate = useMemo(() => {
    if (!dataInizio || !dataFine) return 0
    try {
      const start = parseISO(dataInizio)
      const end   = parseISO(dataFine)
      if (differenceInCalendarDays(end, start) < 0) return 0
      const days = eachDayOfInterval({ start, end })
      return days.filter(d => settings.giorni_lavorativi.includes(getDay(d))).length * oreG
    } catch { return 0 }
  }, [dataInizio, dataFine, settings])

  const autoLabel  = unita === 'giorni' ? `${oreCalcolate / oreG}g` : `${oreCalcolate}h`
  const oreTotali  = valueInput !== ''
    ? (unita === 'giorni' ? parseFloat(valueInput) * oreG : parseFloat(valueInput))
    : oreCalcolate
  const fieldLabel = valueInput !== ''
    ? `${valueInput}${unita === 'giorni' ? 'g' : 'h'}`
    : `${autoLabel} (auto)`
  const quickValues = unita === 'giorni' ? QUICK_DAYS : QUICK_HOURS

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

  return (
    <div className="form-page">
      <div className="page-title" style={{ marginBottom: 14 }}>
        {editId ? 'Modifica assenza' : 'Aggiungi assenza'}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo */}
        <div className="field">
          <div className="field-label">Tipo</div>
          <div className="tipo-grid">
            {TIPI.map(t => {
              const tc = TIPO_OKLCH[t]
              const sel = tipo === t
              return (
                <button key={t} type="button"
                  onClick={() => { setTipo(t); setValueInput('') }}
                  className="tipo-btn"
                  style={sel ? {
                    borderColor: tc.main,
                    background: tc.tint,
                    color: tc.text,
                  } : {}}>
                  {tipoLabel(t)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="field">
          <div className="field-row">
            {([
              { label: 'Dal', value: dataInizio, onChange: (v: string) => { setDataInizio(v); if (v > dataFine) setDataFine(v) }, min: undefined },
              { label: 'Al',  value: dataFine,   onChange: (v: string) => setDataFine(v), min: dataInizio },
            ] as const).map(({ label, value, onChange, min }) => (
              <div key={label}>
                <div className="field-label" style={{ marginBottom: 5 }}>{label}</div>
                <div className="date-wrapper">
                  <div className="date-display">{format(parseISO(value), 'd MMM yyyy')}</div>
                  <input type="date" required value={value} min={min}
                    onChange={e => onChange(e.target.value)}
                    className="date-native" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Valore */}
        <div className="field">
          <div className="field-label">{unita === 'giorni' ? 'Giorni' : 'Ore'}</div>
          <button type="button" onClick={() => { setInputTemp(''); setShowPicker(true) }}
            className={`value-trigger${valueInput === '' ? ' placeholder' : ''}`}>
            <span>{fieldLabel}</span>
            <span style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>›</span>
          </button>
        </div>

        {/* Note */}
        <div className="field">
          <div className="field-label">Note (opzionale)</div>
          <input type="text" placeholder="es. Visita medica" value={note}
            onChange={e => setNote(e.target.value)}
            className="text-input" />
        </div>

        {/* Riepilogo */}
        <div className="form-riepilogo" style={{ background: c.tint, color: c.text }}>
          {tipoLabel(tipo)}: <strong>
            {unita === 'giorni'
              ? `${(oreTotali / oreG).toFixed(1)}g`
              : `${oreTotali}h — ${(oreTotali / oreG).toFixed(1)} giornate`}
          </strong>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary">
          {editId ? 'Salva modifiche' : 'Salva assenza'}
        </button>

        {editId && (
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Annulla
          </button>
        )}
      </form>

      {/* Picker */}
      {showPicker && (
        <div className="sheet-scrim" onClick={() => setShowPicker(false)}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-title">
              {unita === 'giorni' ? 'Seleziona giorni' : 'Seleziona ore'}
            </div>

            <div className="picker-grid">
              <button type="button" onClick={() => { setValueInput(''); setShowPicker(false) }}
                className="pick-btn pick-auto">
                {autoLabel}
                <span className="pick-sub">auto</span>
              </button>
              {quickValues.map(v => (
                <button key={v} type="button" onClick={() => handlePickValue(v)}
                  className="pick-btn">
                  {v}{unita === 'giorni' ? 'g' : 'h'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="number" min="0.5" step="0.5"
                placeholder={unita === 'giorni' ? 'Giorni pers.' : 'Ore pers.'}
                value={inputTemp}
                onChange={e => setInputTemp(e.target.value)}
                className="text-input" style={{ marginBottom: 0 }} />
              <button type="button" onClick={handleConfirmCustom}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  background: 'var(--brand-600)', color: 'white',
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: '0.88rem',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}>
                OK
              </button>
            </div>

            <button type="button" onClick={() => setShowPicker(false)} className="btn-ghost"
              style={{ marginTop: 0 }}>
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
