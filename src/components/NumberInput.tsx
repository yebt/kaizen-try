import { useEffect, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max' | 'type'> & {
  value: number | undefined
  onChange: (n: number | undefined) => void
  min?: number
  max?: number
  /** Whole numbers only. */
  integer?: boolean
  /** Used when the field is left empty (on blur). Leave unset to allow empty. */
  fallback?: number
}

const parse = (t: string) => {
  if (!t.trim()) return undefined
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const show = (n: number | undefined) => (n === undefined ? '' : String(n))

/**
 * Numeric field that keeps what you type. Clearing it stays empty while you
 * type (no "15" jumping back in); limits and defaults apply when you leave it.
 */
export function NumberInput({ value, onChange, min, max, integer, fallback, onBlur, ...rest }: Props) {
  const [text, setText] = useState(show(value))

  // Follow outside changes (templates, steppers) without fighting the user's typing.
  useEffect(() => {
    if (parse(text) !== value) setText(show(value))
  }, [value])

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, '')
        setText(t)
        onChange(parse(t))
      }}
      onBlur={(e) => {
        let n = parse(text) ?? fallback
        if (n !== undefined) {
          if (integer) n = Math.round(n)
          if (min !== undefined) n = Math.max(min, n)
          if (max !== undefined) n = Math.min(max, n)
        }
        setText(show(n))
        if (n !== value) onChange(n)
        onBlur?.(e)
      }}
    />
  )
}
