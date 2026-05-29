import type { AbsenceType } from '../types'

const HUE: Record<AbsenceType, number> = {
  ferie:    188,
  permessi: 230,
  rol:      290,
  malattia: 20,
}

export interface TipoColorSet {
  main:        string
  dark:        string
  tint:        string
  tintBorder:  string
  text:        string
  cal:         string
}

export function tipoColor(tipo: AbsenceType): TipoColorSet {
  const h = HUE[tipo]
  return {
    main:       `oklch(0.62 0.18 ${h})`,
    dark:       `oklch(0.47 0.15 ${h})`,
    tint:       `oklch(0.96 0.05 ${h})`,
    tintBorder: `oklch(0.85 0.10 ${h})`,
    text:       `oklch(0.44 0.16 ${h})`,
    cal:        `oklch(0.82 0.12 ${h})`,
  }
}

export const TIPO_OKLCH: Record<AbsenceType, TipoColorSet> = {
  ferie:    tipoColor('ferie'),
  permessi: tipoColor('permessi'),
  rol:      tipoColor('rol'),
  malattia: tipoColor('malattia'),
}
