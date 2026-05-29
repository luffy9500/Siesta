import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [logoIn, setLogoIn] = useState(false)
  const [out,    setOut]    = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLogoIn(true), 50)
    const t2 = setTimeout(() => setOut(true),    1400)
    const t3 = setTimeout(() => onDone(),         1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        transition: 'opacity 0.5s ease',
        opacity: out ? 0 : 1,
      }}
    >
      <div style={{
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        transform: logoIn ? 'scale(1)' : 'scale(0.8)',
      }}>
        <img src="/favicon.svg" alt="Siesta"
          style={{ width: 80, height: 80, borderRadius: 20, boxShadow: '0 8px 32px oklch(0 0 0 / 0.12)' }} />
      </div>

      <p style={{
        marginTop: 20,
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: '1.8rem',
        color: 'var(--ink)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        siesta
      </p>
      <p style={{
        marginTop: 6,
        fontSize: '0.8rem',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
      }}>
        Gestione ferie &amp; permessi
      </p>

      <div style={{
        marginTop: 36,
        width: 60, height: 3,
        background: 'var(--line)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--brand-500)',
          borderRadius: 999,
          width: logoIn ? '100%' : '0%',
          transition: logoIn ? 'width 1200ms ease' : 'none',
        }} />
      </div>
    </div>
  )
}
