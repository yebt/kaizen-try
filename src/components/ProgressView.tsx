import { useMemo, useState } from 'react'
import { addDays, type DateKey } from '../lib/date'
import { completionRate, daySummary, levelInfo, streakOf, strengthOf, totalWins, totalXp, XP_DONE, XP_OK, XP_PERFECT_DAY } from '../lib/habits'
import { useStore } from '../lib/store'
import { HabitDetail, Heatmap } from './HabitDetail'
import { IconFlame } from './Icons'
import { Ring } from './Ring'

export function ProgressView({ today }: { today: DateKey }) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [open, setOpen] = useState<string | null>(null)
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])

  const stats = useMemo(() => {
    const xp = totalXp(active, logs, today)
    let perfect = 0
    let perfectRun = 0
    let bestPerfectRun = 0
    const first = active.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), today)
    for (let d = first; d < today; d = addDays(d, 1)) {
      const s = daySummary(active, logs, d, today)
      if (!s.scheduled.length) continue
      if (s.perfect) {
        perfect++
        perfectRun++
        bestPerfectRun = Math.max(bestPerfectRun, perfectRun)
      } else perfectRun = 0
    }
    const last7 = Array.from({ length: 7 }, (_, i) => daySummary(active, logs, addDays(today, i - 6), today).progress)
    const wins = active.reduce((n, h) => n + totalWins(h, logs, today), 0)
    return { xp, perfect, bestPerfectRun, last7, wins }
  }, [active, logs, today])

  const lvl = levelInfo(stats.xp)
  const openHabit = habits.find((h) => h.id === open)
  const week = stats.last7.reduce((a, b) => a + b, 0) / 7

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="sub">Evidence you’re changing</div>
          <h1>Progress</h1>
        </div>
      </header>

      {active.length === 0 ? (
        <div className="card empty">
          <div className="big">📈</div>
          <h2>No data yet</h2>
          <p className="muted">Add a habit and your progress will grow here, day by day.</p>
        </div>
      ) : (
        <div className="stack">
          <div className="card">
            <div className="row">
              <div className="lvl-badge" style={{ height: 56, minWidth: 56, fontSize: 18 }}>
                {lvl.level}
              </div>
              <div style={{ flex: 1 }}>
                <b>Level {lvl.level}</b>
                <div className="bar" style={{ margin: '6px 0 4px' }}>
                  <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
                </div>
                <div className="small muted tnum">
                  {lvl.need - lvl.into} XP to level {lvl.level + 1} · {stats.xp} XP total
                </div>
              </div>
            </div>
            <p className="small faint" style={{ marginTop: 10 }}>
              +{XP_DONE} per goal reached · +{XP_OK} for hitting the minimum · +{XP_PERFECT_DAY} per perfect day. XP never goes down.
            </p>
          </div>

          <div className="stats">
            <div className="stat">
              <b>{stats.wins}</b>
              <span>total wins</span>
            </div>
            <div className="stat">
              <b>{stats.perfect}</b>
              <span>perfect days</span>
            </div>
            <div className="stat">
              <b>{Math.round(week * 100)}%</b>
              <span>this week</span>
            </div>
          </div>

          <div className="card">
            <div className="small muted" style={{ marginBottom: 10 }}>
              Last 7 days
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', height: 96 }}>
              {stats.last7.map((p, i) => {
                const d = addDays(today, i - 6)
                return (
                  <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 28,
                        height: `${Math.max(p * 72, 4)}px`,
                        borderRadius: 6,
                        background: p >= 1 ? 'var(--good)' : 'var(--accent)',
                        opacity: p ? 1 : 0.25,
                        transition: 'height .4s',
                      }}
                    />
                    <span className="small faint">{new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <h3 className="section-title">Habits</h3>
          {active.map((h) => {
            const st = streakOf(h, logs, today)
            const strength = strengthOf(h, logs, today)
            const rate = completionRate(h, logs, today)
            return (
              <button key={h.id} className="card" style={{ textAlign: 'left', display: 'block', width: '100%' }} onClick={() => setOpen(h.id)}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: 44, height: 44 }}>
                    <Ring size={44} stroke={4} value={strength} color={h.color} />
                    <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>{h.emoji}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</b>
                    <span className="small muted">
                      Strength {Math.round(strength * 100)}% · {rate === null ? 'new' : `${Math.round(rate * 100)}% last 30d`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="flame" style={{ fontSize: 18 }}>
                      <IconFlame width={16} height={16} />
                      {st.current}
                    </span>
                    <div className="small faint">best {st.best}</div>
                  </div>
                </div>
                <Heatmap habit={h} logs={logs} today={today} weeks={16} />
              </button>
            )
          })}
          <p className="small faint" style={{ textAlign: 'center', marginTop: 8 }}>
            Habit strength rises with consistency and dips gently on a miss — one bad day never erases your work.
          </p>
        </div>
      )}

      {openHabit && <HabitDetail habit={openHabit} logs={logs} date={today} today={today} onClose={() => setOpen(null)} />}
    </div>
  )
}
