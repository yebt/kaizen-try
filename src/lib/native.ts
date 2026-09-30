import { App as CapApp } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

/** Glue for running inside the Android app (Capacitor). No-ops on the web. */
export const isNative = Capacitor.isNativePlatform()

/** Status/navigation bar icons: dark icons on the light theme, light icons on dark. */
export function setSystemBars(dark: boolean) {
  if (!isNative) return
  void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

const pressEscape = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

/**
 * Android back button: close the camera or the open sheet first, then go back
 * to Today, and only then leave the app.
 */
export function handleBackButton(opts: { isHome: () => boolean; goHome: () => void }) {
  if (!isNative) return () => {}
  const sub = CapApp.addListener('backButton', () => {
    if (document.querySelector('.camera, .sheet')) pressEscape()
    else if (!opts.isHome()) opts.goHome()
    else void CapApp.exitApp()
  })
  return () => void sub.then((s) => s.remove())
}
