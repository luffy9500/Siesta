import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CalendarioPage from './pages/CalendarioPage'
import AggiungiPage from './pages/AggiungiPage'
import SaldiPage from './pages/SaldiPage'
import ImpostazioniPage from './pages/ImpostazioniPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-teal-700">
      <div className="text-center">
        <div className="text-4xl mb-3">🌴</div>
        <p className="text-sm text-gray-500">Caricamento…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/calendario" element={<PrivateRoute><CalendarioPage /></PrivateRoute>} />
        <Route path="/aggiungi" element={<PrivateRoute><AggiungiPage /></PrivateRoute>} />
        <Route path="/saldi" element={<PrivateRoute><SaldiPage /></PrivateRoute>} />
        <Route path="/impostazioni" element={<PrivateRoute><ImpostazioniPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
