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
  /** Legacy (v0.1): emoji identity, mapped to an icon on render. */
  emoji?: string
  color: string
  polarity: Polarity
  kind: Kind
  /** Count habits only. */
  unit?: string
  /**
   * Count habits only.
   * build: minimum quantity so the day is not missed.
   * quit: the limit — going above it means the day is missed.
   */
  min?: number
  /**
   * Count habits only.
   * build: target quantity (full completion).
   * quit: target ceiling (full success, e.g. 0).
   */
  goal?: number
  /** Scheduled weekdays, 0 = Sunday. */
  days: number[]
  /** Minutes from midnight, or null for an "anytime" habit. */
  start: number | null
  /** Minutes. */
  duration: number
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
