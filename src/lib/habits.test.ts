import { describe, expect, it } from 'vitest'
import { addDays } from './date'
import { blocksOf, daysSinceMiss, spreadSlots, levelInfo, progressOf, statusOf, streakOf, timesOf, totalXp } from './habits'
import type { Habit, Logs } from './types'

const T = '2026-03-02' // a Monday
const ALL = [0, 1, 2, 3, 4, 5, 6]

function habit(p: Partial<Habit>): Habit {
  return {
    id: 'h', name: 'x', icon: 'leaf', color: '#000', polarity: 'build', kind: 'check',
    days: ALL, start: null, duration: 30, createdAt: addDays(T, -30), order: 0, ...p,
  }
}

describe('statusOf', () => {
  it('build check: done / pending today / missed in the past', () => {
    const h = habit({})
    expect(statusOf(h, { v: 1 }, T, T)).toBe('done')
    expect(statusOf(h, undefined, T, T)).toBe('pending')
    expect(statusOf(h, undefined, addDays(T, -1), T)).toBe('missed')
    expect(statusOf(h, { v: 0, skip: true }, addDays(T, -1), T)).toBe('skipped')
  })

  it('build count uses minimum and goal', () => {
    const h = habit({ kind: 'count', min: 4, goal: 8 })
    expect(statusOf(h, { v: 2 }, addDays(T, -1), T)).toBe('missed')
    expect(statusOf(h, { v: 2 }, T, T)).toBe('pending')
    expect(statusOf(h, { v: 4 }, T, T)).toBe('ok')
    expect(statusOf(h, { v: 9 }, T, T)).toBe('done')
  })

  it('build check done several times a day: goal = times, min still counts', () => {
    const h = habit({ goal: 3, min: 2 })
    expect(timesOf(h)).toBe(3)
    expect(statusOf(h, { v: 1 }, T, T)).toBe('pending')
    expect(statusOf(h, { v: 1 }, addDays(T, -1), T)).toBe('missed')
    expect(statusOf(h, { v: 2 }, addDays(T, -1), T)).toBe('ok')
    expect(statusOf(h, { v: 3 }, T, T)).toBe('done')
    expect(progressOf(h, { v: 1 }, T, T)).toBeCloseTo(1 / 3)
    // Without a minimum, every time is needed.
    const all = habit({ goal: 3 })
    expect(statusOf(all, { v: 2 }, addDays(T, -1), T)).toBe('missed')
    // Plain check habits and quit habits are once a day.
    expect(timesOf(habit({}))).toBe(1)
    expect(timesOf(habit({ polarity: 'quit', goal: 3 }))).toBe(1)
    expect(timesOf(habit({ kind: 'count', goal: 8 }))).toBe(1)
  })

  it('a time for each: one calendar block per time', () => {
    expect(spreadSlots(3, 8 * 60)).toEqual([480, 870, 1260]) // 8:00 · 14:30 · 21:00
    expect(spreadSlots(2, 23 * 60, 30)).toEqual([1380, 1395].map((m) => Math.min(m, 1410)))
    const h = habit({ goal: 3, start: 480, slots: [480, 870, 1260] })
    expect(blocksOf(h)).toEqual([480, 870, 1260])
    // Slots that don't match the count fall back to one block; untimed has none.
    expect(blocksOf(habit({ goal: 2, start: 480, slots: [480, 870, 1260] }))).toEqual([480])
    expect(blocksOf(habit({ goal: 3, start: null, slots: [480, 870, 1260] }))).toEqual([])
  })

  it('quit habits: clean by default, limit and target', () => {
    const c = habit({ polarity: 'quit' })
    expect(statusOf(c, undefined, addDays(T, -3), T)).toBe('done')
    expect(statusOf(c, { v: 1 }, T, T)).toBe('missed')
    const q = habit({ polarity: 'quit', kind: 'count', min: 5, goal: 0 })
    expect(statusOf(q, undefined, T, T)).toBe('done')
    expect(statusOf(q, { v: 3 }, T, T)).toBe('ok')
    expect(statusOf(q, { v: 6 }, T, T)).toBe('missed')
  })

  it('respects schedule and creation date', () => {
    const h = habit({ days: [1] })
    expect(statusOf(h, undefined, addDays(T, -1), T)).toBe('none')
    expect(statusOf(h, undefined, addDays(T, -40), T)).toBe('none')
  })
})

describe('streakOf', () => {
  it('counts consecutive wins and keeps today alive', () => {
    const h = habit({ createdAt: addDays(T, -3) })
    const logs: Logs = {}
    for (let i = 1; i <= 3; i++) logs[addDays(T, -i)] = { h: { v: 1 } }
    const s = streakOf(h, logs, T)
    expect(s.current).toBe(3)
    expect(s.recoverToday).toBe(false)
  })

  it('a miss without shields resets; flags never-miss-twice', () => {
    const h = habit({ createdAt: addDays(T, -3) })
    const logs: Logs = { [addDays(T, -3)]: { h: { v: 1 } }, [addDays(T, -2)]: { h: { v: 1 } } }
    const s = streakOf(h, logs, T)
    expect(s.current).toBe(0)
    expect(s.best).toBe(2)
    expect(s.recoverToday).toBe(true)
  })

  it('earns a shield every 7 wins and spends it on a miss', () => {
    const h = habit({ createdAt: addDays(T, -9) })
    const logs: Logs = {}
    for (let i = 9; i >= 3; i--) logs[addDays(T, -i)] = { h: { v: 1 } } // 7 wins
    // day -2 missed
    logs[addDays(T, -1)] = { h: { v: 1 } }
    const s = streakOf(h, logs, T)
    expect(s.current).toBe(8)
    expect(s.frozen.has(addDays(T, -2))).toBe(true)
    expect(s.freezes).toBe(0)
  })
})

describe('xp', () => {
  it('levels follow 0, 100, 300, 600', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: 100 })
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(299).level).toBe(2)
    expect(levelInfo(300).level).toBe(3)
  })

  it('awards clean past days for quit habits', () => {
    const h = habit({ polarity: 'quit', createdAt: addDays(T, -2) })
    // two clean past days (10 + 20 perfect) each, today not counted yet
    expect(totalXp([h], {}, T)).toBe(60)
  })
})

describe('daysSinceMiss', () => {
  it('is honest for quit habits even when a shield saved the streak', () => {
    const h = habit({ polarity: 'quit', createdAt: addDays(T, -20) })
    const logs: Logs = { [addDays(T, -4)]: { h: { v: 1 } } }
    expect(streakOf(h, logs, T).current).toBeGreaterThan(3)
    expect(daysSinceMiss(h, logs, T)).toBe(3)
  })
})
