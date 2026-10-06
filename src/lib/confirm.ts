import { useSyncExternalStore, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  /** Label of the action button, e.g. "Delete". */
  confirm: string
  cancel?: string
  /** Red action button for destructive choices. */
  danger?: boolean
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

let current: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/**
 * In-app replacement for window.confirm(): a bottom sheet that matches the app
 * and works the same in the browser and the Android app. Resolves true on confirm.
 */
export function ask(opts: ConfirmOptions): Promise<boolean> {
  current?.resolve(false)
  return new Promise((resolve) => {
    current = { ...opts, resolve }
    emit()
  })
}

export function answer(ok: boolean) {
  const p = current
  current = null
  emit()
  p?.resolve(ok)
}

export function useConfirm() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
