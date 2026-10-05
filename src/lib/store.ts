import { useSyncExternalStore } from 'react'
import { todayKey, type DateKey } from './date'
import { migrateLegacyIcon } from './iconMigration'
import type { Entry, Habit, Logs, Settings } from './types'

export interface State {
  habits: Habit[]
  logs: Logs
  /** Last day a celebration was shown, so it only fires once. */
  celebrated?: DateKey
  settings?: Partial<Settings>
  /** Shape of the saved data; 2 = Lucide icon keys (v0.3+). */
  dataVersion?: number
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  weekStartsOn: 1,
  haptics: true,
  celebrations: true,
  photoReminderDays: 14,
}

const KEY = 'kaizen:v1'
export const DATA_VERSION = 2
const empty: State = { habits: [], logs: {}, dataVersion: DATA_VERSION }

/** Bring data saved by an older version up to date. Pure, so it's testable. */
export function migrate(s: State): State {
  if ((s.dataVersion ?? 1) >= DATA_VERSION) return s
  return {
    ...s,
    habits: s.habits.map(({ emoji, ...h }) => ({ ...h, icon: migrateLegacyIcon(h.icon, emoji) })),
    dataVersion: DATA_VERSION,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed: State = { habits: [], logs: {}, ...JSON.parse(raw) }
    const next = migrate(parsed)
    if (next !== parsed) localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return empty
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full / private mode — keep working in memory */
  }
  listeners.forEach((l) => l())
}

export function getState() {
  return state
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...state.settings }
}

let settingsCache: { src: State['settings']; value: Settings } = { src: undefined, value: DEFAULT_SETTINGS }
/** Settings with defaults applied; referentially stable between changes. */
export function useSettings(): Settings {
  return useStore((s) => {
    if (s.settings !== settingsCache.src) settingsCache = { src: s.settings, value: { ...DEFAULT_SETTINGS, ...s.settings } }
    return settingsCache.value
  })
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const actions = {
  saveHabit(h: Omit<Habit, 'id' | 'createdAt' | 'order'> & Partial<Pick<Habit, 'id' | 'createdAt' | 'order'>>) {
    const exists = h.id && state.habits.some((x) => x.id === h.id)
    if (exists) {
      set({ ...state, habits: state.habits.map((x) => (x.id === h.id ? { ...x, ...h } as Habit : x)) })
      return h.id!
    }
    const habit: Habit = {
      ...h,
      id: uid(),
      createdAt: h.createdAt ?? todayKey(),
      order: state.habits.length,
    }
    set({ ...state, habits: [...state.habits, habit] })
    return habit.id
  },

  patchHabit(id: string, patch: Partial<Habit>) {
    set({ ...state, habits: state.habits.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  },

  deleteHabit(id: string) {
    const logs: Logs = {}
    for (const [d, day] of Object.entries(state.logs)) {
      const { [id]: _removed, ...rest } = day
      if (Object.keys(rest).length) logs[d] = rest
    }
    set({ ...state, habits: state.habits.filter((x) => x.id !== id), logs })
  },

  setEntry(date: DateKey, id: string, entry: Entry | null) {
    const day = { ...(state.logs[date] ?? {}) }
    if (entry && (entry.v !== 0 || entry.skip)) day[id] = entry
    else delete day[id]
    set({ ...state, logs: { ...state.logs, [date]: day } })
  },

  updateSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } })
  },

  resetAll() {
    set({ ...empty })
  },

  markCelebrated(date: DateKey) {
    set({ ...state, celebrated: date })
  },

  importState(next: State) {
    set({ ...empty, ...next, dataVersion: DATA_VERSION })
  },
}
