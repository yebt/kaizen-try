import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDay, fromKey, minutesToLabel, nowMinutes, type DateKey } from '../lib/date'
import { haptic } from '../lib/feedback'
import { isScheduled, isSuccess, statusOf } from '../lib/habits'
import { toggleCheck } from '../lib/log'
import { actions, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit } from '../lib/types'
import { HabitDetail, scheduleLabel } from './HabitDetail'
import { HabitIcon } from './HabitIcon'
import type { Draft } from './HabitForm'
import { IconLeft, IconRight } from './Icons'

const PPM = 1.2 // pixels per minute → 72px per hour
const SNAP = 15
const LONG_PRESS = 350
const MOVE_TOLERANCE = 8
const snap = (m: number) => Math.round(m / SNAP) * SNAP

interface Placed {
  habit: Habit
  start: number
  duration: number
  col: number
  cols: number
}

/** Google-Calendar-style side-by-side packing for overlapping blocks. */
export function layoutDay(items: { habit: Habit; start: number; duration: number }[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.duration - a.duration)
  const out: Placed[] = []
  let cluster: Placed[] = []
  let colEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = colEnds.length
    cluster.forEach((p) => (p.cols = cols))
    cluster = []
    colEnds = []
  }
  for (const it of sorted) {
    const end = it.start + Math.max(it.duration, 20)
    if (it.start >= clusterEnd) flush()
    let col = colEnds.findIndex((e) => e <= it.start)
    if (col === -1) col = colEnds.push(0) - 1
    colEnds[col] = end
    const p = { ...it, col, cols: 1 }
    cluster.push(p)
    out.push(p)
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return out
}

type Gesture =
  | { kind: 'pending'; id: string; day: DateKey; x: number; y: number; timer: number; start: number; duration: number; pointerId: number; target: HTMLElement }
  | { kind: 'move' | 'resize'; id: string; day: DateKey; y: number; start: number; duration: number; curStart: number; curDuration: number }
  | { kind: 'slot'; day: DateKey; x: number; y: number; moved: boolean }
  | null

interface Props {
  today: DateKey
  onNew: (d?: Draft) => void
}

