import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diffDays, formatDay, todayKey, type DateKey } from '../lib/date'
import { compress, deletePhoto, savePhoto, updatePhoto, usePhotos, type PhotoView } from '../lib/photos'
import { uid } from '../lib/store'
import { toast } from '../lib/toast'
import type { Pose } from '../lib/types'
import { Camera, POSES } from './Camera'
import { IconCamera, IconCompare, IconTrash, IconUpload } from './Icons'
import { Sheet } from './Sheet'

const short = (d: DateKey) => formatDay(d, { day: 'numeric', month: 'short' })

function Compare({ a, b }: { a: PhotoView; b: PhotoView }) {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const update = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)))
  }
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
      aria-label="Before and after"
      aria-valuemin={0}
      aria-valuemax={100}
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
      <div className="knob" style={{ left: `${pos}%` }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </div>
      <span className="stamp" style={{ left: 12, top: 12 }}>
        {short(a.date)}
      </span>
      <span className="stamp" style={{ right: 12, top: 12 }}>
        {short(b.date)} · +{diffDays(a.date, b.date)} d
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

  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.url)
    },
    [pending],
  )

  const pickFile = useCallback((capture: boolean) => {
    const el = fileInput.current
    if (!el) return
    if (capture) el.setAttribute('capture', 'user')
    else el.removeAttribute('capture')
    el.click()
  }, [])
  const unavailable = useCallback(() => {
    setCamera(false)
    pickFile(true)
  }, [pickFile])

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
  const count = photos?.length ?? 0

  return (
    <div className="app">
      <header className="page-head">
        <div>
          <div className="eyebrow">{count ? `${count} ${count === 1 ? 'photo' : 'photos'} · since ${short(first!.date)}` : 'See your change'}</div>
          <h1>Diary</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {count >= 2 && (
            <button
              className="icon-btn outline"
              aria-pressed={picking}
              onClick={() => {
                setPicking((p) => !p)
                setPicked([])
              }}
              aria-label="Pick two photos to compare"
              style={picking ? { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' } : undefined}
            >
              <IconCompare />
            </button>
          )}
          <button className="icon-btn outline" onClick={() => pickFile(false)} aria-label="Upload a photo">
            <IconUpload />
          </button>
        </div>
      </header>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {picking && (
        <div className="panel small">
          <b style={{ fontWeight: 600 }}>Pick two photos to compare</b> <span className="muted">· {picked.length} of 2 selected</span>
        </div>
      )}

      {pair ? (
        <Compare a={pair[0]} b={pair[1]} />
      ) : (
        photos && (
          <div className="panel empty">
            <h2>{count ? 'One more to compare' : 'Day one starts here'}</h2>
            <p>
              {count
                ? `Take another ${filter === 'all' ? pose : filter} photo in a week or two and a before/after slider appears here.`
                : 'Change is invisible day to day and obvious month to month. A photo every 1–2 weeks is enough.'}
            </p>
          </div>
        )
      )}

      <div className="row" style={{ gap: 8 }}>
        <div className="segmented" style={{ flex: 1 }} role="group" aria-label="Filter by pose">
          {(['all', 'front', 'side', 'back'] as const).map((p) => (
            <button
              key={p}
              aria-pressed={filter === p}
              onClick={() => {
                setFilter(p)
                if (p !== 'all') setPose(p)
              }}
            >
              {p === 'all' ? 'All' : POSES.find((x) => x.id === p)!.label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setCamera(true)}>
          <IconCamera width={18} /> Photo
        </button>
      </div>

      <details className="panel small" style={{ padding: '4px 16px' }}>
        <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}>Tips for photos you can compare</summary>
        <ul className="muted" style={{ margin: '0 0 12px', paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Same spot and time of day — mornings are most consistent</li>
          <li>Face a window for soft, even light; no filters</li>
          <li>Same clothes, camera height and distance (about 2 m)</li>
          <li>Use the self-timer and the ghost overlay to line up</li>
        </ul>
      </details>

      {months.map(([month, items]) => (
        <section key={month} className="group">
          <h3 className="lbl">{new Date(month + '-15').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
          <div className="photo-grid">
            {items.map((p) => {
              const idx = picked.indexOf(p.id)
              return (
                <button
                  key={p.id}
                  aria-pressed={idx >= 0}
                  aria-label={`${p.pose} photo, ${short(p.date)}`}
                  onClick={() => {
                    if (!picking) return setViewing(p.id)
                    setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur.slice(-1), p.id]))
                  }}
                >
                  <img src={p.url} alt="" loading="lazy" />
                  <span className="stamp">{short(p.date)}</span>
                  {idx >= 0 && <span className="n">{idx + 1}</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {camera && (
        <Camera
          pose={pose}
          setPose={setPose}
          ghostUrl={ghost?.url}
          ghostLabel={ghost ? short(ghost.date) : undefined}
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
        <Sheet title={formatDay(viewingPhoto.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} onClose={() => setViewing(null)}>
          <div className="stack viewer" style={{ gap: 16 }}>
            <img src={viewingPhoto.url} alt="" />
            <div className="segmented" role="group" aria-label="Pose">
              {POSES.map((p) => (
                <button key={p.id} aria-pressed={viewingPhoto.pose === p.id} onClick={() => updatePhoto(viewingPhoto.id, { pose: p.id })}>
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
              <IconTrash width={16} /> Delete photo
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
    <label className="field">
      <span>Note</span>
      <textarea
        className="input"
        placeholder="How do you feel? Weight, energy, anything worth remembering…"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== note && updatePhoto(id, { note: v })}
      />
    </label>
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
      toast('Saved to your diary — future you will thank you')
      onClose()
    } catch {
      toast('Couldn’t save — storage may be full')
      setSaving(false)
    }
  }
  return (
    <Sheet
      title="New entry"
      onClose={onClose}
      closeLabel="Cancel"
      actions={
        <button className="text-btn strong" onClick={save} disabled={saving}>
          Save
        </button>
      }
    >
      <div className="stack viewer" style={{ gap: 16 }}>
        <img src={pending.url} alt="Preview" style={{ maxHeight: '45vh', objectFit: 'contain' }} />
        <div className="segmented" role="group" aria-label="Pose">
          {POSES.map((p) => (
            <button key={p.id} aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Date</span>
          <input className="input mono" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || today)} />
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <textarea className="input" placeholder="Mood, weight, energy…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn primary lg block" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save to diary'}
        </button>
      </div>
    </Sheet>
  )
}
