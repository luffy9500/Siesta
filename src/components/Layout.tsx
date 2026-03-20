import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',          label: 'Home',       icon: '🏠' },
  { to: '/calendario',label: 'Calendario', icon: '📅' },
  { to: '/aggiungi',  label: 'Aggiungi',   icon: '➕' },
  { to: '/saldi',     label: 'Saldi',      icon: '💼' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-teal-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">🌴 Siesta</h1>
        <button onClick={handleSignOut} className="text-sm text-teal-200 hover:text-white transition">Esci</button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-10">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition ${
                isActive ? 'text-teal-700 font-semibold' : 'text-gray-500 hover:text-teal-600'
              }`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
