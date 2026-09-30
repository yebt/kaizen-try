import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { getSettings } from './store'

/** Haptics + reduced-motion helpers. */

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A short tick for a tap, a pattern for success. Uses the native haptics
 * engine inside the Android app and the Vibration API on the web.
 */
export function haptic(pattern: number | number[] = 12) {
  if (!getSettings().haptics) return
  try {
    if (Capacitor.isNativePlatform()) {
      if (Array.isArray(pattern)) void Haptics.notification({ type: NotificationType.Success })
      else void Haptics.impact({ style: pattern >= 15 ? ImpactStyle.Medium : ImpactStyle.Light })
      return
    }
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
