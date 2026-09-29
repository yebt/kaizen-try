import { useState } from 'react'
import { inputToMinutes, minutesToInput } from '../lib/date'
import { actions } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit } from '../lib/types'
import { Glyph, ICON_KEYS, iconKey } from './HabitIcon'
import { Sheet } from './Sheet'

/** Muted habit tints — they identify a habit; green stays reserved for "done". */
export const COLORS = ['#2f7ba3', '#7457a0', '#b24f33', '#4c7a55', '#a04c78', '#566a92', '#3f7f86', '#6b6b73']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export type Draft = Partial<Habit>

/** Smart defaults: common habits pre-filled so a new user never faces a blank form. */
export const TEMPLATES: Draft[] = [
  { name: 'Drink water', icon: 'drop', polarity: 'build', kind: 'count', unit: 'glasses', min: 4, goal: 8, color: '#2f7ba3' },
  { name: 'Read', icon: 'book', polarity: 'build', kind: 'count', unit: 'pages', min: 2, goal: 20, color: '#7457a0', start: 21 * 60 + 30, duration: 30 },
  { name: 'Meditate', icon: 'sun', polarity: 'build', kind: 'check', color: '#4c7a55', start: 6 * 60 + 30, duration: 15 },
  { name: 'Workout', icon: 'dumbbell', polarity: 'build', kind: 'count', unit: 'min', min: 10, goal: 45, color: '#b24f33', start: 7 * 60, duration: 45, days: [1, 3, 5] },
  { name: 'No sugar', icon: 'sugar', polarity: 'quit', kind: 'check', color: '#a04c78' },
  { name: 'Less phone', icon: 'phone', polarity: 'quit', kind: 'count', unit: 'hours', min: 3, goal: 1, color: '#566a92' },
  { name: 'Smoking', icon: 'smoke', polarity: 'quit', kind: 'count', unit: 'cigarettes', min: 5, goal: 0, color: '#6b6b73' },
]

interface Props {
  initial?: Draft
  onClose: () => void
}

