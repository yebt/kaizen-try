import { Capacitor, registerPlugin } from '@capacitor/core'
import { useSyncExternalStore } from 'react'
import type { PinLock } from './types'

// ---- PIN -------------------------------------------------------------------
// The PIN keeps the diary away from casual eyes (someone holding your phone).
// Photos are stored as they are; it is a curtain, not encryption.

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function digest(text: string): Promise<string> {
  if (crypto?.subtle) return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  // Insecure contexts lack subtle crypto; a simple FNV-1a still avoids storing the PIN in clear.
  let h = 0x811c9dc5
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0
  return h.toString(16)
}

export async function makePin(pin: string): Promise<PinLock> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(12)).buffer)
  return { salt, hash: await digest(salt + pin) }
}

export async function checkPin(pin: string, lock: PinLock): Promise<boolean> {
  return (await digest(lock.salt + pin)) === lock.hash
}

// ---- lock state --------------------------------------------------------------
// Unlocked only while you're in the diary; leaving it or the app locks it again.

let unlocked = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function unlockDiary() {
  unlocked = true
  emit()
}

export function lockDiary() {
  if (!unlocked) return
  unlocked = false
  emit()
}

export function useDiaryLocked(hasPin: boolean): boolean {
  const open = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => unlocked,
  )
  return hasPin && !open
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) lockDiary()
  })
}

// ---- Android: keep the diary out of screenshots and the recent-apps preview ----

interface PrivacyPlugin {
  setSecure(opts: { secure: boolean }): Promise<void>
}
const Privacy = registerPlugin<PrivacyPlugin>('Privacy')

export function setSecureScreen(secure: boolean) {
  if (!Capacitor.isNativePlatform()) return
  void Privacy.setSecure({ secure }).catch(() => {})
}
