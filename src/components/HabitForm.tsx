import { useState } from 'react'
import { inputToMinutes, minutesToInput } from '../lib/date'
import { actions } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit } from '../lib/types'
import { Sheet } from './Sheet'

export const COLORS = ['#e8622c', '#e5484d', '#d6409f', '#8e4ec6', '#3e63dd', '#0d9fb8', '#12a594', '#46a758', '#c98a07', '#6f6e77']
const EMOJIS = ['💧', '📖', '🏃', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '🧠', '🚶', '🦷', '☀️', '🌱', '💊', '🧹', '🚭', '🍬', '📱', '🍺', '☕', '🍔', '🎮', '💸']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export type Draft = Partial<Habit>

/** Smart defaults: common habits pre-filled so a new user never faces a blank form. */
export const TEMPLATES: Draft[] = [
  { name: 'Drink water', emoji: '💧', polarity: 'build', kind: 'count', unit: 'glasses', min: 4, goal: 8, color: '#0d9fb8' },
  { name: 'Read', emoji: '📖', polarity: 'build', kind: 'count', unit: 'pages', min: 2, goal: 20, color: '#8e4ec6', start: 21 * 60 + 30, duration: 30 },
  { name: 'Workout', emoji: '💪', polarity: 'build', kind: 'count', unit: 'min', min: 10, goal: 45, color: '#e5484d', start: 7 * 60, duration: 45, days: [1, 3, 5] },
  { name: 'Meditate', emoji: '🧘', polarity: 'build', kind: 'check', color: '#12a594', start: 6 * 60 + 30, duration: 15 },
  { name: 'No sugar', emoji: '🍬', polarity: 'quit', kind: 'check', color: '#d6409f' },
  { name: 'Less phone', emoji: '📱', polarity: 'quit', kind: 'count', unit: 'hours', min: 3, goal: 1, color: '#3e63dd' },
  { name: 'Smoking', emoji: '🚭', polarity: 'quit', kind: 'count', unit: 'cigarettes', min: 5, goal: 0, color: '#6f6e77' },
]

interface Props {
  initial?: Draft
  onClose: () => void
}

