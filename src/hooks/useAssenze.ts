import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Assenza, AbsenceType } from '../types'

export function useAssenze(userId: string | undefined) {
  const [assenze, setAssenze] = useState<Assenza[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('assenze')
      .select('*')
      .eq('user_id', userId)
      .order('data_inizio', { ascending: false })
    setAssenze(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const add = async (values: {
    tipo: AbsenceType
    data_inizio: string
    data_fine: string
    ore: number
    note?: string
  }) => {
    if (!userId) return
    const { data } = await supabase
      .from('assenze')
      .insert({ user_id: userId, note: null, ...values })
      .select()
      .single()
    setAssenze(prev => [data, ...prev])
    return data as Assenza
  }

  const update = async (id: string, values: Partial<Assenza>) => {
    const { data } = await supabase
      .from('assenze')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    setAssenze(prev => prev.map(a => a.id === id ? data : a))
  }

  const remove = async (id: string) => {
    await supabase.from('assenze').delete().eq('id', id)
    setAssenze(prev => prev.filter(a => a.id !== id))
  }

  return { assenze, loading, add, update, remove, refetch: fetch }
}
