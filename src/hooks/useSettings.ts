import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserSettings } from '../types'

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  ore_giornaliere: 8,
  giorni_lavorativi: [1, 2, 3, 4, 5], // Lun-Ven
}

export function useSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    setSettings(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (values: Partial<typeof DEFAULT_SETTINGS>) => {
    if (!userId) return
    if (settings) {
      const { data } = await supabase
        .from('user_settings')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single()
      setSettings(data)
    } else {
      const { data } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, ...DEFAULT_SETTINGS, ...values })
        .select()
        .single()
      setSettings(data)
    }
  }

  return { settings: settings ?? { ...DEFAULT_SETTINGS, id: '', user_id: userId ?? '', created_at: '', updated_at: '' } as UserSettings, loading, save, refetch: fetch }
}
