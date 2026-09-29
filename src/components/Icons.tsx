import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
)
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 3v3M16 3v3M7.5 14h4" /></svg>
)
export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.4-2h6.6l1.4 2h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.8" /></svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconMinus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 3, ...p })}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IconLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>
)
export const IconRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>
)
export const IconFlame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}><path d="M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.2-5 .2 1.6.9 2.8 2.1 3.3C10 8.5 10.8 5 12 2z" /></svg>
)
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}><path d="M12 2 4 5v6.5c0 5 3.4 8.8 8 10.5 4.6-1.7 8-5.5 8-10.5V5z" /></svg>
)
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /></svg>
)
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
)
export const IconCompare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M12 2v20" /></svg>
)
export const IconFlip = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" /></svg>
)
export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
)
export const IconTimer = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2h5" /></svg>
)
