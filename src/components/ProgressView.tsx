import { useMemo, useState } from 'react'
import { addDays, formatDay, type DateKey } from '../lib/date'
import { daySummary, levelInfo, statusOf, streakOf, strengthOf, totalWins, totalXp, XP_DONE, XP_OK, XP_PERFECT_DAY } from '../lib/habits'
import { useStore } from '../lib/store'
import { HabitDetail } from './HabitDetail'
import { HabitIcon } from './HabitIcon'

export function ProgressView({ today }: { today: DateKey }) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [open, setOpen] = useState<string | null>(null)
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])

  const stats = useMemo(() => {
    const xp = totalXp(active, logs, today)
    let perfect = 0
    const first = active.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), today)
    for (let d = first; d < today; d = addDays(d, 1)) if (daySummary(active, logs, d, today).perfect) perfect++
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      const s = daySummary(active, logs, d, today)
      return { d, p: s.progress, perfect: s.perfect && d < today, has: s.scheduled.length > 0 }
    })
    const wins = active.reduce((n, h) => n + totalWins(h, logs, today), 0)
    const week = last7.filter((x) => x.has)
    return { xp, perfect, last7, wins, week: week.length ? week.reduce((a, x) => a + x.p, 0) / week.length : 0 }
  }, [active, logs, today])

  const lvl = levelInfo(stats.xp)
  const openHabit = habits.find((h) => h.id === open)

  return (
    <div className="app">
      <header className="page-head">
        <div>
          <div className="eyebrow">Evidence you’re changing</div>
          <h1>Progress</h1>
        </div>
      </header>

      {active.length === 0 ? (
        <div className="panel empty">
          <h2>No data yet</h2>
          <p>Add a habit and your progress will build up here, day by day.</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b style={{ fontWeight: 600 }}>Level {lvl.level}</b>
              <span className="mono xs muted">
                {lvl.into} / {lvl.need} XP
              </span>
            </div>
            <div className="bar" style={{ margin: '10px 0 8px' }}>
              <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
            </div>
            <div className="xs faint">
              XP only goes up — +{XP_DONE} per goal, +{XP_OK} per minimum, +{XP_PERFECT_DAY} per perfect day. {lvl.need - lvl.into} XP to level {lvl.level + 1}.
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat">
              <b>{stats.wins}</b>
              <span>total wins</span>
            </div>
            <div className="stat">
              <b>{stats.perfect}</b>
              <span>perfect days</span>
            </div>
            <div className="stat">
              <b>{Math.round(stats.week * 100)}%</b>
              <span>last 7 days</span>
            </div>
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="lbl" style={{ padding: 0 }}>
                Last 7 days
              </span>
              <span className="legend">
                <span>
                  <i style={{ background: 'var(--accent)' }} />
                  perfect day
                </span>
              </span>
            </div>
            <div className="bars">
              {stats.last7.map(({ d, p, perfect, has }) => (
                <div key={d}>
                  <i className={perfect ? 'done' : !has || p === 0 ? 'none' : ''} style={{ height: `${Math.max(p * 92, 4)}px` }} title={`${Math.round(p * 100)}%`} />
                  <span>{formatDay(d, { weekday: 'narrow' })}</span>
                </div>
              ))}
            </div>
          </div>

          <section className="group">
            <h3 className="lbl">Habits · last 14 days</h3>
            <div className="list">
              {active.map((h) => {
                const st = streakOf(h, logs, today)
                const strength = strengthOf(h, logs, today)
                return (
                  <button key={h.id} className="habit" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(h.id)}>
                    <HabitIcon habit={h} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">{h.name}</div>
                      <div className="spark" aria-hidden>
                        {Array.from({ length: 14 }, (_, i) => {
                          const d = addDays(today, i - 13)
                          const s = statusOf(h, logs[d]?.[h.id], d, today)
                          const bg = s === 'done' ? h.color : s === 'ok' ? `color-mix(in srgb, ${h.color} 50%, transparent)` : undefined
                          return <i key={d} style={bg ? { background: bg } : s === 'none' || s === 'skipped' ? { opacity: 0.4 } : undefined} />
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: 6 }}>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 500 }}>
                        {Math.round(strength * 100)}%
                      </div>
                      <div className="xs faint">{st.current ? `${st.current}d streak` : 'strength'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
          <p className="xs faint" style={{ textAlign: 'center' }}>
            Strength rises with consistency and dips gently on a miss — one bad day never erases your work.
          </p>
        </>
      )}

      {openHabit && <HabitDetail habit={openHabit} logs={logs} date={today} today={today} onClose={() => setOpen(null)} />}
    </div>
  )
}
