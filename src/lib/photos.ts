import { useEffect, useState } from 'react'
import type { Photo, PhotoMeta } from './types'

/** Photo diary persisted in IndexedDB (blobs stay on the device). */

const DB = 'kaizen-photos'
const STORE = 'photos'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export async function listPhotos(): Promise<Photo[]> {
  const all = await tx<Photo[]>('readonly', (s) => s.getAll())
  return all.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
}

export async function savePhoto(p: Photo) {
  await tx('readwrite', (s) => s.put(p))
  notify()
}

export async function updatePhoto(id: string, patch: Partial<PhotoMeta>) {
  const cur = await tx<Photo | undefined>('readonly', (s) => s.get(id))
  if (cur) await savePhoto({ ...cur, ...patch })
}

export async function deletePhoto(id: string) {
  await tx('readwrite', (s) => s.delete(id))
  notify()
}

export interface PhotoView extends PhotoMeta {
  url: string
}

/** All photos, oldest first, with object URLs that are revoked on change. */
export function usePhotos(): PhotoView[] | null {
  const [photos, setPhotos] = useState<PhotoView[] | null>(null)
  useEffect(() => {
    let urls: string[] = []
    let alive = true
    const refresh = () =>
      listPhotos()
        .then((list) => {
          if (!alive) return
          urls.forEach(URL.revokeObjectURL)
          const views = list.map(({ blob, ...meta }) => ({ ...meta, url: URL.createObjectURL(blob) }))
          urls = views.map((v) => v.url)
          setPhotos(views)
        })
        .catch(() => alive && setPhotos([]))
    refresh()
    listeners.add(refresh)
    return () => {
      alive = false
      listeners.delete(refresh)
      urls.forEach(URL.revokeObjectURL)
    }
  }, [])
  return photos
}

/** Downscale to keep storage small; phones produce 4–12 MB originals. */
export async function compress(file: File, max = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality))
}
