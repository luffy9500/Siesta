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

export const TIPO_COLORS: Record<AbsenceType, { bg: string; text: string; border: string }> = {
  ferie:    { bg: 'bg-teal-100',  text: 'text-teal-800',  border: 'border-teal-400' },
  permessi: { bg: 'bg-blue-100',  text: 'text-blue-800',  border: 'border-blue-400' },
  rol:      { bg: 'bg-purple-100',text: 'text-purple-800',border: 'border-purple-400' },
  malattia: { bg: 'bg-red-100',   text: 'text-red-800',   border: 'border-red-400' },
}
