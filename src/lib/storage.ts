import type { UserSettings, Saldo, Assenza } from '../types'

const KEYS = {
  settings: 'siesta_settings',
  saldi: 'siesta_saldi',
  assenze: 'siesta_assenze',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function uuid(): string {
  return crypto.randomUUID()
}

// --- Settings ---

const DEFAULT_SETTINGS: UserSettings = {
  id: 'local',
  user_id: 'local',
  ore_giornaliere: 8,
  giorni_lavorativi: [1, 2, 3, 4, 5],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function loadSettings(): UserSettings {
  return load(KEYS.settings, DEFAULT_SETTINGS)
}

export function saveSettings(values: Partial<UserSettings>): UserSettings {
  const current = loadSettings()
  const updated = { ...current, ...values, updated_at: new Date().toISOString() }
  save(KEYS.settings, updated)
  return updated
}

// --- Saldi ---

export function loadSaldi(): Saldo[] {
  return load<Saldo[]>(KEYS.saldi, [])
}

export function upsertSaldo(anno: number, mese: number, tipo: Saldo['tipo'], ore: number): Saldo[] {
  const saldi = loadSaldi()
  const idx = saldi.findIndex(s => s.anno === anno && s.mese === mese && s.tipo === tipo)
  if (idx >= 0) {
    saldi[idx] = { ...saldi[idx], ore, updated_at: new Date().toISOString() }
  } else {
    const now = new Date().toISOString()
    saldi.unshift({ id: uuid(), user_id: 'local', anno, mese, tipo, ore, created_at: now, updated_at: now })
  }
  save(KEYS.saldi, saldi)
  return saldi
}

// --- Assenze ---

export function loadAssenze(): Assenza[] {
  return load<Assenza[]>(KEYS.assenze, [])
}

export function addAssenza(values: Omit<Assenza, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Assenza[] {
  const assenze = loadAssenze()
  const now = new Date().toISOString()
  const nuova: Assenza = { id: uuid(), user_id: 'local', created_at: now, updated_at: now, ...values }
  const updated = [nuova, ...assenze]
  save(KEYS.assenze, updated)
  return updated
}

export function removeAssenza(id: string): Assenza[] {
  const updated = loadAssenze().filter(a => a.id !== id)
  save(KEYS.assenze, updated)
  return updated
}

export function updateAssenza(id: string, values: Partial<Assenza>): Assenza[] {
  const updated = loadAssenze().map(a =>
    a.id === id ? { ...a, ...values, updated_at: new Date().toISOString() } : a
  )
  save(KEYS.assenze, updated)
  return updated
}
