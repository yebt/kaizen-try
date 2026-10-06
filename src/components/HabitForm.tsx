import { useState } from 'react'
import { inputToMinutes, minutesToInput } from '../lib/date'
import { spreadSlots } from '../lib/habits'
import { actions } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit } from '../lib/types'
import { Glyph } from './HabitIcon'
import { IconMinus, IconPlus } from './Icons'
import { ICONS } from './icons/catalog'
import { suggestIcons } from './icons/search'
import { IconPicker } from './IconPicker'
import { NumberInput } from './NumberInput'
import { Sheet } from './Sheet'

/** Muted habit tints — they identify a habit; green stays reserved for "done". */
export const COLORS = ['#2f7ba3', '#7457a0', '#b24f33', '#4c7a55', '#a04c78', '#566a92', '#3f7f86', '#6b6b73']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export type Draft = Partial<Habit>

/** Smart defaults: common habits pre-filled so a new user never faces a blank form. */
export const TEMPLATES: Draft[] = [
  { name: 'Drink water', icon: 'droplet', polarity: 'build', kind: 'count', unit: 'glasses', min: 4, goal: 8, color: '#2f7ba3' },
  { name: 'Read', icon: 'book-open', polarity: 'build', kind: 'count', unit: 'pages', min: 2, goal: 20, color: '#7457a0', start: 21 * 60 + 30, duration: 30 },
  { name: 'Brush teeth', icon: 'toothbrush', polarity: 'build', kind: 'check', goal: 3, min: 2, color: '#3f7f86' },
  { name: 'Meditate', icon: 'sun', polarity: 'build', kind: 'check', color: '#4c7a55', start: 6 * 60 + 30, duration: 15 },
  { name: 'Workout', icon: 'dumbbell', polarity: 'build', kind: 'count', unit: 'min', min: 10, goal: 45, color: '#b24f33', start: 7 * 60, duration: 45, days: [1, 3, 5] },
  { name: 'No sugar', icon: 'candy-off', polarity: 'quit', kind: 'check', color: '#a04c78' },
  { name: 'Less phone', icon: 'smartphone', polarity: 'quit', kind: 'count', unit: 'hours', min: 3, goal: 1, color: '#566a92' },
  { name: 'Smoking', icon: 'cigarette-off', polarity: 'quit', kind: 'count', unit: 'cigarettes', min: 5, goal: 0, color: '#6b6b73' },
]

