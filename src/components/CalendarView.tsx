import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, formatDay, fromKey, minutesToLabel, nowMinutes, type DateKey } from '../lib/date'
import { haptic } from '../lib/feedback'
import { ask } from '../lib/confirm'
import { blocksOf, isScheduled, isSuccess, statusOf, timesOf } from '../lib/habits'
import { tapCheck } from '../lib/log'
import { actions, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Habit } from '../lib/types'
import { HabitDetail, scheduleLabel } from './HabitDetail'
import { HabitIcon } from './HabitIcon'
import type { Draft } from './HabitForm'
import { IconLeft, IconRight } from './Icons'
import { partOfDay, repeatPhrase, ScheduleSheet } from './ScheduleSheet'

const PPM = 1.2 // pixels per minute → 72px per hour
const SNAP = 15
const LONG_PRESS = 350
const MOVE_TOLERANCE = 8
const snap = (m: number) => Math.round(m / SNAP) * SNAP

interface Placed {
  habit: Habit
  /** Which of the habit's blocks (habits done several times a day can have one per time). */
  slot?: number
  start: number
  duration: number
  col: number
  cols: number
}

/** Google-Calendar-style side-by-side packing for overlapping blocks. */
export function layoutDay(items: { habit: Habit; start: number; duration: number; slot?: number }[]): Placed[] {
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

/** Teach the drag gesture a few times, then stay quiet. */
function placeTip() {
  try {
    const n = Number(localStorage.getItem('kaizen:tip-place') ?? 0)
    if (n >= 3) return
    localStorage.setItem('kaizen:tip-place', String(n + 1))
  } catch {
    return
  }
  toast('Tip: hold it and drag onto the calendar to give it a time')
}

type Gesture =
  | { kind: 'pending'; id: string; slot: number; day: DateKey; x: number; y: number; timer: number; start: number; duration: number; pointerId: number; target: HTMLElement }
  | { kind: 'move' | 'resize'; id: string; slot: number; day: DateKey; y: number; start: number; duration: number; curStart: number; curDuration: number; overAny?: boolean }
  // An "any time" chip: held, then dragged onto the timeline to give it a time.
  | { kind: 'chip'; id: string; day: DateKey; x: number; y: number; timer: number; pointerId: number; target: HTMLElement }
  | { kind: 'place'; id: string; duration: number; drop: { day: DateKey; start: number } | null }
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
  const [selected, setSelected] = useState<{ id: string; day: DateKey; slot?: number } | null>(null)
  const [detail, setDetail] = useState<{ id: string; day: DateKey } | null>(null)
  const [live, setLive] = useState<{ id: string; slot: number; start: number; duration: number; kind: 'move' | 'resize' } | null>(null)
  const [ghost, setGhost] = useState<{ day: DateKey; start: number } | null>(null)
  // Dragging an any-time chip: which chip is lifted and where it would land.
  const [placing, setPlacing] = useState<{ id: string; drop: { day: DateKey; start: number } | null } | null>(null)
  // A timed block dragged up over the Any time row.
  const [overAny, setOverAny] = useState(false)
  const [scheduling, setScheduling] = useState<{ id: string; day: DateKey; start: number; duration: number } | null>(null)
  const colsRef = useRef<HTMLDivElement>(null)
  const alldayRef = useRef<HTMLDivElement>(null)
  const justPlaced = useRef(false)
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
    const row = alldayRef.current
    const stop = (e: TouchEvent) => {
      const g = gesture.current
      if (g && (g.kind === 'move' || g.kind === 'resize' || g.kind === 'place')) e.preventDefault()
    }
    el.addEventListener('touchmove', stop, { passive: false })
    row?.addEventListener('touchmove', stop, { passive: false })
    return () => {
      el.removeEventListener('touchmove', stop)
      row?.removeEventListener('touchmove', stop)
    }
  }, [])

  const commit = (id: string, patch: Partial<Habit>, before: Partial<Habit>, blockStart?: number) => {
    actions.patchHabit(id, patch)
    const h = habits.find((x) => x.id === id)
    const start = blockStart ?? patch.start ?? h?.start ?? 0
    const duration = patch.duration ?? h?.duration ?? 30
    toast(`${h?.name ?? 'Habit'} → ${minutesToLabel(start)}–${minutesToLabel(start + duration)} (every scheduled day)`, () => actions.patchHabit(id, before))
  }

  const revealTime = (start: number) => {
    const el = scroller.current
    if (!el) return
    const top = start * PPM
    if (top < el.scrollTop + 24 || top > el.scrollTop + el.clientHeight - 160) el.scrollTo({ top: Math.max(0, top - 96), behavior: 'smooth' })
  }

  /** Any time → timed, after the user confirms in the sheet. */
  const schedule = (id: string, day: DateKey, start: number, duration: number, slots?: number[]) => {
    const h = habits.find((x) => x.id === id)
    if (!h) return
    const before = { start: h.start, duration: h.duration, slots: h.slots }
    actions.patchHabit(id, { start, duration, slots })
    haptic([8, 30, 12])
    setScheduling(null)
    setSelected({ id, day, slot: 0 })
    requestAnimationFrame(() => revealTime(start))
    const label = slots ? slots.map(minutesToLabel).join(' · ') : `${minutesToLabel(start)} · ${partOfDay(start)}`
    toast(`${h.name} → ${label}`, () => {
      actions.patchHabit(id, before)
      setSelected(null)
    })
  }

  /** Timed → any time, behind a confirmation (it changes the habit on every day). */
  const unschedule = async (h: Habit) => {
    if (h.start === null) return
    const ok = await ask({
      title: `Make “${h.name}” any time?`,
      body: (
        <div className="stack" style={{ gap: 14 }}>
          <div className="change">
            <span className="from mono">
              {blocksOf(h).length > 1 ? blocksOf(h).map(minutesToLabel).join(' · ') : `${minutesToLabel(h.start)} – ${minutesToLabel((h.start + h.duration) % 1440)}`}
            </span>
            <IconRight aria-hidden />
            <span className="to" style={{ fontFamily: 'inherit' }}>
              Any time
            </span>
          </div>
          <span>
            {blocksOf(h).length > 1 ? `All ${blocksOf(h).length} blocks leave` : 'It leaves'} the timeline {repeatPhrase(h.days)} and moves to <b>Anytime</b> on Today. History and streak don’t change.
          </span>
        </div>
      ),
      confirm: 'Move to Any time',
      cancel: 'Keep the time',
    })
    if (!ok) return
    const before = { start: h.start, duration: h.duration, slots: h.slots }
    actions.patchHabit(h.id, { start: null, slots: undefined })
    toast(`${h.name} → Any time`, () => actions.patchHabit(h.id, before))
  }

  /** Suggested time for "Set time": the next quarter hour today, 9:00 on other days. */
  const suggestStart = (day: DateKey, duration: number) => {
    const base = day === today ? Math.ceil((now + 1) / SNAP) * SNAP : 9 * 60
    return Math.max(0, Math.min(base, 1440 - duration))
  }

  /** Where a dragged chip would land, or null when the pointer is off the timeline. */
  const slotAt = (x: number, y: number, duration: number) => {
    const sc = scroller.current?.getBoundingClientRect()
    const cols = colsRef.current?.getBoundingClientRect()
    if (!sc || !cols || y < sc.top || y > sc.bottom || x < sc.left || x > sc.right) return null
    const i = Math.min(span - 1, Math.max(0, Math.floor((x - cols.left) / (cols.width / span))))
    // The finger holds the block near its top, like picking up a card.
    const start = Math.min(Math.max(0, snap((y - cols.top) / PPM - 10)), 1440 - Math.min(duration, 1440))
    return { day: days[i], start }
  }

  const autoScroll = (clientY: number) => {
    const el = scroller.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (clientY < r.top + 48) el.scrollTop -= 10
    else if (clientY > r.bottom - 96) el.scrollTop += 10
  }

  // ---- block gestures --------------------------------------------------------
  const onBlockDown = (e: React.PointerEvent, h: Habit, day: DateKey, slot: number, start: number) => {
    e.stopPropagation()
    swipe.current = null
    const target = e.currentTarget as HTMLElement
    const timer = window.setTimeout(() => {
      const g = gesture.current
      if (g?.kind !== 'pending') return
      haptic(15)
      g.target.setPointerCapture?.(g.pointerId)
      gesture.current = { kind: 'move', id: h.id, slot, day, y: g.y, start: g.start, duration: g.duration, curStart: g.start, curDuration: g.duration }
      setSelected({ id: h.id, day, slot })
      setLive({ id: h.id, slot, start: g.start, duration: g.duration, kind: 'move' })
    }, LONG_PRESS)
    gesture.current = { kind: 'pending', id: h.id, slot, day, x: e.clientX, y: e.clientY, timer, start, duration: h.duration, pointerId: e.pointerId, target }
  }

  const onHandleDown = (e: React.PointerEvent, h: Habit, day: DateKey, slot: number, start: number) => {
    e.stopPropagation()
    swipe.current = null
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    gesture.current = { kind: 'resize', id: h.id, slot, day, y: e.clientY, start, duration: h.duration, curStart: start, curDuration: h.duration }
    setLive({ id: h.id, slot, start, duration: h.duration, kind: 'resize' })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    if (g.kind === 'chip' || g.kind === 'place') return
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
      const top = scroller.current?.getBoundingClientRect().top ?? 0
      const above = e.clientY < top
      if (above !== !!g.overAny) {
        g.overAny = above
        setOverAny(above)
        if (above) haptic(10)
      }
      const s = Math.min(Math.max(0, snap(g.start + dMin)), 1440 - Math.max(g.duration, SNAP))
      if (s !== g.curStart) haptic(4)
      g.curStart = s
      setLive({ id: g.id, slot: g.slot, start: s, duration: g.duration, kind: 'move' })
    } else {
      const d = Math.min(Math.max(SNAP, snap(g.duration + dMin)), 1440 - g.start)
      if (d !== g.curDuration) haptic(4)
      g.curDuration = d
      setLive({ id: g.id, slot: g.slot, start: g.start, duration: d, kind: 'resize' })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (g?.kind === 'pending') {
      clearTimeout(g.timer)
      setSelected((s) => (s?.id === g.id && s.day === g.day && s.slot === g.slot ? null : { id: g.id, day: g.day, slot: g.slot }))
    } else if (g?.kind === 'move' && g.overAny) {
      setLive(null)
      setOverAny(false)
      const h = habits.find((x) => x.id === g.id)
      if (h) unschedule(h)
    } else if (g?.kind === 'move' || g?.kind === 'resize') {
      setLive(null)
      const h = habits.find((x) => x.id === g.id)
      const blocks = h ? blocksOf(h) : []
      if (g.curStart === g.start && g.curDuration === g.duration) {
        // nothing moved
      } else if (h && blocks.length > 1) {
        // Move just this time's block; the length is shared by all of them.
        const slots = blocks.map((m, i) => (i === g.slot ? g.curStart : m)).sort((a, b) => a - b)
        commit(g.id, { start: slots[0], slots, duration: g.curDuration }, { start: h.start, slots: h.slots, duration: h.duration }, g.curStart)
        setSelected({ id: g.id, day: g.day, slot: slots.indexOf(g.curStart) })
      } else commit(g.id, { start: g.curStart, duration: g.curDuration }, { start: g.start, duration: g.duration })
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
    setOverAny(false)
    gesture.current = null
    swipe.current = null
  }

  // ---- any-time chips: tap to select, hold and drag onto the timeline -----------
  const onChipDown = (e: React.PointerEvent, h: Habit, day: DateKey) => {
    if (e.button !== 0) return
    justPlaced.current = false // a click may never follow a touch drag
    const target = e.currentTarget as HTMLElement
    const timer = window.setTimeout(() => {
      const g = gesture.current
      if (g?.kind !== 'chip') return
      haptic(15)
      try {
        g.target.setPointerCapture(g.pointerId)
      } catch {
        /* pointer already gone */
      }
      const duration = Math.max(SNAP, h.duration || 30)
      gesture.current = { kind: 'place', id: h.id, duration, drop: null }
      setSelected(null)
      setPlacing({ id: h.id, drop: null })
    }, LONG_PRESS)
    gesture.current = { kind: 'chip', id: h.id, day, x: e.clientX, y: e.clientY, timer, pointerId: e.pointerId, target }
  }

  const onChipMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (g?.kind === 'chip') {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > MOVE_TOLERANCE) {
        clearTimeout(g.timer)
        gesture.current = null
      }
      return
    }
    if (g?.kind !== 'place') return
    const sc = scroller.current?.getBoundingClientRect()
    if (sc && e.clientY >= sc.top) autoScroll(e.clientY)
    const drop = slotAt(e.clientX, e.clientY, g.duration)
    if (drop?.start !== g.drop?.start || drop?.day !== g.drop?.day) {
      if (drop) haptic(4)
      g.drop = drop
      setPlacing({ id: g.id, drop })
    }
  }

  const onChipUp = () => {
    const g = gesture.current
    if (g?.kind === 'chip') {
      clearTimeout(g.timer)
      gesture.current = null
      return // a plain tap — handled by onClick
    }
    if (g?.kind !== 'place') return
    gesture.current = null
    justPlaced.current = true
    setPlacing(null)
    if (g.drop) setScheduling({ id: g.id, day: g.drop.day, start: g.drop.start, duration: g.duration })
    else toast('Drop it on the calendar to give it a time')
  }

  const onChipCancel = () => {
    const g = gesture.current
    if (g?.kind === 'chip') clearTimeout(g.timer)
    if (g?.kind === 'chip' || g?.kind === 'place') gesture.current = null
    setPlacing(null)
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
  const placingHabit = placing && habits.find((h) => h.id === placing.id)
  const schedulingHabit = scheduling && habits.find((h) => h.id === scheduling.id)
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

      <div className={`allday ${overAny ? 'drop-any' : ''} ${placing ? 'placing' : ''}`} style={{ gridTemplateColumns: cols }} ref={alldayRef}>
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
                const n = timesOf(h)
                const v = logs[d]?.[h.id]?.v ?? 0
                const isSel = selected?.id === h.id && selected.day === d
                return (
                  <button
                    key={h.id}
                    className={`allday-item ${isSuccess(s) && h.polarity === 'build' ? 'won' : ''} ${isSel ? 'selected' : ''} ${placing?.id === h.id ? 'lifted' : ''}`}
                    style={{ ['--c' as string]: h.color }}
                    onPointerDown={(e) => onChipDown(e, h, d)}
                    onPointerMove={onChipMove}
                    onPointerUp={onChipUp}
                    onPointerCancel={onChipCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => {
                      if (justPlaced.current) return void (justPlaced.current = false)
                      setSelected(isSel ? null : { id: h.id, day: d })
                      if (!isSel) placeTip()
                    }}
                    aria-label={`${h.name}, any time. Tap to select, hold and drag onto the calendar to give it a time.`}
                  >
                    <span className="nm">{h.name}</span>
                    {n > 1 && d <= today && <span className="n">{Math.min(v, n)}/{n}</span>}
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
          <div className="cal-cols" style={{ gridTemplateColumns: cols, height: 1440 * PPM }} ref={colsRef}>
            {days.map((d) => {
              const items = active
                .filter((h) => h.start !== null && isScheduled(h, d))
                .flatMap((h) =>
                  blocksOf(h).map((start, slot) => {
                    const o = live?.id === h.id ? live : null
                    // Resizing changes every block of the habit; moving only the one being dragged.
                    const mine = o && o.slot === slot
                    return { habit: h, slot, start: mine ? o.start : start, duration: o && (mine || o.kind === 'resize') ? o.duration : h.duration }
                  }),
                )
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
                    const slot = p.slot ?? 0
                    const n = blocksOf(h).length
                    const s = statusOf(h, logs[d]?.[h.id], d, today)
                    // A per-time block reads as done once that many times are logged.
                    const won = h.polarity === 'build' && (n > 1 ? (logs[d]?.[h.id]?.v ?? 0) > slot : isSuccess(s))
                    const isSel = selected?.id === h.id && selected.day === d && (n === 1 || selected.slot === slot)
                    const isLive = live?.id === h.id && live.slot === slot
                    const height = Math.max(p.duration * PPM, 22)
                    return (
                      <div
                        key={`${h.id}:${slot}`}
                        className={`event ${won ? 'won' : ''} ${isSel ? 'selected' : ''} ${isLive && live.kind === 'move' ? 'dragging' : ''}`}
                        style={{
                          top: p.start * PPM,
                          height,
                          left: `calc(${(p.col / p.cols) * 100}% + 1px)`,
                          width: `calc(${100 / p.cols}% - 3px)`,
                          ['--c' as string]: h.color,
                        }}
                        onPointerDown={(e) => onBlockDown(e, h, d, slot, p.start)}
                        role="button"
                        aria-label={`${h.name}${n > 1 ? `, time ${slot + 1} of ${n}` : ''}, ${minutesToLabel(p.start)}. Tap to select, long-press to move.`}
                      >
                        <b>
                          {h.name}
                          {n > 1 && <span className="of"> {slot + 1}/{n}</span>}
                        </b>
                        {height > 36 && (
                          <span className="t">
                            {minutesToLabel(p.start)} – {minutesToLabel(p.start + p.duration)}
                          </span>
                        )}
                        {isSel && <span className="knob" />}
                        {isSel && <div className="handle" onPointerDown={(e) => onHandleDown(e, h, d, slot, p.start)} aria-label="Drag to resize" />}
                      </div>
                    )
                  })}
                  {placing?.drop?.day === d && placingHabit && (
                    <div
                      className="event placing"
                      style={{ top: placing.drop.start * PPM, height: Math.max(placingHabit.duration * PPM, 22), left: 1, width: 'calc(100% - 3px)', ['--c' as string]: placingHabit.color }}
                      aria-hidden
                    >
                      <b>{placingHabit.name}</b>
                      <span className="t">
                        {minutesToLabel(placing.drop.start)} – {minutesToLabel(placing.drop.start + placingHabit.duration)}
                      </span>
                    </div>
                  )}
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

      {selHabit && selected && <ActionBar habit={selHabit} slot={selected.slot} day={selected.day} today={today} v={logs[selected.day]?.[selHabit.id]?.v ?? 0} onOpen={() => setDetail(selected)}>
        {selHabit.start === null ? (
          <button className="btn sm" onClick={() => setScheduling({ id: selHabit.id, day: selected.day, start: suggestStart(selected.day, selHabit.duration || 30), duration: selHabit.duration || 30 })}>
            Set time
          </button>
        ) : (
          <button className="btn sm" onClick={() => unschedule(selHabit)}>
            Any time
          </button>
        )}
      </ActionBar>}

      {schedulingHabit && scheduling && (
        <ScheduleSheet
          habit={schedulingHabit}
          start={scheduling.start}
          duration={scheduling.duration}
          onConfirm={(start, duration, slots) => schedule(scheduling.id, scheduling.day, start, duration, slots)}
          onClose={() => setScheduling(null)}
        />
      )}

      {detailHabit && detail && (
        <HabitDetail habit={detailHabit} logs={logs} date={detail.day} today={today} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}

/** Bottom bar for the selected habit: details, (un)schedule, and log it. */
function ActionBar({ habit: h, slot, day, today, v, onOpen, children }: { habit: Habit; slot?: number; day: DateKey; today: DateKey; v: number; onOpen: () => void; children: ReactNode }) {
  const n = timesOf(h)
  const canLog = h.kind === 'check' && h.polarity === 'build' && day <= today
  const blocks = blocksOf(h)
  const start = blocks[slot ?? 0] ?? h.start
  const when =
    start === null
      ? `Any time · ${scheduleLabel(h.days)}`
      : `${blocks.length > 1 ? `${(slot ?? 0) + 1}/${blocks.length} · ` : ''}${minutesToLabel(start)} – ${minutesToLabel(start + h.duration)} · ${scheduleLabel(h.days)}`
  return (
    <div className="cal-action" role="toolbar" aria-label={h.name}>
      <button className="name" onClick={onOpen} aria-label={`${h.name} — details`}>
        <HabitIcon habit={h} size={36} />
        <span className="txt">
          <b>{h.name}</b>
          <span>{when}</span>
        </span>
        <IconRight className="chev" aria-hidden />
      </button>
      {children}
      {canLog &&
        (n > 1 ? (
          <button className="btn sm primary" onClick={() => tapCheck(h, day)} disabled={v >= n}>
            {v >= n ? `${n}/${n} ✓` : `+1 · ${v}/${n}`}
          </button>
        ) : (
          <button className="btn sm primary" onClick={() => tapCheck(h, day)}>
            {v ? 'Undo' : 'Done'}
          </button>
        ))}
    </div>
  )
}