export function HabitForm({ initial = {}, onClose }: Props) {
  const isEdit = Boolean(initial.id)
  const [h, setH] = useState<Draft>({
    name: '',
    emoji: '🌱',
    color: COLORS[0],
    polarity: 'build',
    kind: 'check',
    days: [0, 1, 2, 3, 4, 5, 6],
    start: null,
    duration: 30,
    ...initial,
  })
  const [endMode, setEndMode] = useState(false)
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
    if (!quit && h.min !== undefined && h.goal !== undefined && h.min > h.goal) errors.push('Minimum can’t exceed the goal')
    if (!quit && h.min !== undefined && h.min <= 0) errors.push('Minimum must be above 0')
    if (quit && h.min !== undefined && h.goal !== undefined && h.goal > h.min) errors.push('Target must be at or below the limit')
  }

  const save = () => {
    if (errors.length) return
    actions.saveHabit({
      ...(h as Habit),
      name: h.name!.trim(),
      unit: h.kind === 'count' ? h.unit?.trim() : undefined,
      min: h.kind === 'count' ? h.min : undefined,
      goal: h.kind === 'count' ? h.goal : undefined,
      start: timed ? h.start! : null,
      duration: Math.max(15, h.duration ?? 30),
    })
    toast(isEdit ? 'Habit updated' : `“${h.name!.trim()}” added — small steps, every day`)
    onClose()
  }

  const num = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <Sheet
      title={isEdit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      actions={
        <button className="btn primary sm" onClick={save} disabled={errors.length > 0} style={{ opacity: errors.length ? 0.5 : 1 }}>
          Save
        </button>
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        {!isEdit && (
          <div className="field">
            <span>Quick start</span>
            <div className="chips scroll">
              {TEMPLATES.map((t) => (
                <button key={t.name} className="chip" onClick={() => setH((x) => ({ ...x, days: [0, 1, 2, 3, 4, 5, 6], start: null, duration: 30, ...t }))}>
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="segmented" role="group" aria-label="Habit direction">
          <button aria-pressed={!quit} onClick={() => set({ polarity: 'build', ...(h.kind === 'count' ? { min: undefined, goal: undefined } : {}) })}>
            ＋ Build a habit
          </button>
          <button aria-pressed={quit} onClick={() => set({ polarity: 'quit', ...(h.kind === 'count' ? { min: undefined, goal: undefined } : {}) })}>
            − Leave a habit
          </button>
        </div>

        <label className="field">
          <span>Name</span>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ fontSize: 28, width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 12, background: h.color + '26' }}>
              {h.emoji}
            </div>
            <input
              className="input"
              value={h.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={quit ? 'e.g. Social media, Sugar' : 'e.g. Read, Walk, Stretch'}
              autoFocus={!isEdit}
              maxLength={40}
            />
          </div>
        </label>

        <div className="emoji-grid" role="group" aria-label="Icon">
          {EMOJIS.map((e) => (
            <button key={e} aria-pressed={h.emoji === e} onClick={() => set({ emoji: e })}>
              {e}
            </button>
          ))}
        </div>

        <div className="field">
          <span>How do you track it?</span>
          <div className="segmented">
            <button aria-pressed={h.kind === 'check'} onClick={() => set({ kind: 'check' })}>
              {quit ? 'Clean / slipped' : 'Just done'}
            </button>
            <button aria-pressed={h.kind === 'count'} onClick={() => set({ kind: 'count' })}>
              Quantity
            </button>
          </div>
          <span className="hint">
            {h.kind === 'check'
              ? quit
                ? 'Every day counts as clean unless you log a slip.'
                : 'One tap marks the day as done.'
              : quit
                ? 'Log how much; stay under your limit, aim for your target.'
                : 'Accumulate through the day. Hitting the minimum keeps your streak.'}
          </span>
        </div>

        {h.kind === 'count' && (
          <div className="grid-3">
            <label className="field">
              <span>Unit</span>
              <input className="input" value={h.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="min" maxLength={16} />
            </label>
            <label className="field">
              <span>{quit ? 'Limit (max)' : 'Minimum'}</span>
              <input className="input" type="number" inputMode="decimal" min={0} value={h.min ?? ''} onChange={(e) => set({ min: num(e.target.value) })} placeholder={quit ? '5' : '2'} />
            </label>
            <label className="field">
              <span>{quit ? 'Target' : 'Goal'}</span>
              <input className="input" type="number" inputMode="decimal" min={0} value={h.goal ?? ''} onChange={(e) => set({ goal: num(e.target.value) })} placeholder={quit ? '0' : '10'} />
            </label>
          </div>
        )}
        {h.kind === 'count' && (
          <span className="hint small faint" style={{ marginTop: -10 }}>
            {quit
              ? 'Over the limit = missed day. At or under the target = full win.'
              : 'Minimum = the tiny version that still counts (never miss). Goal = a great day.'}
          </span>
        )}

        <div className="field">
          <span>Days</span>
          <div className="days-pick">
            {WEEK_ORDER.map((d) => (
              <button key={d} aria-pressed={h.days?.includes(d)} onClick={() => toggleDay(d)} aria-label={`Day ${d}`}>
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="chips">
            <button className="chip" onClick={() => set({ days: [0, 1, 2, 3, 4, 5, 6] })}>Every day</button>
            <button className="chip" onClick={() => set({ days: [1, 2, 3, 4, 5] })}>Weekdays</button>
            <button className="chip" onClick={() => set({ days: [0, 6] })}>Weekends</button>
          </div>
        </div>

        <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', padding: '4px 14px 14px' }}>
          <label className="switch">
            <span>
              <b style={{ fontWeight: 650 }}>Put it on the calendar</b>
              <br />
              <span className="small muted">Planning “when” makes follow-through far more likely.</span>
            </span>
            <input type="checkbox" checked={timed} onChange={(e) => set({ start: e.target.checked ? 7 * 60 : null })} />
          </label>
          {timed && (
            <div className="stack" style={{ marginTop: 8 }}>
              <div className="segmented" style={{ background: 'var(--surface)' }}>
                <button aria-pressed={!endMode} onClick={() => setEndMode(false)}>Duration</button>
                <button aria-pressed={endMode} onClick={() => setEndMode(true)}>End time</button>
              </div>
              <div className="grid-2">
                <label className="field">
                  <span>Starts</span>
                  <input className="input" style={{ background: 'var(--surface)' }} type="time" step={300} value={minutesToInput(h.start!)} onChange={(e) => set({ start: inputToMinutes(e.target.value) })} />
                </label>
                {endMode ? (
                  <label className="field">
                    <span>Ends</span>
                    <input
                      className="input"
                      style={{ background: 'var(--surface)' }}
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
                    <span>Minutes</span>
                    <input className="input" style={{ background: 'var(--surface)' }} type="number" inputMode="numeric" min={15} step={5} value={h.duration ?? 30} onChange={(e) => set({ duration: Number(e.target.value) || 15 })} />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        <label className="field">
          <span>Cue — when / where? <span className="faint">(optional)</span></span>
          <input className="input" value={h.cue ?? ''} onChange={(e) => set({ cue: e.target.value })} placeholder={quit ? 'When I feel the urge, I will…' : 'After my morning coffee, in the kitchen'} maxLength={80} />
        </label>

        <label className="field">
          <span>Why — who are you becoming? <span className="faint">(optional)</span></span>
          <input className="input" value={h.why ?? ''} onChange={(e) => set({ why: e.target.value })} placeholder={quit ? 'I’m someone in control of my time' : 'I’m someone who reads every day'} maxLength={80} />
        </label>

        <div className="field">
          <span>Color</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button key={c} style={{ background: c }} aria-pressed={h.color === c} aria-label={`Color ${c}`} onClick={() => set({ color: c })} />
            ))}
          </div>
        </div>

        {errors.length > 0 && h.name && <p className="small" style={{ color: 'var(--bad)' }}>{errors[0]}</p>}
        <button className="btn primary block" onClick={save} disabled={errors.length > 0} style={{ opacity: errors.length ? 0.5 : 1, minHeight: 52 }}>
          {isEdit ? 'Save changes' : 'Start this habit'}
        </button>
      </div>
    </Sheet>
  )
}
