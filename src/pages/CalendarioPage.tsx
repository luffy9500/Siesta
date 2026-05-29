import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, parseISO, isWithinInterval,
  addMonths, subMonths, startOfDay,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { Assenza, AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'

const DAY_HEADERS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

function getAssenzeForDay(day: Date, assenze: Assenza[]): Assenza[] {
  return assenze.filter(a => {
    const start = parseISO(a.data_inizio)
    const end   = parseISO(a.data_fine)
    return isWithinInterval(startOfDay(day), { start: startOfDay(start), end: startOfDay(end) })
  })
}

export default function CalendarioPage() {
  const { assenze, remove } = useAssenze()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [current, setCurrent] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: string; list: Assenza[] } | null>(null)
  const [filtriAttivi, setFiltriAttivi] = useState<AbsenceType[]>([])

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS[t]

  const toggleFiltro = (tipo: AbsenceType) => {
    setFiltriAttivi(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo])
  }

  const assenzeFiltrate = useMemo(() =>
    filtriAttivi.length === 0 ? assenze : assenze.filter(a => filtriAttivi.includes(a.tipo)),
    [assenze, filtriAttivi]
  )

  const days = useMemo(() => {
    const start = startOfMonth(current)
    const end   = endOfMonth(current)
    const all   = eachDayOfInterval({ start, end })
    const startDow = (getDay(start) + 6) % 7
    return [...Array(startDow).fill(null), ...all]
  }, [current])

  const assenzeMap = useMemo(() => {
    const map = new Map<string, Assenza[]>()
    days.forEach(d => {
      if (!d) return
      const key = format(d, 'yyyy-MM-dd')
      map.set(key, getAssenzeForDay(d, assenzeFiltrate))
    })
    return map
  }, [days, assenzeFiltrate])

  const handleDayClick = (day: Date) => {
    const key  = format(day, 'yyyy-MM-dd')
    const list = assenzeMap.get(key) ?? []
    if (list.length > 0) setSelectedDay({ date: key, list })
    else navigate(`/aggiungi?data=${key}`)
  }

  const handleDelete = (id: string) => {
    if (!selectedDay) return
    const assenza = selectedDay.list.find(a => a.id === id)
    if (!assenza) return
    if (confirm(`Eliminare questa assenza di ${tipoLabel(assenza.tipo)}?`)) {
      remove(id)
      const newList = selectedDay.list.filter(a => a.id !== id)
      if (newList.length === 0) setSelectedDay(null)
      else setSelectedDay({ ...selectedDay, list: newList })
    }
  }

  const unitaOf = (t: AbsenceType) => settings.unita_tipo[t] ?? 'ore'
  const fmtOre = (a: Assenza) => {
    const u = unitaOf(a.tipo)
    return u === 'giorni'
      ? `${(a.ore / settings.ore_giornaliere).toFixed(1)}g`
      : `${a.ore}h`
  }

  return (
    <div className="screen">
      {/* Month nav */}
      <div className="cal-head">
        <button className="cal-nav" onClick={() => setCurrent(subMonths(current, 1))}>‹</button>
        <span className="cal-month">{format(current, 'MMMM yyyy', { locale: it })}</span>
        <button className="cal-nav" onClick={() => setCurrent(addMonths(current, 1))}>›</button>
      </div>

      {/* Filters */}
      <div className="cal-filters">
        {TIPI.map(t => {
          const attivo   = filtriAttivi.includes(t)
          const isFaded  = filtriAttivi.length > 0 && !attivo
          const c = TIPO_OKLCH[t]
          return (
            <button key={t} onClick={() => toggleFiltro(t)}
              className={`cal-chip${attivo ? ' chip-active' : ''}${isFaded ? ' chip-faded' : ''}`}
              style={attivo ? { '--chip-color': c.main } as React.CSSProperties : {}}>
              {tipoLabel(t)}
            </button>
          )
        })}
        {filtriAttivi.length > 0 && (
          <button onClick={() => setFiltriAttivi([])}
            className="cal-chip"
            style={{ background: 'var(--surface-2)' }}>
            × Tutti
          </button>
        )}
      </div>

      {/* Day-of-week headers */}
      <div className="cal-grid" style={{ marginBottom: 3 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const key       = format(day, 'yyyy-MM-dd')
          const dayAssenze = assenzeMap.get(key) ?? []
          const inMonth   = isSameMonth(day, current)

          return (
            <button key={key} onClick={() => handleDayClick(day)}
              className={`cal-cell${!inMonth ? ' out-month' : ''}${isToday(day) ? ' today' : ''}`}>
              {dayAssenze.length > 0 && (
                <div className="cal-fills">
                  {dayAssenze.map((a, ai) => (
                    <div key={ai} style={{ flex: 1, background: TIPO_OKLCH[a.tipo].cal }} />
                  ))}
                </div>
              )}
              <span style={{
                position: 'relative', zIndex: 1,
                color: dayAssenze.length > 0 ? TIPO_OKLCH[dayAssenze[0].tipo].text : undefined,
                fontWeight: dayAssenze.length > 0 ? 800 : 700,
              }}>
                {format(day, 'd')}
              </span>
              {dayAssenze.length > 1 && (
                <span style={{
                  position: 'relative', zIndex: 1,
                  fontSize: 8, lineHeight: 1, fontWeight: 800,
                  color: 'white',
                  background: 'oklch(0 0 0 / 0.22)',
                  borderRadius: 999, padding: '1px 4px',
                }}>
                  {dayAssenze.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Day sheet */}
      {selectedDay && (
        <div className="sheet-scrim" onClick={() => setSelectedDay(null)}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div className="sheet-title">
                  {format(parseISO(selectedDay.date), 'd MMMM yyyy', { locale: it })}
                </div>
              </div>
              <button onClick={() => navigate(`/aggiungi?data=${selectedDay.date}`)}
                className="sheet-add-btn">
                + Aggiungi
              </button>
            </div>

            {selectedDay.list.map(assenza => {
              const c = TIPO_OKLCH[assenza.tipo]
              return (
                <div key={assenza.id} className="day-card">
                  <div className="day-card-accent" style={{ background: c.main }} />
                  <div className="day-card-body">
                    <span className="day-tag"
                      style={{ background: c.tint, color: c.text, border: `1px solid ${c.tintBorder}` }}>
                      {tipoLabel(assenza.tipo)}
                    </span>
                    <div className="day-card-row">
                      <span>Dal</span>
                      <span>{format(parseISO(assenza.data_inizio), 'd MMM yyyy', { locale: it })}</span>
                    </div>
                    <div className="day-card-row">
                      <span>Al</span>
                      <span>{format(parseISO(assenza.data_fine), 'd MMM yyyy', { locale: it })}</span>
                    </div>
                    <div className="day-card-row">
                      <span>Ore</span>
                      <span>{fmtOre(assenza)}</span>
                    </div>
                    {assenza.note && (
                      <div className="day-card-row">
                        <span>Note</span>
                        <span>{assenza.note}</span>
                      </div>
                    )}
                    <div className="day-actions">
                      <button className="btn-soft"
                        style={{ background: c.tint, color: c.text }}
                        onClick={() => { setSelectedDay(null); navigate(`/aggiungi?edit=${assenza.id}`) }}>
                        ✏️ Modifica
                      </button>
                      <button className="btn-soft"
                        style={{
                          background: 'oklch(0.97 0.03 25)',
                          color: 'oklch(0.45 0.18 25)',
                        }}
                        onClick={() => handleDelete(assenza.id)}>
                        🗑 Elimina
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