export function HabitForm({ initial = {}, onClose }: Props) {
  const isEdit = Boolean(initial.id)
  const [h, setH] = useState<Draft>(() => ({
    name: '',
    color: COLORS[0],
    polarity: 'build',
    kind: 'check',
    days: [0, 1, 2, 3, 4, 5, 6],
    start: null,
    duration: 30,
    ...initial,
    icon: initial.icon ?? (initial.emoji ? iconKey(initial) : 'leaf'),
  }))
  const [endMode, setEndMode] = useState(true)
  const set = (patch: Draft) => setH((x) => ({ ...x, ...patch }))
  const quit = h.polarity === 'quit'
  const timed = h.start !== null && h.start !== undefined

  const toggleDay = (d: number) => {
    const days = h.days ?? []
    set({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] })
  }

  const errors: string[] = []
  if (!h.name?.trim()) errors.push('Give it a name')
  if (!h.days?.length) errors.push('Pick at least one day')
  if (h.kind === 'count') {
    if (!h.unit?.trim()) errors.push('Add a unit')
    if (h.goal === undefined || Number.isNaN(h.goal)) errors.push(quit ? 'Set a target' : 'Set a goal')
    if (h.min === undefined || Number.isNaN(h.min)) errors.push(quit ? 'Set a limit' : 'Set a minimum')
    if (!quit && h.min !== undefined && h.goal !== undefined && h.min > h.goal) errors.push('The minimum can’t exceed the goal')
    if (!quit && h.min !== undefined && h.min <= 0) errors.push('The minimum must be above 0')
    if (quit && h.min !== undefined && h.goal !== undefined && h.goal > h.min) errors.push('The target must be at or below the limit')
  }

  const save = () => {
    if (errors.length) return
    actions.saveHabit({
      ...(h as Habit),
      name: h.name!.trim(),
      emoji: undefined,
      unit: h.kind === 'count' ? h.unit?.trim() : undefined,
      min: h.kind === 'count' ? h.min : undefined,
      goal: h.kind === 'count' ? h.goal : undefined,
      start: timed ? h.start! : null,
      duration: Math.max(15, h.duration ?? 30),
      cue: h.cue?.trim() || undefined,
      why: h.why?.trim() || undefined,
    })
    toast(isEdit ? 'Habit updated' : `“${h.name!.trim()}” added — small steps, every day`)
    onClose()
  }

  const num = (v: string) => (v === '' ? undefined : Number(v))
  const switchPolarity = (polarity: 'build' | 'quit') => set({ polarity, ...(h.kind === 'count' && polarity !== h.polarity ? { min: undefined, goal: undefined } : {}) })

  return (
    <Sheet
      title={isEdit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      closeLabel="Cancel"
      actions={
        <button className="text-btn strong" onClick={save} disabled={errors.length > 0}>
          Save
        </button>
      }
    >
      <div className="stack" style={{ gap: 20 }}>
        {!isEdit && (
          <div className="chips scroll" aria-label="Quick start">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                className="chip"
                onClick={() => setH((x) => ({ ...x, days: [0, 1, 2, 3, 4, 5, 6], start: null, duration: 30, cue: undefined, why: undefined, ...t }))}
              >
                <Glyph name={t.icon!} size={15} color={t.color} />
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="segmented" role="group" aria-label="Habit direction">
          <button aria-pressed={!quit} onClick={() => switchPolarity('build')}>
            Build
          </button>
          <button aria-pressed={quit} onClick={() => switchPolarity('quit')}>
            Leave
          </button>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              value={h.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={quit ? 'e.g. Social media, sugar' : 'e.g. Read, walk, stretch'}
              autoFocus={!isEdit}
              maxLength={40}
            />
          </label>
          <div className="icon-grid" role="group" aria-label="Icon" style={{ ['--c' as string]: h.color }}>
            {ICON_KEYS.map((k) => (
              <button key={k} aria-pressed={h.icon === k} aria-label={k} onClick={() => set({ icon: k })}>
                <Glyph name={k} size={19} />
              </button>
            ))}
          </div>
          <div className="swatches" role="group" aria-label="Color">
            {COLORS.map((c) => (
              <button key={c} style={{ background: c }} aria-pressed={h.color === c} aria-label={`Color ${c}`} onClick={() => set({ color: c })} />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Tracking</span>
          <div className="segmented">
            <button aria-pressed={h.kind === 'check'} onClick={() => set({ kind: 'check' })}>
              {quit ? 'Clean or slipped' : 'Done or not'}
            </button>
            <button aria-pressed={h.kind === 'count'} onClick={() => set({ kind: 'count' })}>
              Quantity
            </button>
          </div>
          {h.kind === 'check' && (
            <span className="hint">{quit ? 'Every day counts as clean unless you log a slip.' : 'One tap marks the day as done.'}</span>
          )}
        </div>

        {h.kind === 'count' && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="grid-3">
              <label className="field">
                <span>Unit</span>
                <input className="input" value={h.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="km" maxLength={16} />
              </label>
              <label className="field">
                <span>{quit ? 'Limit' : 'Minimum'}</span>
                <input className="input mono" type="number" inputMode="decimal" min={0} value={h.min ?? ''} onChange={(e) => set({ min: num(e.target.value) })} placeholder={quit ? '5' : '2'} />
              </label>
              <label className="field">
                <span>{quit ? 'Target' : 'Goal'}</span>
                <input className="input mono" type="number" inputMode="decimal" min={0} value={h.goal ?? ''} onChange={(e) => set({ goal: num(e.target.value) })} placeholder={quit ? '0' : '5'} />
              </label>
            </div>
            <span className="hint">
              {quit
                ? 'Going over the limit misses the day. At or under the target is a full win.'
                : 'The minimum is the tiny version that still counts — hit it and the day isn’t missed.'}
            </span>
          </div>
        )}

        <div className="field">
          <span>Repeat</span>
          <div className="days-pick">
            {WEEK_ORDER.map((d) => (
              <button key={d} aria-pressed={h.days?.includes(d)} onClick={() => toggleDay(d)} aria-label={DAY_NAMES[d]}>
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: '2px 14px 14px' }}>
          <label className="switch">
            <span>
              <b style={{ fontWeight: 600 }}>Schedule a time</b>
              <br />
              <span className="xs muted">Shows on your calendar. Planning “when” makes follow-through more likely.</span>
            </span>
            <input type="checkbox" checked={timed} onChange={(e) => set({ start: e.target.checked ? 7 * 60 : null })} />
          </label>
          {timed && (
            <div className="stack" style={{ gap: 10, marginTop: 6 }}>
              <div className="grid-2">
                <label className="field">
                  <span>Starts</span>
                  <input className="input mono" type="time" step={300} value={minutesToInput(h.start!)} onChange={(e) => set({ start: inputToMinutes(e.target.value) })} />
                </label>
                {endMode ? (
                  <label className="field">
                    <span>Ends</span>
                    <input
                      className="input mono"
                      type="time"
                      step={300}
                      value={minutesToInput((h.start! + (h.duration ?? 30)) % 1440)}
                      onChange={(e) => {
                        let end = inputToMinutes(e.target.value)
                        if (end <= h.start!) end += 1440
                        set({ duration: Math.max(15, end - h.start!) })
                      }}
                    />
                  </label>
                ) : (
                  <label className="field">
                    <span>Duration (min)</span>
                    <input className="input mono" type="number" inputMode="numeric" min={15} step={5} value={h.duration ?? 30} onChange={(e) => set({ duration: Number(e.target.value) || 15 })} />
                  </label>
                )}
              </div>
              <div className="segmented sm">
                <button aria-pressed={endMode} onClick={() => setEndMode(true)}>
                  End time
                </button>
                <button aria-pressed={!endMode} onClick={() => setEndMode(false)}>
                  Duration
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="field">
          <span>Cue · when or where (optional)</span>
          <input className="input" value={h.cue ?? ''} onChange={(e) => set({ cue: e.target.value })} placeholder={quit ? 'When I feel the urge, I will…' : 'After my morning coffee'} maxLength={80} />
        </label>

        <label className="field">
          <span>Why · who are you becoming (optional)</span>
          <input className="input" value={h.why ?? ''} onChange={(e) => set({ why: e.target.value })} placeholder={quit ? 'I’m in control of my time' : 'I’m someone who reads every day'} maxLength={80} />
        </label>

        {errors.length > 0 && h.name ? <p className="small" style={{ color: 'var(--bad)' }}>{errors[0]}</p> : null}
        <button className="btn primary lg block" onClick={save} disabled={errors.length > 0}>
          {isEdit ? 'Save changes' : 'Create habit'}
        </button>
      </div>
    </Sheet>
  )
}
