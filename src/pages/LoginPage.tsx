import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Controlla la tua email per confermare la registrazione.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🌴</div>
          <h1 className="text-2xl font-bold text-teal-800">Siesta</h1>
          <p className="text-gray-500 text-sm mt-1">Gestione ferie e permessi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="tuaemail@esempio.it"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}
          {message && <p className="text-green-700 text-sm bg-green-50 rounded-lg p-2">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Attendere…' : isRegister ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        <button
          onClick={() => { setIsRegister(!isRegister); setError(null); setMessage(null) }}
          className="w-full mt-4 text-sm text-teal-700 hover:text-teal-900 text-center"
        >
          {isRegister ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
        </button>
      </div>
    </div>
  )
}
