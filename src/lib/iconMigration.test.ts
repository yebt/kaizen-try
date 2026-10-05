import { describe, expect, it } from 'vitest'
import { ICONS } from '../components/icons/catalog'
import { LEGACY_ICONS, migrateLegacyIcon } from './iconMigration'
import { migrate } from './store'
import type { Habit } from './types'

const habit = (p: Partial<Habit>): Habit => ({
  id: 'h', name: 'x', color: '#000000', polarity: 'build', kind: 'check',
  days: [0, 1, 2, 3, 4, 5, 6], start: null, duration: 30, createdAt: '2026-09-01', order: 0, ...p,
})

describe('legacy icon migration', () => {
  it('maps every old icon name to an icon that exists', () => {
    for (const [old, now] of Object.entries(LEGACY_ICONS)) expect(ICONS[now], `${old} -> ${now}`).toBeDefined()
  })

  it('keeps meanings where names collide with Lucide', () => {
    expect(migrateLegacyIcon('phone', undefined)).toBe('smartphone')
    expect(migrateLegacyIcon('book', undefined)).toBe('book-open')
    expect(migrateLegacyIcon(undefined, '🍺')).toBe('beer')
    expect(migrateLegacyIcon(undefined, undefined)).toBe('leaf')
  })

  it('migrates saved data once and drops emoji', () => {
    const old = { habits: [habit({ icon: 'phone' }), habit({ id: 'e', emoji: '💧' })], logs: {} }
    const next = migrate(old)
    expect(next.habits.map((h) => h.icon)).toEqual(['smartphone', 'droplet'])
    expect(next.habits[1].emoji).toBeUndefined()
    expect(next.dataVersion).toBe(2)
    // Already migrated: untouched, so a new "phone" (handset) stays a handset.
    const again = migrate({ ...next, habits: [habit({ icon: 'phone' })] })
    expect(again.habits[0].icon).toBe('phone')
  })
})
