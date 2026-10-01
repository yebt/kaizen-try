import { execSync } from 'node:child_process'
import pkg from './package.json' with { type: 'json' }
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Short commit of this build: CI provides GITHUB_SHA; locally ask git. */
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  base: './',
  define: {
    // CI sets APP_VERSION from the release tag; locally package.json is used.
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
})
