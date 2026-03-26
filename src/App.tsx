import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import DashboardPage from './pages/DashboardPage'
import CalendarioPage from './pages/CalendarioPage'
import AggiungiPage from './pages/AggiungiPage'
import SaldiPage from './pages/SaldiPage'
import ImpostazioniPage from './pages/ImpostazioniPage'
import StatistichePage from './pages/StatistichePage'
import { useSettings } from './hooks/useSettings'

function DarkModeManager() {
  const { settings } = useSettings()

  useEffect(() => {
    const html = document.documentElement
    let mql: MediaQueryList | null = null
    let listener: ((e: MediaQueryListEvent) => void) | null = null

    const applyDark = (dark: boolean) => {
      html.classList.toggle('dark', dark)
    }

    if (settings.tema === 'scuro') {
      applyDark(true)
    } else if (settings.tema === 'chiaro') {
      applyDark(false)
    } else {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
      applyDark(mql.matches)
      listener = (e) => applyDark(e.matches)
      mql.addEventListener('change', listener)
    }

    return () => {
      if (mql && listener) mql.removeEventListener('change', listener)
    }
  }, [settings.tema])

  return null
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  return (
    <SettingsProvider>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <BrowserRouter>
        <DarkModeManager />
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/aggiungi" element={<AggiungiPage />} />
            <Route path="/saldi" element={<SaldiPage />} />
            <Route path="/statistiche" element={<StatistichePage />} />
            <Route path="/impostazioni" element={<ImpostazioniPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SettingsProvider>
  )
}
