import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  // starts fully visible; 'logoIn' animates the logo entrance; 'out' fades the whole screen
  const [logoIn, setLogoIn] = useState(false)
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLogoIn(true), 50)   // trigger logo scale-in
    const t2 = setTimeout(() => setOut(true),    1400)  // start fade-out
    const t3 = setTimeout(() => onDone(),         1900)  // unmount
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-900 transition-opacity duration-500"
      style={{ opacity: out ? 0 : 1 }}
    >
      {/* Glow backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full bg-violet-400/10 dark:bg-violet-500/10 blur-3xl" />
      </div>

      {/* Logo */}
      <div
        className="transition-transform duration-500"
        style={{ transform: logoIn ? 'scale(1)' : 'scale(0.85)' }}
      >
        <img src="/favicon.svg" alt="Siesta" className="w-20 h-20 drop-shadow-xl" />
      </div>

      {/* App name */}
      <p className="mt-5 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        Siesta
      </p>
      <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 font-medium">
        Gestione ferie &amp; permessi
      </p>

      {/* Loader bar */}
      <div className="mt-10 w-16 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all"
          style={{
            width: logoIn ? '100%' : '0%',
            transitionDuration: logoIn ? '1200ms' : '0ms',
          }}
        />
      </div>
    </div>
  )
}
