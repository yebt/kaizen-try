import { describe, expect, it } from 'vitest'
import { BackupError, FORMAT, mergeData, parseBackup, summarize } from './backup'
import type { Habit } from './types'

const habit = (id: string, p: Partial<Habit> = {}): Habit => ({
  id, name: id, icon: 'leaf', color: '#2f7ba3', polarity: 'build', kind: 'check',
  days: [0, 1, 2, 3, 4, 5, 6], start: null, duration: 30, createdAt: '2026-09-01', order: 0, ...p,
})

const file = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: 'kaizen', format: FORMAT, exportedAt: '2026-09-30T10:00:00Z',
    settings: { name: 'Ana', theme: 'dark', weekStartsOn: 0, haptics: false, celebrations: true, photoReminderDays: 7 },
    habits: [habit('a'), habit('b', { kind: 'count', unit: 'km', min: 2, goal: 5 })],
    logs: { '2026-09-29': { a: { v: 1 }, b: { v: 3 } }, '2026-09-30': { a: { v: 0, skip: true } } },
    ...over,
  })

describe('parseBackup', () => {
  it('round-trips a valid backup', () => {
    const b = parseBackup(file())
    expect(b.habits.map((h) => h.id)).toEqual(['a', 'b'])
    expect(b.settings).toMatchObject({ name: 'Ana', theme: 'dark', weekStartsOn: 0, haptics: false, photoReminderDays: 7 })
    expect(summarize(b)).toMatchObject({ habits: 2, days: 2, entries: 3, photos: 0, name: 'Ana' })
  })

  it('rejects files that are not Kaizen backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup(JSON.stringify({ app: 'other' }))).toThrow(/isn’t a Kaizen backup/)
    expect(() => parseBackup(file({ format: FORMAT + 1 }))).toThrow(/newer version/)
    expect(() => parseBackup(file({ habits: [habit('a'), habit('a')] }))).toThrow(/duplicate/)
    expect(() => parseBackup(file({ habits: [{ id: 'x' }] }))).toThrow(/missing its id or name/)
  })

  it('sanitizes untrusted values', () => {
    const b = parseBackup(
      file({
        settings: { theme: 'neon', photoReminderDays: 3 },
        habits: [habit('a', { color: 'red; x', start: 5000, days: [9, 1], duration: 1 })],
        logs: { 'bad-date': { a: { v: 1 } }, '2026-09-29': { a: { v: -3 }, ghost: { v: 1 } }, '2026-09-30': { a: { v: 2 } } },
        photos: [{ id: 'p', data: 'javascript:alert(1)' }, { id: 'q', data: 'data:image/jpeg;base64,AAAA', pose: 'weird' }],
      }),
    )
    expect(b.settings.theme).toBe('system')
    expect(b.settings.photoReminderDays).toBe(14)
    expect(b.habits[0]).toMatchObject({ color: '#6b6b73', start: null, days: [1], duration: 15 })
    expect(b.logs).toEqual({ '2026-09-30': { a: { v: 2 } } })
    expect(b.photos?.map((p) => [p.id, p.pose])).toEqual([['q', 'other']])
  })
})

describe('mergeData', () => {
  it('adds new habits and days; the file wins on conflicts', () => {
    const cur = { habits: [habit('a', { name: 'Old' }), habit('c')], logs: { '2026-09-29': { a: { v: 1 }, c: { v: 1 } } } }
    const inc = { habits: [habit('a', { name: 'New' }), habit('b')], logs: { '2026-09-29': { a: { v: 0, skip: true } }, '2026-09-30': { b: { v: 1 } } } }
    const m = mergeData(cur, inc)
    expect(m.habits.map((h) => [h.id, h.name])).toEqual([['a', 'New'], ['c', 'c'], ['b', 'b']])
    expect(m.logs['2026-09-29']).toEqual({ a: { v: 0, skip: true }, c: { v: 1 } })
    expect(m.logs['2026-09-30']).toEqual({ b: { v: 1 } })
  })
})

describe('backups from older versions', () => {
  it('migrates icon names from format-1 files', () => {
    const b = parseBackup(file({ format: 1, habits: [habit('a', { icon: 'phone' }), habit('b', { icon: undefined, emoji: '📖' })] }))
    expect(b.habits.map((h) => h.icon)).toEqual(['smartphone', 'book-open'])
  })

  it('keeps icon names from current files', () => {
    const b = parseBackup(file({ habits: [habit('a', { icon: 'phone' })] }))
    expect(b.habits[0].icon).toBe('phone')
  })
})

