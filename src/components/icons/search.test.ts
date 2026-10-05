import { describe, expect, it } from 'vitest'
import { ICONS, ICON_CATEGORIES } from './catalog'
import { normalize, searchIcons, suggestIcons } from './search'

const keys = (q: string) => searchIcons(q).map((d) => d.key)

describe('icon catalog', () => {
  it('every category key exists in the catalog', () => {
    for (const c of ICON_CATEGORIES) for (const k of c.keys) expect(ICONS[k], `${c.id}/${k}`).toBeDefined()
  })
})

describe('searchIcons', () => {
  it('finds by English or Spanish words, ignoring accents', () => {
    expect(keys('water')).toContain('droplet')
    expect(keys('agua')).toContain('droplet')
    expect(keys('música')).toContain('music')
    expect(normalize('Música ')).toBe('musica')
  })

  it('matches word prefixes and requires every word', () => {
    expect(keys('gym')).toContain('dumbbell')
    expect(keys('no alc')).toEqual(expect.arrayContaining(['wine-off']))
    expect(keys('zzzz')).toEqual([])
  })

  it('ranks a hit on the icon name above a tag hit', () => {
    expect(keys('book')[0]).toMatch(/^book/)
  })
})

describe('suggestIcons', () => {
  it('suggests from the habit name, then fills with defaults', () => {
    const s = suggestIcons('Leer 20 páginas', 'build', 5).map((d) => d.key)
    expect(s[0]).toMatch(/book/)
    expect(s).toHaveLength(5)
    expect(new Set(s).size).toBe(5)
  })

  it('returns only real matches when fill is off', () => {
    expect(suggestIcons('Leer', 'build', 10, false).every((d) => /book|library|reading/.test(d.key + d.tags))).toBe(true)
    expect(suggestIcons('zzzz', 'build', 10, false)).toEqual([])
  })

  it('uses quit defaults for habits to leave', () => {
    expect(suggestIcons('', 'quit', 3).map((d) => d.key)).toContain('ban')
  })
})
