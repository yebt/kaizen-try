import { useState } from 'react'
import { inputToMinutes, minutesToInput, minutesToLabel } from '../lib/date'
import { spreadSlots, timesOf } from '../lib/habits'
import type { Habit } from '../lib/types'
import { scheduleLabel } from './HabitDetail'
import { HabitIcon } from './HabitIcon'
import { IconRight } from './Icons'
import { Sheet } from './Sheet'

const DURATIONS = [15, 30, 45, 60, 90]

export const partOfDay = (start: number) => (start < 12 * 60 ? 'Morning' : start < 17 * 60 ? 'Afternoon' : 'Evening')
/** "every day", "on weekdays", "on Mon Wed Fri" */
export function repeatPhrase(days: number[]) {
  const l = scheduleLabel(days)
  return l === 'Every day' ? 'every day' : `on ${l === 'Weekdays' || l === 'Weekends' ? l.toLowerCase() : l}`
}
const durLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`)

interface Props {
  habit: Habit
  start: number
  duration: number
  /** `slots` is set when each time gets its own block. */
  onConfirm: (start: number, duration: number, slots?: number[]) => void
  onClose: () => void
}

/**
 * Confirms turning an "any time" habit into a timed one. Giving it a time
 * changes the habit itself (every day it repeats), so we say exactly what
 * will change and let the time be fine-tuned before committing.
 */
export function ScheduleSheet({ habit: h, start: initialStart, duration: initialDuration, onConfirm, onClose }: Props) {
  const times = timesOf(h)
  const [start, setStart] = useState(initialStart)
  // Several times a day: default to one short block per time, starting where it was dropped.
  const [slots, setSlots] = useState<number[] | null>(() => (times > 1 ? spreadSlots(times, initialStart, 15) : null))
  const [duration, setDuration] = useState(Math.max(15, times > 1 ? 15 : initialDuration))
  const end = start + duration
  const fitsDay = (slots ? Math.max(...slots) : start) + duration <= 1440
  const sorted = slots && [...slots].sort((a, b) => a - b)
  const setSlot = (i: number, m: number) => setSlots((x) => x && x.map((v, j) => (j === i ? m : v)))

  return (
    <Sheet title="Set a time" onClose={onClose} closeLabel="Cancel" className="confirm">
      <div className="stack" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 12 }}>
          <HabitIcon habit={h} size={44} />
          <div style={{ minWidth: 0 }}>
            <h2 className="confirm-title" style={{ fontSize: 26 }}>
              Give “{h.name}” a time?
            </h2>
          </div>
        </div>

        <div className="change" aria-label="What changes">
          <span className="from">Any time</span>
          <IconRight aria-hidden />
          <span className="to">{sorted ? sorted.map(minutesToLabel).join(' · ') : `${minutesToLabel(start)} – ${minutesToLabel(end % 1440)}`}</span>
        </div>

        {times > 1 && (
          <div className="segmented sm" role="group" aria-label="Blocks">
            <button aria-pressed={!!slots} onClick={() => setSlots(spreadSlots(times, start, duration))}>
              A time for each
            </button>
            <button aria-pressed={!slots} onClick={() => (slots && setStart(Math.min(...slots)), setSlots(null))}>
              One block
            </button>
          </div>
        )}

        {slots ? (
          <div className="slot-list">
            {slots.map((m, i) => (
              <label className="field" key={i}>
                <span>Time {i + 1}</span>
                <input className="input mono" type="time" step={300} value={minutesToInput(m)} onChange={(e) => e.target.value && setSlot(i, inputToMinutes(e.target.value))} />
              </label>
            ))}
          </div>
        ) : (
          <div className="grid-2">
            <label className="field">
              <span>Starts</span>
              <input
                className="input mono"
                type="time"
                step={300}
                value={minutesToInput(start)}
                onChange={(e) => e.target.value && setStart(inputToMinutes(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Ends</span>
              <input
                className="input mono"
                type="time"
                step={300}
                value={minutesToInput(end % 1440)}
                onChange={(e) => {
                  if (!e.target.value) return
                  let m = inputToMinutes(e.target.value)
                  if (m <= start) m += 1440
                  setDuration(Math.max(15, m - start))
                }}
              />
            </label>
          </div>
        )}
        <div className="chips" role="group" aria-label="Duration">
          {DURATIONS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={duration === m} onClick={() => setDuration(m)}>
              {durLabel(m)}
            </button>
          ))}
        </div>

        <ul className="consequences">
          <li>
            It shows on the calendar <b>{repeatPhrase(h.days)}</b>, and under <b>{partOfDay(sorted ? sorted[0] : start)}</b> on Today.
          </li>
          {times > 1 && (sorted ? <li>Each of the {times} times gets its own block. Check them off in any order.</li> : <li>One block holds all {times} times — you still tap each one off.</li>)}
          <li>History and streak stay exactly the same. Drag the block later to adjust, or move it back to Any time.</li>
          {!fitsDay && <li className="warn">It runs past midnight — the block stops at the end of the day.</li>}
        </ul>

        <div className="stack" style={{ gap: 8 }}>
          <button
            className="btn primary lg block"
            onClick={() => (sorted ? onConfirm(sorted[0], duration, sorted) : onConfirm(start, Math.min(duration, 1440 - start)))}
            autoFocus
          >
            {sorted ? `Schedule ${times} times` : `Schedule at ${minutesToLabel(start)}`}
          </button>
          <button className="btn lg block ghost" onClick={onClose}>
            Keep it any time
          </button>
        </div>
      </div>
    </Sheet>
  )
}
