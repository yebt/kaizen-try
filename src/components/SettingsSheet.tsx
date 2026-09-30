import { useEffect, useRef, useState } from 'react'
import { applyBackup, backupFileName, BackupError, createBackup, parseBackup, summarize, type Backup, type ImportMode } from '../lib/backup'
import { saveTextFile } from '../lib/files'
import { clearPhotos, countPhotos } from '../lib/photos'
import { actions, useSettings, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Settings } from '../lib/types'
import { APP_VERSION } from '../lib/buildInfo'
import { AboutSheet } from './AboutSheet'
import { IconRight, IconUpload } from './Icons'
import { Sheet } from './Sheet'

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented sm" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch setting">
      <span>
        <b>{label}</b>
        {hint && <span className="xs muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : w + 's'}`
const cancelled = (e: unknown) => /cancel/i.test(String((e as Error)?.message ?? e))

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const [photos, setPhotos] = useState<number | null>(null)
  const [withPhotos, setWithPhotos] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<Backup | null>(null)
  const [about, setAbout] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Settings>) => actions.updateSettings(patch)

  useEffect(() => {
    countPhotos().then(setPhotos, () => setPhotos(0))
  }, [incoming, busy])

  const days = Object.keys(logs).length

  const doExport = async () => {
    setBusy('export')
    try {
      const backup = await createBackup({ includePhotos: withPhotos })
      const how = await saveTextFile(backupFileName(withPhotos), JSON.stringify(backup))
      toast(how === 'downloaded' ? 'Backup downloaded' : 'Backup ready')
    } catch (e) {
      if (!cancelled(e)) toast('Couldn’t export — ' + ((e as Error).message || 'unknown error'))
    } finally {
      setBusy(null)
    }
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setIncoming(parseBackup(await f.text()))
    } catch (e) {
      toast(e instanceof BackupError ? e.message : 'Couldn’t read that file.', undefined, 6000)
    }
  }

  const eraseAll = async () => {
    if (!confirm('Erase all habits, history, photos and settings on this device? Export a backup first if you might want them back.')) return
    if (!confirm('This can’t be undone. Erase everything?')) return
    actions.resetAll()
    await clearPhotos()
    toast('All data erased')
    onClose()
  }

  if (incoming) return <ImportSheet backup={incoming} onDone={() => setIncoming(null)} />
  if (about) return <AboutSheet onClose={() => setAbout(false)} />

  return (
    <Sheet title="Profile & settings" onClose={onClose} closeLabel="Done">
      <div className="stack" style={{ gap: 24 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar lg" aria-hidden>
            {settings.name.trim()[0]?.toUpperCase() || 'K'}
          </span>
          <label className="field" style={{ flex: 1 }}>
            <span>Your name</span>
            <input className="input" value={settings.name} onChange={(e) => set({ name: e.target.value })} placeholder="What should we call you?" maxLength={40} autoComplete="given-name" />
          </label>
        </div>

        <section className="group">
          <h3 className="lbl">Preferences</h3>
          <div className="list settings-list">
            <div className="setting">
              <b>Appearance</b>
              <Seg label="Appearance" value={settings.theme} onChange={(theme) => set({ theme })} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} />
            </div>
            <div className="setting">
              <b>Week starts on</b>
              <Seg label="Week starts on" value={settings.weekStartsOn} onChange={(weekStartsOn) => set({ weekStartsOn })} options={[[1, 'Monday'], [0, 'Sunday']]} />
            </div>
            <div className="setting">
              <b>Progress photo reminder</b>
              <Seg label="Photo reminder" value={settings.photoReminderDays} onChange={(photoReminderDays) => set({ photoReminderDays })} options={[[0, 'Off'], [7, '7 d'], [14, '14 d'], [30, '30 d']]} />
            </div>
            <Toggle label="Haptics" hint="A light tap when you check things off" checked={settings.haptics} onChange={(haptics) => set({ haptics })} />
            <Toggle label="Celebrations" hint="Confetti for perfect days and milestones" checked={settings.celebrations} onChange={(celebrations) => set({ celebrations })} />
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Your data</h3>
          <div className="list settings-list">
            <div className="setting">
              <span className="small muted">
                {plural(habits.length, 'habit')} · {plural(days, 'day')} logged · {photos === null ? '…' : plural(photos, 'photo')}. Everything stays on this device until you export it.
              </span>
            </div>
            <Toggle
              label="Include photos"
              hint={photos ? `Adds ${plural(photos, 'photo')} — the file gets much larger` : 'No photos yet'}
              checked={withPhotos && !!photos}
              onChange={setWithPhotos}
            />
            <div className="setting" style={{ gap: 10 }}>
              <button className="btn primary block" onClick={doExport} disabled={busy !== null || (!habits.length && !photos)}>
                {busy === 'export' ? 'Preparing…' : 'Export backup'}
              </button>
              <button className="btn block" onClick={() => file.current?.click()} disabled={busy !== null}>
                <IconUpload width={18} /> Import backup…
              </button>
              <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
            </div>
          </div>
        </section>

        <div className="list">
          <button className="about-row" onClick={() => setAbout(true)}>
            <span>About Kaizen</span>
            <span className="about-value">
              <span className="mono">{APP_VERSION}</span>
              <IconRight width={16} height={16} aria-hidden />
            </span>
          </button>
        </div>

        <div className="stack" style={{ gap: 4, alignItems: 'center' }}>
          <button className="btn danger" onClick={eraseAll}>
            Erase all data
          </button>
          <p className="xs faint">No account, no tracking</p>
        </div>
      </div>
    </Sheet>
  )
}

