import { useState } from 'react'
import { minutesToLabel, type DateKey } from '../lib/date'
import { daysSinceMiss, formatQty, statusOf, streakOf, thresholds } from '../lib/habits'
import { addQty, stepOf, toggleCheck, writeEntry } from '../lib/log'
import type { Habit, Logs } from '../lib/types'
import { HabitIcon } from './HabitIcon'
import { IconCheck, IconMinus, IconPlus } from './Icons'
import { Sheet } from './Sheet'

interface Props {
  habit: Habit
  logs: Logs
  date: DateKey
  today: DateKey
  onOpen: () => void
}

function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`
}

/** One row in a grouped list: icon · name + context line · the single action. */
export function HabitCard({ habit: h, logs, date, today, onOpen }: Props) {
  const entry = logs[date]?.[h.id]
  const status = statusOf(h, entry, date, today)
  const streak = streakOf(h, logs, today)
  const v = entry?.v ?? 0
  const [exact, setExact] = useState(false)
  const { min, goal } = thresholds(h)
  const quit = h.polarity === 'quit'
  const won = status === 'done' && !quit
  const future = status === 'future'

  // One context line — the most useful thing to know right now.
  const time = h.start !== null ? minutesToLabel(h.start) : null
  let meta: string
  let warn = false
  if (status === 'skipped') meta = 'Rest day — streak is safe'
  else if (date === today && streak.recoverToday) {
    meta = 'Missed yesterday — never miss twice'
    warn = true
  } else if (quit && h.kind === 'check') {
    meta = streak.freezes ? `${plural(streak.freezes, 'shield')} · best ${streak.best} days` : `Best ${plural(streak.best, 'day')}`
  } else if (quit) {
    meta = `${formatQty(v)} of ${formatQty(min)} ${h.unit} limit${goal < min ? ` · aim ≤ ${formatQty(goal)}` : ''}`
    warn = status === 'missed'
  } else if (h.kind === 'count') {
    meta = [time, `${formatQty(v)} of ${formatQty(goal)} ${h.unit}`, status === 'ok' ? 'minimum met' : !time && status !== 'done' ? `min ${formatQty(min)}` : null]
      .filter(Boolean)
      .join(' · ')
  } else {
    meta = [time, streak.current ? `${streak.current}-day streak` : 'Start your streak today'].filter(Boolean).join(' · ')
  }

  const fill = h.kind === 'count' && !quit ? Math.min(v / goal, 1) : null
  const clean = quit && h.kind === 'check' ? daysSinceMiss(h, logs, today) : 0

  return (
    <div className={`habit ${won ? 'won' : ''}`}>
      <button className="main" onClick={onOpen} aria-label={`${h.name} — details`}>
        <HabitIcon habit={h} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{h.name}</div>
          <div className={`meta ${warn ? 'warn' : ''}`}>{meta}</div>
          {fill !== null && (
            <div className="mini" aria-hidden>
              <i className={status === 'done' ? 'done' : ''} style={{ width: `${fill * 100}%` }} />
              {min < goal && <span className="tick" style={{ left: `${(min / goal) * 100}%` }} />}
            </div>
          )}
        </div>
      </button>

      {future ? null : h.kind === 'check' && !quit ? (
        <button
          className={`check ${v ? 'on' : ''} ${status === 'skipped' ? 'rest' : ''}`}
          onClick={() => toggleCheck(h, date)}
          aria-pressed={!!v}
          aria-label={v ? `Undo ${h.name}` : `Mark ${h.name} done`}
        >
          <span>
            <IconCheck />
          </span>
        </button>
      ) : h.kind === 'check' ? (
        <div className="clean">
          {!v && (
            <div className="count">
              <b>{clean}d</b>
              <small>clean</small>
            </div>
          )}
          <button className={`slip ${v ? 'on' : ''}`} onClick={() => toggleCheck(h, date)} aria-pressed={!!v}>
            {v ? 'Undo slip' : 'Slipped'}
          </button>
        </div>
      ) : (
        <div className="qty">
          <button className="val" onClick={() => setExact(true)} aria-label={`Set exact ${h.unit}`}>
            <b>{formatQty(v)}</b>
            <small>{h.unit}</small>
          </button>
          <button
            className={`plus ${status === 'done' && !quit ? 'on' : ''}`}
            onClick={() => addQty(h, date, stepOf(h))}
            aria-label={`Add ${stepOf(h)} ${h.unit}`}
          >
            <IconPlus />
          </button>
        </div>
      )}

      {exact && <ExactEntry habit={h} value={v} onClose={() => setExact(false)} onSave={(n) => writeEntry(h, date, n ? { v: n } : null)} />}
    </div>
  )
}

function ExactEntry({ habit: h, value, onClose, onSave }: { habit: Habit; value: number; onClose: () => void; onSave: (n: number) => void }) {
  const [v, setV] = useState(String(value || ''))
  const { min, goal } = thresholds(h)
  const step = stepOf(h)
  const presets = Array.from(new Set([min, goal].filter((n) => n > 0))).sort((a, b) => a - b)
  const n = Number(v) || 0
  const commit = (x: number) => {
    onSave(Math.max(0, Math.round(x * 100) / 100))
    onClose()
  }
  return (
    <Sheet title={h.name} onClose={onClose} closeLabel="Cancel" actions={<button className="text-btn strong" onClick={() => commit(n)}>Save</button>}>
      <form
        className="stack"
        style={{ gap: 18 }}
        onSubmit={(e) => {
          e.preventDefault()
          commit(n)
        }}
      >
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="icon-btn outline" onClick={() => setV(String(Math.max(0, n - step)))} aria-label="Decrease">
            <IconMinus />
          </button>
          <label className="field" style={{ flex: 1 }}>
            <span style={{ textAlign: 'center' }}>Total today · {h.unit}</span>
            <input
              className="input mono"
              style={{ fontSize: 32, minHeight: 68, textAlign: 'center' }}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              value={v}
              onChange={(e) => setV(e.target.value)}
            />
          </label>
          <button type="button" className="icon-btn outline" onClick={() => setV(String(n + step))} aria-label="Increase">
            <IconPlus />
          </button>
        </div>
        <div className="chips" style={{ justifyContent: 'center' }}>
          {presets.map((p) => (
            <button type="button" key={p} className="chip" onClick={() => commit(p)}>
              {p === min ? (h.polarity === 'quit' ? 'Limit' : 'Minimum') : h.polarity === 'quit' ? 'Target' : 'Goal'} · {formatQty(p)}
            </button>
          ))}
          {value > 0 && (
            <button type="button" className="chip" onClick={() => commit(0)}>
              Reset
            </button>
          )}
        </div>
        <button className="btn primary lg block">Save</button>
      </form>
    </Sheet>
  )
}
