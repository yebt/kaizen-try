import { confetti } from '../components/Confetti'
import { haptic } from './feedback'
import { MILESTONES, statusOf, streakOf, thresholds, timesOf, isSuccess } from './habits'
import { actions, getState } from './store'
import { toast } from './toast'
import type { DateKey } from './date'
import { todayKey } from './date'
import type { Entry, Habit } from './types'

/** Sensible +/- step for a count habit. */
export function stepOf(h: Habit): number {
  const { goal, min } = thresholds(h)
  const ref = Math.max(goal, min)
  return ref >= 60 ? 10 : ref >= 30 ? 5 : 1
}

/** Write an entry and give feedback proportional to what just happened. */
export function writeEntry(h: Habit, date: DateKey, entry: Entry | null) {
  const today = todayKey()
  const before = getState()
  const prevEntry = before.logs[date]?.[h.id]
  const prevStatus = statusOf(h, prevEntry, date, today)
  const prevStreak = streakOf(h, before.logs, today).current

  actions.setEntry(date, h.id, entry)

  const after = getState()
  const status = statusOf(h, after.logs[date]?.[h.id], date, today)
  const streak = streakOf(h, after.logs, today).current

  if (!isSuccess(prevStatus) && isSuccess(status)) {
    haptic(status === 'done' ? [10, 40, 18] : 12)
    if (streak > prevStreak && MILESTONES.includes(streak) && h.polarity === 'build') {
      confetti(90)
      toast(`${streak}-day streak on ${h.name}. ${streak >= 66 ? 'This is who you are now.' : 'Keep the chain going.'}`)
    }
  } else if (status === 'missed' && prevStatus !== 'missed' && h.polarity === 'quit') {
    haptic(20)
    toast('Logged. A lapse isn’t a relapse — your progress still counts.', () => actions.setEntry(date, h.id, prevEntry ?? null), 6000)
  }
}

/**
 * The check button: a single tap for once-a-day habits; for "3 times a day"
 * each tap logs one more time (with Undo) until the day is complete.
 * Returns false when there's nothing left to add (the caller can offer to edit).
 */
export function tapCheck(h: Habit, date: DateKey): boolean {
  const n = timesOf(h)
  if (n === 1) {
    toggleCheck(h, date)
    return true
  }
  const prev = getState().logs[date]?.[h.id]
  const v = prev?.v ?? 0
  if (v >= n) return false
  writeEntry(h, date, { v: v + 1 })
  const { min } = thresholds(h)
  const left = n - v - 1
  if (left > 0) {
    haptic(8)
    const note = v + 1 === min ? ' — the day counts' : left === 1 ? ' — one more to go' : ''
    toast(`${h.name} · ${v + 1} of ${n}${note}`, () => actions.setEntry(date, h.id, prev ?? null), 3000)
  }
  return true
}

/** Set how many times a multi-times habit was done (0 clears the day). */
export function setTimes(h: Habit, date: DateKey, times: number) {
  const n = Math.max(0, Math.min(timesOf(h), Math.round(times)))
  const skip = getState().logs[date]?.[h.id]?.skip
  writeEntry(h, date, n || skip ? { v: n, ...(skip ? { skip } : {}) } : null)
}

export function toggleCheck(h: Habit, date: DateKey) {
  const cur = getState().logs[date]?.[h.id]
  writeEntry(h, date, cur?.v ? null : { v: 1 })
}

export function addQty(h: Habit, date: DateKey, delta: number) {
  const cur = getState().logs[date]?.[h.id]?.v ?? 0
  const v = Math.max(0, Math.round((cur + delta) * 100) / 100)
  writeEntry(h, date, v ? { v } : null)
}

export function setSkip(h: Habit, date: DateKey, skip: boolean) {
  const prev = getState().logs[date]?.[h.id]
  actions.setEntry(date, h.id, skip ? { v: prev?.v ?? 0, skip: true } : prev?.v ? { v: prev.v } : null)
  if (skip) toast('Rest day — your streak is safe.', () => actions.setEntry(date, h.id, prev ?? null))
}
