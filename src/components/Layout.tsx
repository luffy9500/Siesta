import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',             label: 'Home',         icon: '🏠' },
  { to: '/calendario',   label: 'Calendario',   icon: '📅' },
  { to: '/aggiungi',     label: 'Aggiungi',     icon: '➕' },
  { to: '/saldi',        label: 'Saldi',        icon: '💼' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      <header className="bg-teal-700 text-white px-4 pb-3 shadow-md sticky top-0 z-10 pt-safe-top">
        <h1 className="text-xl font-bold tracking-tight">🌴 Siesta</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-nav-safe">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-10 pb-safe-bottom">
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
