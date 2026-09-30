import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yebt.kaizen',
  appName: 'Kaizen',
  webDir: 'dist',
  android: {
    // Matches the app's light background so there's no flash while loading.
    backgroundColor: '#f6f5f2',
  },
}

export default config
