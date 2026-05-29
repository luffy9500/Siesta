import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAfter, parseISO, startOfDay, format, isBefore, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import BalanceCard from '../components/BalanceCard'
import { useSaldi } from '../hooks/useSaldi'
import { useAssenze } from '../hooks/useAssenze'
import { useSettings } from '../hooks/useSettings'
import { TIPO_OKLCH } from '../lib/tipoColors'
import type { AbsenceType } from '../types'
import { TIPO_LABELS as TIPO_LABELS_FALLBACK } from '../types'

const TIPI: AbsenceType[] = ['ferie', 'permessi', 'rol', 'malattia']

function toGiorni(ore: number, oreG: number) {
  const g = ore / oreG
  return g % 1 === 0 ? `${g}g` : `${g.toFixed(1)}g`
}

export default function DashboardPage() {
  const { getLatest } = useSaldi()
  const { assenze } = useAssenze()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const today = startOfDay(new Date())
  const oreG  = settings.ore_giornaliere

  const tipoLabel = (t: AbsenceType) => settings.tipo_labels[t] ?? TIPO_LABELS_FALLBACK[t]

  const stats = useMemo(() => {
    return TIPI.map(tipo => {
      const latest = getLatest(tipo)
      const saldoBusta = latest?.ore ?? null
      const salMese = latest ? new Date(latest.anno, latest.mese - 1, 1) : null

      const passate = assenze.filter(a =>
        a.tipo === tipo &&
        !isAfter(parseISO(a.data_fine), today) &&
        (salMese ? !isAfter(salMese, parseISO(a.data_inizio)) : true)
      )
      const future = assenze.filter(a =>
        a.tipo === tipo && isAfter(parseISO(a.data_inizio), today)
      )

      const oreUsate = passate.reduce((sum, a) => sum + a.ore, 0)
      const orePianificate = future.reduce((sum, a) => sum + a.ore, 0)

      return { tipo, saldoBusta, oreUsate, orePianificate }
    })
  }, [assenze, getLatest, today])

  const upcoming = useMemo(() =>
    [...assenze]
      .filter(a => isAfter(parseISO(a.data_inizio), today) ||
        (!isBefore(parseISO(a.data_fine), today) && !isAfter(parseISO(a.data_inizio), addDays(today, 30))))
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
      .slice(0, 4),
    [assenze, today]
  )

  const dateLabel = format(today, "EEEE d MMMM", { locale: it })

  const ferieStats = stats.find(s => s.tipo === 'ferie')!
  const altriStats = stats.filter(s => s.tipo !== 'ferie')

  const ferieBusta       = ferieStats.saldoBusta
  const ferieDisponibili = ferieBusta !== null
    ? Math.max(0, ferieBusta - ferieStats.oreUsate - ferieStats.orePianificate)
    : null
  const ferieUnita = settings.unita_tipo['ferie'] ?? 'ore'

  const fmtFerie = (ore: number) =>
    ferieUnita === 'giorni' ? toGiorni(ore, oreG) : `${ore}h`

  return (
    <div className="screen pb-nav-safe">
      {/* Greeting */}
      <div className="greet">
        <div className="greet-hi">Ciao 👋</div>
        <div className="greet-date">{dateLabel}</div>
      </div>

      {/* Hero — Ferie */}
      <div className="hero">
        <div className="hero-head">
          <div>
            <div className="hero-title">{tipoLabel('ferie')}</div>
            {ferieBusta !== null && settings.soglia_saldo_basso > 0 &&
              ferieDisponibili !== null && ferieDisponibili <= settings.soglia_saldo_basso && (
              <div className="hero-warn">⚠ Saldo basso</div>
            )}
          </div>
          <Link to="/saldi" className="hero-busta">
            {ferieBusta !== null ? `busta ${fmtFerie(ferieBusta)}` : '+ Aggiorna busta'}
          </Link>
        </div>

        <div className="hero-body">
          <div className="hero-nums">
            {ferieDisponibili !== null ? (
              <>
                <span className="hero-big">{fmtFerie(ferieDisponibili)}</span>
              </>
            ) : (
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>—</span>
            )}
          </div>

          {ferieBusta !== null && (
            <div className="hero-legend">
              <div className="hl-item">
                <div className="hl-dot" style={{ background: 'oklch(1 0 0 / 0.9)' }} />
                <span className="hl-val">{fmtFerie(ferieDisponibili!)}</span>
                <span className="hl-name">disponibili</span>
              </div>
              <div className="hl-item">
                <div className="hl-dot" style={{ background: 'oklch(1 0 0 / 0.5)' }} />
                <span className="hl-val">{fmtFerie(ferieStats.oreUsate)}</span>
                <span className="hl-name">usate</span>
              </div>
              <div className="hl-item">
                <div className="hl-dot" style={{ background: 'oklch(0.85 0.15 80 / 0.85)' }} />
                <span className="hl-val">{fmtFerie(ferieStats.orePianificate)}</span>
                <span className="hl-name">pianificate</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Altri saldi */}
      <div className="section-label">Altri saldi</div>
      <div className="bal-list">
        {altriStats.map(s => (
          <BalanceCard key={s.tipo} {...s} />
        ))}
      </div>

      {/* Prossime assenze */}
      {upcoming.length > 0 && (
        <>
          <div className="section-label">Prossime assenze</div>
          <div className="up-list">
            {upcoming.map(a => {
              const c = TIPO_OKLCH[a.tipo]
              const da = format(parseISO(a.data_inizio), 'd MMM', { locale: it })
              const al = format(parseISO(a.data_fine), 'd MMM', { locale: it })
              const unitaA = settings.unita_tipo[a.tipo] ?? 'ore'
              const valStr = unitaA === 'giorni'
                ? toGiorni(a.ore, oreG)
                : `${a.ore}h`
              return (
                <div key={a.id} className="up-item" onClick={() => navigate(`/aggiungi?edit=${a.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <div className="up-dot" style={{ background: c.main }} />
                  <div className="up-text">
                    <div className="up-title">{tipoLabel(a.tipo)}{a.note ? ` — ${a.note}` : ''}</div>
                    <div className="up-note">{da} → {al}</div>
                  </div>
                  <div className="up-meta">
                    <div className="up-date">{da}</div>
                    <div className="up-val">{valStr}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
