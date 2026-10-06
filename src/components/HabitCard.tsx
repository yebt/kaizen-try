import { useRef, useState } from 'react'
import { minutesToLabel, type DateKey } from '../lib/date'
import { blocksOf, daysSinceMiss, formatQty, statusOf, streakOf, thresholds, timesOf } from '../lib/habits'
import { addQty, setTimes, stepOf, tapCheck, toggleCheck, writeEntry } from '../lib/log'
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
  const times = timesOf(h)
  const quit = h.polarity === 'quit'
  const won = status === 'done' && !quit
  const future = status === 'future'

  // One context line — the most useful thing to know right now.
  const blocks = blocksOf(h)
  // With a time for each, point at the next one still to do.
  const time = blocks.length > 1 ? (v < blocks.length ? `next ${minutesToLabel(blocks[v])}` : null) : h.start !== null ? minutesToLabel(h.start) : null
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
  } else if (times > 1) {
    const counted = status === 'ok' ? 'counts for today' : status === 'done' ? (streak.current ? `${streak.current}-day streak` : null) : min < times && !time ? `${min} still counts` : null
    meta = [time, `${v} of ${times} times`, counted].filter(Boolean).join(' · ')
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

      {future ? null : times > 1 ? (
        <TimesButton
          habit={h}
          value={v}
          rest={status === 'skipped'}
          onTap={() => {
            if (!tapCheck(h, date)) setExact(true)
          }}
          onLongPress={() => setExact(true)}
        />
      ) : h.kind === 'check' && !quit ? (
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

      {exact && times > 1 && <TimesEntry habit={h} value={v} onClose={() => setExact(false)} onSave={(n) => setTimes(h, date, n)} />}
      {exact && times === 1 && <ExactEntry habit={h} value={v} onClose={() => setExact(false)} onSave={(n) => writeEntry(h, date, n ? { v: n } : null)} />}
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

/** Ring split into one arc per time; fills as you go, turns green when complete. */
export function TimesRing({ times, value, min, size = 32 }: { times: number; value: number; min: number; size?: number }) {
  const r = size / 2 - 2.5
  const c = 2 * Math.PI * r
  const gap = times > 8 ? 2.5 : 4
  const seg = c / times - gap
  const done = value >= times
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={`times-ring ${done ? 'full' : ''}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {Array.from({ length: times }, (_, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={i < value ? 'on' : i === min - 1 && min < times ? 'min' : ''}
            strokeDasharray={`${seg} ${c - seg}`}
            strokeDashoffset={-(i * (seg + gap)) - gap / 2}
          />
        ))}
      </g>
    </svg>
  )
}

function TimesButton({ habit: h, value, rest, onTap, onLongPress }: { habit: Habit; value: number; rest: boolean; onTap: () => void; onLongPress: () => void }) {
  const n = timesOf(h)
  const { min } = thresholds(h)
  const done = value >= n
  const timer = useRef(0)
  const held = useRef(false)
  const cancel = () => clearTimeout(timer.current)
  return (
    <button
      className={`check times ${done ? 'on' : ''} ${rest ? 'rest' : ''}`}
      onPointerDown={() => {
        held.current = false
        timer.current = window.setTimeout(() => {
          held.current = true
          onLongPress()
        }, 450)
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!held.current) onTap()
        held.current = false
      }}
      aria-label={done ? `${h.name}: all ${n} done. Edit` : `${h.name}: ${value} of ${n}. Log one more`}
    >
      <TimesRing times={n} value={value} min={min} />
      <span className="times-core">{done ? <IconCheck /> : <b>{value}</b>}</span>
    </button>
  )
}

/** Adjust a multi-times day: tap a pip to set the count, or step with − / +. */
function TimesEntry({ habit: h, value, onClose, onSave }: { habit: Habit; value: number; onClose: () => void; onSave: (n: number) => void }) {
  const n = timesOf(h)
  const { min } = thresholds(h)
  const [v, setV] = useState(Math.min(value, n))
  const commit = (x: number) => {
    onSave(x)
    onClose()
  }
  const label = v >= n ? 'All done' : v >= min ? 'Counts for today' : v === 0 ? 'Not yet' : `${min - v} more to count`
  return (
    <Sheet title={h.name} onClose={onClose} closeLabel="Cancel" actions={<button className="text-btn strong" onClick={() => commit(v)}>Save</button>}>
      <div className="stack" style={{ gap: 22, alignItems: 'center', textAlign: 'center' }}>
        <div className="times-big" style={{ ['--c' as string]: h.color }}>
          <TimesRing times={n} value={v} min={min} size={132} />
          <div className="times-big-core">
            <b className="mono">
              {v}
              <small>/{n}</small>
            </b>
            <span className={v >= min ? 'ok' : ''}>{label}</span>
          </div>
        </div>
        <div className="pips" role="group" aria-label="Times done today">
          {Array.from({ length: n }, (_, i) => (
            <button
              key={i}
              className={`pip ${i < v ? 'on' : ''} ${i === min - 1 && min < n ? 'min' : ''}`}
              onClick={() => setV(i + 1 === v ? i : i + 1)}
              aria-pressed={i < v}
              aria-label={`${i + 1} ${i ? 'times' : 'time'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10, width: '100%' }}>
          <button className="btn lg" style={{ flex: 1 }} onClick={() => setV(Math.max(0, v - 1))} disabled={v === 0}>
            <IconMinus width={18} /> One less
          </button>
          <button className="btn lg" style={{ flex: 1 }} onClick={() => setV(Math.min(n, v + 1))} disabled={v >= n}>
            <IconPlus width={18} /> One more
          </button>
        </div>
        {min < n && <p className="xs muted">The marked pip is your minimum — reach it and the day counts.</p>}
        <button className="btn primary lg block" onClick={() => commit(v)}>
          Save
        </button>
      </div>
    </Sheet>
  )
}
