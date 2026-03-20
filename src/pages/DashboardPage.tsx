import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAfter, parseISO, startOfDay } from 'date-fns'
import BalanceCard from '../components/BalanceCard'
import { useSaldi } from '../hooks/useSaldi'
import { useAssenze } from '../hooks/useAssenze'
import type { AbsenceType } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

export default function DashboardPage() {
  const { getLatest } = useSaldi()
  const { assenze } = useAssenze()
  const navigate = useNavigate()
  const today = startOfDay(new Date())

  const stats = useMemo(() => {
    return TIPI.map(tipo => {
      const latest = getLatest(tipo)
      const saldoBusta = latest?.ore ?? null
      const salMese = latest ? new Date(latest.anno, latest.mese - 1, 1) : null

      const passate = assenze.filter(a =>
        a.tipo === tipo &&
        !isAfter(parseISO(a.data_fine), today) &&
        (salMese ? !isAfter(salMese, parseISO(a.data_inizio)) : true)
      )
      const future = assenze.filter(a =>
        a.tipo === tipo && isAfter(parseISO(a.data_inizio), today)
      )

      const oreUsate = passate.reduce((sum, a) => sum + a.ore, 0)
      const orePianificate = future.reduce((sum, a) => sum + a.ore, 0)
      const oreResidue = saldoBusta !== null ? Math.max(0, saldoBusta - oreUsate) : 0

      return { tipo, saldoBusta, oreUsate, oreResidue, orePianificate }
    })
  }, [assenze, getLatest, today])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">Saldo attuale</h2>
        <button
          onClick={() => navigate('/saldi')}
          className="text-xs text-teal-700 border border-teal-600 rounded-full px-3 py-1 hover:bg-teal-50"
        >
          Aggiorna busta
        </button>
      </div>

      {stats.map(s => (
        <BalanceCard key={s.tipo} {...s} />
      ))}

      <button
        onClick={() => navigate('/aggiungi')}
        className="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 rounded-2xl transition shadow-md"
      >
        + Aggiungi assenza
      </button>
    </div>
  )
}
