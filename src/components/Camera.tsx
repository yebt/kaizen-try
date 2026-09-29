import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/feedback'
import type { Pose } from '../lib/types'
import { IconFlip, IconTimer, IconX } from './Icons'

export const POSES: { id: Pose; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
  { id: 'other', label: 'Other' },
]

interface Props {
  pose: Pose
  setPose: (p: Pose) => void
  ghostUrl?: string
  /** e.g. "15 Sep" — date of the ghost photo. */
  ghostLabel?: string
  onCapture: (b: Blob) => void
  onClose: () => void
  onUnavailable: () => void
}

/**
 * Progress-photo camera: overlays a translucent "ghost" of your last photo in
 * the same pose so framing stays consistent, with a self-timer for hands-free shots.
 */
export function Camera({ pose, setPose, ghostUrl, ghostLabel, onCapture, onClose, onUnavailable }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [opacity, setOpacity] = useState(0.38)
  const [timer, setTimer] = useState<0 | 3 | 10>(3)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      onUnavailable()
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
      })
      .catch(() => !cancelled && onUnavailable())
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing, onUnavailable])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    // Crop the centre 3:4 region — the same region the viewfinder shows.
    const vw = v.videoWidth
    const vh = v.videoHeight
    const target = 3 / 4
    let sw = vw
    let sh = vh
    if (vw / vh > target) sw = vh * target
    else sh = vw / target
    const scale = Math.min(1, 1600 / sh)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d')!
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
    haptic([10, 30, 10])
    canvas.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.88)
  }

  const shoot = () => {
    if (count !== null) return
    if (!timer) return snap()
    let n = timer
    setCount(n)
    const t = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(t)
        setCount(null)
        snap()
      } else {
        haptic(8)
        setCount(n)
      }
    }, 1000)
  }

  return (
    <div className="camera">
      <div className="view">
        <div className="frame">
          <video ref={video} autoPlay playsInline muted className={facing === 'user' ? 'mirror' : ''} />
          {ghostUrl && opacity > 0 && <img className="ghost" src={ghostUrl} alt="" style={{ opacity }} />}
          <div className="thirds" />
          {count !== null && <div className="count">{count}</div>}
          {ghostLabel && count === null && <div className="hint-pill">Line up with your {ghostLabel} photo</div>}
        </div>
        <div className="top">
          <button className="round" onClick={onClose} aria-label="Close camera">
            <IconX />
          </button>
          <button className="round" onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))} aria-label={`Self-timer: ${timer ? `${timer} seconds` : 'off'}`}>
            <IconTimer />
            <span className="mono">{timer ? `${timer}s` : 'Off'}</span>
          </button>
        </div>
      </div>
      <div className="controls">
        <div className="poses" role="group" aria-label="Pose">
          {POSES.map((p) => (
            <button key={p.id} aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {ghostUrl ? (
          <label className="ghost-ctl">
            <span>Ghost</span>
            <input type="range" min={0} max={0.8} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            <span className="mono">{Math.round(opacity * 100)}%</span>
          </label>
        ) : (
          <p className="xs" style={{ textAlign: 'center', color: 'rgba(255,255,255,.65)' }}>
            Your first {pose} photo — next time it appears as a guide to line up with.
          </p>
        )}
        <div className="shutter-row">
          <div className="thumb">{ghostUrl && <img src={ghostUrl} alt="" />}</div>
          <button className="shutter" onClick={shoot} aria-label="Take photo" />
          <button className="flip" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Flip camera">
            <IconFlip />
          </button>
        </div>
      </div>
    </div>
  )
}