function ImportSheet({ backup, onDone }: { backup: Backup; onDone: () => void }) {
  const s = summarize(backup)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [withSettings, setWithSettings] = useState(false)
  const [withPhotos, setWithPhotos] = useState(s.photos > 0)
  const [busy, setBusy] = useState(false)
  const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown date'

  const run = async () => {
    if (mode === 'replace' && !confirm('Replace everything on this device with this backup? Current habits and history will be removed.')) return
    setBusy(true)
    try {
      await applyBackup(backup, { mode, settings: withSettings || mode === 'replace', photos: withPhotos })
      toast(`Imported ${plural(s.habits, 'habit')}${withPhotos && s.photos ? ` and ${plural(s.photos, 'photo')}` : ''}`)
      onDone()
    } catch (e) {
      toast('Import failed — ' + ((e as Error).message || 'unknown error'))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Import backup" onClose={onDone} closeLabel="Cancel">
      <div className="stack" style={{ gap: 20 }}>
        <div className="stat-grid">
          <div className="stat">
            <b>{s.habits}</b>
            <span>{s.habits === 1 ? 'habit' : 'habits'}</span>
          </div>
          <div className="stat">
            <b>{s.days}</b>
            <span>{s.days === 1 ? 'day logged' : 'days logged'}</span>
          </div>
          <div className="stat">
            <b>{s.photos}</b>
            <span>{s.photos === 1 ? 'photo' : 'photos'}</span>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: -8 }}>
          Exported {when}
          {s.name ? ` by ${s.name}` : ''}.
        </p>

        <div className="field">
          <span>How to import</span>
          <div className="segmented">
            <button aria-pressed={mode === 'merge'} onClick={() => setMode('merge')}>
              Merge
            </button>
            <button aria-pressed={mode === 'replace'} onClick={() => setMode('replace')}>
              Replace
            </button>
          </div>
          <span className="hint">
            {mode === 'merge'
              ? 'Adds the file’s habits and days to what’s here. Where both have the same entry, the file’s version wins.'
              : 'Removes the current habits and history on this device and restores exactly what’s in the file.'}
          </span>
        </div>

        {(mode === 'merge' || s.photos > 0) && (
        <div className="list settings-list">
          {mode === 'merge' && <Toggle label="Also apply profile & settings" checked={withSettings} onChange={setWithSettings} />}
          {s.photos > 0 && (
            <Toggle
              label={`Import ${plural(s.photos, 'photo')}`}
              hint={mode === 'replace' ? 'Replaces the photos on this device' : 'Added to your diary'}
              checked={withPhotos}
              onChange={setWithPhotos}
            />
          )}
        </div>
        )}

        <button className={`btn lg block ${mode === 'replace' ? 'danger-fill' : 'primary'}`} onClick={run} disabled={busy}>
          {busy ? 'Importing…' : mode === 'replace' ? 'Replace my data' : 'Merge into my data'}
        </button>
      </div>
    </Sheet>
  )
}
