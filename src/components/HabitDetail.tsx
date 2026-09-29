import { useState } from 'react'
import { addDays, formatDay, minutesToLabel, startOfWeek, type DateKey } from '../lib/date'
import {
  completionRate,
  daysSinceMiss,
  formatQty,
  nextMilestone,
  progressOf,
  statusOf,
  streakOf,
  strengthOf,
  thresholds,
  totalIn,
  totalWins,
} from '../lib/habits'
import { setSkip } from '../lib/log'
import { actions } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit, Logs } from '../lib/types'
import { HabitForm } from './HabitForm'
import { HabitIcon } from './HabitIcon'
import { IconTrash } from './Icons'
import { Sheet } from './Sheet'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function scheduleLabel(days: number[]): string {
  if (days.length === 7) return 'Every day'
  const s = [...days].sort().join()
  if (s === '1,2,3,4,5') return 'Weekdays'
  if (s === '0,6') return 'Weekends'
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(' ')
}

export function Heatmap({ habit: h, logs, today, weeks = 20 }: { habit: Habit; logs: Logs; today: DateKey; weeks?: number }) {
  const start = addDays(startOfWeek(today), -(weeks - 1) * 7)
  const { frozen } = streakOf(h, logs, today)
  const cells = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i)
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    const style: React.CSSProperties = {}
    let cls = ''
    if (s === 'future') cls = 'fut'
    else if (s === 'done') style.background = h.color
    else if (s === 'ok') (style.background = h.color), (style.opacity = 0.5)
    else if (s === 'pending') {
      const p = progressOf(h, logs[d]?.[h.id], d, today)
      if (p > 0) (style.background = h.color), (style.opacity = 0.2 + p * 0.3)
    } else if (s === 'skipped') style.background = 'var(--line)'
    else if (s === 'missed' && frozen.has(d)) style.background = 'var(--shield)'
    if (d === today) cls += ' today'
    cells.push(<i key={d} className={cls} style={style} title={`${formatDay(d, { month: 'short', day: 'numeric' })}: ${frozen.has(d) ? 'shielded' : s}`} />)
  }
  return <div className="heat">{cells}</div>
}

interface Props {
  habit: Habit
  logs: Logs
  date: DateKey
  today: DateKey
  onClose: () => void
}

export function HabitDetail({ habit: h, logs, date, today, onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const streak = streakOf(h, logs, today)
  const strength = strengthOf(h, logs, today)
  const rate = completionRate(h, logs, today)
  const wins = totalWins(h, logs, today)
  const quit = h.polarity === 'quit'
  const current = quit ? daysSinceMiss(h, logs, today) : streak.current
  const next = nextMilestone(current)
  const status = statusOf(h, logs[date]?.[h.id], date, today)
  const { min, goal } = thresholds(h)

  if (editing) return <HabitForm initial={h} onClose={() => setEditing(false)} />

  const remove = () => {
    if (!confirm(`Delete “${h.name}” and all its history? This can’t be undone.`)) return
    actions.deleteHabit(h.id)
    toast('Habit deleted')
    onClose()
  }

  const recent = h.kind === 'count' ? totalIn(h, logs, today, 30) : 0
  const previous = h.kind === 'count' ? totalIn(h, logs, addDays(today, -30), 30) : 0
  const delta = previous ? (recent - previous) / previous : null
  const better = delta !== null && (quit ? delta < 0 : delta > 0)

  const subtitle = [
    scheduleLabel(h.days),
    h.kind === 'count' ? (quit ? `limit ${formatQty(min)} · aim ≤ ${formatQty(goal)} ${h.unit}` : `minimum ${formatQty(min)} · goal ${formatQty(goal)} ${h.unit}`) : quit ? 'stay clean' : null,
    h.start !== null ? `${minutesToLabel(h.start)}–${minutesToLabel(h.start + h.duration)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const stats: [string, string][] = [
    [String(current), quit ? 'days clean' : 'day streak'],
    [String(streak.best), quit ? 'best (with shields)' : 'best streak'],
    [`${Math.round(strength * 100)}%`, 'habit strength'],
    [String(wins), quit ? 'clean days total' : 'total wins'],
    [rate === null ? '—' : `${Math.round(rate * 100)}%`, 'last 30 days'],
    [String(streak.freezes), streak.freezes === 1 ? 'shield' : 'shields'],
  ]

  return (
    <Sheet title="" onClose={onClose} actions={<button className="text-btn strong" onClick={() => setEditing(true)}>Edit</button>}>
      <div className="stack" style={{ gap: 22 }}>
        <div className="row" style={{ gap: 14 }}>
          <HabitIcon habit={h} size={52} />
          <div style={{ minWidth: 0 }}>
            <h1 className="serif" style={{ fontSize: 34, lineHeight: 1.05 }}>
              {h.name}
            </h1>
            <div className="small muted" style={{ marginTop: 4 }}>
              {subtitle}
            </div>
          </div>
        </div>

        {(h.why || h.cue) && (
          <div className="stack" style={{ gap: 6 }}>
            {h.why && <p className="quote">“{h.why}”</p>}
            {h.cue && <p className="small muted">Cue: {h.cue}</p>}
          </div>
        )}

        <div className="stat-grid">
          {stats.map(([v, l]) => (
            <div className="stat" key={l}>
              <b>{v}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <div className="row small" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontWeight: 600 }}>Next milestone · {next} days</b>
            <span className="muted">{next - current} to go</span>
          </div>
          <div className="bar">
            <i className="done" style={{ width: `${(current / next) * 100}%` }} />
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="lbl" style={{ padding: 0 }}>
              History
            </span>
            <span className="legend">
              <span>
                <i style={{ background: h.color }} />
                {quit ? 'clean' : 'goal'}
              </span>
              {h.kind === 'count' && (
                <span>
                  <i style={{ background: h.color, opacity: 0.5 }} />
                  {quit ? 'under limit' : 'minimum'}
                </span>
              )}
              {streak.frozen.size > 0 && (
                <span>
                  <i style={{ background: 'var(--shield)' }} />
                  shielded
                </span>
              )}
            </span>
          </div>
          <Heatmap habit={h} logs={logs} today={today} />
        </div>

        {h.kind === 'count' && (
          <div className="panel row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="xs muted">Last 30 days</div>
              <div>
                <span className="mono" style={{ fontSize: 22, fontWeight: 500 }}>
                  {formatQty(recent)}
                </span>
                <span className="small muted"> {h.unit}</span>
              </div>
            </div>
            {delta !== null && (
              <span className="small" style={{ fontWeight: 600, color: better ? 'var(--accent)' : 'var(--ink-2)' }}>
                {delta > 0 ? '+' : '−'}
                {Math.abs(Math.round(delta * 100))}% vs previous 30
              </span>
            )}
          </div>
        )}

        <div className="stack" style={{ gap: 4 }}>
          {status !== 'none' && status !== 'future' && (
            <button className="btn block" onClick={() => setSkip(h, date, status !== 'skipped')}>
              {status === 'skipped' ? 'Undo rest day' : `Rest day ${date === today ? 'today' : formatDay(date, { weekday: 'short', day: 'numeric' })} · keeps streak`}
            </button>
          )}
          <p className="xs faint" style={{ textAlign: 'center', marginTop: 8 }}>
            Started {formatDay(h.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <button className="btn danger block" onClick={remove}>
            <IconTrash width={16} /> Delete habit
          </button>
        </div>
      </div>
    </Sheet>
  )
}
