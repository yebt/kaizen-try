import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './native'
import { buildPlan, type Planned } from './notify'
import { listPhotos } from './photos'
import { getSettings, getState } from './store'

/** Glue between the pure plan (lib/notify) and the device's notification scheduler. */

const CHANNEL = 'reminders'
let channelReady = false

export type Permission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function permission(): Promise<Permission> {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

export async function askPermission(): Promise<Permission> {
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

/** Android 12+: without "Alarms & reminders" access, reminders can arrive a few minutes late. */
export async function exactAllowed(): Promise<boolean> {
  if (!isNative) return true
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
  } catch {
    return true
  }
}

export async function openExactSettings() {
  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    /* not available on this Android version */
  }
}

async function ensureChannel() {
  if (!isNative || channelReady) return
  try {
    await LocalNotifications.createChannel({ id: CHANNEL, name: 'Habit reminders', description: 'Daily plan, check-ins and habit reminders', importance: 4, visibility: 0 })
    channelReady = true
  } catch {
    /* older Android: the default channel works */
  }
}

async function lastPhotoDate(): Promise<string | null> {
  try {
    const photos = await listPhotos()
    return photos.length ? photos[photos.length - 1].date : null
  } catch {
    return null
  }
}

export async function currentPlan(): Promise<Planned[]> {
  const s = getState()
  return buildPlan({ habits: s.habits, logs: s.logs, settings: getSettings(), now: new Date(), lastPhoto: await lastPhotoDate() })
}

let running: Promise<number> | null = null
let again = false

/** Replace everything scheduled with the current plan. Returns how many were scheduled. */
export function syncReminders(): Promise<number> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }))
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
      if (!getSettings().notify.enabled || (await permission()) !== 'granted') return 0
      await ensureChannel()
      const plan = await currentPlan()
      if (!plan.length) return 0
      await LocalNotifications.schedule({
        notifications: plan.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          schedule: { at: p.at, allowWhileIdle: true },
          channelId: isNative ? CHANNEL : undefined,
          smallIcon: 'ic_stat_kaizen',
          iconColor: '#1f6f5c',
          extra: { kind: p.kind, habitId: p.habitId },
        })),
      })
      return plan.length
    } catch {
      return 0
    } finally {
      running = null
      if (again) {
        again = false
        void syncReminders()
      }
    }
  })()
  return running
}

export async function sendTest() {
  await ensureChannel()
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 99_999,
        title: 'Kaizen reminders are on',
        body: 'This is how a reminder looks. Small steps, every day.',
        schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true },
        channelId: isNative ? CHANNEL : undefined,
        smallIcon: 'ic_stat_kaizen',
        iconColor: '#1f6f5c',
      },
    ],
  })
}

/** Tapping a notification opens the app on Today. */
export function onReminderTap(fn: () => void) {
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', fn)
  return () => void sub.then((s) => s.remove()).catch(() => {})
}
