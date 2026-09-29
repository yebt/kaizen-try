import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diffDays, formatDay, todayKey, type DateKey } from '../lib/date'
import { compress, deletePhoto, savePhoto, updatePhoto, usePhotos, type PhotoView } from '../lib/photos'
import { uid } from '../lib/store'
import { toast } from '../lib/toast'
import type { Pose } from '../lib/types'
import { Camera, POSES } from './Camera'
import { IconCamera, IconCompare, IconTrash, IconUpload } from './Icons'
import { Sheet } from './Sheet'

function Compare({ a, b }: { a: PhotoView; b: PhotoView }) {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const update = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)))
  }
  const days = diffDays(a.date, b.date)
  return (
    <div
      className="compare"
      ref={ref}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && update(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      role="slider"
      aria-label="Before / after"
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
        if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
      }}
    >
      <img src={b.url} alt={`After, ${b.date}`} />
      <img src={a.url} alt={`Before, ${a.date}`} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="divider" style={{ left: `${pos}%` }} />
      <span className="tag" style={{ left: 10 }}>{formatDay(a.date, { month: 'short', day: 'numeric' })}</span>
      <span className="tag" style={{ right: 10 }}>
        {formatDay(b.date, { month: 'short', day: 'numeric' })} · +{days}d
      </span>
    </div>
  )
}

