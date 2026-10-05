import type { Habit } from '../lib/types'
import { ICONS } from './icons/catalog'

/** Renders a catalog icon by key; unknown keys fall back to a leaf. */
export function Glyph({ name, size = 20, color = 'currentColor', stroke = 1.75 }: { name: string; size?: number; color?: string; stroke?: number }) {
  const { Icon } = ICONS[name] ?? ICONS.leaf
  return <Icon size={size} color={color} strokeWidth={stroke} absoluteStrokeWidth={false} aria-hidden />
}

/** Tinted rounded tile with the habit's line icon. */
export function HabitIcon({ habit, size = 40 }: { habit: Pick<Habit, 'icon' | 'color'>; size?: number }) {
  return (
    <span className="tile" style={{ width: size, height: size, ['--c' as string]: habit.color }}>
      <Glyph name={habit.icon ?? 'leaf'} size={Math.round(size / 2)} />
    </span>
  )
}
