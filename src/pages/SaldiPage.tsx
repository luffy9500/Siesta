import { useState, useMemo } from 'react'
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

  const fmtOre = (ore: number) =>
    unita === 'giorni' ? `${(ore / oreG).toFixed(1)}g` : `${ore}h`

  // Group storico by month, most recent first
  const storicoGrouped = useMemo(() => {
    const sorted = [...saldi].sort((a, b) =>
      b.anno !== a.anno ? b.anno - a.anno : b.mese - a.mese
    )
    const groups: { key: string; label: string; entries: typeof saldi }[] = []
    sorted.forEach(s => {
      const key = `${s.anno}-${s.mese}`
      let g = groups.find(g => g.key === key)
      if (!g) {
        const monthLabel = MESI.find(m => m.value === s.mese)?.label ?? ''
        g = { key, label: `${monthLabel} ${s.anno}`, entries: [] }
        groups.push(g)
      }
      g.entries.push(s)
    })
    // sort entries within each group by TIPI order
    groups.forEach(g => {
      g.entries.sort((a, b) => TIPI.indexOf(a.tipo) - TIPI.indexOf(b.tipo))
    })
    return groups.slice(0, 12) // last 12 months
  }, [saldi])

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
                {existing ? fmtOre(existing.ore) : '—'}
              </span>
              <input type="number" min="0" step="0.5"
                placeholder="0"
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

      {storicoGrouped.length > 0 && (
        <>
          <div className="section-label">Storico</div>
          {storicoGrouped.map(group => (
            <div key={group.key} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
                color: 'var(--ink-faint)', textTransform: 'capitalize',
                marginBottom: 4, paddingLeft: 2,
              }}>
                {group.label}
              </div>
              <div className="storico-list" style={{ margin: 0 }}>
                {group.entries.map(s => {
                  const c = TIPO_OKLCH[s.tipo]
                  return (
                    <div key={s.id} className="storico-row">
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        background: c.tint, color: c.text,
                        border: `1px solid ${c.tintBorder}`,
                        borderRadius: 999, padding: '2px 9px',
                        flexShrink: 0,
                      }}>
                        {tipoLabel(s.tipo)}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)' }}>
                        {fmtOre(s.ore)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
