import { Fragment, useEffect, useRef, useState } from 'react'
import { CalendarView } from './components/CalendarView'
import { confetti } from './components/Confetti'
import { DiaryView } from './components/DiaryView'
import { HabitForm, type Draft } from './components/HabitForm'
import { IconCalendar, IconCamera, IconChart, IconCheck, IconPlus, IconToday } from './components/Icons'
import { ProgressView } from './components/ProgressView'
import { SettingsSheet } from './components/SettingsSheet'
import { Sheet } from './components/Sheet'
import { TodayView } from './components/TodayView'
import { diffDays, todayKey } from './lib/date'
import { haptic } from './lib/feedback'
import { daySummary, streakOf } from './lib/habits'
import { handleBackButton, setSystemBars } from './lib/native'
import { usePhotos } from './lib/photos'
import { actions, useSettings, useStore } from './lib/store'
import { dismiss, useToasts } from './lib/toast'

type Tab = 'today' | 'calendar' | 'progress' | 'diary'

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { id: 'progress', label: 'Progress', Icon: IconChart },
  { id: 'diary', label: 'Diary', Icon: IconCamera },
]

function useToday() {
  const [today, setToday] = useState(todayKey())
  useEffect(() => {
    const check = () => setToday(todayKey())
    const t = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}

export default function App() {
  const today = useToday()
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('kaizen:tab') as Tab) || 'today')
  const [date, setDate] = useState(today)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settings = useSettings()
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const celebrated = useStore((s) => s.celebrated)
  const photos = usePhotos()
  const toasts = useToasts()

  useEffect(() => {
    try {
      localStorage.setItem('kaizen:tab', tab)
    } catch {
      /* ignore */
    }
  }, [tab])

  useEffect(() => setDate(today), [today])

  // Appearance: follow the OS unless the user picked light or dark.
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0e0e10' : '#f6f5f2'))
    setSystemBars(dark)
    if (settings.theme !== 'system') return
    // Keep the bars in sync if the OS switches while the app is open.
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemBars(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  const tabRef = useRef(tab)
  tabRef.current = tab
  useEffect(() => handleBackButton({ isHome: () => tabRef.current === 'today', goHome: () => setTab('today') }), [])

  // Peak moment: the first time today's habits are all handled.
  useEffect(() => {
    const active = habits.filter((h) => !h.archived)
    const s = daySummary(active, logs, today, today)
    const anyBuild = s.scheduled.some((h) => h.polarity === 'build')
    if (s.perfect && anyBuild && celebrated !== today) {
      actions.markCelebrated(today)
      haptic([20, 60, 20, 60, 40])
      if (settings.celebrations) {
        confetti()
        setCelebrate(true)
      }
    }
  }, [habits, logs, today, celebrated, settings.celebrations])

  const lastPhoto = photos?.length ? photos[photos.length - 1].date : null
  const daysSincePhoto = lastPhoto ? diffDays(lastPhoto, today) : photos ? null : 0
  const bestStreak = Math.max(0, ...habits.map((h) => streakOf(h, logs, today).current))

  return (
    <>
      {tab === 'today' && (
        <TodayView today={today} date={date} setDate={setDate} onNew={(d) => setDraft(d ?? {})} daysSincePhoto={daysSincePhoto} goDiary={() => setTab('diary')} onSettings={() => setSettingsOpen(true)} />
      )}
      {tab === 'calendar' && <CalendarView today={today} onNew={(d) => setDraft(d ?? {})} />}
      {tab === 'progress' && <ProgressView today={today} />}
      {tab === 'diary' && <DiaryView today={today} />}

      <div className="tabbar">
        <nav>
          {TABS.map(({ id, label, Icon }, i) => (
            <Fragment key={id}>
              {i === 2 && (
                <button className="tab-add" onClick={() => setDraft({})} aria-label="New habit">
                  <IconPlus />
                </button>
              )}
              <button className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                <Icon />
                {label}
              </button>
            </Fragment>
          ))}
        </nav>
      </div>

      <div className={`toasts ${tab === 'calendar' ? 'raised' : ''}`} aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span style={{ flex: 1 }}>{t.text}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo!()
                  dismiss(t.id)
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>

      {draft && <HabitForm initial={draft} onClose={() => setDraft(null)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      {celebrate && (
        <Sheet title="" onClose={() => setCelebrate(false)}>
          <div className="celebrate">
            <div className="medal">
              <IconCheck />
            </div>
            <h2>A perfect day</h2>
            <p className="muted">
              Every habit handled{settings.name ? `, ${settings.name}` : ''}. {bestStreak > 1 ? `Your longest active streak is ${bestStreak} days.` : 'This is how streaks begin.'}
            </p>
            <p className="xs faint" style={{ margin: '4px 0 16px' }}>
              +20 XP bonus lands at midnight. Rest well — tomorrow, same small steps.
            </p>
            <button className="btn primary lg block" onClick={() => setCelebrate(false)}>
              Keep going
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