export const MAX_TIMES = 12

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer — ${label}`}>
        <IconMinus />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More — ${label}`}>
        <IconPlus />
      </button>
    </div>
  )
}

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
    icon: initial.icon ?? 'leaf',
  }))
  const [endMode, setEndMode] = useState(true)
  const [picker, setPicker] = useState(false)
  // A new habit's icon follows its name until the user picks one themselves.
  const [iconChosen, setIconChosen] = useState(Boolean(initial.icon))
  const set = (patch: Draft) => setH((x) => ({ ...x, ...patch }))
  const chooseIcon = (icon: string) => {
    setIconChosen(true)
    set({ icon })
  }
  const suggestions = suggestIcons(h.name ?? '', h.polarity ?? 'build', 6)
  const setName = (name: string) => {
    const first = suggestIcons(name, h.polarity ?? 'build', 1)[0]
    set(iconChosen || !name.trim() || !first ? { name } : { name, icon: first.key })
  }
  const quit = h.polarity === 'quit'
  // "Done or not" habits can be done several times a day: goal = times, min = times that still count.
  const multi = !quit && h.kind === 'check'
  const times = multi ? Math.max(1, h.goal ?? 1) : 1
  const timesMin = Math.min(h.min ?? times, times)
  const setTimesGoal = (n: number) => {
    const next = Math.max(1, Math.min(MAX_TIMES, n))
    // Keep "all of them" as the default bar; keep a custom minimum if it still fits.
    const keepMin = h.min !== undefined && h.min < times && h.min < next
    // Per-time blocks follow the count, keeping the first time where it was.
    const slots = h.slots && next > 1 ? spreadSlots(next, h.slots[0], h.duration ?? 30) : undefined
    set({ goal: next, min: keepMin ? h.min : next, slots })
  }
  const timed = h.start !== null && h.start !== undefined
  const perTime = timed && times > 1 && h.slots?.length === times
  const setSlot = (i: number, m: number) => {
    const slots = [...h.slots!]
    slots[i] = m
    set({ slots, start: Math.min(...slots) })
  }
  const togglePerTime = (on: boolean) =>
    set(on ? { slots: spreadSlots(times, h.start ?? 8 * 60, 15), duration: 15 } : { slots: undefined, start: h.slots?.[0] ?? h.start })

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
      min: h.kind === 'count' ? h.min : multi && times > 1 ? timesMin : undefined,
      goal: h.kind === 'count' ? h.goal : multi && times > 1 ? times : undefined,
      start: !timed ? null : perTime ? Math.min(...h.slots!) : h.start!,
      slots: perTime ? [...h.slots!].sort((a, b) => a - b) : undefined,
      duration: Math.max(15, h.duration ?? 30),
      cue: h.cue?.trim() || undefined,
      why: h.why?.trim() || undefined,
    })
    toast(isEdit ? 'Habit updated' : `“${h.name!.trim()}” added — small steps, every day`)
    onClose()
  }

  const switchPolarity = (polarity: 'build' | 'quit') => polarity !== h.polarity && set({ polarity, min: undefined, goal: undefined })
  const switchKind = (kind: 'check' | 'count') => kind !== h.kind && set({ kind, min: undefined, goal: undefined })

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
                onClick={() => setH((x) => ({ ...x, days: [0, 1, 2, 3, 4, 5, 6], start: null, duration: 30, cue: undefined, why: undefined, unit: undefined, min: undefined, goal: undefined, slots: undefined, ...t }))}
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
              onChange={(e) => setName(e.target.value)}
              placeholder={quit ? 'e.g. Social media, sugar' : 'e.g. Read, walk, stretch'}
              autoFocus={!isEdit}
              maxLength={40}
            />
          </label>
          <div className="icon-pick" role="group" aria-label="Icon" style={{ ['--c' as string]: h.color }}>
            <button className="icon-current" onClick={() => setPicker(true)} aria-label={`Icon: ${ICONS[h.icon!]?.label ?? 'Leaf'}. Choose another`}>
              <Glyph name={h.icon!} size={26} />
            </button>
            <div className="icon-suggest">
              {suggestions
                .filter((d) => d.key !== h.icon)
                .slice(0, 5)
                .map((d) => (
                  <button key={d.key} onClick={() => chooseIcon(d.key)} aria-label={d.label} title={d.label}>
                    <Glyph name={d.key} size={19} />
                  </button>
                ))}
              <button className="icon-more" onClick={() => setPicker(true)}>
                All icons
              </button>
            </div>
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
            <button aria-pressed={h.kind === 'check'} onClick={() => switchKind('check')}>
              {quit ? 'Clean or slipped' : 'Done or not'}
            </button>
            <button aria-pressed={h.kind === 'count'} onClick={() => switchKind('count')}>
              Quantity
            </button>
          </div>
          {h.kind === 'check' && quit && (
            <span className="hint">Every day counts as clean unless you log a slip. For a daily limit — like 2 coffees — choose Quantity.</span>
          )}
        </div>

        {multi && (
          <div className="panel stack" style={{ gap: 14, padding: '12px 14px' }}>
            <div className="times-row">
              <div>
                <b>Times a day</b>
                <span>{times === 1 ? 'Once — one tap marks the day done.' : `${times} times — tap once each time.`}</span>
              </div>
              <Stepper value={times} min={1} max={MAX_TIMES} onChange={setTimesGoal} label="Times a day" />
            </div>
            {times > 1 && (
              <div className="field" style={{ gap: 8 }}>
                <span>The day counts from</span>
                <div className="chips" role="group" aria-label="Minimum times">
                  {Array.from({ length: times }, (_, i) => i + 1).map((k) => (
                    <button key={k} type="button" className="chip" aria-pressed={timesMin === k} onClick={() => set({ min: k })}>
                      {k === times ? `All ${k}` : k}
                    </button>
                  ))}
                </div>
                <span className="hint">
                  {timesMin === times
                    ? `Done after ${times} taps. Pick a lower number to keep your streak on busy days.`
                    : `Done at ${times}. ${timesMin} ${timesMin === 1 ? 'time' : 'times'} still counts — the day isn’t missed.`}
                </span>
              </div>
            )}
          </div>
        )}

        {h.kind === 'count' && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="grid-3">
              <label className="field">
                <span>Unit</span>
                <input className="input" value={h.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="km" maxLength={16} />
              </label>
              <label className="field">
                <span>{quit ? 'Limit' : 'Minimum'}</span>
                <NumberInput className="input mono" min={0} value={h.min} onChange={(min) => set({ min })} placeholder={quit ? '5' : '2'} />
              </label>
              <label className="field">
                <span>{quit ? 'Target' : 'Goal'}</span>
                <NumberInput className="input mono" min={0} value={h.goal} onChange={(goal) => set({ goal })} placeholder={quit ? '0' : '5'} />
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
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) =>
                set(
                  !e.target.checked
                    ? { start: null, slots: undefined }
                    : times > 1
                      ? { start: 8 * 60, slots: spreadSlots(times, 8 * 60, 15), duration: 15 }
                      : { start: 7 * 60 },
                )
              }
            />
          </label>
          {timed && times > 1 && (
            <div className="segmented sm" style={{ marginTop: 6 }} role="group" aria-label="Blocks">
              <button aria-pressed={perTime} onClick={() => togglePerTime(true)}>
                A time for each
              </button>
              <button aria-pressed={!perTime} onClick={() => togglePerTime(false)}>
                One block
              </button>
            </div>
          )}
          {perTime && (
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              <div className="slot-list">
                {h.slots!.map((m, i) => (
                  <label className="field" key={i}>
                    <span>Time {i + 1}</span>
                    <input className="input mono" type="time" step={300} value={minutesToInput(m)} onChange={(e) => e.target.value && setSlot(i, inputToMinutes(e.target.value))} />
                  </label>
                ))}
                <label className="field">
                  <span>Each lasts (min)</span>
                  <NumberInput className="input mono" integer min={15} max={240} fallback={15} value={h.duration} onChange={(duration) => set({ duration })} placeholder="15" />
                </label>
              </div>
              <span className="hint">Each time gets its own block on the calendar. Checking off still counts in any order.</span>
            </div>
          )}
          {timed && !perTime && (
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
                    <NumberInput className="input mono" integer min={15} max={1440} fallback={30} value={h.duration} onChange={(duration) => set({ duration })} placeholder="30" />
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
        {picker && (
          <IconPicker
            value={h.icon!}
            color={h.color!}
            name={h.name ?? ''}
            polarity={h.polarity ?? 'build'}
            onSelect={chooseIcon}
            onClose={() => setPicker(false)}
          />
        )}
        <button className="btn primary lg block" onClick={save} disabled={errors.length > 0}>
          {isEdit ? 'Save changes' : 'Create habit'}
        </button>
      </div>
    </Sheet>
  )
}
