import { useMemo, useRef, useState } from 'react'
import { addDays, formatDay, fromKey, startOfWeek, type DateKey } from '../lib/date'
import { daySummary, isSuccess, levelInfo, progressOf, statusOf, streakOf, totalXp } from '../lib/habits'
import { useSettings, useStore } from '../lib/store'
import type { Habit } from '../lib/types'
import { HabitCard } from './HabitCard'
import { HabitDetail } from './HabitDetail'
import { TEMPLATES, type Draft } from './HabitForm'
import { HabitIcon } from './HabitIcon'
import { IconCamera, IconFlame, IconRight } from './Icons'

interface Props {
  today: DateKey
  date: DateKey
  setDate: (d: DateKey) => void
  onNew: (d?: Draft) => void
  daysSincePhoto: number | null
  goDiary: () => void
  onSettings: () => void
}

function summaryCopy(done: number, total: number, perfect: boolean, future: boolean): [string, string] {
  if (future) return [`${total} planned`, '']
  if (perfect) return [`All ${total} done`, ' — a perfect day']
  const left = total - done
  if (done === 0) return [`0 of ${total} done`, ' — start with the easiest one']
  if (left === 1) return [`${done} of ${total} done`, ' — one more for a perfect day']
  return [`${done} of ${total} done`, ` — ${left} more for a perfect day`]
}

