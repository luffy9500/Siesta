import { useState, useCallback, useRef } from 'react'
import { isAfter, parseISO, startOfDay, format } from 'date-fns'
import { it } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import { useAssenze } from '../hooks/useAssenze'
import { TIPO_LABELS } from '../types'
import type { AbsenceType, UserSettings } from '../types'
import { generateICS } from '../lib/ics'
import { exportAllData, importAllData } from '../lib/storage'

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

const TEMI: { value: UserSettings['tema']; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'chiaro', label: '☀️ Chiaro' },
  { value: 'scuro', label: '🌙 Scuro' },
]

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ore, setOre] = useState(settings.ore_giornaliere)
  const [giorni, setGiorni] = useState<number[]>(settings.giorni_lavorativi)
  const [soglia, setSoglia] = useState(settings.soglia_saldo_basso)
  const [tipoLabels, setTipoLabels] = useState<Record<AbsenceType, string>>(settings.tipo_labels)
  const [tema, setTema] = useState<UserSettings['tema']>(settings.tema)
  const [saved, setSaved] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'shared'>('idle')
  const [calStatus, setCalStatus] = useState<'idle' | 'done'>('idle')
  const [xlsxStatus, setXlsxStatus] = useState<'idle' | 'done'>('idle')
  const [backupStatus, setBackupStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'done' | 'error'>('idle')

  const toggleGiorno = (v: number) => {
    setGiorni(prev => prev.includes(v) ? prev.filter(g => g !== v) : [...prev, v])
  }

  const handleSave = () => {
    save({ ore_giornaliere: ore, giorni_lavorativi: giorni, soglia_saldo_basso: soglia, tipo_labels: tipoLabels, tema })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const buildExportText = useCallback(() => {
    const today = startOfDay(new Date())
    const dateLabel = format(today, "d MMMM yyyy", { locale: it })
    const sep = '─────────────────'
    const lines: string[] = ['🌴 Siesta — Riepilogo ferie', `Generato il ${dateLabel}`, '']
    TIPI.forEach(tipo => {
      const stats = computeStats(tipo, getLatest, assenze, today)
      lines.push(sep)
      lines.push(`${TIPO_EMOJI[tipo]} ${(settings.tipo_labels[tipo] ?? TIPO_LABELS[tipo]).toUpperCase()}`)
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
    const future = assenze.filter(a => isAfter(parseISO(a.data_inizio), today)).sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
    const past = assenze.filter(a => !isAfter(parseISO(a.data_fine), today)).sort((a, b) => b.data_inizio.localeCompare(a.data_inizio)).slice(0, 10)
    if (future.length > 0) {
      lines.push(sep); lines.push('📅 ASSENZE PIANIFICATE')
      future.forEach(a => {
        const da = format(parseISO(a.data_inizio), 'd MMM', { locale: it })
        const al = format(parseISO(a.data_fine), 'd MMM yyyy', { locale: it })
        lines.push(`  • ${TIPO_EMOJI[a.tipo]} ${settings.tipo_labels[a.tipo] ?? TIPO_LABELS[a.tipo]}: ${da} → ${al} (${a.ore}h)${a.note ? ' — ' + a.note : ''}`)
      })
      lines.push('')
    }
    if (past.length > 0) {
      lines.push(sep); lines.push('🗂 ULTIME ASSENZE GODUTE')
      past.forEach(a => {
        const da = format(parseISO(a.data_inizio), 'd MMM', { locale: it })
        const al = format(parseISO(a.data_fine), 'd MMM yyyy', { locale: it })
        lines.push(`  • ${TIPO_EMOJI[a.tipo]} ${settings.tipo_labels[a.tipo] ?? TIPO_LABELS[a.tipo]}: ${da} → ${al} (${a.ore}h)${a.note ? ' — ' + a.note : ''}`)
      })
    }
    return lines.join('\n')
  }, [assenze, getLatest, settings.tipo_labels])

  const handleExport = async () => {
    const text = buildExportText()
    if (navigator.share) {
      try { await navigator.share({ title: 'Siesta – Riepilogo ferie', text }); setExportStatus('shared'); setTimeout(() => setExportStatus('idle'), 2500) } catch { /* annullato */ }
    } else {
      await navigator.clipboard.writeText(text); setExportStatus('copied'); setTimeout(() => setExportStatus('idle'), 2500)
    }
  }

  const handleExportCal = () => {
    const icsContent = generateICS(assenze)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator as Navigator & { standalone?: boolean }).standalone) {
      window.location.href = url; setTimeout(() => URL.revokeObjectURL(url), 8000)
    } else {
      const a = document.createElement('a'); a.href = url; a.download = 'siesta-assenze.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000)
    }
    setCalStatus('done'); setTimeout(() => setCalStatus('idle'), 2500)
  }

  const handleExportXlsx = useCallback(() => {
    const today = startOfDay(new Date())
    const riepilogoRows = TIPI.map(tipo => {
      const stats = computeStats(tipo, getLatest, assenze, today)
      return { Tipo: settings.tipo_labels[tipo] ?? TIPO_LABELS[tipo], 'Saldo busta (h)': stats?.busta ?? '', 'Godute (h)': stats?.usate ?? '', 'Pianificate (h)': stats?.pianificate ?? '', 'Rimanenti (h)': stats?.rimanenti ?? '' }
    })
    const assenzeRows = [...assenze].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio)).map(a => ({
      Tipo: settings.tipo_labels[a.tipo] ?? TIPO_LABELS[a.tipo],
      Dal: format(parseISO(a.data_inizio), 'd/MM/yyyy'), Al: format(parseISO(a.data_fine), 'd/MM/yyyy'),
      'Ore': a.ore, 'Giorni equiv.': +(a.ore / settings.ore_giornaliere).toFixed(2),
      Stato: isAfter(parseISO(a.data_inizio), today) ? 'Pianificata' : 'Goduta', Note: a.note ?? '',
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riepilogoRows), 'Riepilogo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assenzeRows), 'Assenze')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'siesta-assenze.xlsx')
    setXlsxStatus('done'); setTimeout(() => setXlsxStatus('idle'), 2500)
  }, [assenze, getLatest, settings])

  const handleBackup = () => {
    try {
      const json = exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      downloadBlob(blob, `siesta-backup-${format(new Date(), 'yyyy-MM-dd')}.json`)
      setBackupStatus('done'); setTimeout(() => setBackupStatus('idle'), 2500)
    } catch { setBackupStatus('error'); setTimeout(() => setBackupStatus('idle'), 3000) }
  }

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { importAllData(ev.target?.result as string); setRestoreStatus('done'); setTimeout(() => window.location.reload(), 1500) }
      catch { setRestoreStatus('error'); setTimeout(() => setRestoreStatus('idle'), 3000) }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3'
  const label = 'block text-sm font-bold text-gray-700 dark:text-gray-200 mb-0.5'
  const hint = 'text-xs text-gray-500 dark:text-gray-400 mb-2'
  const inputCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100'
  const btnExport = 'w-full py-2 rounded-lg font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="p-3">
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">Impostazioni</h2>

      <div className="space-y-3">
        {/* Tema */}
        <div className={card}>
          <label className={label}>Tema</label>
          <p className={hint}>Scegli il tema dell'app</p>
          <div className="flex gap-2">
            {TEMI.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTema(t.value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${
                  tema === t.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ore per giornata */}
        <div className={card}>
          <label className={label}>Ore per giornata lavorativa</label>
          <p className={hint}>Usato per il calcolo automatico delle ore</p>
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="24" step="0.5" value={ore}
              onChange={e => setOre(parseFloat(e.target.value))}
              className={`w-20 ${inputCls}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">ore / giorno</span>
          </div>
        </div>

        {/* Giorni lavorativi */}
        <div className={card}>
          <label className={label}>Giorni lavorativi</label>
          <p className={hint}>Seleziona i giorni che contano come lavorativi</p>
          <div className="grid grid-cols-2 gap-1">
            {GIORNI.map(g => (
              <label key={g.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input type="checkbox" checked={giorni.includes(g.value)}
                  onChange={() => toggleGiorno(g.value)}
                  className="w-4 h-4 accent-teal-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{g.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Avviso saldo basso */}
        <div className={card}>
          <label className={label}>Avviso saldo basso</label>
          <p className={hint}>Evidenzia le card quando le ore disponibili scendono sotto questa soglia (0 = disabilitato)</p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="200" step="0.5" value={soglia}
              onChange={e => setSoglia(parseFloat(e.target.value) || 0)}
              className={`w-20 ${inputCls}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">ore</span>
          </div>
        </div>

        {/* Etichette tipi */}
        <div className={card}>
          <label className={label}>Nomi tipi assenza</label>
          <p className={hint}>Personalizza le etichette dei tipi di assenza</p>
          <div className="space-y-1.5">
            {TIPI.map(tipo => (
              <div key={tipo} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">{TIPO_LABELS[tipo]}</span>
                <input type="text" value={tipoLabels[tipo]}
                  onChange={e => setTipoLabels(prev => ({ ...prev, [tipo]: e.target.value }))}
                  className={`flex-1 ${inputCls}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className={`${card} space-y-2`}>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Esporta dati</p>

          <div>
            <p className={hint}>Riepilogo testuale con saldi e assenze</p>
            <button type="button" onClick={handleExport}
              className={`${btnExport} bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 hover:bg-teal-100`}>
              {exportStatus === 'copied' ? '✓ Copiato!' : exportStatus === 'shared' ? '✓ Condiviso!' : '📤 Condividi riepilogo'}
            </button>
          </div>

          <div>
            <p className={hint}>File Excel con riepilogo saldi e dettaglio assenze</p>
            <button type="button" onClick={handleExportXlsx} disabled={assenze.length === 0}
              className={`${btnExport} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 hover:bg-green-100`}>
              {xlsxStatus === 'done' ? '✓ Scaricato!' : '📊 Esporta Excel (.xlsx)'}
            </button>
          </div>

          <div>
            <p className={hint}>Compatibile con Apple Calendar e Google Calendar</p>
            <button type="button" onClick={handleExportCal} disabled={assenze.length === 0}
              className={`${btnExport} bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 hover:bg-sky-100`}>
              {calStatus === 'done' ? '✓ Esportato!' : '📅 Apri in Calendario (.ics)'}
            </button>
          </div>

          {assenze.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Nessuna assenza da esportare</p>
          )}
        </div>

        {/* Backup / Restore */}
        <div className={`${card} space-y-2`}>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Backup & Ripristino</p>
          <p className={hint}>Esporta tutti i tuoi dati in un file JSON e reimportali in caso di necessità.</p>

          <button type="button" onClick={handleBackup}
            className={`${btnExport} bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-100`}>
            {backupStatus === 'done' ? '✓ Backup scaricato!' : backupStatus === 'error' ? '✗ Errore' : '💾 Scarica backup (.json)'}
          </button>

          <div>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={`${btnExport} bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 hover:bg-orange-100`}>
              {restoreStatus === 'done' ? '✓ Ripristino in corso…' : restoreStatus === 'error' ? '✗ File non valido' : '📂 Ripristina da backup'}
            </button>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">⚠️ I dati sono salvati localmente sul dispositivo. Usa il backup per proteggerti dalla perdita dei dati.</p>
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full mt-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl transition shadow-md">
        {saved ? '✓ Salvato!' : 'Salva impostazioni'}
      </button>
    </div>
  )
}
