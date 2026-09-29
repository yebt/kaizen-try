import { useState } from 'react'
import { minutesToLabel, type DateKey } from '../lib/date'
import { daysSinceMiss, formatQty, progressOf, statusOf, streakOf, thresholds } from '../lib/habits'
import { addQty, stepOf, toggleCheck, writeEntry } from '../lib/log'
import type { Habit, Logs } from '../lib/types'
import { IconCheck, IconFlame, IconMinus, IconPlus, IconShield } from './Icons'
import { Ring } from './Ring'
import { Sheet } from './Sheet'

interface Props {
  habit: Habit
  logs: Logs
  date: DateKey
  today: DateKey
  onOpen: () => void
}

export function HabitCard({ habit: h, logs, date, today, onOpen }: Props) {
  const entry = logs[date]?.[h.id]
  const status = statusOf(h, entry, date, today)
  const progress = progressOf(h, entry, date, today)
  const streak = streakOf(h, logs, today)
  const v = entry?.v ?? 0
  const won = status === 'done' && h.polarity === 'build'
  const [exact, setExact] = useState(false)
  const future = status === 'future'
  const { min, goal } = thresholds(h)
  const clean = h.polarity === 'quit' && h.kind === 'check' ? daysSinceMiss(h, logs, today) : 0

  let detail: string | null = null
  if (h.kind === 'count') {
    detail =
      h.polarity === 'build'
        ? `min ${formatQty(min)} · goal ${formatQty(goal)}`
        : `limit ${formatQty(min)}${goal < min ? ` · aim ≤${formatQty(goal)}` : ''}`
  }

  const ringColor = status === 'missed' ? 'var(--bad)' : status === 'ok' && h.polarity === 'build' ? 'var(--warn)' : h.color

  return (
    <div className={`habit ${won ? 'won' : ''}`}>
      <button className="main" onClick={onOpen} aria-label={`${h.name} details`}>
        <div className="emoji-ring">
          <Ring size={52} stroke={4} value={progress} color={ringColor} tick={h.kind === 'count' && h.polarity === 'build' ? min / goal : undefined} />
          <span>{h.emoji}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="name">{h.name}</div>
          <div className="meta">
            {streak.current > 0 && (
              <span className="flame" title="Current streak">
                <IconFlame />
                {streak.current}
              </span>
            )}
            {streak.freezes > 0 && (
              <span className="shield" title="Streak shields — they absorb one missed day each">
                <IconShield />
                {streak.freezes}
              </span>
            )}
            {h.start !== null && <span>{minutesToLabel(h.start)}</span>}
            {detail && <span className="tnum">{detail}</span>}
            {status === 'skipped' && <span>Rest day</span>}
          </div>
          {date === today && streak.recoverToday && <div className="nudge">Never miss twice — today gets you back on track</div>}
        </div>
      </button>

      {future ? null : h.kind === 'check' && h.polarity === 'build' ? (
        <button
          className={`check ${v ? 'on' : ''} ${status === 'skipped' ? 'skipped' : ''}`}
          onClick={() => toggleCheck(h, date)}
          aria-pressed={!!v}
          aria-label={v ? `Undo ${h.name}` : `Mark ${h.name} done`}
          style={v ? { background: h.color, borderColor: h.color } : undefined}
        >
          <IconCheck />
        </button>
      ) : h.kind === 'check' ? (
        v ? (
          <button className="slip" onClick={() => toggleCheck(h, date)} style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>
            Slipped · undo
          </button>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <div className="clean-badge">
              <b>{clean}</b>
              <small>{clean === 1 ? 'day clean' : 'days clean'}</small>
            </div>
            <button className="slip" onClick={() => toggleCheck(h, date)}>
              Slipped
            </button>
          </div>
        )
      ) : (
        <div className={`stepper ${status === 'done' && h.polarity === 'build' ? 'done' : ''}`}>
          <button className="step" onClick={() => addQty(h, date, -stepOf(h))} disabled={!v} aria-label="Decrease" style={{ opacity: v ? 1 : 0.4 }}>
            <IconMinus />
          </button>
          <button className="val tnum" onClick={() => setExact(true)} aria-label="Enter exact amount">
            {formatQty(v)}
            <small>{h.unit}</small>
          </button>
          <button className="step plus" onClick={() => addQty(h, date, stepOf(h))} aria-label="Increase" style={h.polarity === 'quit' ? undefined : { background: status === 'done' ? h.color : undefined, color: status === 'done' ? '#fff' : undefined }}>
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
  const presets = Array.from(new Set([min, goal, Math.round(goal / 2), goal * 1.5].filter((n) => n > 0).map((n) => Math.round(n * 10) / 10))).sort((a, b) => a - b)
  const commit = (n: number) => {
    onSave(Math.max(0, n))
    onClose()
  }
  return (
    <Sheet title={`${h.emoji} ${h.name}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          commit(Number(v) || 0)
        }}
      >
        <label className="field">
          <span>Total today ({h.unit})</span>
          <input className="input" style={{ fontSize: 28, fontWeight: 800, minHeight: 64 }} type="number" inputMode="decimal" min={0} step="any" autoFocus value={v} onChange={(e) => setV(e.target.value)} />
        </label>
        <div className="chips">
          {presets.map((p) => (
            <button type="button" key={p} className="chip" onClick={() => commit(p)}>
              {formatQty(p)} {h.unit}
            </button>
          ))}
        </div>
        <button className="btn primary block" style={{ minHeight: 52 }}>
          Save
        </button>
      </form>
    </Sheet>
  )
}
