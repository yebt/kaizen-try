import { Check } from 'lucide-react'
import { actions, useSettings } from '../lib/store'
import { FONTS, THEMES, type ThemeDef } from '../lib/themes'
import { Sheet } from './Sheet'

/** A tiny screen drawn in the theme's own colors: a card, a line of text, a done check. */
function ThemePreview({ t }: { t: ThemeDef }) {
  const half = (light: ThemeDef, dark: ThemeDef) => (
    <>
      <ThemePreview t={light} />
      <span className="theme-split">
        <ThemePreview t={dark} />
      </span>
    </>
  )
  if (t.scheme === 'system') return half(THEMES[1], THEMES[2])
  return (
    <span className="theme-mock" style={{ background: t.bg }} aria-hidden>
      <span className="theme-card" style={{ background: t.surface }}>
        <i style={{ background: t.ink }} />
        <i style={{ background: t.ink, opacity: 0.35, width: '55%' }} />
        <b style={{ background: t.accent }} />
      </span>
      <span className="theme-bar" style={{ background: t.accent }} />
    </span>
  )
}

export function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  return (
    <Sheet title="Appearance" onClose={onClose} closeLabel="Back">
      <div className="stack" style={{ gap: 24 }}>
        <section className="group">
          <h3 className="lbl">Theme</h3>
          <div className="theme-grid" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.id} className="theme-opt" role="radio" aria-checked={settings.theme === t.id} onClick={() => actions.updateSettings({ theme: t.id })}>
                <span className="theme-frame">
                  <ThemePreview t={t} />
                  {settings.theme === t.id && (
                    <span className="theme-check">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="theme-name">
                  {t.label}
                  <small>{t.scheme === 'system' ? 'Auto' : t.scheme === 'dark' ? 'Dark' : 'Light'}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Font</h3>
          <div className="list" role="radiogroup" aria-label="Font">
            {FONTS.map((f) => (
              <button key={f.id} className="font-opt" role="radio" aria-checked={settings.font === f.id} onClick={() => actions.updateSettings({ font: f.id })}>
                <span className="font-aa" style={{ fontFamily: f.display, fontWeight: f.displayWeight }} aria-hidden>
                  Aa
                </span>
                <span className="font-txt">
                  <b style={{ fontFamily: f.display, fontWeight: f.displayWeight }}>{f.label}</b>
                  <span style={{ fontFamily: f.text }}>{f.hint}</span>
                </span>
                {settings.font === f.id && <Check size={18} className="font-check" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="xs faint">Changes apply right away. Numbers stay in a fixed-width font so times and counts line up.</p>
        </section>
      </div>
    </Sheet>
  )
}
