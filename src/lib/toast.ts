import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  text: string
  undo?: () => void
}

let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, undo?: () => void, ms = 4000) {
  const t = { id: ++seq, text, undo }
  toasts = [...toasts.filter((x) => x.text !== text).slice(-1), t]
  emit()
  setTimeout(() => dismiss(t.id), ms)
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )
}
