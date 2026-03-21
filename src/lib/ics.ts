import { addDays, parseISO, format } from 'date-fns'
import type { Assenza } from '../types'
import { TIPO_LABELS } from '../types'

const TIPO_EMOJI: Record<string, string> = {
  ferie: '🌴',
  permessi: '📋',
  rol: '⏰',
  malattia: '🤒',
}

function toICSDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

function dtstamp(): string {
  return format(new Date(), "yyyyMMdd'T'HHmmss'Z'")
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICS(assenze: Assenza[]): string {
  const stamp = dtstamp()

  const events = assenze.map(a => {
    const emoji = TIPO_EMOJI[a.tipo] ?? ''
    const label = TIPO_LABELS[a.tipo]
    const summary = escapeICS(`${emoji} ${label} (${a.ore}h)`)
    const dtend = toICSDate(format(addDays(parseISO(a.data_fine), 1), 'yyyy-MM-dd'))
    const lines = [
      'BEGIN:VEVENT',
      `UID:${a.id}@siesta`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(a.data_inizio)}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
    ]
    const desc = [
      `${a.ore} ore di ${label}`,
      a.note ? `Note: ${a.note}` : '',
    ].filter(Boolean).join('\\n')
    lines.push(`DESCRIPTION:${escapeICS(desc)}`)
    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Siesta//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}
