import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Saldo, AbsenceType } from '../types'

export function useSaldi(userId: string | undefined) {
  const [saldi, setSaldi] = useState<Saldo[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('saldi')
      .select('*')
      .eq('user_id', userId)
      .order('anno', { ascending: false })
      .order('mese', { ascending: false })
    setSaldi(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (anno: number, mese: number, tipo: AbsenceType, ore: number) => {
    if (!userId) return
    const existing = saldi.find(s => s.anno === anno && s.mese === mese && s.tipo === tipo)
    if (existing) {
      const { data } = await supabase
        .from('saldi')
        .update({ ore, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      setSaldi(prev => prev.map(s => s.id === existing.id ? data : s))
    } else {
      const { data } = await supabase
        .from('saldi')
        .insert({ user_id: userId, anno, mese, tipo, ore })
        .select()
        .single()
      setSaldi(prev => [data, ...prev])
    }
  }

  const getLatest = (tipo: AbsenceType) => {
    return saldi.filter(s => s.tipo === tipo)[0] ?? null
  }

  return { saldi, loading, upsert, getLatest, refetch: fetch }
}
