import { useState } from 'react'
import { loadSettings, saveSettings } from '../lib/storage'
import type { UserSettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings)

  const save = (values: Partial<UserSettings>) => {
    const updated = saveSettings(values)
    setSettings(updated)
  }

  return { settings, save }
}
