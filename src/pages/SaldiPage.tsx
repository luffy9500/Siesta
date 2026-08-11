import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSaldi } from '../hooks/useSaldi'
import { useSettings } from '../hooks/useSettings'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'

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
  const unita     = settings.unita
  const oreG      = settings.ore_giornaliere

  const getExisting = (tipo: AbsenceType) =>
    saldi.find(s => s.anno === anno && s.mese === mese && s.tipo === tipo)

  const handleSave = () => {
    TIPI.forEach(tipo => {
      const val = values[tipo]
      if (val !== undefined && val !== '') {
        const parsed = parseFloat(val)
        const ore    = unita === 'giorni' ? parsed * oreG : parsed
        upsert(anno, mese, tipo, ore)
      }
    })
    setValues({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = TIPI.some(t => values[t] !== undefined && values[t] !== '')

  const fmtExisting = (_tipo: AbsenceType, ore: number) =>
    unita === 'giorni' ? `${(ore / oreG).toFixed(1)}g` : `${ore}h`

  return (
    <div className="screen">
      <div style={{ marginBottom: 14 }}>
        <div className="page-title">Saldi busta paga</div>
      </div>

      {/* Period selector */}
      <div className="saldi-period">
        <div className="select-wrap">
          <select value={mese} onChange={e => setMese(Number(e.target.value))}>
            {MESI.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))}
          min="2020" max="2099"
          style={{
            width: 78,
            border: '1.5px solid var(--line-2)',
            borderRadius: 'var(--r-input)',
            padding: '9px 12px',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.85rem',
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
          }} />
      </div>

      {/* Compact grouped list */}
      <div className="settings-group" style={{ marginBottom: 12 }}>
        {TIPI.map(tipo => {
          const existing = getExisting(tipo)
          const c        = TIPO_OKLCH[tipo]
          return (
            <div key={tipo} className="set-row" style={{ padding: '11px 14px', gap: 10, cursor: 'text' }}
              onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                background: c.tint, color: c.text,
                border: `1px solid ${c.tintBorder}`,
                borderRadius: 999, padding: '3px 10px',
                flexShrink: 0, minWidth: 72, textAlign: 'center',
              }}>
                {tipoLabel(tipo)}
              </span>
              <span style={{
                fontSize: '0.78rem', color: 'var(--ink-faint)',
                flex: 1,
              }}>
                {existing ? fmtExisting(tipo, existing.ore) : '—'}
              </span>
              <input type="number" min="0" step="0.5"
                placeholder={unita === 'giorni' ? '0g' : '0h'}
                value={values[tipo] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [tipo]: e.target.value }))}
                className="saldi-compact-input"
                style={{
                  width: 64, textAlign: 'right',
                  border: 'none', outline: 'none',
                  fontFamily: 'var(--font-ui)', fontSize: '0.95rem', fontWeight: 700,
                  background: 'transparent', color: 'var(--ink)',
                }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-faint)', minWidth: 16 }}>
                {unita === 'giorni' ? 'g' : 'h'}
              </span>
            </div>
          )
        })}
      </div>

      <button onClick={handleSave} disabled={!hasChanges} className="btn-primary"
        style={{ marginTop: 4 }}>
        {saved ? '✓ Salvato!' : 'Salva saldi'}
      </button>

      {saldi.length > 0 && (
        <>
          <div className="section-label">Storico</div>
          <div className="storico-list">
          {saldi.slice(0, 20).map(s => {
            const c = TIPO_OKLCH[s.tipo]
            return (
              <div key={s.id} className="storico-row">
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  background: c.tint, color: c.text,
                  border: `1px solid ${c.tintBorder}`,
                  borderRadius: 999, padding: '2px 9px',
                }}>
                  {tipoLabel(s.tipo)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', textTransform: 'capitalize' }}>
                  {MESI.find(m => m.value === s.mese)?.label} {s.anno}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)' }}>
                  {fmtExisting(s.tipo, s.ore)}
                </span>
              </div>
            )
          })}
          </div>
        </>
      )}
    </div>
  )
}
