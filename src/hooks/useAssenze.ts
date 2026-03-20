import { useState } from 'react'
import { loadAssenze, addAssenza, removeAssenza, updateAssenza } from '../lib/storage'
import type { Assenza, AbsenceType } from '../types'

export function useAssenze() {
  const [assenze, setAssenze] = useState<Assenza[]>(loadAssenze)

  const add = (values: { tipo: AbsenceType; data_inizio: string; data_fine: string; ore: number; note?: string }) => {
    const updated = addAssenza({ ...values, note: values.note ?? null })
    setAssenze(updated)
  }

  const remove = (id: string) => {
    setAssenze(removeAssenza(id))
  }

  const update = (id: string, values: Partial<Assenza>) => {
    setAssenze(updateAssenza(id, values))
  }

  return { assenze, add, remove, update }
}
