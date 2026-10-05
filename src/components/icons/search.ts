import { ICONS, ICON_CATEGORIES, type IconDef } from './catalog'

/** Lowercase and strip accents so "musica" finds "música". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const CATEGORY_WORDS: Record<string, string> = {}
for (const c of ICON_CATEGORIES) for (const k of c.keys) CATEGORY_WORDS[k] = `${CATEGORY_WORDS[k] ?? ''} ${c.label} ${c.es}`

const INDEX: [IconDef, string][] = Object.values(ICONS).map((d) => [
  d,
  normalize(`${d.key.replace(/-/g, ' ')} ${d.label} ${d.tags} ${CATEGORY_WORDS[d.key] ?? ''}`),
])

/**
 * Icons matching every word of the query (prefix match per word), best first:
 * a hit on the icon's own name ranks above a hit on a tag.
 */
export function searchIcons(query: string): IconDef[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const scored: [IconDef, number][] = []
  for (const [def, hay] of INDEX) {
    const tokens = hay.split(/\s+/)
    let score = 0
    let ok = true
    for (const w of words) {
      const name = normalize(def.label).split(' ').some((t) => t.startsWith(w))
      if (name) score += 2
      else if (tokens.some((t) => t.startsWith(w))) score += 1
      else {
        ok = false
        break
      }
    }
    if (ok) scored.push([def, score])
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([d]) => d)
}

/**
 * Icons suggested for a habit name: any word of the name may match.
 * "Read 20 pages" → book icons. With `fill`, tops up with a default set.
 */
export function suggestIcons(name: string, polarity: 'build' | 'quit', limit = 7, fill = true): IconDef[] {
  const seen = new Set<string>()
  const out: IconDef[] = []
  const add = (d: IconDef | undefined) => {
    if (d && !seen.has(d.key) && out.length < limit) {
      seen.add(d.key)
      out.push(d)
    }
  }
  for (const word of normalize(name).split(/\s+/).filter((w) => w.length >= 3)) for (const d of searchIcons(word)) add(d)
  if (!fill) return out
  const defaults = polarity === 'quit'
    ? ['ban', 'cigarette-off', 'wine-off', 'candy-off', 'phone-off', 'monitor-off', 'bell-off']
    : ['leaf', 'droplet', 'book-open', 'dumbbell', 'sun', 'footprints', 'bed']
  for (const k of defaults) add(ICONS[k])
  return out
}
