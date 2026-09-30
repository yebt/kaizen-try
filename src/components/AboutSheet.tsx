import { App as CapApp } from '@capacitor/app'
import { useEffect, useState, type ReactNode } from 'react'
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE, ISSUES_URL, RELEASES_URL, REPO_URL } from '../lib/buildInfo'
import { isNative } from '../lib/native'
import { toast } from '../lib/toast'
import { IconRight } from './Icons'
import { Sheet } from './Sheet'

const CREDITS: [string, string][] = [
  ['React', 'MIT'],
  ['Capacitor', 'MIT'],
  ['Vite', 'MIT'],
  ['Geist & Geist Mono', 'SIL OFL 1.1'],
  ['Instrument Serif', 'SIL OFL 1.1'],
]

interface NativeInfo {
  version: string
  build: string
  id: string
}

function Logo() {
  return (
    <svg width="72" height="72" viewBox="0 0 512 512" aria-hidden className="about-logo">
      <rect width="512" height="512" rx="112" fill="#18181b" />
      <circle cx="256" cy="256" r="136" fill="none" stroke="#2c2c31" strokeWidth="36" />
      <circle cx="256" cy="256" r="136" fill="none" stroke="#5cc4a4" strokeWidth="36" strokeLinecap="round" strokeDasharray="641 855" transform="rotate(-90 256 256)" />
      <path d="M204 260l36 36 72-80" fill="none" stroke="#f6f5f2" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Row({ label, value, href }: { label: string; value?: ReactNode; href?: string }) {
  const body = (
    <>
      <span>{label}</span>
      <span className="about-value">
        {value}
        {href && <IconRight width={16} height={16} aria-hidden />}
      </span>
    </>
  )
  return href ? (
    <a className="about-row" href={href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <div className="about-row">{body}</div>
  )
}

export function AboutSheet({ onClose }: { onClose: () => void }) {
  const [native, setNative] = useState<NativeInfo | null>(null)

  useEffect(() => {
    if (!isNative) return
    CapApp.getInfo()
      .then(({ version, build, id }) => setNative({ version, build, id }))
      .catch(() => {})
  }, [])

  const built = new Date(BUILD_DATE)
  const builtLabel = Number.isNaN(built.getTime()) ? '—' : built.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const platform = native ? `Android app ${native.version} (${native.build})` : 'Web app'
  const summary = `Kaizen ${APP_VERSION} (${BUILD_COMMIT}) · ${platform}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      toast('Version details copied')
    } catch {
      toast(summary)
    }
  }

  const reportUrl = `${ISSUES_URL}?body=${encodeURIComponent(`\n\n---\n${summary}\n${navigator.userAgent}`)}`

  return (
    <Sheet title="About" onClose={onClose} closeLabel="Back">
      <div className="stack" style={{ gap: 24 }}>
        <div className="about-hero">
          <Logo />
          <h1 className="serif">Kaizen</h1>
          <p className="muted">Small steps, every day.</p>
          <button className="chip mono" onClick={copy} aria-label={`${summary}. Copy version details`}>
            Version {APP_VERSION}
          </button>
        </div>

        <section className="group">
          <h3 className="lbl">This version</h3>
          <div className="list">
            <Row label="Version" value={<span className="mono">{APP_VERSION}</span>} />
            <Row label="Build" value={<span className="mono">{BUILD_COMMIT}</span>} href={BUILD_COMMIT !== 'unknown' ? `${REPO_URL}/commit/${BUILD_COMMIT}` : undefined} />
            <Row label="Built on" value={builtLabel} />
            <Row label="Platform" value={platform} />
            {native && <Row label="App ID" value={<span className="mono xs">{native.id}</span>} />}
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Updates & help</h3>
          <div className="list">
            <Row label="What’s new in this version" href={`${RELEASES_URL}/tag/v${APP_VERSION}`} />
            <Row label="Check for updates" href={`${RELEASES_URL}/latest`} />
            <Row label="Report a problem" href={reportUrl} />
            <Row label="Source code" href={REPO_URL} />
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Privacy</h3>
          <div className="panel small" style={{ lineHeight: 1.55 }}>
            <p>
              <b style={{ fontWeight: 600 }}>Your data never leaves this device.</b> There’s no account, no analytics and no ads. Habits, history and photos are stored only on this
              phone or browser, and only you can export them.
            </p>
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Built on habit science</h3>
          <div className="list">
            <div className="about-row about-text">
              Forgiving streaks, a minimum that still counts, and “never miss twice” come from research on how habits actually form — about 66 days on average, and one missed day
              doesn’t reset the process.
            </div>
            <Row label="Read the research notes" href={`${REPO_URL}/blob/main/docs/RESEARCH.md`} />
          </div>
        </section>

        <section className="group">
          <h3 className="lbl">Open-source software</h3>
          <div className="list">
            {CREDITS.map(([name, license]) => (
              <Row key={name} label={name} value={<span className="xs">{license}</span>} />
            ))}
          </div>
        </section>

        <p className="xs faint" style={{ textAlign: 'center' }}>
          Made with care by{' '}
          <a href="https://github.com/yebt" target="_blank" rel="noopener noreferrer">
            yebt
          </a>
          .
        </p>
      </div>
    </Sheet>
  )
}
