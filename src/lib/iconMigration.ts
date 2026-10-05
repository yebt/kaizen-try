/**
 * Up to v0.2.x habits used Kaizen's own 24 icon names (and emoji before that).
 * Since v0.3 icons are Lucide names. Some old names mean something else in
 * Lucide (old "phone" was a smartphone, Lucide "phone" is a handset), so data
 * written by older versions is migrated once, never guessed at render time.
 */
export const LEGACY_ICONS: Record<string, string> = {
  drop: 'droplet',
  book: 'book-open',
  run: 'activity',
  sun: 'sun',
  dumbbell: 'dumbbell',
  leaf: 'leaf',
  moon: 'moon',
  pen: 'pen-line',
  music: 'music',
  brain: 'brain',
  walk: 'footprints',
  stretch: 'person-standing',
  tooth: 'toothbrush',
  pill: 'pill',
  home: 'house',
  heart: 'heart',
  sugar: 'candy',
  phone: 'smartphone',
  smoke: 'cigarette',
  glass: 'beer',
  coffee: 'coffee',
  food: 'hamburger',
  game: 'gamepad-2',
  money: 'banknote',
}

const FROM_EMOJI: Record<string, string> = {
  '💧': 'droplet', '📖': 'book-open', '🏃': 'activity', '🧘': 'sun', '💪': 'dumbbell', '🥗': 'salad', '😴': 'moon', '✍️': 'pen-line',
  '🎸': 'guitar', '🧠': 'brain', '🚶': 'footprints', '🦷': 'toothbrush', '☀️': 'sun', '🌱': 'sprout', '💊': 'pill', '🧹': 'broom',
  '🚭': 'cigarette-off', '🍬': 'candy', '📱': 'smartphone', '🍺': 'beer', '☕': 'coffee', '🍔': 'hamburger', '🎮': 'gamepad-2', '💸': 'banknote',
}

/** Icon key for a habit saved by a version before v0.3. */
export function migrateLegacyIcon(icon: string | undefined, emoji: string | undefined): string {
  if (icon) return LEGACY_ICONS[icon] ?? icon
  return (emoji && FROM_EMOJI[emoji]) || 'leaf'
}
