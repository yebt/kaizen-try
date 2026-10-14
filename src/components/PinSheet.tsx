import { useState } from 'react'
import { checkPin, makePin } from '../lib/privacy'
import { getSettings } from '../lib/store'
import type { PinLock } from '../lib/types'
import { PinPad } from './PinPad'
import { Sheet } from './Sheet'

type Props =
  | { mode: 'set'; onDone: (pin: PinLock) => void; onClose: () => void }
  | { mode: 'verify'; title: string; hint?: string; onDone: () => void; onClose: () => void }

/** Choose a new PIN (twice), or confirm the current one before a sensitive action. */
export function PinSheet(props: Props) {
  const [first, setFirst] = useState<string | null>(null)
  const [mismatch, setMismatch] = useState(false)

  if (props.mode === 'verify') {
    return (
      <Sheet title="" onClose={props.onClose} closeLabel="Cancel">
        <PinPad
          title={props.title}
          hint={props.hint ?? 'Enter your diary PIN'}
          onComplete={async (pin) => {
            const lock = getSettings().diaryPin
            if (!lock || (await checkPin(pin, lock))) props.onDone()
            else return 'Wrong PIN — try again'
          }}
        />
      </Sheet>
    )
  }

  return (
    <Sheet title="" onClose={props.onClose} closeLabel="Cancel">
      <PinPad
        key={first === null ? 'first' : 'again'}
        title={first === null ? 'Choose a PIN' : 'Enter it again'}
        hint={first === null ? (mismatch ? 'They didn’t match — choose a PIN again' : '4 digits to open your diary') : 'To make sure it’s right'}
        onComplete={async (pin) => {
          if (first === null) {
            setMismatch(false)
            setFirst(pin)
            return
          }
          if (pin !== first) {
            setFirst(null)
            setMismatch(true)
            return
          }
          props.onDone(await makePin(pin))
        }}
      />
    </Sheet>
  )
}
