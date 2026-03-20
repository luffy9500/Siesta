export type AbsenceType = 'ferie' | 'permessi' | 'rol' | 'malattia'

export interface UserSettings {
  id: string
  user_id: string
  ore_giornaliere: number
  giorni_lavorativi: number[] // 0=Dom, 1=Lun, ..., 6=Sab
  created_at: string
  updated_at: string
}

export interface Saldo {
  id: string
  user_id: string
  anno: number
  mese: number // 1-12
  tipo: AbsenceType
  ore: number
  created_at: string
  updated_at: string
}

export interface Assenza {
  id: string
  user_id: string
  tipo: AbsenceType
  data_inizio: string // ISO date YYYY-MM-DD
  data_fine: string   // ISO date YYYY-MM-DD
  ore: number
  note: string | null
  created_at: string
  updated_at: string
}

export const TIPO_LABELS: Record<AbsenceType, string> = {
  ferie: 'Ferie',
  permessi: 'Permessi',
  rol: 'ROL',
  malattia: 'Malattia',
}

export const TIPO_COLORS: Record<AbsenceType, {
  bg: string; text: string; border: string
  accent: string; bar: string; pill: string; cal: string
}> = {
  ferie:    { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-400',   accent: 'bg-teal-500',   bar: 'bg-teal-500',   pill: 'bg-teal-100 text-teal-700',   cal: 'bg-teal-300'   },
  permessi: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-400',    accent: 'bg-sky-500',    bar: 'bg-sky-500',    pill: 'bg-sky-100 text-sky-700',     cal: 'bg-sky-300'    },
  rol:      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-400', accent: 'bg-violet-500', bar: 'bg-violet-500', pill: 'bg-violet-100 text-violet-700',cal: 'bg-violet-300' },
  malattia: { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-400',   accent: 'bg-rose-500',   bar: 'bg-rose-500',   pill: 'bg-rose-100 text-rose-700',   cal: 'bg-rose-300'   },
}
