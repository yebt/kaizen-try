import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Glyph } from './HabitIcon'
import { ICONS, ICON_CATEGORIES, type IconDef } from './icons/catalog'
import { searchIcons, suggestIcons } from './icons/search'
import { Sheet } from './Sheet'

interface Props {
  value: string
  color: string
  /** Habit name and direction, used for the "Suggested" row. */
  name: string
  polarity: 'build' | 'quit'
  onSelect: (key: string) => void
  onClose: () => void
}

function Grid({ icons, value, onPick }: { icons: IconDef[]; value: string; onPick: (k: string) => void }) {
  return (
    <div className="picker-grid">
      {icons.map((d) => (
        <button key={d.key} className="picker-item" aria-pressed={d.key === value} onClick={() => onPick(d.key)} title={d.label}>
          <span className="picker-tile">
            <Glyph name={d.key} size={22} />
          </span>
          <span className="picker-label">{d.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Full icon chooser: search (English or Spanish), category filter, and
 * suggestions from the habit's name. One tap picks and closes.
 */
export function IconPicker({ value, color, name, polarity, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')

  const category = ICON_CATEGORIES.find((c) => c.id === cat)
  const results = useMemo(() => {
    if (!query.trim()) return null
    const found = searchIcons(query)
    return category ? found.filter((d) => category.keys.includes(d.key)) : found
  }, [query, category])
  // Only real matches for the name here; generic defaults would read as "suggested for X".
  const suggested = useMemo(() => suggestIcons(name, polarity, 10, false), [name, polarity])

  const pick = (k: string) => {
    onSelect(k)
    onClose()
  }

  return (
    <Sheet title="Choose icon" onClose={onClose} closeLabel="Cancel" className="tall">
      <div className="picker" style={{ ['--c' as string]: color }}>
        <div className="picker-controls">
          <label className="picker-search">
            <Search size={18} aria-hidden />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search icons — e.g. water, leer, gym"
              aria-label="Search icons"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="picker-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="chips scroll" role="group" aria-label="Category">
            <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
              All
            </button>
            {ICON_CATEGORIES.map((c) => (
              <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {results ? (
          results.length ? (
            <section className="group">
              <h3 className="lbl">
                {results.length} {results.length === 1 ? 'icon' : 'icons'}
                {category ? ` in ${category.label}` : ''}
              </h3>
              <Grid icons={results} value={value} onPick={pick} />
            </section>
          ) : (
            <div className="empty" style={{ padding: '32px 12px' }}>
              <h2 style={{ fontSize: 24 }}>No icons for “{query.trim()}”</h2>
              <p>Try another word{category ? ' or search all categories' : ''} — English or Spanish both work.</p>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                {category && (
                  <button className="btn sm" onClick={() => setCat('all')}>
                    Search all
                  </button>
                )}
                <button className="btn sm" onClick={() => setQuery('')}>
                  Clear search
                </button>
              </div>
            </div>
          )
        ) : category ? (
          <Grid icons={category.keys.map((k) => ICONS[k])} value={value} onPick={pick} />
        ) : (
          <>
            {suggested.length > 0 && (
              <section className="group">
                <h3 className="lbl">Suggested for “{name.trim()}”</h3>
                <Grid icons={suggested} value={value} onPick={pick} />
              </section>
            )}
            {ICON_CATEGORIES.map((c) => (
              <section key={c.id} className="group">
                <h3 className="lbl">{c.label}</h3>
                <Grid icons={c.keys.map((k) => ICONS[k])} value={value} onPick={pick} />
              </section>
            ))}
          </>
        )}
      </div>
    </Sheet>
  )
}
