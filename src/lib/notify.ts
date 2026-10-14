import { addDays, fromKey, minutesToLabel, toKey, type DateKey } from './date'
import { blocksOf, isScheduled, isSuccess, statusOf, timesOf } from './habits'
import type { Habit, Logs, NotifySettings, Settings } from './types'

export const DEFAULT_NOTIFY: NotifySettings = {
  enabled: false,
  morning: 8 * 60,
  evening: 21 * 60,
  timedLead: 0,
  diary: true,
  hideNames: false,
}

/** How far ahead reminders are scheduled; refreshed every time the app opens or data changes. */
export const HORIZON_DAYS = 14
const MAX_SCHEDULED = 120
const DIARY_AT = 20 * 60

export type ReminderKind = 'morning' | 'evening' | 'habit' | 'diary'

export interface Planned {
  id: number
  at: Date
  title: string
  body: string
  kind: ReminderKind
  habitId?: string
}

interface PlanInput {
  habits: Habit[]
  logs: Logs
  settings: Settings
  now: Date
  /** Date of the newest diary photo; null when there are none yet. */
  lastPhoto: DateKey | null
}

const atMinutes = (day: DateKey, min: number) => {
  const d = fromKey(day)
  d.setHours(Math.floor(min / 60), min % 60, 0, 0)
  return d
}

/** When a habit should remind on a day: its custom time, or its calendar blocks minus the lead. */
export function reminderTimes(h: Habit, lead: number | null): number[] {
  if (h.reminder === 'off') return []
  if (typeof h.reminder === 'number') return [h.reminder]
  if (h.start === null || lead === null) return []
  return blocksOf(h).map((m) => Math.max(0, m - lead))
}

function habitText(h: Habit, slot: number, blocks: number): { title: string; body: string } {
  if (h.polarity === 'quit') return { title: h.name, body: 'Stay on track today — you’ve got this.' }
  const times = timesOf(h)
  if (times > 1 && blocks > 1) return { title: `${h.name} · ${slot + 1} of ${times}`, body: 'Tap to check it off.' }
  if (h.kind === 'count') return { title: h.name, body: `Goal ${h.goal ?? ''} ${h.unit ?? ''}`.trim() + (h.min ? ` — even ${h.min} counts.` : '.') }
  return { title: h.name, body: h.cue ? `Cue: ${h.cue}` : 'Small step, right now.' }
}

/**
 * Every reminder for the next couple of weeks. Pure (no plugin calls), so it can be tested.
 * Today's reminders skip habits that are already done, and anything in the past.
 */
export function buildPlan({ habits, logs, settings, now, lastPhoto }: PlanInput): Planned[] {
  const n = settings.notify
  if (!n.enabled) return []
  const today = toKey(now)
  const active = habits.filter((h) => !h.archived)
  const out: Omit<Planned, 'id'>[] = []
  const name = settings.name.trim()

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = addDays(today, i)
    const scheduled = active.filter((h) => isScheduled(h, day))
    const builds = scheduled.filter((h) => h.polarity === 'build')
    const open = builds.filter((h) => {
      const s = statusOf(h, logs[day]?.[h.id], day, today)
      return !isSuccess(s) && s !== 'skipped'
    })

    if (n.morning !== null && builds.length) {
      out.push({
        at: atMinutes(day, n.morning),
        kind: 'morning',
        title: `Good morning${name ? `, ${name}` : ''}`,
        body: `${builds.length} ${builds.length === 1 ? 'habit' : 'habits'} today — start with the easiest one.`,
      })
    }

    if (n.evening !== null && builds.length) {
      const left = i === 0 ? open.length : builds.length
      if (left > 0)
        out.push({
          at: atMinutes(day, n.evening),
          kind: 'evening',
          title: 'Evening check-in',
          body: i === 0 ? `${left} left today. Log what you did — never miss twice.` : 'Log what you did today — never miss twice.',
        })
    }

    for (const h of scheduled) {
      const times = reminderTimes(h, n.timedLead)
      const logged = logs[day]?.[h.id]?.v ?? 0
      const done = isSuccess(statusOf(h, logs[day]?.[h.id], day, today)) && h.polarity === 'build'
      if (logs[day]?.[h.id]?.skip) continue
      times.forEach((m, slot) => {
        // Per-time blocks: only the times not logged yet.
        if (times.length > 1 ? slot < logged : done) return
        const text = n.hideNames ? { title: 'Habit reminder', body: 'Time for one of your habits.' } : habitText(h, slot, times.length)
        out.push({ at: atMinutes(day, m), kind: 'habit', habitId: h.id, ...text })
      })
    }
  }

  if (n.diary && settings.photoReminderDays > 0) {
    const due = lastPhoto ? addDays(lastPhoto, settings.photoReminderDays) : addDays(today, 1)
    const day = due < today ? today : due
    // Discreet on purpose: nothing about photos or bodies on the lock screen.
    if (day <= addDays(today, HORIZON_DAYS - 1)) out.push({ at: atMinutes(day, DIARY_AT), kind: 'diary', title: 'Kaizen', body: 'Time for a diary check-in.' })
  }

  return out
    .filter((p) => p.at.getTime() > now.getTime() + 30_000)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SCHEDULED)
    .map((p, i) => ({ ...p, id: i + 1 }))
}

/** "Today 9:30 PM", "Tomorrow 8:00 AM", "Thu 8:00 AM". */
export function whenLabel(at: Date, now: Date): string {
  const days = Math.round((fromKey(toKey(at)).getTime() - fromKey(toKey(now)).getTime()) / 86_400_000)
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : at.toLocaleDateString(undefined, { weekday: 'short' })
  return `${day} ${minutesToLabel(at.getHours() * 60 + at.getMinutes())}`
}
