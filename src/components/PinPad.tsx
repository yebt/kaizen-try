import { Delete } from 'lucide-react'
import { useEffect, useState } from 'react'
import { haptic } from '../lib/feedback'

export const PIN_LENGTH = 4

interface Props {
  title: string
  hint?: string
  /** Resolve to an error message to shake and clear, or nothing when accepted. */
  onComplete: (pin: string) => Promise<string | void> | string | void
}

/** Four dots and a phone-style keypad. Also accepts the keyboard's digits. */
export function PinPad({ title, hint, onComplete }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)

  const press = (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return
    haptic(6)
    setError(null)
    setPin((p) => p + d)
  }
  const back = () => !busy && setPin((p) => p.slice(0, -1))

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    setBusy(true)
    Promise.resolve(onComplete(pin)).then((err) => {
      setBusy(false)
      if (err) {
        haptic([30, 40, 30])
        setError(err)
        setShake((n) => n + 1)
      }
      setPin('')
    })
  }, [pin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') back()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <div className="pinpad">
      <div className="pin-head">
        <h2>{title}</h2>
        <p className={error ? 'err' : 'muted'} aria-live="polite">
          {error ?? hint ?? ' '}
        </p>
      </div>
      <div className={`pin-dots ${shake ? 'shake' : ''}`} key={shake} aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <i key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}>0</button>
        <button onClick={back} aria-label="Delete last digit" className="pin-back">
          <Delete size={22} />
        </button>
      </div>
    </div>
  )
}
