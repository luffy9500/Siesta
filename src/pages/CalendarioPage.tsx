import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, parseISO, isWithinInterval,
  addMonths, subMonths, startOfDay,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { useAssenze } from '../hooks/useAssenze'
import type { Assenza, AbsenceType } from '../types'
import { TIPO_COLORS, TIPO_LABELS } from '../types'

const DAY_HEADERS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

function getAssenzeForDay(day: Date, assenze: Assenza[]): Assenza[] {
  return assenze.filter(a => {
    const start = parseISO(a.data_inizio)
    const end = parseISO(a.data_fine)
    return isWithinInterval(startOfDay(day), { start: startOfDay(start), end: startOfDay(end) })
  })
}

export default function CalendarioPage() {
  const { user } = useAuth()
  const { assenze, remove } = useAssenze(user?.id)
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<Assenza | null>(null)

  const days = useMemo(() => {
    const start = startOfMonth(current)
    const end = endOfMonth(current)
    const all = eachDayOfInterval({ start, end })
    // Monday-first: pad with nulls
    const startDow = (getDay(start) + 6) % 7 // 0=Mon
    return [...Array(startDow).fill(null), ...all]
  }, [current])

  const assenzeMap = useMemo(() => {
    const map = new Map<string, Assenza[]>()
    days.forEach(d => {
      if (!d) return
      const key = format(d, 'yyyy-MM-dd')
      map.set(key, getAssenzeForDay(d, assenze))
    })
    return map
  }, [days, assenze])

  const handleDelete = async () => {
    if (!selected) return
    if (confirm(`Eliminare questa assenza di ${TIPO_LABELS[selected.tipo]}?`)) {
      await remove(selected.id)
      setSelected(null)
    }
  }

  return (
    <div className="p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 text-xl">‹</button>
        <h2 className="text-base font-bold text-gray-800 capitalize">
          {format(current, 'MMMM yyyy', { locale: it })}
        </h2>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 text-xl">›</button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(['ferie', 'permessi', 'rol', 'malattia'] as AbsenceType[]).map(t => (
          <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[t].bg} ${TIPO_COLORS[t].text}`}>
            {TIPO_LABELS[t]}
          </span>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const key = format(day, 'yyyy-MM-dd')
          const dayAssenze = assenzeMap.get(key) ?? []
          const inMonth = isSameMonth(day, current)
          const todayClass = isToday(day) ? 'ring-2 ring-teal-500' : ''

          return (
            <button
              key={key}
              onClick={() => dayAssenze.length > 0 && setSelected(dayAssenze[0])}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative overflow-hidden
                ${inMonth ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-300'}
                ${todayClass}
                ${dayAssenze.length > 0 ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Colored stripes per assenze multiple */}
              {dayAssenze.length > 0 && (
                <div className="absolute inset-0 flex">
                  {dayAssenze.map((a, ai) => (
                    <div
                      key={ai}
                      className={`flex-1 opacity-60 ${TIPO_COLORS[a.tipo].bg}`}
                    />
                  ))}
                </div>
              )}
              <span className={`relative z-10 font-medium ${dayAssenze.length > 0 ? TIPO_COLORS[dayAssenze[0].tipo].text : ''}`}>
                {format(day, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail popup */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${TIPO_COLORS[selected.tipo].bg} ${TIPO_COLORS[selected.tipo].text}`}>
              {TIPO_LABELS[selected.tipo]}
            </div>
            <div className="space-y-2 text-sm text-gray-700 mb-6">
              <div className="flex justify-between"><span>Dal</span><span className="font-medium">{format(parseISO(selected.data_inizio), 'd MMM yyyy', { locale: it })}</span></div>
              <div className="flex justify-between"><span>Al</span><span className="font-medium">{format(parseISO(selected.data_fine), 'd MMM yyyy', { locale: it })}</span></div>
              <div className="flex justify-between"><span>Ore</span><span className="font-medium">{selected.ore}h</span></div>
              {selected.note && <div className="flex justify-between"><span>Note</span><span className="font-medium">{selected.note}</span></div>}
            </div>
            <button
              onClick={handleDelete}
              className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition"
            >
              Elimina assenza
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
