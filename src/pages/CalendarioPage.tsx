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
import type { Assenza, AbsenceType } from '../types'
import { TIPO_COLORS, TIPO_LABELS } from '../types'

const DAY_HEADERS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

function getAssenzeForDay(day: Date, assenze: Assenza[]): Assenza[] {
  return assenze.filter(a => {
    const start = parseISO(a.data_inizio)
    const end = parseISO(a.data_fine)
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
    setFiltriAttivi(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    )
  }

  const assenzeFiltrate = useMemo(() =>
    filtriAttivi.length === 0 ? assenze : assenze.filter(a => filtriAttivi.includes(a.tipo)),
    [assenze, filtriAttivi]
  )

  const days = useMemo(() => {
    const start = startOfMonth(current)
    const end = endOfMonth(current)
    const all = eachDayOfInterval({ start, end })
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
    const key = format(day, 'yyyy-MM-dd')
    const list = assenzeMap.get(key) ?? []
    if (list.length > 0) {
      setSelectedDay({ date: key, list })
    } else {
      navigate(`/aggiungi?data=${key}`)
    }
  }

  const handleDelete = (id: string) => {
    if (!selectedDay) return
    const assenza = selectedDay.list.find(a => a.id === id)
    if (!assenza) return
    if (confirm(`Eliminare questa assenza di ${tipoLabel(assenza.tipo)}?`)) {
      remove(id)
      const newList = selectedDay.list.filter(a => a.id !== id)
      if (newList.length === 0) {
        setSelectedDay(null)
      } else {
        setSelectedDay({ ...selectedDay, list: newList })
      }
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-xl text-gray-700 dark:text-gray-200">‹</button>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 capitalize">
          {format(current, 'MMMM yyyy', { locale: it })}
        </h2>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-xl text-gray-700 dark:text-gray-200">›</button>
      </div>

      {/* Legenda / filtri */}
      <div className="flex flex-wrap gap-2 mb-3">
        {TIPI.map(t => {
          const attivo = filtriAttivi.includes(t)
          const isFiltrato = filtriAttivi.length > 0 && !attivo
          return (
            <button
              key={t}
              onClick={() => toggleFiltro(t)}
              className={`text-xs px-2 py-0.5 rounded-full transition border ${
                isFiltrato
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600'
                  : `${TIPO_COLORS[t].bg} ${TIPO_COLORS[t].text} border-transparent`
              } ${attivo ? 'ring-2 ring-offset-1 ' + TIPO_COLORS[t].border : ''}`}
            >
              {tipoLabel(t)}
            </button>
          )
        })}
        {filtriAttivi.length > 0 && (
          <button
            onClick={() => setFiltriAttivi([])}
            className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
          >
            × Tutti
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const key = format(day, 'yyyy-MM-dd')
          const dayAssenze = assenzeMap.get(key) ?? []
          const inMonth = isSameMonth(day, current)

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative overflow-hidden
                ${inMonth ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100' : 'bg-gray-50 dark:bg-gray-700/40 text-gray-300 dark:text-gray-600'}
                ${isToday(day) ? 'ring-2 ring-teal-500' : ''}
                cursor-pointer hover:opacity-80 transition-opacity
              `}
            >
              {dayAssenze.length > 0 && (
                <div className="absolute inset-0 flex">
                  {dayAssenze.map((a, ai) => (
                    <div key={ai} className={`flex-1 ${TIPO_COLORS[a.tipo].cal}`} />
                  ))}
                </div>
              )}
              <span className={`relative z-10 font-semibold ${dayAssenze.length > 0 ? TIPO_COLORS[dayAssenze[0].tipo].text : ''}`}>
                {format(day, 'd')}
              </span>
              {dayAssenze.length > 1 && (
                <span className="relative z-10 text-[8px] leading-none font-bold text-white/90 bg-black/20 rounded-full px-1">
                  {dayAssenze.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom sheet: lista assenze del giorno selezionato */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                {format(parseISO(selectedDay.date), 'd MMMM yyyy', { locale: it })}
              </p>
              <button
                onClick={() => navigate(`/aggiungi?data=${selectedDay.date}`)}
                className="text-xs text-teal-600 dark:text-teal-400 font-semibold border border-teal-300 dark:border-teal-600 rounded-full px-2.5 py-1"
              >
                + Aggiungi
              </button>
            </div>
            <div className="space-y-3">
              {selectedDay.list.map(assenza => (
                <div key={assenza.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className={`h-1 ${TIPO_COLORS[assenza.tipo].accent}`} />
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[assenza.tipo].bg} ${TIPO_COLORS[assenza.tipo].text}`}>
                        {tipoLabel(assenza.tipo)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-3">
                      <div className="flex justify-between">
                        <span>Dal</span>
                        <span className="font-medium">{format(parseISO(assenza.data_inizio), 'd MMM yyyy', { locale: it })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Al</span>
                        <span className="font-medium">{format(parseISO(assenza.data_fine), 'd MMM yyyy', { locale: it })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ore</span>
                        <span className="font-medium">{assenza.ore}h</span>
                      </div>
                      {assenza.note && (
                        <div className="flex justify-between">
                          <span>Note</span>
                          <span className="font-medium">{assenza.note}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedDay(null); navigate(`/aggiungi?edit=${assenza.id}`) }}
                        className="flex-1 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold rounded-xl text-sm hover:bg-teal-100 transition"
                      >
                        ✏️ Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(assenza.id)}
                        className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-xl text-sm hover:bg-red-100 transition"
                      >
                        🗑 Elimina
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
