import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Hand a text file to the user.
 * Web: a normal download. Android app: write to the cache and open the
 * system share sheet (Save to Files / Drive / email…), since WebView
 * downloads don't work inside Capacitor.
 */
export async function saveTextFile(name: string, text: string, mime = 'application/json'): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: name, files: [uri], dialogTitle: 'Save your Kaizen backup' })
    return 'shared'
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