export function CalendarView({ today, onNew }: Props) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [anchor, setAnchor] = useState(today)
  const [span, setSpan] = useState<1 | 3>(() => (innerWidth >= 700 ? 3 : 1))
  const [selected, setSelected] = useState<{ id: string; day: DateKey } | null>(null)
  const [detail, setDetail] = useState<{ id: string; day: DateKey } | null>(null)
  const [live, setLive] = useState<{ id: string; start: number; duration: number; kind: 'move' | 'resize' } | null>(null)
  const [ghost, setGhost] = useState<{ day: DateKey; start: number } | null>(null)
  const [now, setNow] = useState(nowMinutes())
  const scroller = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(anchor, i)), [anchor, span])
  const active = habits.filter((h) => !h.archived)

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Start scrolled to "now" (or the first block), like Google Calendar.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const firstTimed = Math.min(...active.filter((h) => h.start !== null).map((h) => h.start!), now)
    el.scrollTop = Math.max(0, (anchor === today ? now - 90 : firstTimed - 30) * PPM)
  }, [])

  // Block native scrolling while a block is being dragged (needs a non-passive listener).
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const stop = (e: TouchEvent) => {
      const g = gesture.current
      if (g && (g.kind === 'move' || g.kind === 'resize')) e.preventDefault()
    }
    el.addEventListener('touchmove', stop, { passive: false })
    return () => el.removeEventListener('touchmove', stop)
  }, [])

  const commit = (id: string, patch: Partial<Habit>, before: Partial<Habit>) => {
    actions.patchHabit(id, patch)
    const h = habits.find((x) => x.id === id)
    const start = patch.start ?? h?.start ?? 0
    const duration = patch.duration ?? h?.duration ?? 30
    toast(`${h?.name ?? 'Habit'} → ${minutesToLabel(start)}–${minutesToLabel(start + duration)} (every scheduled day)`, () => actions.patchHabit(id, before))
  }

  const autoScroll = (clientY: number) => {
    const el = scroller.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (clientY < r.top + 48) el.scrollTop -= 10
    else if (clientY > r.bottom - 96) el.scrollTop += 10
  }

  // ---- block gestures --------------------------------------------------------
  const onBlockDown = (e: React.PointerEvent, h: Habit, day: DateKey) => {
    e.stopPropagation()
    swipe.current = null
    const target = e.currentTarget as HTMLElement
    const timer = window.setTimeout(() => {
      const g = gesture.current
      if (g?.kind !== 'pending') return
      haptic(15)
      g.target.setPointerCapture?.(g.pointerId)
      gesture.current = { kind: 'move', id: h.id, day, y: g.y, start: g.start, duration: g.duration, curStart: g.start, curDuration: g.duration }
      setSelected({ id: h.id, day })
      setLive({ id: h.id, start: g.start, duration: g.duration, kind: 'move' })
    }, LONG_PRESS)
    gesture.current = { kind: 'pending', id: h.id, day, x: e.clientX, y: e.clientY, timer, start: h.start!, duration: h.duration, pointerId: e.pointerId, target }
  }

  const onHandleDown = (e: React.PointerEvent, h: Habit, day: DateKey) => {
    e.stopPropagation()
    swipe.current = null
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    gesture.current = { kind: 'resize', id: h.id, day, y: e.clientY, start: h.start!, duration: h.duration, curStart: h.start!, curDuration: h.duration }
    setLive({ id: h.id, start: h.start!, duration: h.duration, kind: 'resize' })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pending' || g.kind === 'slot') {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > MOVE_TOLERANCE) {
        if (g.kind === 'pending') {
          clearTimeout(g.timer)
          gesture.current = null
        } else g.moved = true
      }
      return
    }
    autoScroll(e.clientY)
    const dMin = (e.clientY - g.y) / PPM
    if (g.kind === 'move') {
      const s = Math.min(Math.max(0, snap(g.start + dMin)), 1440 - Math.max(g.duration, SNAP))
      if (s !== g.curStart) haptic(4)
      g.curStart = s
      setLive({ id: g.id, start: s, duration: g.duration, kind: 'move' })
    } else {
      const d = Math.min(Math.max(SNAP, snap(g.duration + dMin)), 1440 - g.start)
      if (d !== g.curDuration) haptic(4)
      g.curDuration = d
      setLive({ id: g.id, start: g.start, duration: d, kind: 'resize' })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (g?.kind === 'pending') {
      clearTimeout(g.timer)
      setSelected((s) => (s?.id === g.id && s.day === g.day ? null : { id: g.id, day: g.day }))
    } else if (g?.kind === 'move' || g?.kind === 'resize') {
      setLive(null)
      if (g.curStart !== g.start || g.curDuration !== g.duration)
        commit(g.id, { start: g.curStart, duration: g.curDuration }, { start: g.start, duration: g.duration })
    } else if (g?.kind === 'slot' && !g.moved) {
      if (selected) setSelected(null)
      else {
        const col = (e.target as HTMLElement).closest('.cal-col') as HTMLElement | null
        if (col) {
          const r = col.getBoundingClientRect()
          const start = Math.min(snap((e.clientY - r.top) / PPM - SNAP / 2), 1440 - 30)
          setGhost({ day: g.day, start: Math.max(0, start) })
          onNew({ start: Math.max(0, start), duration: 30, days: [0, 1, 2, 3, 4, 5, 6] })
        }
      }
    }
    // horizontal swipe → change day(s)
    const sw = swipe.current
    swipe.current = null
    if (sw && !(g && (g.kind === 'move' || g.kind === 'resize'))) {
      const dx = e.clientX - sw.x
      const dy = e.clientY - sw.y
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) setAnchor((a) => addDays(a, dx < 0 ? span : -span))
    }
  }

  const onCancel = () => {
    const g = gesture.current
    if (g?.kind === 'pending') clearTimeout(g.timer)
    if (g?.kind === 'move' || g?.kind === 'resize') setLive(null)
    gesture.current = null
    swipe.current = null
  }

  // Ghost slot disappears once the form closes.
  useEffect(() => {
    if (!ghost) return
    const t = setTimeout(() => setGhost(null), 600)
    return () => clearTimeout(t)
  }, [ghost, habits])

  const cols = `repeat(${span}, 1fr)`
  const selHabit = selected && habits.find((h) => h.id === selected.id)
  const detailHabit = detail && habits.find((h) => h.id === detail.id)
  const anchorDate = fromKey(anchor)
  const title = anchorDate.toLocaleDateString(undefined, anchorDate.getFullYear() === fromKey(today).getFullYear() ? { month: 'long' } : { month: 'short', year: 'numeric' })

  return (
    <div className="app full">
      <header className="cal-head">
        <h1>{title}</h1>
        {!days.includes(today) && (
          <button className="btn ghost sm" onClick={() => setAnchor(today)}>
            Today
          </button>
        )}
        <div className="segmented sm">
          <button aria-pressed={span === 1} onClick={() => setSpan(1)}>
            Day
          </button>
          <button aria-pressed={span === 3} onClick={() => setSpan(3)}>
            3 days
          </button>
        </div>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, -span))} aria-label="Previous">
          <IconLeft />
        </button>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, span))} aria-label="Next">
          <IconRight />
        </button>
      </header>

      <div className="cal-days" style={{ gridTemplateColumns: cols }}>
        {days.map((d) => (
          <div key={d} className={`cal-day-h ${d === today ? 'is-today' : ''}`}>
            <div className="wd">{formatDay(d, { weekday: 'short' })}</div>
            <div className="dn">{fromKey(d).getDate()}</div>
          </div>
        ))}
      </div>

      <div className="allday" style={{ gridTemplateColumns: cols }}>
        <span className="lbl-any">
          Any
          <br />
          time
        </span>
        {days.map((d) => (
          <div className={`col ${span === 1 ? 'wrap' : ''}`} key={d}>
            {active
              .filter((h) => h.start === null && isScheduled(h, d))
              .map((h) => {
                const s = statusOf(h, logs[d]?.[h.id], d, today)
                return (
                  <button
                    key={h.id}
                    className={`allday-item ${isSuccess(s) && h.polarity === 'build' ? 'won' : ''}`}
                    style={{ ['--c' as string]: h.color }}
                    onClick={() => setDetail({ id: h.id, day: d })}
                  >
                    {h.name}
                  </button>
                )
              })}
          </div>
        ))}
      </div>

      <div
        className={`cal-scroll ${selected ? 'has-action' : ''}`}
        ref={scroller}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="cal-grid" style={{ height: 1440 * PPM + 16 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="cal-hour" style={{ top: h * 60 * PPM }}>
              {h > 0 && <span>{minutesToLabel(h * 60)}</span>}
            </div>
          ))}
          <div className="cal-cols" style={{ gridTemplateColumns: cols, height: 1440 * PPM }}>
            {days.map((d) => {
              const items = active
                .filter((h) => h.start !== null && isScheduled(h, d))
                .map((h) => {
                  const o = live?.id === h.id ? live : null
                  return { habit: h, start: o ? o.start : h.start!, duration: o ? o.duration : h.duration }
                })
              return (
                <div
                  key={d}
                  className="cal-col"
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) gesture.current = { kind: 'slot', day: d, x: e.clientX, y: e.clientY, moved: false }
                  }}
                >
                  {layoutDay(items).map((p) => {
                    const h = p.habit
                    const s = statusOf(h, logs[d]?.[h.id], d, today)
                    const won = isSuccess(s) && h.polarity === 'build'
                    const isSel = selected?.id === h.id && selected.day === d
                    const isLive = live?.id === h.id
                    const height = Math.max(p.duration * PPM, 22)
                    return (
                      <div
                        key={h.id}
                        className={`event ${won ? 'won' : ''} ${isSel ? 'selected' : ''} ${isLive && live.kind === 'move' ? 'dragging' : ''}`}
                        style={{
                          top: p.start * PPM,
                          height,
                          left: `calc(${(p.col / p.cols) * 100}% + 1px)`,
                          width: `calc(${100 / p.cols}% - 3px)`,
                          ['--c' as string]: h.color,
                        }}
                        onPointerDown={(e) => onBlockDown(e, h, d)}
                        role="button"
                        aria-label={`${h.name}, ${minutesToLabel(p.start)}. Tap to select, long-press to move.`}
                      >
                        <b>{h.name}</b>
                        {height > 36 && (
                          <span className="t">
                            {minutesToLabel(p.start)} – {minutesToLabel(p.start + p.duration)}
                          </span>
                        )}
                        {isSel && <span className="knob" />}
                        {isSel && <div className="handle" onPointerDown={(e) => onHandleDown(e, h, d)} aria-label="Drag to resize" />}
                      </div>
                    )
                  })}
                  {ghost?.day === d && (
                    <div className="ghost-slot" style={{ top: ghost.start * PPM, height: 30 * PPM }}>
                      {minutesToLabel(ghost.start)}
                    </div>
                  )}
                  {d === today && <div className="now-line" style={{ top: now * PPM }} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selHabit && selected && (
        <div className="cal-action" role="toolbar">
          <HabitIcon habit={selHabit} size={36} />
          <div className="name">
            <b>{selHabit.name}</b>
            <span>
              {minutesToLabel(selHabit.start ?? 0)} – {minutesToLabel((selHabit.start ?? 0) + selHabit.duration)} · {scheduleLabel(selHabit.days)}
            </span>
          </div>
          <button className="btn sm" onClick={() => setDetail(selected)}>
            Open
          </button>
          {selHabit.kind === 'check' && selHabit.polarity === 'build' && selected.day <= today && (
            <button className="btn sm primary" onClick={() => toggleCheck(selHabit, selected.day)}>
              {logs[selected.day]?.[selHabit.id]?.v ? 'Undo' : 'Done'}
            </button>
          )}
        </div>
      )}

      {detailHabit && detail && (
        <HabitDetail habit={detailHabit} logs={logs} date={detail.day} today={today} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
