/** Values injected at build time by vite.config.ts. */
declare const __APP_VERSION__: string
declare const __BUILD_COMMIT__: string
declare const __BUILD_DATE__: string

export const APP_VERSION = __APP_VERSION__
export const BUILD_COMMIT = __BUILD_COMMIT__
export const BUILD_DATE = __BUILD_DATE__

export const REPO_URL = 'https://github.com/yebt/kaizen-try'
export const RELEASES_URL = `${REPO_URL}/releases`
export const ISSUES_URL = `${REPO_URL}/issues/new`
