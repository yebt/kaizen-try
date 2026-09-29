import { useMemo, useState } from 'react'
import { addDays, formatDay, fromKey, startOfWeek, type DateKey } from '../lib/date'
import { daySummary, levelInfo, totalXp } from '../lib/habits'
import { useStore } from '../lib/store'
import type { Habit } from '../lib/types'
import { HabitCard } from './HabitCard'
import { HabitDetail } from './HabitDetail'
import { TEMPLATES, type Draft } from './HabitForm'
import { IconLeft, IconRight } from './Icons'
import { Ring } from './Ring'

interface Props {
  today: DateKey
  date: DateKey
  setDate: (d: DateKey) => void
  onNew: (d?: Draft) => void
  daysSincePhoto: number | null
  goDiary: () => void
}

function heroCopy(done: number, total: number, perfect: boolean) {
  if (perfect) return ['Perfect day', 'Every habit handled. That’s how change compounds.']
  const left = total - done
  if (done === 0) return ['Let’s begin', 'Start with the easiest one — momentum does the rest.']
  if (left === 1) return ['One to go', 'You’re one habit away from a perfect day.']
  if (done / total >= 0.5) return ['Past halfway', `${left} left. You’re closer than you think.`]
  return ['Good start', `${done} down, ${left} to go.`]
}

export function TodayView({ today, date, setDate, onNew, daysSincePhoto, goDiary }: Props) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [open, setOpen] = useState<string | null>(null)
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])
  const summary = daySummary(active, logs, date, today)
  const xp = useMemo(() => totalXp(active, logs, today), [active, logs, today])
  const lvl = levelInfo(xp)
  const weekStart = startOfWeek(date)
  const isToday = date === today
  const d = fromKey(today)
  const freshStart = isToday && (d.getDay() === 1 || d.getDate() === 1)

  const groups = useMemo(() => {
    const sorted = [...summary.scheduled].sort((a, b) => (a.start ?? -1) - (b.start ?? -1) || a.order - b.order)
    const g: [string, Habit[]][] = [
      ['Anytime', []],
      ['Morning', []],
      ['Afternoon', []],
      ['Evening', []],
      ['Leaving behind', []],
    ]
    for (const h of sorted) {
      if (h.polarity === 'quit') g[4][1].push(h)
      else if (h.start === null) g[0][1].push(h)
      else if (h.start < 12 * 60) g[1][1].push(h)
      else if (h.start < 17 * 60) g[2][1].push(h)
      else g[3][1].push(h)
    }
    return g.filter(([, list]) => list.length)
  }, [summary.scheduled])

  const openHabit = habits.find((h) => h.id === open)
  const [title, copy] = heroCopy(summary.successes, summary.scheduled.length, summary.perfect)

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="sub">{formatDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>{isToday ? 'Today' : date < today ? formatDay(date, { weekday: 'long' }) : 'Upcoming'}</h1>
        </div>
        <div className="lvl-badge" title={`${xp} XP`}>
          Lv {lvl.level}
        </div>
      </header>

      <div className="row" style={{ gap: 0, marginBottom: 4 }}>
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Previous week">
          <IconLeft />
        </button>
        <div className="spacer" />
        {!isToday && (
          <button className="btn ghost sm" onClick={() => setDate(today)}>
            Back to today
          </button>
        )}
        <div className="spacer" />
        <button className="icon-btn" onClick={() => setDate(addDays(date, 7))} aria-label="Next week">
          <IconRight />
        </button>
      </div>
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(weekStart, i)
          const s = daySummary(active, logs, day, today)
          return (
            <button
              key={day}
              onClick={() => setDate(day)}
              aria-current={day === date ? 'date' : undefined}
              className={`${day === today ? 'is-today' : ''} ${day > today ? 'future' : ''}`}
            >
              <span className="wd">{formatDay(day, { weekday: 'narrow' })}</span>
              <div style={{ position: 'relative', width: 32, height: 32 }}>
                <Ring size={32} stroke={3.5} value={day > today ? 0 : s.progress} color={s.perfect ? 'var(--good)' : 'var(--accent)'} />
                <span className="dn" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  {fromKey(day).getDate()}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {active.length === 0 ? (
        <div className="card empty">
          <div className="big">🌱</div>
          <h2>Small steps, every day</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Kaizen means continuous improvement. Pick one habit to start — you can add more later.
          </p>
          <div className="chips" style={{ justifyContent: 'center' }}>
            {TEMPLATES.map((t) => (
              <button key={t.name} className="chip" onClick={() => onNew(t)}>
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
          <button className="btn primary" style={{ marginTop: 20 }} onClick={() => onNew()}>
            Create my own
          </button>
        </div>
      ) : (
        <div className="stack">
          {summary.scheduled.length > 0 && (
            <div className="card">
              <div className="hero">
                <div className="ring-wrap">
                  <Ring size={96} stroke={10} value={summary.progress} color={summary.perfect ? 'var(--good)' : 'var(--accent)'} />
                  <div className="ring-label tnum">
                    <div>
                      {summary.successes}/{summary.scheduled.length}
                      <small>{Math.round(summary.progress * 100)}%</small>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2>{date > today ? 'Coming up' : title}</h2>
                  <p>{date > today ? `${summary.scheduled.length} habits planned.` : copy}</p>
                  <div className="level">
                    <span>Lv {lvl.level}</span>
                    <div className="bar">
                      <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
                    </div>
                    <span className="tnum">
                      {lvl.into}/{lvl.need} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {freshStart && (
            <div className="banner">
              <span className="icon">🌅</span>
              <div>
                <strong>Fresh start</strong>
                New {d.getDate() === 1 ? 'month' : 'week'}, clean slate. Whatever happened before, today counts.
              </div>
            </div>
          )}

          {isToday && (daysSincePhoto === null || daysSincePhoto >= 14) && (
            <button className="banner" style={{ textAlign: 'left', background: 'var(--surface)', boxShadow: 'var(--shadow)' }} onClick={goDiary}>
              <span className="icon">📸</span>
              <div>
                <strong>{daysSincePhoto === null ? 'Take your first progress photo' : `${daysSincePhoto} days since your last photo`}</strong>
                <span className="muted">Change is slow to see day to day — photos make it visible.</span>
              </div>
            </button>
          )}

          {summary.scheduled.length === 0 && (
            <div className="card empty">
              <div className="big">☕</div>
              <h2>Nothing scheduled</h2>
              <p className="muted">Enjoy the rest — recovery is part of the process.</p>
            </div>
          )}

          {groups.map(([label, list]) => (
            <section key={label}>
              <h3 className="section-title">{label}</h3>
              <div className="stack" style={{ gap: 10 }}>
                {list.map((h) => (
                  <HabitCard key={h.id} habit={h} logs={logs} date={date} today={today} onOpen={() => setOpen(h.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {openHabit && <HabitDetail habit={openHabit} logs={logs} date={date} today={today} onClose={() => setOpen(null)} />}
    </div>
  )
}
