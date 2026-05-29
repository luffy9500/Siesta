import { useState, useCallback, useRef } from 'react'
import { isAfter, parseISO, startOfDay, format } from 'date-fns'
import { it } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { useSettings } from '../hooks/useSettings'
import { useSaldi } from '../hooks/useSaldi'
import { useAssenze } from '../hooks/useAssenze'
import { TIPO_LABELS } from '../types'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType, UserSettings } from '../types'
import { generateICS } from '../lib/ics'
import { exportAllData, importAllData } from '../lib/storage'

const GIORNI = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
]

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']
const TIPO_EMOJI: Record<AbsenceType, string> = { ferie: '🌴', permessi: '📋', rol: '⏰', malattia: '🤒' }

const TEMI: { value: UserSettings['tema']; label: string }[] = [
  { value: 'auto',   label: 'Auto' },
  { value: 'chiaro', label: 'Chiaro' },
  { value: 'scuro',  label: 'Scuro'  },
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
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ImpostazioniPage() {
  const { settings, save } = useSettings()
  const { getLatest }      = useSaldi()
  const { assenze }        = useAssenze()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ore, setOre]             = useState(settings.ore_giornaliere)
  const [giorni, setGiorni]       = useState<number[]>(settings.giorni_lavorativi)
  const [soglia, setSoglia]       = useState(settings.soglia_saldo_basso)
  const [tipoLabels, setTipoLabels] = useState<Record<AbsenceType, string>>(settings.tipo_labels)
  const [unitaTipo, setUnitaTipo] = useState<Record<AbsenceType, 'ore' | 'giorni'>>(settings.unita_tipo)
  const [tema, setTema]           = useState<UserSettings['tema']>(settings.tema)
  const [saved, setSaved]         = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'shared'>('idle')
  const [calStatus, setCalStatus]   = useState<'idle' | 'done'>('idle')
  const [xlsxStatus, setXlsxStatus] = useState<'idle' | 'done'>('idle')
  const [backupStatus, setBackupStatus]   = useState<'idle' | 'done' | 'error'>('idle')
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'done' | 'error'>('idle')

  const toggleGiorno = (v: number) => {
    setGiorni(prev => prev.includes(v) ? prev.filter(g => g !== v) : [...prev, v])
  }

  const handleSave = () => {
    save({ ore_giornaliere: ore, giorni_lavorativi: giorni, soglia_saldo_basso: soglia, tipo_labels: tipoLabels, unita_tipo: unitaTipo, tema })
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
    const past   = assenze.filter(a => !isAfter(parseISO(a.data_fine), today)).sort((a, b) => b.data_inizio.localeCompare(a.data_inizio)).slice(0, 10)
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
    const url  = URL.createObjectURL(blob)
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

  return (
    <div className="screen">
      <div style={{ marginBottom: 16 }}>
        <div className="page-title">Impostazioni</div>
      </div>

      {/* Tema */}
      <div className="section-label">Aspetto</div>
      <div className="settings-group">
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="set-label">Tema</div>
          <div className="seg">
            {TEMI.map(t => (
              <button key={t.value} type="button"
                className={`seg-btn${tema === t.value ? ' active' : ''}`}
                onClick={() => { setTema(t.value); save({ tema: t.value }) }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ore per giornata */}
      <div className="section-label">Orario di lavoro</div>
      <div className="settings-group">
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div>
            <div className="set-label">Ore per giornata lavorativa</div>
            <div className="set-hint">Usato per il calcolo automatico delle ore</div>
          </div>
          <div className="stepper">
            <button type="button" className="stepper-btn"
              onClick={() => setOre(o => Math.max(1, +(o - 0.5).toFixed(1)))}
              disabled={ore <= 1}>−</button>
            <span className="stepper-val">{ore}h</span>
            <button type="button" className="stepper-btn"
              onClick={() => setOre(o => Math.min(24, +(o + 0.5).toFixed(1)))}>+</button>
          </div>
        </div>

        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div>
            <div className="set-label">Giorni lavorativi</div>
            <div className="set-hint">I giorni che contano come lavorativi</div>
          </div>
          <div className="giorni-row">
            {GIORNI.map(g => (
              <button key={g.value} type="button"
                className={`giorno-pill${giorni.includes(g.value) ? ' active' : ''}`}
                onClick={() => toggleGiorno(g.value)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Avviso saldo basso */}
      <div className="section-label">Avvisi</div>
      <div className="settings-group">
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div>
            <div className="set-label">Avviso saldo basso</div>
            <div className="set-hint">
              Evidenzia quando le ore disponibili scendono sotto questa soglia (0 = disabilitato)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min={0} max={160} step={4}
              value={soglia}
              onChange={e => setSoglia(Number(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)', minWidth: 40 }}>
              {soglia === 0 ? 'Off' : `${soglia}h`}
            </span>
          </div>
        </div>
      </div>

      {/* Tipi di assenza */}
      <div className="section-label">Tipi di assenza</div>
      <div className="settings-group">
        {TIPI.map(tipo => {
          const c = TIPO_OKLCH[tipo]
          return (
            <div key={tipo} className="set-row"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  background: c.tint, color: c.text,
                  border: `1px solid ${c.tintBorder}`,
                  borderRadius: 999, padding: '2px 9px',
                }}>
                  {TIPO_LABELS[tipo]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text"
                  value={tipoLabels[tipo]}
                  onChange={e => setTipoLabels(prev => ({ ...prev, [tipo]: e.target.value }))}
                  className="text-input"
                  style={{ flex: 1 }} />
                <div className="seg" style={{ flexShrink: 0 }}>
                  {(['ore', 'giorni'] as const).map(u => (
                    <button key={u} type="button"
                      className={`seg-btn${unitaTipo[tipo] === u ? ' active' : ''}`}
                      onClick={() => setUnitaTipo(prev => ({ ...prev, [tipo]: u }))}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Export */}
      <div className="section-label">Esporta</div>
      <div className="settings-group">
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div className="set-hint">Riepilogo testuale con saldi e assenze</div>
          <button type="button" onClick={handleExport} className="btn-export"
            style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)' }}>
            {exportStatus === 'copied' ? '✓ Copiato!' : exportStatus === 'shared' ? '✓ Condiviso!' : '📤 Condividi riepilogo'}
          </button>
        </div>

        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div className="set-hint">File Excel con riepilogo saldi e dettaglio assenze</div>
          <button type="button" onClick={handleExportXlsx} disabled={assenze.length === 0} className="btn-export"
            style={{ background: 'oklch(0.97 0.04 145)', color: 'oklch(0.4 0.14 145)', border: '1px solid oklch(0.88 0.08 145)' }}>
            {xlsxStatus === 'done' ? '✓ Scaricato!' : '📊 Esporta Excel (.xlsx)'}
          </button>
        </div>

        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div className="set-hint">Compatibile con Apple Calendar e Google Calendar</div>
          <button type="button" onClick={handleExportCal} disabled={assenze.length === 0} className="btn-export"
            style={{ background: 'oklch(0.97 0.04 230)', color: 'oklch(0.42 0.16 230)', border: '1px solid oklch(0.87 0.09 230)' }}>
            {calStatus === 'done' ? '✓ Esportato!' : '📅 Apri in Calendario (.ics)'}
          </button>
        </div>

        {assenze.length === 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', textAlign: 'center', padding: '4px 0' }}>
            Nessuna assenza da esportare
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="section-label">Backup & Ripristino</div>
      <div className="settings-group">
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div className="set-hint">Esporta tutti i tuoi dati in un file JSON</div>
          <button type="button" onClick={handleBackup} className="btn-export"
            style={{ background: 'oklch(0.97 0.04 290)', color: 'oklch(0.42 0.15 290)', border: '1px solid oklch(0.87 0.09 290)' }}>
            {backupStatus === 'done' ? '✓ Backup scaricato!' : backupStatus === 'error' ? '✗ Errore' : '💾 Scarica backup (.json)'}
          </button>
        </div>

        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-export"
            style={{ background: 'oklch(0.97 0.04 60)', color: 'oklch(0.45 0.15 60)', border: '1px solid oklch(0.87 0.09 60)' }}>
            {restoreStatus === 'done' ? '✓ Ripristino in corso…' : restoreStatus === 'error' ? '✗ File non valido' : '📂 Ripristina da backup'}
          </button>
        </div>
      </div>

      <div style={{
        background: 'oklch(0.97 0.04 80)',
        border: '1px solid oklch(0.88 0.08 80)',
        borderRadius: 14,
        padding: '10px 14px',
        fontSize: '0.73rem',
        color: 'oklch(0.46 0.12 70)',
        marginBottom: 12,
      }}>
        ⚠️ I dati sono salvati localmente sul dispositivo. Usa il backup per proteggerti dalla perdita dei dati.
      </div>

      <button onClick={handleSave} className="btn-primary">
        {saved ? '✓ Salvato!' : 'Salva impostazioni'}
      </button>

      {/* Footer */}
      <div className="app-foot">
        <img src="/favicon.svg" alt="" style={{ width: 28, height: 28, borderRadius: 7, opacity: 0.5 }} />
        <div className="foot-wordmark">siesta</div>
        <div className="foot-version">v1.0 · dati salvati localmente</div>
      </div>
    </div>
  )
}
