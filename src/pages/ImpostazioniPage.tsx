import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'

const GIORNI = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
]

export default function ImpostazioniPage() {
  const { settings, save } = useSettings()
  const [ore, setOre] = useState(settings.ore_giornaliere)
  const [giorni, setGiorni] = useState<number[]>(settings.giorni_lavorativi)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setOre(settings.ore_giornaliere)
    setGiorni(settings.giorni_lavorativi)
  }, [settings.ore_giornaliere, settings.giorni_lavorativi])

  const toggleGiorno = (v: number) => {
    setGiorni(prev => prev.includes(v) ? prev.filter(g => g !== v) : [...prev, v])
  }

  const handleSave = () => {
    save({ ore_giornaliere: ore, giorni_lavorativi: giorni })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-6">Impostazioni</h2>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Ore per giornata lavorativa</label>
          <p className="text-xs text-gray-500 mb-3">Usato per il calcolo automatico delle ore</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={ore}
              onChange={e => setOre(parseFloat(e.target.value))}
              className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-500">ore / giorno</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Giorni lavorativi</label>
          <p className="text-xs text-gray-500 mb-3">Seleziona i giorni che contano come lavorativi</p>
          <div className="space-y-2">
            {GIORNI.map(g => (
              <label key={g.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giorni.includes(g.value)}
                  onChange={() => toggleGiorno(g.value)}
                  className="w-4 h-4 accent-teal-600"
                />
                <span className="text-sm text-gray-700">{g.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-700 font-medium">⚠️ I dati sono salvati localmente sul dispositivo. Cancellare i dati del browser rimuoverà tutte le assenze e i saldi.</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full mt-6 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 rounded-2xl transition shadow-md"
      >
        {saved ? '✓ Salvato!' : 'Salva impostazioni'}
      </button>
    </div>
  )
}
