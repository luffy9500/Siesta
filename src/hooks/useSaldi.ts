import { useState } from 'react'
import { loadSaldi, upsertSaldo } from '../lib/storage'
import type { Saldo, AbsenceType } from '../types'

export function useSaldi() {
  const [saldi, setSaldi] = useState<Saldo[]>(loadSaldi)

  const upsert = (anno: number, mese: number, tipo: AbsenceType, ore: number) => {
    const updated = upsertSaldo(anno, mese, tipo, ore)
    setSaldi(updated)
  }

  const getLatest = (tipo: AbsenceType) => {
    return saldi.filter(s => s.tipo === tipo)[0] ?? null
  }

  return { saldi, upsert, getLatest }
}
