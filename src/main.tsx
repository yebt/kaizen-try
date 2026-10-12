import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
// Optional font styles (Settings → Appearance). Browsers only fetch the ones in use.
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/nunito/wght.css'
import '@fontsource/atkinson-hyperlegible/latin-400.css'
import '@fontsource/atkinson-hyperlegible/latin-700.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The Android app ships its assets inside the APK, so no service worker there.
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
