import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',             label: 'Home',   icon: '🏠' },
  { to: '/calendario',   label: 'Cal.',   icon: '📅' },
  { to: '/aggiungi',     label: '+',      icon: '➕' },
  { to: '/statistiche',  label: 'Stats',  icon: '📊' },
  { to: '/saldi',        label: 'Saldi',  icon: '💼' },
  { to: '/impostazioni', label: 'Imp.',   icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col max-w-lg mx-auto">
      <header className="bg-teal-600 text-white px-5 pb-3.5 shadow-md sticky top-0 z-10 pt-safe-top">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🌴</span>
          <span className="text-lg font-bold tracking-tight">Siesta</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-nav-safe">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex z-10 pb-safe-bottom">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition ${
                isActive ? 'text-teal-600 font-semibold' : 'text-gray-400 dark:text-gray-500 hover:text-teal-500'
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