export function TodayView({ today, date, setDate, onNew, daysSincePhoto, goDiary, onSettings }: Props) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [open, setOpen] = useState<string | null>(null)
  const swipe = useRef<number | null>(null)
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])
  const summary = daySummary(active, logs, date, today)
  const xp = useMemo(() => totalXp(active, logs, today), [active, logs, today])
  const lvl = levelInfo(xp)
  const best = useMemo(() => Math.max(0, ...active.filter((h) => h.polarity === 'build').map((h) => streakOf(h, logs, today).current)), [active, logs, today])
  const settings = useSettings()
  const weekStart = startOfWeek(date, settings.weekStartsOn)
  const remind = settings.photoReminderDays
  const showPhoto = date === today && remind > 0 && (daysSincePhoto === null || daysSincePhoto >= remind)
  const isToday = date === today
  const d = fromKey(today)
  const freshStart = isToday && (d.getDay() === 1 || d.getDate() === 1)

  const groups = useMemo(() => {
    const sorted = [...summary.scheduled].sort((a, b) => (a.start ?? -1) - (b.start ?? -1) || a.order - b.order)
    const g: [string, Habit[]][] = [
      ['Morning', []],
      ['Afternoon', []],
      ['Evening', []],
      ['Anytime', []],
      ['Leaving behind', []],
    ]
    for (const h of sorted) {
      if (h.polarity === 'quit') g[4][1].push(h)
      else if (h.start === null) g[3][1].push(h)
      else if (h.start < 12 * 60) g[0][1].push(h)
      else if (h.start < 17 * 60) g[1][1].push(h)
      else g[2][1].push(h)
    }
    return g.filter(([, list]) => list.length)
  }, [summary.scheduled])

  const openHabit = habits.find((h) => h.id === open)
  const [lead, rest] = summaryCopy(summary.successes, summary.scheduled.length, summary.perfect, date > today)

  return (
    <div className="app">
      <header className="page-head">
        <div>
          <div className="eyebrow">{formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{isToday ? 'Today' : date < today ? formatDay(date, { weekday: 'long' }) : 'Upcoming'}</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {active.length > 0 && (
            <span className="streak-pill" title={`${xp} XP · longest active streak ${best} days`}>
              <IconFlame />
              <span className="mono">{best}</span>
              <span className="faint">·</span>
              <span>Lv {lvl.level}</span>
            </span>
          )}
          <button className="avatar" onClick={onSettings} aria-label="Profile and settings">
            {settings.name.trim()[0]?.toUpperCase() || 'K'}
          </button>
        </div>
      </header>

      <div>
        <button className="sr-only" onClick={() => setDate(addDays(date, -7))}>
          Previous week
        </button>
        <div
          className="week"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const dx = e.clientX - (swipe.current ?? e.clientX)
            swipe.current = null
            if (Math.abs(dx) > 50) setDate(addDays(date, dx < 0 ? 7 : -7))
          }}
          onPointerCancel={() => (swipe.current = null)}
        >
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i)
            const s = daySummary(active, logs, day, today)
            const dot = day > today || !s.scheduled.length ? '' : s.perfect ? 'full' : s.progress > 0 ? 'part' : ''
            return (
              <button
                key={day}
                onClick={() => setDate(day)}
                aria-current={day === date ? 'date' : undefined}
                aria-label={formatDay(day, { weekday: 'long', day: 'numeric' })}
                className={`${day === today ? 'is-today' : ''} ${day > today ? 'future' : ''}`}
              >
                <span className="wd">{formatDay(day, { weekday: 'narrow' })}</span>
                <span className="dn">{fromKey(day).getDate()}</span>
                <span className={`dot ${dot}`} />
              </button>
            )
          })}
        </div>
        <button className="sr-only" onClick={() => setDate(addDays(date, 7))}>
          Next week
        </button>
        {!isToday && (
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button className="btn ghost sm" onClick={() => setDate(today)}>
              Jump to today
            </button>
          </div>
        )}
      </div>

      {active.length === 0 ? (
        <div className="panel empty">
          <h2>Small steps, every day</h2>
          <p>Kaizen means continuous improvement. Pick one habit to start — you can add more later.</p>
          <div className="list" style={{ width: '100%', marginTop: 12, textAlign: 'left' }}>
            {TEMPLATES.slice(0, 5).map((t) => (
              <button key={t.name} className="habit" style={{ width: '100%', minHeight: 60 }} onClick={() => onNew(t)}>
                <HabitIcon habit={t as Habit} size={36} />
                <div style={{ flex: 1 }}>
                  <div className="name">{t.name}</div>
                  <div className="meta">
                    {t.polarity === 'quit' ? 'Leave' : 'Build'} · {t.kind === 'count' ? `goal ${t.goal} ${t.unit}` : t.goal ? `${t.goal} times a day` : 'check off daily'}
                  </div>
                </div>
                <IconRight width={18} className="faint" />
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ marginTop: 8 }} onClick={() => onNew()}>
            Create my own
          </button>
        </div>
      ) : (
        <>
          {summary.scheduled.length > 0 && (
            <div className="summary" aria-live="polite">
              <div className="line">
                <div>
                  <b>{lead}</b>
                  <span className="muted">{rest}</span>
                </div>
                {date <= today && <span className="mono small muted">{Math.round(summary.progress * 100)}%</span>}
              </div>
              <div className="segbar" aria-hidden>
                {summary.scheduled.map((h) => {
                  const e = logs[date]?.[h.id]
                  const s = statusOf(h, e, date, today)
                  const cls = isSuccess(s) || s === 'skipped' ? 'on' : progressOf(h, e, date, today) > 0 ? 'half' : ''
                  return <i key={h.id} className={cls} />
                })}
              </div>
            </div>
          )}

          {(freshStart || showPhoto) && (
            <div className="list">
              {freshStart && (
                <div className="notice">
                  <span className="tile" style={{ width: 36, height: 36, ['--c' as string]: 'var(--accent)' }}>
                    <IconRight width={18} />
                  </span>
                  <div>
                    <strong>Fresh start</strong>
                    <span className="muted">New {d.getDate() === 1 ? 'month' : 'week'}, clean slate. Today counts.</span>
                  </div>
                </div>
              )}
              {showPhoto && (
                <button className="notice" onClick={goDiary}>
                  <span className="tile" style={{ width: 36, height: 36 }}>
                    <IconCamera width={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{daysSincePhoto === null ? 'Take your first progress photo' : `Progress photo · ${daysSincePhoto} days since the last`}</strong>
                    <span className="muted">Change is slow day to day — photos make it visible.</span>
                  </div>
                  <IconRight width={18} className="faint" />
                </button>
              )}
            </div>
          )}

          {summary.scheduled.length === 0 && (
            <div className="panel empty">
              <h2>Nothing scheduled</h2>
              <p>Enjoy the rest — recovery is part of the process.</p>
            </div>
          )}

          {groups.map(([label, list]) => (
            <section key={label} className="group">
              <h3 className="lbl">{label}</h3>
              <div className="list">
                {list.map((h) => (
                  <HabitCard key={h.id} habit={h} logs={logs} date={date} today={today} onOpen={() => setOpen(h.id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {openHabit && <HabitDetail habit={openHabit} logs={logs} date={date} today={today} onClose={() => setOpen(null)} />}
    </div>
  )
}
