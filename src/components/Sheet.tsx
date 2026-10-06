import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Right side of the header (e.g. Save / Edit). */
  actions?: ReactNode
  closeLabel?: string
  /** Extra class on the sheet, e.g. "tall" for a near-full-height picker. */
  className?: string
}

/** Open sheets, bottom to top: Esc / Android Back closes only the top one. */
const stack: symbol[] = []

/** Bottom sheet: keeps the user in context; dismiss by Close, scrim tap, Esc, or swipe down. */
export function Sheet({ title, onClose, children, actions, closeLabel = 'Close', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)

  // Each sheet stacks above the ones under it, scrim included, so a dialog
  // opened from a sheet dims that sheet too.
  const [depth] = useState(() => stack.length)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const id = Symbol('sheet')
    stack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) close.current()
    }
    addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      stack.splice(stack.indexOf(id), 1)
      removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  const start = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if ((ref.current?.scrollTop ?? 0) > 0) return
    drag.current = { y: e.clientY, dy: 0 }
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    ref.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const end = () => {
    if (!drag.current || !ref.current) return
    const { dy } = drag.current
    drag.current = null
    if (dy > 110) onClose()
    else ref.current.style.transform = ''
  }

  return (
    <>
      <div className="scrim" onClick={onClose} style={{ zIndex: 50 + depth * 2 }} />
      <div className={`sheet ${className}`} ref={ref} role="dialog" aria-modal="true" style={{ zIndex: 51 + depth * 2 }}>
        <div className="sheet-top" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <div className="grabber" />
          <div className="sheet-head">
            <button className="text-btn" onClick={onClose}>
              {closeLabel}
            </button>
            <h2>{title}</h2>
            <div>{actions}</div>
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
