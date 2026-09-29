import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Right side of the header (e.g. Save / Edit). */
  actions?: ReactNode
  closeLabel?: string
}

/** Bottom sheet: keeps the user in context; dismiss by Close, scrim tap, Esc, or swipe down. */
export function Sheet({ title, onClose, children, actions, closeLabel = 'Close' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

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
      <div className="scrim" onClick={onClose} />
      <div className="sheet" ref={ref} role="dialog" aria-modal="true">
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