export function DiaryView({ today }: { today: DateKey }) {
  const photos = usePhotos()
  const [pose, setPose] = useState<Pose>('front')
  const [filter, setFilter] = useState<Pose | 'all'>('all')
  const [camera, setCamera] = useState(false)
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [showTips, setShowTips] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const list = useMemo(() => (photos ?? []).filter((p) => filter === 'all' || p.pose === filter), [photos, filter])
  const ghost = useMemo(() => [...(photos ?? [])].reverse().find((p) => p.pose === pose), [photos, pose])

  // Default comparison: first vs latest photo of the same pose.
  const pair = useMemo((): [PhotoView, PhotoView] | null => {
    if (picked.length === 2) {
      const [x, y] = picked.map((id) => photos?.find((p) => p.id === id)).filter(Boolean) as PhotoView[]
      if (x && y) return x.date <= y.date ? [x, y] : [y, x]
    }
    const pool = (photos ?? []).filter((p) => p.pose === (filter === 'all' ? pose : filter))
    return pool.length >= 2 ? [pool[0], pool[pool.length - 1]] : null
  }, [photos, picked, filter, pose])

  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.url)
  }, [pending])

  const unavailable = useCallback(() => {
    setCamera(false)
    fileInput.current?.click()
  }, [])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    const blob = await compress(f)
    setPending({ blob, url: URL.createObjectURL(blob) })
  }

  const months = useMemo(() => {
    const m = new Map<string, PhotoView[]>()
    for (const p of [...list].reverse()) {
      const k = p.date.slice(0, 7)
      m.set(k, [...(m.get(k) ?? []), p])
    }
    return [...m.entries()]
  }, [list])

  const viewingPhoto = photos?.find((p) => p.id === viewing)
  const first = photos?.[0]

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="sub">{photos?.length ? `${photos.length} photos · since ${formatDay(first!.date, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'See your change'}</div>
          <h1>Photo diary</h1>
        </div>
        {(photos?.length ?? 0) >= 2 && (
          <button
            className="icon-btn"
            aria-pressed={picking}
            onClick={() => {
              setPicking((p) => !p)
              setPicked([])
            }}
            aria-label="Pick two photos to compare"
            style={picking ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
          >
            <IconCompare />
          </button>
        )}
      </header>

      <input ref={fileInput} type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      <div className="stack">
        <div className="grid-2">
          <button className="btn primary" style={{ minHeight: 52 }} onClick={() => setCamera(true)}>
            <IconCamera width={20} /> Take photo
          </button>
          <button
            className="btn"
            style={{ minHeight: 52 }}
            onClick={() => {
              fileInput.current?.removeAttribute('capture')
              fileInput.current?.click()
              fileInput.current?.setAttribute('capture', 'user')
            }}
          >
            <IconUpload width={20} /> Upload
          </button>
        </div>

        {picking && (
          <div className="banner">
            <span className="icon">↔️</span>
            <div>
              <strong>Pick two photos</strong>
              {picked.length}/2 selected. Tap again to deselect.
            </div>
          </div>
        )}

        {pair && (
          <div className="card" style={{ padding: 10 }}>
            <Compare a={pair[0]} b={pair[1]} />
            <p className="small muted" style={{ textAlign: 'center', marginTop: 8 }}>
              Drag to compare · {diffDays(pair[0].date, pair[1].date)} days apart
            </p>
          </div>
        )}

        {photos && photos.length === 0 && (
          <div className="card empty">
            <div className="big">📸</div>
            <h2>Day one starts here</h2>
            <p className="muted">
              Change is invisible day-to-day and obvious month-to-month. Take a photo every 1–2 weeks and compare.
            </p>
          </div>
        )}

        <button className="small muted" style={{ textAlign: 'left', padding: '4px 4px' }} onClick={() => setShowTips((s) => !s)}>
          {showTips ? '▾' : '▸'} Tips for photos you can actually compare
        </button>
        {showTips && (
          <div className="card small" style={{ lineHeight: 1.6 }}>
            • Same spot, same time of day (mornings are most consistent)
            <br />• Face a window — soft, even light; no filters
            <br />• Same clothes, same camera height and distance (~2 m)
            <br />• Use the timer and the ghost overlay to line up
            <br />• Front, side and back every 1–2 weeks is plenty
          </div>
        )}

        {(photos?.length ?? 0) > 0 && (
          <div className="chips scroll">
            <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </button>
            {POSES.map((p) => (
              <button key={p.id} className="chip" aria-pressed={filter === p.id} onClick={() => setFilter(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {months.map(([month, items]) => (
          <section key={month}>
            <h3 className="section-title">{new Date(month + '-15').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
            <div className="photo-grid">
              {items.map((p) => {
                const idx = picked.indexOf(p.id)
                return (
                  <button
                    key={p.id}
                    aria-pressed={idx >= 0}
                    onClick={() => {
                      if (!picking) return setViewing(p.id)
                      setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur.slice(-1), p.id]))
                    }}
                  >
                    <img src={p.url} alt={`${p.pose} ${p.date}`} loading="lazy" />
                    <span className="d">{formatDay(p.date, { day: 'numeric', month: 'short' })}</span>
                    {idx >= 0 && <span className="n">{idx + 1}</span>}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {camera && (
        <Camera
          pose={pose}
          setPose={setPose}
          ghostUrl={ghost?.url}
          onClose={() => setCamera(false)}
          onUnavailable={unavailable}
          onCapture={(blob) => {
            setCamera(false)
            setPending({ blob, url: URL.createObjectURL(blob) })
          }}
        />
      )}

      {pending && <SavePhoto pending={pending} pose={pose} today={today} onClose={() => setPending(null)} />}

      {viewingPhoto && (
        <Sheet title={formatDay(viewingPhoto.date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} onClose={() => setViewing(null)}>
          <div className="stack viewer">
            <img src={viewingPhoto.url} alt="" />
            <div className="chips">
              {POSES.map((p) => (
                <button key={p.id} className="chip" aria-pressed={viewingPhoto.pose === p.id} onClick={() => updatePhoto(viewingPhoto.id, { pose: p.id })}>
                  {p.label}
                </button>
              ))}
            </div>
            <NoteField id={viewingPhoto.id} note={viewingPhoto.note} />
            {first && viewingPhoto.id !== first.id && (
              <p className="small muted">Day {diffDays(first.date, viewingPhoto.date) + 1} of your journey.</p>
            )}
            <button
              className="btn danger block"
              onClick={async () => {
                if (!confirm('Delete this photo? This can’t be undone.')) return
                await deletePhoto(viewingPhoto.id)
                setViewing(null)
                toast('Photo deleted')
              }}
            >
              <IconTrash width={18} /> Delete photo
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function NoteField({ id, note }: { id: string; note: string }) {
  const [v, setV] = useState(note)
  return (
    <textarea
      className="input"
      placeholder="How do you feel? Weight, energy, anything worth remembering…"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== note && updatePhoto(id, { note: v })}
    />
  )
}

function SavePhoto({ pending, pose: initialPose, today, onClose }: { pending: { blob: Blob; url: string }; pose: Pose; today: DateKey; onClose: () => void }) {
  const [pose, setPose] = useState(initialPose)
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      await savePhoto({ id: uid(), date, pose, note: note.trim(), createdAt: Date.now(), blob: pending.blob })
      toast('Saved to your diary 📸 Future you will thank you.')
      onClose()
    } catch {
      toast('Couldn’t save — storage may be full.')
      setSaving(false)
    }
  }
  return (
    <Sheet title="New entry" onClose={onClose}>
      <div className="stack viewer">
        <img src={pending.url} alt="Preview" style={{ maxHeight: '45vh', objectFit: 'contain', background: '#000' }} />
        <div className="chips">
          {POSES.map((p) => (
            <button key={p.id} className="chip" aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Date</span>
          <input className="input" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || today)} />
        </label>
        <textarea className="input" placeholder="Note (optional) — mood, weight, energy…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn primary block" style={{ minHeight: 52 }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save to diary'}
        </button>
      </div>
    </Sheet>
  )
}
