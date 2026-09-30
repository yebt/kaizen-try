import { prefersReducedMotion } from '../lib/feedback'
import { getSettings } from '../lib/store'

const COLORS = ['#ff7a45', '#3ccf8e', '#4a90e2', '#f0b429', '#b36bff', '#ff5c8a']

/** Lightweight canvas confetti burst; no-op with reduced motion. */
export function confetti(pieces = 140) {
  if (prefersReducedMotion() || !getSettings().celebrations) return
  const canvas = document.createElement('canvas')
  canvas.className = 'confetti'
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  const parts = Array.from({ length: pieces }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 16 - 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    c: COLORS[(Math.random() * COLORS.length) | 0],
  }))
  const t0 = performance.now()
  const tick = (t: number) => {
    const age = t - t0
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of parts) {
      p.vy += 0.45
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - age / 2600)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (age < 2600) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}
