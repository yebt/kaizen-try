import type { DateKey } from './date'

/** build = a habit you want to do; quit = a habit you want to leave. */
export type Polarity = 'build' | 'quit'
/** check = done / not done; count = accumulative quantity with a unit. */
export type Kind = 'check' | 'count'

export interface Habit {
  id: string
  name: string
  /** Line-icon key (see HabitIcon). */
  icon?: string
  /** Legacy (v0.1): emoji identity, migrated to `icon` on load (see iconMigration). */
  emoji?: string
  color: string
  polarity: Polarity
  kind: Kind
  /** Count habits only. */
  unit?: string
  /**
   * Count habits:
   * build: minimum quantity so the day is not missed.
   * quit: the limit — going above it means the day is missed.
   * Build check habits done several times a day: how many times still count.
   */
  min?: number
  /**
   * Count habits:
   * build: target quantity (full completion).
   * quit: target ceiling (full success, e.g. 0).
   * Build check habits: times a day (unset = once). See `timesOf`.
   */
  goal?: number
  /** Scheduled weekdays, 0 = Sunday. */
  days: number[]
  /** Minutes from midnight, or null for an "anytime" habit. */
  start: number | null
  /**
   * Habits done several times a day: one start (minutes) per time, sorted,
   * so each time gets its own block on the calendar. `start` mirrors slots[0].
   * Unset = a single block holds all the times.
   */
  slots?: number[]
  /** Minutes. */
  duration: number
  /**
   * Reminder: minutes from midnight for a custom time, 'off' for none.
   * Unset = default: timed habits follow their calendar blocks, untimed get none.
   */
  reminder?: number | 'off'
  /** Identity statement: "I'm becoming someone who…" */
  why?: string
  /** Implementation intention cue: "after coffee", "at the gym". */
  cue?: string
  createdAt: DateKey
  archived?: boolean
  order: number
}

export interface Entry {
  /** check-build: 1 = done. check-quit: 1 = slipped. count: quantity. */
  v: number
  /** Planned rest / sick day — neutral, never breaks a streak. */
  skip?: boolean
}

/** logs[date][habitId] */
export type Logs = Record<DateKey, Record<string, Entry>>

export type Pose = 'front' | 'side' | 'back' | 'other'

export interface Photo {
  id: string
  date: DateKey
  pose: Pose
  note: string
  createdAt: number
  blob: Blob
}

export interface PhotoMeta {
  id: string
  date: DateKey
  pose: Pose
  note: string
  createdAt: number
}

/** 'system' follows the OS; the rest are fixed palettes (see lib/themes). */
export type Theme = 'system' | 'light' | 'dark' | 'sand' | 'sage' | 'rose' | 'ocean' | 'forest' | 'plum' | 'midnight'
export type FontStyle = 'editorial' | 'modern' | 'classic' | 'rounded' | 'readable' | 'system'

/** Salted SHA-256 of the diary PIN. A privacy curtain, not encryption. */
export interface PinLock {
  salt: string
  hash: string
}

/** Profile and preferences — travel with exports. */
export interface Settings {
  name: string
  theme: Theme
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1
  haptics: boolean
  /** Confetti and the perfect-day sheet. */
  celebrations: boolean
  /** Remind to take a progress photo after this many days; 0 = off. */
  photoReminderDays: number
  font: FontStyle
  /** Show the photo diary as a tab; otherwise it lives inside Progress. */
  diaryTab: boolean
  /** Blur photo thumbnails until you open one. */
  blurPhotos: boolean
  notify: NotifySettings
  /** Ask for a PIN to open the diary. Never exported in backups. */
  diaryPin?: PinLock
}

/** Local reminders (Settings → Notifications). Times are minutes from midnight; null = off. */
export interface NotifySettings {
  enabled: boolean
  /** "Plan your day" summary. */
  morning: number | null
  /** "Anything left?" check-in. */
  evening: number | null
  /** Minutes before a timed habit's block; null = no automatic reminders. */
  timedLead: number | null
  /** Discreet diary check-in when one is due. */
  diary: boolean
  /** Say "Habit reminder" instead of the habit's name. */
  hideNames: boolean
}
