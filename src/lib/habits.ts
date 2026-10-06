import { addDays, diffDays, weekday, type DateKey } from './date'
import type { Entry, Habit, Logs } from './types'

export type Status =
  | 'none' // not scheduled / before the habit existed
  | 'future'
  | 'pending' // today, not yet satisfied
  | 'skipped' // rest day, neutral
  | 'done' // goal reached (or clean for quit habits)
  | 'ok' // minimum reached (or under the limit for quit habits)
  | 'missed'

export const isSuccess = (s: Status) => s === 'done' || s === 'ok'

/** Times a day for a build "done or not" habit — 1 is the classic single tap. */
export function timesOf(h: Habit): number {
  return h.kind === 'check' && h.polarity === 'build' ? Math.max(1, Math.round(h.goal ?? 1)) : 1
}

/** Start of each calendar block: one per time when the habit has its own slots. */
export function blocksOf(h: Habit): number[] {
  if (h.start === null) return []
  const n = timesOf(h)
  return n > 1 && h.slots?.length === n ? h.slots : [h.start]
}

/** Spread N times through the day from `first` (e.g. 8:00 · 14:30 · 21:00), on 15-minute steps. */
export function spreadSlots(n: number, first: number, duration = 15): number[] {
  const last = Math.max(first, Math.min(21 * 60, 1440 - duration))
  const step = n > 1 ? Math.max(15, Math.floor((last - first) / (n - 1) / 15) * 15) : 0
  return Array.from({ length: n }, (_, i) => Math.min(first + i * step, 1440 - duration))
}

export function isScheduled(h: Habit, date: DateKey): boolean {
  return date >= h.createdAt && h.days.includes(weekday(date))
}

/** Normalized thresholds so incomplete habits still behave sensibly. */
export function thresholds(h: Habit): { min: number; goal: number } {
  if (h.polarity === 'build') {
    const goal = Math.max(h.goal ?? h.min ?? 1, 0.0001)
    const min = Math.min(h.min ?? goal, goal)
    return { min, goal }
  }
  const goal = Math.max(h.goal ?? 0, 0)
  const min = Math.max(h.min ?? goal, goal) // limit
  return { min, goal }
}

export function statusOf(h: Habit, e: Entry | undefined, date: DateKey, today: DateKey): Status {
  if (!isScheduled(h, date)) return 'none'
  if (e?.skip) return 'skipped'
  if (date > today) return 'future'
  const v = e?.v ?? 0
  const past = date < today

  if (h.polarity === 'quit') {
    if (h.kind === 'check') return v >= 1 ? 'missed' : 'done'
    const { min: limit, goal } = thresholds(h)
    if (v <= goal) return 'done'
    if (v <= limit) return 'ok'
    return 'missed'
  }

  if (h.kind === 'check' && timesOf(h) === 1) return v >= 1 ? 'done' : past ? 'missed' : 'pending'
  // Quantity, or "done" several times a day (goal = times, min = times that still count).
  const { min, goal } = thresholds(h)
  if (v >= goal) return 'done'
  if (v >= min) return 'ok'
  return past ? 'missed' : 'pending'
}

/** 0..1 fill used by rings and cards. */
export function progressOf(h: Habit, e: Entry | undefined, date: DateKey, today: DateKey): number {
  const s = statusOf(h, e, date, today)
  if (s === 'done') return 1
  if (s === 'missed' || s === 'none' || s === 'future') return 0
  if (s === 'skipped') return 1
  if (h.polarity === 'quit') return s === 'ok' ? 0.6 : 0
  return Math.min((e?.v ?? 0) / thresholds(h).goal, 1)
}

export const FREEZE_EVERY = 7
export const MAX_FREEZES = 2

export interface StreakInfo {
  current: number
  best: number
  /** Streak shields currently banked. */
  freezes: number
  /** Days where a shield absorbed a miss. */
  frozen: Set<DateKey>
  /** Missed yesterday and not yet recovered today. */
  recoverToday: boolean
}

/**
 * Forgiving streaks: every 7 consecutive successes earns a shield (max 2).
 * A missed day spends a shield instead of resetting the streak.
 * Skipped / unscheduled days are neutral, and today never breaks a streak
 * until it's over.
 */
export function streakOf(h: Habit, logs: Logs, today: DateKey): StreakInfo {
  let current = 0
  let best = 0
  let freezes = 0
  let run = 0
  let lastScored: 'success' | 'missed' | null = null
  const frozen = new Set<DateKey>()
  const span = diffDays(h.createdAt, today)
  for (let i = 0; i <= span; i++) {
    const d = addDays(h.createdAt, i)
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    if (isSuccess(s)) {
      current++
      run++
      if (run >= FREEZE_EVERY) {
        run = 0
        if (freezes < MAX_FREEZES) freezes++
      }
      lastScored = 'success'
    } else if (s === 'missed') {
      if (freezes > 0) {
        freezes--
        frozen.add(d)
      } else {
        current = 0
      }
      run = 0
      lastScored = 'missed'
    }
    best = Math.max(best, current)
  }
  const todayStatus = statusOf(h, logs[today]?.[h.id], today, today)
  return {
    current,
    best,
    freezes,
    frozen,
    recoverToday: lastScored === 'missed' && todayStatus === 'pending',
  }
}

