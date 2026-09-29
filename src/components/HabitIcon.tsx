import type { Habit } from '../lib/types'

/** Line icons for habits — one stroke style, 24px grid. */
export const HABIT_ICONS: Record<string, string> = {
  drop: 'M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z',
  book: 'M4 5.5c2.7-1 5.3-1 8 .8 2.7-1.8 5.3-1.8 8-.8v13c-2.7-1-5.3-1-8 .8-2.7-1.8-5.3-1.8-8-.8zM12 6.3v13',
  run: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  sun: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  dumbbell: 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  pen: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  music: 'M9 18V5l10-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  brain: 'M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 .5V6a2 2 0 0 0-3-1.5zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 .5',
  walk: 'M13 3a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 13 3zM11 21l2-6-2.5-2.5L12 8l3 3 3 1M9 11l1.5-3M13 15l3 6',
  stretch: 'M4 20c4-2 6-6 8-10s4-6 8-6M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  tooth: 'M7 4c-2 0-3 1.8-3 4 0 3 1.5 4 2 7s1 6 2.5 6 1.5-4 3.5-4 2 4 3.5 4 2-3 2.5-6 2-4 2-7c0-2.2-1-4-3-4s-3 1-5 1-3-1-5-1z',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10l7 7',
  home: 'M4 11 12 4l8 7v9H4zM10 20v-5h4v5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  sugar: 'M5 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM5 12h14M12 5v14',
  phone: 'M9.5 3h5A2.5 2.5 0 0 1 17 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 18.5v-13A2.5 2.5 0 0 1 9.5 3zM11 17.5h2',
  smoke: 'M3 15h13v3H3zM19 15v3M16 11c0-2 2-2 2-4M20 11c0-2 2-2 2-4',
  glass: 'M7 3h10l-1.5 17a1.5 1.5 0 0 1-1.5 1.4h-4a1.5 1.5 0 0 1-1.5-1.4zM7.5 8.5h9',
  coffee: 'M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3',
  food: 'M4 11h16M5 11a7 7 0 0 1 14 0M4 15h16M5 15v1a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1',
  game: 'M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4zM8 10.5v3M6.5 12h3M16 11.5h.01M17.5 13h.01',
  money: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v.01M18 14v.01',
}

export const ICON_KEYS = Object.keys(HABIT_ICONS)

const FROM_EMOJI: Record<string, string> = {
  '💧': 'drop', '📖': 'book', '🏃': 'run', '🧘': 'sun', '💪': 'dumbbell', '🥗': 'leaf', '😴': 'moon', '✍️': 'pen',
  '🎸': 'music', '🧠': 'brain', '🚶': 'walk', '🦷': 'tooth', '☀️': 'sun', '🌱': 'leaf', '💊': 'pill', '🧹': 'home',
  '🚭': 'smoke', '🍬': 'sugar', '📱': 'phone', '🍺': 'glass', '☕': 'coffee', '🍔': 'food', '🎮': 'game', '💸': 'money',
}

export function iconKey(h: Pick<Habit, 'icon' | 'emoji'>): string {
  if (h.icon && HABIT_ICONS[h.icon]) return h.icon
  return (h.emoji && FROM_EMOJI[h.emoji]) || 'leaf'
}

export function Glyph({ name, size = 20, color = 'currentColor', stroke = 1.75 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={HABIT_ICONS[name] ?? HABIT_ICONS.leaf} />
    </svg>
  )
}

/** Tinted rounded tile with the habit's line icon. */
export function HabitIcon({ habit, size = 40 }: { habit: Pick<Habit, 'icon' | 'emoji' | 'color'>; size?: number }) {
  return (
    <span className="tile" style={{ width: size, height: size, ['--c' as string]: habit.color }}>
      <Glyph name={iconKey(habit)} size={Math.round(size / 2)} />
    </span>
  )
}
