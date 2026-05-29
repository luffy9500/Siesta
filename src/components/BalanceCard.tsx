import type { AbsenceType } from '../types'
import { TIPO_LABELS } from '../types'
import { TIPO_OKLCH } from '../lib/tipoColors'
import { useSettings } from '../hooks/useSettings'

interface Props {
  tipo: AbsenceType
  saldoBusta: number | null
  oreUsate: number
  orePianificate: number
}

function toGiorni(ore: number, oreG: number): string {
  const g = ore / oreG
  return g % 1 === 0 ? `${g}g` : `${g.toFixed(1)}g`
}

function fmt(ore: number, unita: 'ore' | 'giorni', oreG: number): string {
  return unita === 'giorni' ? toGiorni(ore, oreG) : `${ore}h`
}

export default function BalanceCard({ tipo, saldoBusta, oreUsate, orePianificate }: Props) {
  const { settings } = useSettings()
  const c = TIPO_OKLCH[tipo]
  const label  = settings.tipo_labels[tipo] ?? TIPO_LABELS[tipo]
  const oreG   = settings.ore_giornaliere
  const unita  = settings.unita_tipo[tipo] ?? 'ore'
  const hasData = saldoBusta !== null

  const oreDisponibili  = hasData ? Math.max(0, saldoBusta - oreUsate - orePianificate) : 0
  const sogliaAttiva    = settings.soglia_saldo_basso > 0
  const saldoBasso      = hasData && sogliaAttiva && oreDisponibili <= settings.soglia_saldo_basso

  const pctUsate       = hasData && saldoBusta! > 0 ? Math.min(100, (oreUsate / saldoBusta!) * 100) : 0
  const pctPianificate = hasData && saldoBusta! > 0 ? Math.min(100 - pctUsate, (orePianificate / saldoBusta!) * 100) : 0

  const dispColor = saldoBasso ? 'oklch(0.55 0.18 50)' : c.main

  return (
    <div className="bal-row">
      <div className="bal-accent" style={{ background: saldoBasso ? 'oklch(0.7 0.18 50)' : c.main }} />

      <div style={{ flex: 1 }}>
        <div className="bal-top">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="bal-name">{label}</span>
            {saldoBasso && <span className="bal-warn">⚠ Basso</span>}
          </div>
          {hasData && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: c.text,
              background: c.tint,
              border: `1px solid ${c.tintBorder}`,
              borderRadius: 999, padding: '1px 8px',
            }}>
              busta {fmt(saldoBusta!, unita, oreG)}
            </span>
          )}
        </div>

        {!hasData ? (
          <p style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontStyle: 'italic', margin: '4px 0' }}>
            Nessun saldo inserito
          </p>
        ) : (
          <>
            <div className="bal-disp" style={{ color: dispColor }}>
              {fmt(oreDisponibili, unita, oreG)}
              {unita === 'ore' && (
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ink-faint)', marginLeft: 6 }}>
                  {toGiorni(oreDisponibili, oreG)}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--ink-faint)', marginLeft: 4 }}>
                disponibili
              </span>
            </div>

            <div className="bal-track">
              <div className="bal-fill" style={{ width: `${pctUsate}%`, background: c.main }} />
              <div className="bal-fill" style={{ width: `${pctPianificate}%`, background: 'oklch(0.76 0.15 80)' }} />
            </div>

            <div className="bal-sub">
              <b>{fmt(oreUsate, unita, oreG)}</b> usate&nbsp;&middot;&nbsp;
              <b>{fmt(orePianificate, unita, oreG)}</b> pian.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
