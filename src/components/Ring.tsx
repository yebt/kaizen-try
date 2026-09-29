interface Props {
  size: number
  stroke: number
  value: number // 0..1
  color?: string
  track?: string
  /** Optional 0..1 position of a tick mark (the minimum). */
  tick?: number
}

export function Ring({ size, stroke, value, color = 'var(--accent)', track = 'var(--surface-2)', tick }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  const angle = tick !== undefined ? tick * 2 * Math.PI - Math.PI / 2 : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${v * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .5s cubic-bezier(.2,.8,.2,1)' }}
        opacity={v === 0 ? 0 : 1}
      />
      {tick !== undefined && tick > 0 && tick < 1 && (
        <circle
          cx={size / 2 + r * Math.cos(angle)}
          cy={size / 2 + r * Math.sin(angle)}
          r={stroke / 2 - 0.5}
          fill="var(--surface)"
          stroke={color}
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}
