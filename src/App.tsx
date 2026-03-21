import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import CalendarioPage from './pages/CalendarioPage'
import AggiungiPage from './pages/AggiungiPage'
import SaldiPage from './pages/SaldiPage'
import ImpostazioniPage from './pages/ImpostazioniPage'
import StatistichePage from './pages/StatistichePage'

export default function App() {
  return (
    <BrowserRouter>
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
  )
}
