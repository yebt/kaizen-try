/** Local-date helpers. Dates are stored as 'YYYY-MM-DD' keys in local time. */

export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): DateKey {
  return toKey(new Date())
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function weekday(key: DateKey): number {
  return fromKey(key).getDay()
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000)
}

export function startOfWeek(key: DateKey, weekStartsOn = 1): DateKey {
  const wd = weekday(key)
  return addDays(key, -((wd - weekStartsOn + 7) % 7))
}

export function formatDay(key: DateKey, opts: Intl.DateTimeFormatOptions): string {
  return fromKey(key).toLocaleDateString(undefined, opts)
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: m ? '2-digit' : undefined })
}

export function minutesToInput(min: number): string {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`
}

export function inputToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
