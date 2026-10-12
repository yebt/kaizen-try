import type { FontStyle, Theme } from './types'

export interface ThemeDef {
  id: Theme
  label: string
  /** Light or dark base; sets the matching system bars and contrast rules. */
  scheme: 'light' | 'dark' | 'system'
  /** Colors for the picker preview (the real tokens live in styles.css). */
  bg: string
  surface: string
  ink: string
  accent: string
}

export const THEMES: ThemeDef[] = [
  { id: 'system', label: 'System', scheme: 'system', bg: '#f6f5f2', surface: '#ffffff', ink: '#18181b', accent: '#1f6f5c' },
  { id: 'light', label: 'Paper', scheme: 'light', bg: '#f6f5f2', surface: '#ffffff', ink: '#18181b', accent: '#1f6f5c' },
  { id: 'dark', label: 'Ink', scheme: 'dark', bg: '#0e0e10', surface: '#17171a', ink: '#ededef', accent: '#5cc4a4' },
  { id: 'sand', label: 'Sand', scheme: 'light', bg: '#f3ece0', surface: '#fbf7f0', ink: '#2b2118', accent: '#5f6b2a' },
  { id: 'sage', label: 'Sage', scheme: 'light', bg: '#eaefe7', surface: '#f7f9f5', ink: '#1a2419', accent: '#2f6b46' },
  { id: 'rose', label: 'Rose', scheme: 'light', bg: '#f7ecee', surface: '#fdf7f8', ink: '#2a1a1f', accent: '#a2365f' },
  { id: 'ocean', label: 'Ocean', scheme: 'dark', bg: '#0b1420', surface: '#121e2c', ink: '#e6eef7', accent: '#4fc3c9' },
  { id: 'forest', label: 'Forest', scheme: 'dark', bg: '#0d1510', surface: '#152019', ink: '#e7efe8', accent: '#9ccf6a' },
  { id: 'plum', label: 'Plum', scheme: 'dark', bg: '#16101c', surface: '#211829', ink: '#f0e9f5', accent: '#c9a2ef' },
  { id: 'midnight', label: 'Midnight', scheme: 'dark', bg: '#000000', surface: '#0f0f11', ink: '#f2f2f3', accent: '#5cc4a4' },
]

export const themeDef = (id: Theme) => THEMES.find((t) => t.id === id) ?? THEMES[0]
export const isTheme = (v: unknown): v is Theme => THEMES.some((t) => t.id === v)

export interface FontDef {
  id: FontStyle
  label: string
  hint: string
  /** CSS font stacks used by the picker preview (the app reads them from styles.css). */
  display: string
  text: string
  displayWeight: number
}

export const FONTS: FontDef[] = [
  { id: 'editorial', label: 'Editorial', hint: 'Serif titles, clean text', display: "'Instrument Serif', serif", text: "'Geist Variable', sans-serif", displayWeight: 400 },
  { id: 'modern', label: 'Modern', hint: 'One clean sans-serif', display: "'Geist Variable', sans-serif", text: "'Geist Variable', sans-serif", displayWeight: 600 },
  { id: 'classic', label: 'Classic', hint: 'Bookish, warm titles', display: "'Fraunces Variable', serif", text: "'Geist Variable', sans-serif", displayWeight: 500 },
  { id: 'rounded', label: 'Rounded', hint: 'Soft and friendly', display: "'Nunito Variable', sans-serif", text: "'Nunito Variable', sans-serif", displayWeight: 800 },
  { id: 'readable', label: 'Readable', hint: 'Designed for low vision', display: "'Atkinson Hyperlegible', sans-serif", text: "'Atkinson Hyperlegible', sans-serif", displayWeight: 700 },
  { id: 'system', label: 'Device', hint: 'Your phone’s own font', display: 'system-ui, sans-serif', text: 'system-ui, sans-serif', displayWeight: 600 },
]

export const isFont = (v: unknown): v is FontStyle => FONTS.some((f) => f.id === v)
