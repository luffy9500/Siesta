import { createContext, useContext, useState } from 'react'
import { loadSettings, saveSettings } from '../lib/storage'
import type { UserSettings } from '../types'

interface SettingsCtx {
  settings: UserSettings
  save: (values: Partial<UserSettings>) => void
}

const SettingsContext = createContext<SettingsCtx>({
  settings: loadSettings(),
  save: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(loadSettings)

  const save = (values: Partial<UserSettings>) => {
    const updated = saveSettings(values)
    setSettings(updated)
  }

  return (
    <SettingsContext.Provider value={{ settings, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
