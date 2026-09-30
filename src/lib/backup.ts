import { todayKey } from './date'
import { clearPhotos, listPhotos, savePhoto } from './photos'
import { DEFAULT_SETTINGS, getSettings, getState, actions, type State } from './store'
import type { Entry, Habit, Logs, Photo, Pose, Settings } from './types'

/**
 * Backup file format. Plain JSON so it's portable and human-readable.
 * Bump FORMAT when the shape changes and keep parseBackup able to read older ones.
 */
export const FORMAT = 1

export interface BackupPhoto {
  id: string
  date: string
  pose: Pose
  note: string
  createdAt: number
  /** data: URL (base64 JPEG). */
  data: string
}

export interface Backup {
  app: 'kaizen'
  format: number
  exportedAt: string
  settings: Settings
  habits: Habit[]
  logs: Logs
  celebrated?: string
  photos?: BackupPhoto[]
}

export interface BackupSummary {
  habits: number
  days: number
  entries: number
  photos: number
  exportedAt: string
  name: string
}

// ---- export ---------------------------------------------------------------

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

export async function createBackup({ includePhotos }: { includePhotos: boolean }): Promise<Backup> {
  const s = getState()
  const backup: Backup = {
    app: 'kaizen',
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    habits: s.habits,
    logs: s.logs,
    celebrated: s.celebrated,
  }
  if (includePhotos) {
    const photos = await listPhotos()
    backup.photos = await Promise.all(
      photos.map(async ({ blob, ...meta }) => ({ ...meta, data: await blobToDataUrl(blob) })),
    )
  }
  return backup
}

export function backupFileName(includePhotos: boolean) {
  return `kaizen-${includePhotos ? 'full-' : ''}backup-${todayKey()}.json`
}

// ---- import ---------------------------------------------------------------

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const POSES: Pose[] = ['front', 'side', 'back', 'other']

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function cleanHabit(raw: unknown, i: number): Habit {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !raw.id || !raw.name.trim())
    throw new BackupError(`Habit #${i + 1} is missing its id or name.`)
  const days = Array.isArray(raw.days) ? raw.days.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) : []
  const start = num(raw.start)
  return {
    id: raw.id,
    name: raw.name.trim().slice(0, 60),
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
    color: typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : '#6b6b73',
    polarity: raw.polarity === 'quit' ? 'quit' : 'build',
    kind: raw.kind === 'count' ? 'count' : 'check',
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    min: num(raw.min),
    goal: num(raw.goal),
    days: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
    start: start !== undefined && start >= 0 && start < 1440 ? start : null,
    duration: Math.max(15, num(raw.duration) ?? 30),
    why: typeof raw.why === 'string' ? raw.why : undefined,
    cue: typeof raw.cue === 'string' ? raw.cue : undefined,
    createdAt: typeof raw.createdAt === 'string' && DATE_RE.test(raw.createdAt) ? raw.createdAt : todayKey(),
    archived: raw.archived === true || undefined,
    order: num(raw.order) ?? i,
  }
}

function cleanLogs(raw: unknown, ids: Set<string>): Logs {
  if (!isObj(raw)) return {}
  const logs: Logs = {}
  for (const [date, day] of Object.entries(raw)) {
    if (!DATE_RE.test(date) || !isObj(day)) continue
    const out: Record<string, Entry> = {}
    for (const [id, e] of Object.entries(day)) {
      if (!ids.has(id) || !isObj(e)) continue
      const v = num(e.v) ?? 0
      if (v < 0) continue
      out[id] = e.skip === true ? { v, skip: true } : { v }
    }
    if (Object.keys(out).length) logs[date] = out
  }
  return logs
}

function cleanSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {}
  return {
    name: typeof s.name === 'string' ? s.name.slice(0, 40) : DEFAULT_SETTINGS.name,
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    weekStartsOn: s.weekStartsOn === 0 ? 0 : 1,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
    celebrations: typeof s.celebrations === 'boolean' ? s.celebrations : DEFAULT_SETTINGS.celebrations,
    photoReminderDays: [0, 7, 14, 30].includes(s.photoReminderDays as number) ? (s.photoReminderDays as number) : DEFAULT_SETTINGS.photoReminderDays,
  }
}

function cleanPhotos(raw: unknown): BackupPhoto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Record<string, unknown> => isObj(p) && typeof p.id === 'string' && typeof p.data === 'string' && p.data.startsWith('data:image/'))
    .map((p) => ({
      id: p.id as string,
      date: typeof p.date === 'string' && DATE_RE.test(p.date) ? p.date : todayKey(),
      pose: POSES.includes(p.pose as Pose) ? (p.pose as Pose) : 'other',
      note: typeof p.note === 'string' ? p.note : '',
      createdAt: num(p.createdAt) ?? Date.now(),
      data: p.data as string,
    }))
}

/** Parse and validate untrusted file contents into a clean Backup. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('This file isn’t valid JSON. Choose a Kaizen backup (.json).')
  }
  if (!isObj(raw) || raw.app !== 'kaizen') throw new BackupError('This isn’t a Kaizen backup file.')
  const format = num(raw.format)
  if (!format || format > FORMAT) throw new BackupError('This backup was made by a newer version of Kaizen. Update the app and try again.')
  if (!Array.isArray(raw.habits)) throw new BackupError('The backup has no habits list.')
  const habits = raw.habits.map(cleanHabit)
  const ids = new Set(habits.map((h) => h.id))
  if (ids.size !== habits.length) throw new BackupError('The backup contains duplicate habits.')
  return {
    app: 'kaizen',
    format,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    settings: cleanSettings(raw.settings),
    habits,
    logs: cleanLogs(raw.logs, ids),
    celebrated: typeof raw.celebrated === 'string' ? raw.celebrated : undefined,
    photos: cleanPhotos(raw.photos),
  }
}

export function summarize(b: Backup): BackupSummary {
  const days = Object.keys(b.logs)
  return {
    habits: b.habits.length,
    days: days.length,
    entries: days.reduce((n, d) => n + Object.keys(b.logs[d]).length, 0),
    photos: b.photos?.length ?? 0,
    exportedAt: b.exportedAt,
    name: b.settings.name,
  }
}

export type ImportMode = 'merge' | 'replace'

export interface ImportOptions {
  mode: ImportMode
  settings: boolean
  photos: boolean
}

/** Pure merge of habits + logs. On conflicts the imported file wins. */
export function mergeData(cur: Pick<State, 'habits' | 'logs'>, inc: Pick<Backup, 'habits' | 'logs'>): Pick<State, 'habits' | 'logs'> {
  const byId = new Map(cur.habits.map((h) => [h.id, h]))
  for (const h of inc.habits) byId.set(h.id, { ...byId.get(h.id), ...h })
  const habits = [...byId.values()].map((h, i) => ({ ...h, order: i }))
  const logs: Logs = { ...cur.logs }
  for (const [date, day] of Object.entries(inc.logs)) logs[date] = { ...logs[date], ...day }
  return { habits, logs }
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  return res.blob()
}

export async function applyBackup(b: Backup, opts: ImportOptions) {
  const cur = getState()
  const data = opts.mode === 'replace' ? { habits: b.habits, logs: b.logs } : mergeData(cur, b)
  const settings = opts.settings ? b.settings : cur.settings
  actions.importState({
    ...data,
    settings,
    celebrated: opts.mode === 'replace' ? b.celebrated : cur.celebrated,
  })

  if (opts.photos && b.photos?.length) {
    if (opts.mode === 'replace') await clearPhotos()
    for (const p of b.photos) {
      const { data: url, ...meta } = p
      const photo: Photo = { ...meta, blob: await dataUrlToBlob(url) }
      await savePhoto(photo)
    }
  }
}