/**
 * Habit strength (0..1), an exponentially smoothed score in the spirit of
 * Loop Habit Tracker: one miss dents it, it never drops to zero at once.
 * Reaches ~80% after a month of daily success, ~96% after two.
 */
export function strengthOf(h: Habit, logs: Logs, today: DateKey): number {
  const m = Math.pow(0.5, 1 / 13)
  let score = 0
  const span = diffDays(h.createdAt, today)
  for (let i = 0; i <= span; i++) {
    const d = addDays(h.createdAt, i)
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    if (s === 'none' || s === 'skipped' || s === 'future' || s === 'pending') continue
    if (h.polarity === 'quit' && d === today && s !== 'missed') continue
    const hit = s === 'done' ? 1 : s === 'ok' ? 0.75 : 0
    score = score * m + hit * (1 - m)
  }
  return score
}

/** Total successful days ever — never goes down, even after a lapse. */
export function totalWins(h: Habit, logs: Logs, today: DateKey): number {
  let n = 0
  const span = diffDays(h.createdAt, today)
  for (let i = 0; i <= span; i++) {
    const d = addDays(h.createdAt, i)
    if (h.polarity === 'quit' && d === today) continue
    if (isSuccess(statusOf(h, logs[d]?.[h.id], d, today))) n++
  }
  return n
}

/** Consecutive days (up to today) without a missed day — no shields applied. */
export function daysSinceMiss(h: Habit, logs: Logs, today: DateKey): number {
  let n = 0
  for (let d = today; d >= h.createdAt; d = addDays(d, -1)) {
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    if (s === 'missed') break
    if (isSuccess(s) && !(h.polarity === 'quit' && d === today)) n++
  }
  return n
}

export const MILESTONES = [3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365]

export function nextMilestone(n: number): number {
  return MILESTONES.find((m) => m > n) ?? Math.ceil((n + 1) / 100) * 100
}

export interface DaySummary {
  scheduled: Habit[]
  progress: number // 0..1 average
  successes: number
  perfect: boolean
}

export function daySummary(habits: Habit[], logs: Logs, date: DateKey, today: DateKey): DaySummary {
  const scheduled = habits.filter((h) => !h.archived && isScheduled(h, date))
  if (!scheduled.length) return { scheduled, progress: 0, successes: 0, perfect: false }
  let sum = 0
  let successes = 0
  for (const h of scheduled) {
    const e = logs[date]?.[h.id]
    sum += progressOf(h, e, date, today)
    const s = statusOf(h, e, date, today)
    if (isSuccess(s) || s === 'skipped') successes++
  }
  return {
    scheduled,
    progress: sum / scheduled.length,
    successes,
    perfect: successes === scheduled.length,
  }
}

/** Completion rate over the last `days` days (today counts only if already won). */
export function completionRate(h: Habit, logs: Logs, today: DateKey, days = 30): number | null {
  let wins = 0
  let total = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    if (s === 'none' || s === 'skipped' || s === 'future' || s === 'pending') continue
    total++
    if (isSuccess(s)) wins++
  }
  return total ? wins / total : null
}

/** Sum of logged quantity in a window ending at `end` (inclusive). */
export function totalIn(h: Habit, logs: Logs, end: DateKey, days: number): number {
  let sum = 0
  for (let i = 0; i < days; i++) sum += logs[addDays(end, -i)]?.[h.id]?.v ?? 0
  return sum
}

// ---- XP & levels -----------------------------------------------------------

export const XP_DONE = 10
export const XP_OK = 6
export const XP_PERFECT_DAY = 20

export function totalXp(habits: Habit[], logs: Logs, today: DateKey): number {
  if (!habits.length) return 0
  const first = habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), today)
  let xp = 0
  for (let d = first; d <= today; d = addDays(d, 1)) {
    for (const h of habits) {
      // Quit habits earn XP only once the day is over (a clean day is a whole day).
      if (h.polarity === 'quit' && d === today) continue
      const s = statusOf(h, logs[d]?.[h.id], d, today)
      if (s === 'done') xp += XP_DONE
      else if (s === 'ok') xp += XP_OK
    }
    if (d < today && daySummary(habits, logs, d, today).perfect) xp += XP_PERFECT_DAY
  }
  return xp
}

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000… */
export function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 1
  while (50 * (level + 1) * level <= xp) level++
  const base = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, into: xp - base, need: next - base }
}

export function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
