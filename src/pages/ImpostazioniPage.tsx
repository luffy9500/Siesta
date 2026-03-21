import { useState, useCallback } from 'react'
import { isAfter, parseISO, startOfDay, format } from 'date-fns'
import { it } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import { useAssenze } from '../hooks/useAssenze'
import { TIPO_LABELS } from '../types'
import type { AbsenceType } from '../types'
import { generateICS } from '../lib/ics'

const GIORNI = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
]

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const TIPO_EMOJI: Record<AbsenceType, string> = { ferie: '🌴', permessi: '📋', rol: '⏰', malattia: '🤒' }

function computeStats(tipo: AbsenceType, getLatest: (t: AbsenceType) => { ore: number; anno: number; mese: number } | null, assenze: ReturnType<typeof useAssenze>['assenze'], today: Date) {
  const latest = getLatest(tipo)
  if (!latest) return null
  const salMese = new Date(latest.anno, latest.mese - 1, 1)
  const usate = assenze
    .filter(a => a.tipo === tipo && !isAfter(parseISO(a.data_fine), today) && !isAfter(salMese, parseISO(a.data_inizio)))
    .reduce((s, a) => s + a.ore, 0)
  const pianificate = assenze
    .filter(a => a.tipo === tipo && isAfter(parseISO(a.data_inizio), today))
    .reduce((s, a) => s + a.ore, 0)
  const rimanenti = Math.max(0, latest.ore - usate - pianificate)
  return { busta: latest.ore, usate, pianificate, rimanenti }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ImpostazioniPage() {
  const { settings, save } = useSettings()
  const { getLatest } = useSaldi()
  const { assenze } = useAssenze()
  const [ore, setOre] = useState(settings.ore_giornaliere)
  const [giorni, setGiorni] = useState<number[]>(settings.giorni_lavorativi)
  const [saved, setSaved] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'shared'>('idle')
  const [calStatus, setCalStatus] = useState<'idle' | 'done'>('idle')
  const [xlsxStatus, setXlsxStatus] = useState<'idle' | 'done'>('idle')

  const toggleGiorno = (v: number) => {
    setGiorni(prev => prev.includes(v) ? prev.filter(g => g !== v) : [...prev, v])
  }

  const handleSave = () => {
    save({ ore_giornaliere: ore, giorni_lavorativi: giorni })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const buildExportText = useCallback(() => {
    const today = startOfDay(new Date())
    const dateLabel = format(today, "d MMMM yyyy", { locale: it })
    const sep = '─────────────────'

    const lines: string[] = [
      '🌴 Siesta — Riepilogo ferie',
      `Generato il ${dateLabel}`,
      '',
    ]

    TIPI.forEach(tipo => {
      const stats = computeStats(tipo, getLatest, assenze, today)
      lines.push(sep)
      lines.push(`${TIPO_EMOJI[tipo]} ${TIPO_LABELS[tipo].toUpperCase()}`)
      if (!stats) {
        lines.push('  • Nessun saldo inserito')
      } else {
        lines.push(`  • Saldo busta:   ${stats.busta}h`)
        lines.push(`  • Godute:        ${stats.usate}h`)
        lines.push(`  • Pianificate:   ${stats.pianificate}h`)
        lines.push(`  • Rimanenti:     ${stats.rimanenti}h`)
      }
      lines.push('')
    })

    const future = assenze
      .filter(a => isAfter(parseISO(a.data_inizio), today))
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))

    const past = assenze
      .filter(a => !isAfter(parseISO(a.data_fine), today))
      .sort((a, b) => b.data_inizio.localeCompare(a.data_inizio))
      .slice(0, 10)

    if (future.length > 0) {
      lines.push(sep)
      lines.push('📅 ASSENZE PIANIFICATE')
      future.forEach(a => {
        const da = format(parseISO(a.data_inizio), 'd MMM', { locale: it })
        const al = format(parseISO(a.data_fine), 'd MMM yyyy', { locale: it })
        lines.push(`  • ${TIPO_EMOJI[a.tipo]} ${TIPO_LABELS[a.tipo]}: ${da} → ${al} (${a.ore}h)${a.note ? ' — ' + a.note : ''}`)
      })
      lines.push('')
    }

    if (past.length > 0) {
      lines.push(sep)
      lines.push('🗂 ULTIME ASSENZE GODUTE')
      past.forEach(a => {
        const da = format(parseISO(a.data_inizio), 'd MMM', { locale: it })
        const al = format(parseISO(a.data_fine), 'd MMM yyyy', { locale: it })
        lines.push(`  • ${TIPO_EMOJI[a.tipo]} ${TIPO_LABELS[a.tipo]}: ${da} → ${al} (${a.ore}h)${a.note ? ' — ' + a.note : ''}`)
      })
    }

    return lines.join('\n')
  }, [assenze, getLatest])

  const handleExport = async () => {
    const text = buildExportText()
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Siesta – Riepilogo ferie', text })
        setExportStatus('shared')
        setTimeout(() => setExportStatus('idle'), 2500)
      } catch { /* annullato */ }
    } else {
      await navigator.clipboard.writeText(text)
      setExportStatus('copied')
      setTimeout(() => setExportStatus('idle'), 2500)
    }
  }

  const handleExportCal = async () => {
    const icsContent = generateICS(assenze)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const file = new File([blob], 'siesta-assenze.ics', { type: 'text/calendar' })
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Siesta – Assenze' }) } catch { /* annullato */ }
    } else {
      downloadBlob(blob, 'siesta-assenze.ics')
    }
    setCalStatus('done')
    setTimeout(() => setCalStatus('idle'), 2500)
  }

  const handleExportXlsx = useCallback(() => {
    const today = startOfDay(new Date())

    // Foglio 1: Riepilogo saldi
    const riepilogoRows = TIPI.map(tipo => {
      const stats = computeStats(tipo, getLatest, assenze, today)
      return {
        Tipo: TIPO_LABELS[tipo],
        'Saldo busta (h)': stats?.busta ?? '',
        'Godute (h)': stats?.usate ?? '',
        'Pianificate (h)': stats?.pianificate ?? '',
        'Rimanenti (h)': stats?.rimanenti ?? '',
      }
    })

    // Foglio 2: Dettaglio assenze
    const assenzeRows = [...assenze]
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
      .map(a => ({
        Tipo: TIPO_LABELS[a.tipo],
        Dal: format(parseISO(a.data_inizio), 'd/MM/yyyy'),
        Al: format(parseISO(a.data_fine), 'd/MM/yyyy'),
        'Ore': a.ore,
        'Giorni equiv.': +(a.ore / settings.ore_giornaliere).toFixed(2),
        Stato: isAfter(parseISO(a.data_inizio), today) ? 'Pianificata' : 'Goduta',
        Note: a.note ?? '',
      }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riepilogoRows), 'Riepilogo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assenzeRows), 'Assenze')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'siesta-assenze.xlsx')

    setXlsxStatus('done')
    setTimeout(() => setXlsxStatus('idle'), 2500)
  }, [assenze, getLatest, settings.ore_giornaliere])

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
              className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
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

        {/* Export card raggruppato */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-bold text-gray-700">Esporta dati</p>

          {/* Testo / condividi */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Riepilogo testuale con saldi e assenze</p>
            <button
              type="button"
              onClick={handleExport}
              className="w-full py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-semibold text-sm transition hover:bg-teal-100"
            >
              {exportStatus === 'copied' ? '✓ Copiato!' : exportStatus === 'shared' ? '✓ Condiviso!' : '📤 Condividi riepilogo'}
            </button>
          </div>

          {/* Excel */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">File Excel con riepilogo saldi e dettaglio assenze</p>
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={assenze.length === 0}
              className="w-full py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl font-semibold text-sm transition hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {xlsxStatus === 'done' ? '✓ Scaricato!' : '📊 Esporta Excel (.xlsx)'}
            </button>
          </div>

          {/* Calendario ICS */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Compatibile con Apple Calendar e Google Calendar</p>
            <button
              type="button"
              onClick={handleExportCal}
              disabled={assenze.length === 0}
              className="w-full py-2.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl font-semibold text-sm transition hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {calStatus === 'done' ? '✓ Esportato!' : '📅 Apri in Calendario (.ics)'}
            </button>
          </div>

          {assenze.length === 0 && (
            <p className="text-xs text-gray-400 text-center">Nessuna assenza da esportare</p>
          )}
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
