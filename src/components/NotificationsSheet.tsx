import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { inputToMinutes, minutesToInput } from '../lib/date'
import { isNative } from '../lib/native'
import { whenLabel, type Planned } from '../lib/notify'
import { askPermission, currentPlan, exactAllowed, openExactSettings, permission, sendTest, syncReminders, type Permission } from '../lib/reminders'
import { actions, useSettings, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { NotifySettings } from '../lib/types'
import { Sheet } from './Sheet'

const LEADS: [number | null, string][] = [
  [null, 'Off'],
  [0, 'At start'],
  [5, '5 min'],
  [15, '15 min'],
]

/** A switch row with an optional time field that appears when it's on. */
function TimedRow({ label, hint, value, fallback, onChange }: { label: string; hint: string; value: number | null; fallback: number; onChange: (v: number | null) => void }) {
  return (
    <div className="notify-row">
      <label className="switch">
        <span>
          <b>{label}</b>
          <span className="xs muted">{hint}</span>
        </span>
        <input type="checkbox" checked={value !== null} onChange={(e) => onChange(e.target.checked ? fallback : null)} />
      </label>
      {value !== null && (
        <input className="input mono notify-time" type="time" step={300} value={minutesToInput(value)} onChange={(e) => e.target.value && onChange(inputToMinutes(e.target.value))} aria-label={`${label} time`} />
      )}
    </div>
  )
}

export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  const n = settings.notify
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [perm, setPerm] = useState<Permission | null>(null)
  const [exact, setExact] = useState(true)
  const [plan, setPlan] = useState<Planned[] | null>(null)
  const set = (patch: Partial<NotifySettings>) => actions.updateSettings({ notify: { ...n, ...patch } })

  useEffect(() => {
    permission().then(setPerm)
    exactAllowed().then(setExact)
    const onShow = () => {
      if (document.hidden) return
      permission().then(setPerm)
      exactAllowed().then(setExact)
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])

  // Preview what's coming, and keep the device's schedule in step with every change here.
  useEffect(() => {
    currentPlan().then(setPlan)
    const t = setTimeout(() => void syncReminders(), 400)
    return () => clearTimeout(t)
  }, [settings, habits, logs])

  const enable = async (on: boolean) => {
    if (!on) return set({ enabled: false })
    let p = perm ?? (await permission())
    if (p === 'prompt') p = await askPermission()
    setPerm(p)
    if (p === 'granted') {
      set({ enabled: true })
      toast('Reminders on')
    } else if (p === 'denied') toast('Notifications are blocked for Kaizen — allow them in your phone’s settings.', undefined, 6000)
    else toast('This browser can’t show notifications.', undefined, 5000)
  }

  const timedCount = habits.filter((h) => !h.archived && h.start !== null && h.reminder !== 'off').length
  const custom = habits.filter((h) => !h.archived && typeof h.reminder === 'number').length
  const next = plan?.[0]
  const on = n.enabled && perm === 'granted'

  return (
    <Sheet title="Notifications" onClose={onClose} closeLabel="Back">
      <div className="stack" style={{ gap: 22 }}>
        <div className="notify-hero">
          <span className={`notify-bell ${on ? 'on' : ''}`} aria-hidden>
            {on ? <Bell size={24} /> : <BellOff size={24} />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{on ? 'Reminders are on' : 'Reminders are off'}</b>
            <span className="small muted">
              {on
                ? next
                  ? `Next: ${next.kind === 'habit' && !n.hideNames ? next.title : next.kind === 'morning' ? 'Morning plan' : next.kind === 'evening' ? 'Evening check-in' : next.title} · ${whenLabel(next.at, new Date())}`
                  : 'Nothing to remind you about yet.'
                : 'Gentle nudges at the times you choose. Everything is scheduled on this device.'}
            </span>
          </div>
          <label className="switch bare">
            <input type="checkbox" checked={n.enabled} onChange={(e) => enable(e.target.checked)} aria-label="Reminders" />
          </label>
        </div>

        {perm === 'denied' && (
          <div className="panel small notify-warn">
            Notifications are blocked for Kaizen. Turn them on in your phone’s <b>Settings → Apps → Kaizen → Notifications</b>, then come back.
          </div>
        )}
        {perm === 'unsupported' && <div className="panel small notify-warn">This browser can’t show notifications. Install the Android app for reminders.</div>}

        {n.enabled && (
          <>
            <section className="group">
              <h3 className="lbl">Daily</h3>
              <div className="list">
                <TimedRow label="Morning plan" hint="How many habits today, and where to start" value={n.morning} fallback={8 * 60} onChange={(morning) => set({ morning })} />
                <TimedRow label="Evening check-in" hint="Only if something is still open — never miss twice" value={n.evening} fallback={21 * 60} onChange={(evening) => set({ evening })} />
              </div>
            </section>

            <section className="group">
              <h3 className="lbl">Habits</h3>
              <div className="list settings-list">
                <div className="setting">
                  <b>Timed habits</b>
                  <span className="xs muted" style={{ marginTop: -6 }}>
                    {timedCount ? `Remind before each calendar block · ${timedCount} ${timedCount === 1 ? 'habit' : 'habits'}` : 'Habits with a time on the calendar get reminded at their block'}
                  </span>
                  <div className="segmented sm" role="group" aria-label="Timed habit reminders">
                    {LEADS.map(([v, l]) => (
                      <button key={String(v)} aria-pressed={n.timedLead === v} onClick={() => set({ timedLead: v })}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting">
                  <span className="xs muted">
                    {custom ? `${custom} ${custom === 1 ? 'habit has' : 'habits have'} a custom reminder time. ` : ''}
                    Set a habit’s own reminder — or turn it off — in its Edit screen. Done habits don’t remind you again that day.
                  </span>
                </div>
              </div>
            </section>

            <section className="group">
              <h3 className="lbl">Privacy</h3>
              <div className="list settings-list">
                <label className="switch setting">
                  <span>
                    <b>Hide habit names</b>
                    <span className="xs muted">Shows “Habit reminder” instead, lock screen included</span>
                  </span>
                  <input type="checkbox" checked={n.hideNames} onChange={(e) => set({ hideNames: e.target.checked })} />
                </label>
                <label className="switch setting">
                  <span>
                    <b>Diary check-in</b>
                    <span className="xs muted">
                      {settings.photoReminderDays ? `A discreet “Time for a diary check-in” every ${settings.photoReminderDays} days` : 'Turn on the check-in reminder in Settings first'}
                    </span>
                  </span>
                  <input type="checkbox" checked={n.diary && settings.photoReminderDays > 0} disabled={!settings.photoReminderDays} onChange={(e) => set({ diary: e.target.checked })} />
                </label>
              </div>
            </section>

            {isNative && !exact && (
              <div className="panel small notify-warn">
                <b>Exact timing is off.</b> Android may deliver reminders a few minutes late.{' '}
                <button className="text-btn strong" onClick={openExactSettings}>
                  Allow alarms & reminders
                </button>
              </div>
            )}

            <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
              <button
                className="btn block"
                onClick={() =>
                  sendTest().then(
                    () => toast('Test sent — check your notifications'),
                    () => toast('Couldn’t send a notification here'),
                  )
                }
              >
                <Bell size={16} /> Send a test notification
              </button>
              <p className="xs faint" style={{ textAlign: 'center' }}>
                {plan ? `${plan.length} reminders planned for the next 2 weeks. ` : ''}
                {isNative ? 'They keep working with the app closed, and after a restart.' : 'In the browser they only arrive while Kaizen is open — the Android app delivers them anytime.'}
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
