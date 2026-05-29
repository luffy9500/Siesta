import { NavLink, useNavigate } from 'react-router-dom'

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18V12" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" /><circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

const TABS = [
  { to: '/',            label: 'Home',    Icon: IconHome,     end: true  },
  { to: '/calendario',  label: 'Cal.',    Icon: IconCalendar, end: false },
  { to: '/statistiche', label: 'Stats',   Icon: IconChart,    end: false },
  { to: '/saldi',       label: 'Saldi',   Icon: IconWallet,   end: false },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <img src="/favicon.svg" alt="" style={{ width: 26, height: 26, borderRadius: 7 }} />
          <span className="app-wordmark">siesta</span>
        </div>
        <button className="hdr-btn" onClick={() => navigate('/impostazioni')} aria-label="Impostazioni">
          <IconGear />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-nav-safe">
        {children}
      </main>

      <nav className="tab-bar">
        {TABS.slice(0, 2).map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `tab-item${isActive ? ' active-tab' : ''}`}>
            <span className="tab-icon"><Icon /></span>
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}

        <NavLink to="/aggiungi" className="tab-fab" style={{ margin: '0 4px' }} aria-label="Aggiungi">
          +
        </NavLink>

        {TABS.slice(2).map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `tab-item${isActive ? ' active-tab' : ''}`}>
            <span className="tab-icon"><Icon /></span>
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
