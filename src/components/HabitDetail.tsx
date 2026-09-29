import { useState } from 'react'
import { addDays, diffDays, formatDay, minutesToLabel, startOfWeek, type DateKey } from '../lib/date'
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
import { IconEdit, IconTrash } from './Icons'
import { Sheet } from './Sheet'

export function Heatmap({ habit: h, logs, today, weeks: maxWeeks = 18 }: { habit: Habit; logs: Logs; today: DateKey; weeks?: number }) {
  const weeks = Math.min(maxWeeks, Math.max(10, Math.ceil(diffDays(h.createdAt, today) / 7) + 2))
  const start = addDays(startOfWeek(today), -(weeks - 1) * 7)
  const { frozen } = streakOf(h, logs, today)
  const cells = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i)
    const s = statusOf(h, logs[d]?.[h.id], d, today)
    let bg = 'var(--surface-2)'
    let op = 1
    if (s === 'done') bg = h.color
    else if (s === 'ok') (bg = h.color), (op = 0.55)
    else if (s === 'pending') {
      const p = progressOf(h, logs[d]?.[h.id], d, today)
      if (p > 0) (bg = h.color), (op = 0.2 + p * 0.3)
    } else if (s === 'skipped') bg = 'var(--line)'
    else if (s === 'missed') bg = frozen.has(d) ? '#4a90e2' : 'color-mix(in srgb, var(--bad) 30%, transparent)'
    else if (s === 'none' || s === 'future') op = 0.35
    cells.push(<i key={d} title={`${d}: ${frozen.has(d) ? 'shielded' : s}`} className={d === today ? 'today' : ''} style={{ background: bg, opacity: op }} />)
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
  const next = nextMilestone(streak.current)
  const entry = logs[date]?.[h.id]
  const status = statusOf(h, entry, date, today)
  const quit = h.polarity === 'quit'

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

  return (
    <Sheet
      title={
        <span>
          {h.emoji} {h.name}
        </span>
      }
      onClose={onClose}
      actions={
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit">
          <IconEdit />
        </button>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        {(h.why || h.cue) && (
          <div className="banner" style={{ background: h.color + '1f' }}>
            <div>
              {h.why && <strong>{h.why}</strong>}
              {h.cue && <span className="muted">{h.cue}</span>}
            </div>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <b>{quit ? daysSinceMiss(h, logs, today) : streak.current}</b>
            <span>{quit ? 'days since slip' : 'day streak'}</span>
          </div>
          <div className="stat">
            <b>{quit ? streak.current : streak.best}</b>
            <span>{quit ? 'streak (with shields)' : 'best streak'}</span>
          </div>
          <div className="stat">
            <b>{Math.round(strength * 100)}%</b>
            <span>habit strength</span>
          </div>
          <div className="stat">
            <b>{wins}</b>
            <span>{quit ? 'clean days total' : 'total wins'}</span>
          </div>
          <div className="stat">
            <b>{rate === null ? '—' : `${Math.round(rate * 100)}%`}</b>
            <span>last 30 days</span>
          </div>
          <div className="stat">
            <b style={{ color: '#4a90e2' }}>{streak.freezes}</b>
            <span>shields</span>
          </div>
        </div>

        <div className="milestone">
          <span className="muted">Next: {next} days</span>
          <div className="bar">
            <i style={{ width: `${(streak.current / next) * 100}%`, background: h.color }} />
          </div>
          <span className="tnum small">{next - streak.current} to go</span>
        </div>

        {h.kind === 'count' && (
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
            <div className="small muted">Last 30 days</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <b style={{ fontSize: 26 }} className="tnum">
                {formatQty(recent)}
              </b>
              <span className="muted">{h.unit}</span>
              {delta !== null && (
                <span className={`delta ${better ? 'up' : 'down'}`}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}% vs previous 30
                </span>
              )}
            </div>
            <div className="small faint">
              {quit ? 'Limit' : 'Minimum'} {formatQty(thresholds(h).min)} · {quit ? 'target' : 'goal'} {formatQty(thresholds(h).goal)} {h.unit}
            </div>
          </div>
        )}

        <div>
          <div className="small muted" style={{ marginBottom: 8 }}>
            History {streak.frozen.size > 0 && <span style={{ color: '#4a90e2' }}>· blue = shielded day</span>}
          </div>
          <Heatmap habit={h} logs={logs} today={today} />
        </div>

        <div className="small muted">
          {h.start !== null ? `Scheduled ${minutesToLabel(h.start)} – ${minutesToLabel(h.start + h.duration)} · ` : ''}
          Started {formatDay(h.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        {status !== 'none' && status !== 'future' && (
          <button className="btn block" onClick={() => setSkip(h, date, status !== 'skipped')}>
            {status === 'skipped' ? 'Undo rest day' : `Rest day ${date === today ? 'today' : formatDay(date, { weekday: 'short', day: 'numeric' })} (keeps streak)`}
          </button>
        )}
        <button className="btn danger block" onClick={remove}>
          <IconTrash width={18} /> Delete habit
        </button>
      </div>
    </Sheet>
  )
}
