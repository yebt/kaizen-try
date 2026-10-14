import { describe, expect, it } from 'vitest'
import { toKey } from './date'
import { buildPlan, DEFAULT_NOTIFY, reminderTimes } from './notify'
import { DEFAULT_SETTINGS } from './store'
import type { Habit, Logs, Settings } from './types'

const ALL = [0, 1, 2, 3, 4, 5, 6]
const now = new Date(2026, 9, 14, 7, 0) // 7:00 AM
const T = toKey(now)

const habit = (p: Partial<Habit>): Habit => ({
  id: 'h', name: 'Read', icon: 'leaf', color: '#000', polarity: 'build', kind: 'check',
  days: ALL, start: null, duration: 30, createdAt: '2026-10-01', order: 0, ...p,
})
const settings = (notify: Partial<Settings['notify']> = {}, more: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS, ...more, notify: { ...DEFAULT_NOTIFY, enabled: true, ...notify },
})
const plan = (habits: Habit[], s = settings(), logs: Logs = {}, lastPhoto: string | null = T) => buildPlan({ habits, logs, settings: s, now, lastPhoto })
const todays = (p: ReturnType<typeof plan>) => p.filter((x) => toKey(x.at) === T)

describe('reminder plan', () => {
  it('is empty while reminders are off', () => {
    expect(plan([habit({})], settings({ enabled: false }))).toEqual([])
  })

  it('plans the morning and evening for two weeks, in time order with unique ids', () => {
    const p = plan([habit({})], settings({ timedLead: null }))
    expect(p.filter((x) => x.kind === 'morning')).toHaveLength(14)
    expect(p.filter((x) => x.kind === 'evening')).toHaveLength(14)
    expect(p.map((x) => x.at.getTime())).toEqual([...p.map((x) => x.at.getTime())].sort((a, b) => a - b))
    expect(new Set(p.map((x) => x.id)).size).toBe(p.length)
    expect(todays(p)[0].body).toMatch(/1 habit today/)
  })

  it('reminds timed habits at each block, minus the lead, and skips times already past', () => {
    expect(reminderTimes(habit({ start: 9 * 60 }), 15)).toEqual([8 * 60 + 45])
    expect(reminderTimes(habit({ start: 480, goal: 3, slots: [480, 870, 1260] }), 0)).toEqual([480, 870, 1260])
    expect(reminderTimes(habit({ start: 480, reminder: 'off' }), 0)).toEqual([])
    expect(reminderTimes(habit({ start: null, reminder: 600 }), 0)).toEqual([600])
    const early = habit({ id: 'e', start: 6 * 60 }) // 6:00 is before "now" (7:00)
    expect(todays(plan([early])).some((x) => x.habitId === 'e')).toBe(false)
  })

  it('drops today’s reminders for habits already done, and per-time blocks already logged', () => {
    const read = habit({ start: 21 * 60 })
    const teeth = habit({ id: 't', name: 'Brush', start: 8 * 60, goal: 3, slots: [8 * 60, 14 * 60, 21 * 60] })
    const logs: Logs = { [T]: { h: { v: 1 }, t: { v: 1 } } }
    const p = todays(plan([read, teeth], settings(), logs))
    expect(p.some((x) => x.habitId === 'h')).toBe(false)
    expect(p.filter((x) => x.habitId === 't').map((x) => x.at.getHours())).toEqual([14, 21])
    // The evening check-in still counts what's open (teeth isn't done yet).
    expect(p.find((x) => x.kind === 'evening')?.body).toMatch(/^1 left/)
  })

  it('can hide habit names, and keeps the diary reminder discreet', () => {
    const p = plan([habit({ name: 'Smoking', polarity: 'quit', reminder: 20 * 60 })], settings({ hideNames: true }, { photoReminderDays: 7 }), {}, '2026-10-01')
    const hab = p.filter((x) => x.kind === 'habit')
    expect(hab.length).toBeGreaterThan(0)
    expect(hab.every((x) => !x.title.includes('Smoking') && !x.body.includes('Smoking'))).toBe(true)
    const diary = p.find((x) => x.kind === 'diary')!
    expect(diary.body).toBe('Time for a diary check-in.')
    expect(toKey(diary.at)).toBe(T) // overdue → today
  })
})
