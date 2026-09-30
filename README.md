# Kaizen — habit tracker

A minimal, mobile-first habit tracker PWA. **Small steps, every day.**

## Features

- **Build or leave habits.** *Build* habits are ones you want to do. *Leave* habits are ones you want to quit, and they count clean days with an honest "days clean" counter.
- **Two ways to track:**
  - **Just done**: one tap marks the day.
  - **Quantity**: accumulates through the day and has three settings:
    - a **unit**
    - a **minimum**: the tiny version that still counts, so the day isn't missed
    - a **goal**: a great day

    For quit habits these become a **limit** (going over it means a missed day) and a **target** (a full win).
- **Calendar like Google Calendar.** Habits can have a start time plus a duration or an end time.
  - Tap an empty slot to create a habit there.
  - **Long-press** a block to drag it.
  - Select a block and pull its tab to **resize** it.
  - Everything snaps to 15 minutes, and every change has an **Undo** toast.
  - There is a red "now" line, a Day or 3-day view, and you can swipe between days.
- **Gamification grounded in research** (see [`docs/RESEARCH.md`](docs/RESEARCH.md)):
  - a daily progress ring
  - forgiving streaks: you earn a **shield** for every 7 wins (at most 2), and it absorbs a miss
  - rest days that keep your streak
  - a "never miss twice" nudge
  - a habit-strength score in the style of Loop Habit Tracker
  - XP and levels, and XP never decreases
  - milestones up to 66 days
  - a perfect-day celebration
  - a fresh-start banner on Mondays and on the 1st of the month
- **Photo diary.**
  - A camera with a **ghost overlay** of your last photo in the same pose, plus a self-timer.
  - Pose tags and notes on each photo.
  - A **before/after slider** that compares your first and latest photo, or any two you pick.
  - Photos stay on your device (IndexedDB).
- Works offline, can be installed as an app, supports dark and light mode, and respects reduced-motion settings.
- **Profile & settings** (tap the avatar on Today): your name, appearance (System / Light / Dark), which day the week starts on, how often to remind you about progress photos, haptics and celebrations.
- **Backup & restore** in the same sheet:
  - **Export** saves everything (habits, history, profile and settings) to a `.json` file, with or without photos.
  - **Import** shows what's in the file first, then lets you **Merge** it into your data (the file wins where both have the same entry) or **Replace** your data with it.
  - Files are checked and cleaned before anything is written, and a file from a newer version of the app is refused.

## Design

The UI is quiet and uses a small set of tokens, all in `src/styles.css`:

- **Colors:** a warm off-white or ink background, and one green accent that is used only to mean "done". Each habit also has its own muted tint.
- **Fonts:** Instrument Serif for page titles, Geist for the interface and Geist Mono for numbers. The fonts are bundled with the app, so it works fully offline.
- **Layout:** grouped lists with hairline dividers, line icons, 44 px minimum touch targets, and automatic light and dark mode.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for habit / streak / XP logic
npm run build      # static build in dist/ (deploy anywhere)
```

Open it on your phone. To install it, use your browser's **Add to Home Screen**. The camera needs HTTPS or `localhost`. Without it, the app falls back to the system photo picker.

## Android app

The Android app wraps the same web app with [Capacitor](https://capacitorjs.com). The app ID is `com.yebt.kaizen`, set in `capacitor.config.ts`.

**Get an APK without installing anything.** Download it from the latest [release](../../releases/latest). For an in-between build, every push to `main` or `feature/**` and every pull request runs the **Android APK** workflow. Open the run and download the `kaizen-debug-apk` artifact. You need to allow installs from unknown sources.

### Releases

Every version tag publishes a **GitHub Release** with an installable APK (`kaizen-X.Y.Z.apk` and its SHA-256 checksum). The **Release** workflow builds it.

1. Bump `"version"` in `package.json` in a pull request, then merge it.
2. Tag `main` with the same version and push the tag:
   ```bash
   git checkout main && git pull
   git tag v0.3.0 && git push origin v0.3.0
   ```
   You can also create the release from the GitHub UI (**Releases → Draft a new release**, with a new tag `v0.3.0`). The workflow then attaches the APK to it.

The workflow checks that the tag matches `package.json` and runs the tests first. A tag with a suffix, such as `v0.3.0-beta.1`, is published as a **pre-release**. The Android version code comes from the version: `1.2.3` becomes `10203`.

**Signing.** Android only installs an update over an existing app if both are signed with the same key.

- **Debug key:** `android/app/debug.keystore` is committed on purpose, so every debug and CI build shares one key and installs over the last one. It protects nothing.
- **Release key:** releases use it when these repository secrets are set (**Settings → Secrets and variables → Actions**):

  | Secret | Value |
  |---|---|
  | `ANDROID_KEYSTORE_BASE64` | the keystore file, base64-encoded |
  | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
  | `ANDROID_KEY_ALIAS` | the key alias, e.g. `kaizen` |
  | `ANDROID_KEY_PASSWORD` | the key password |

  Create the key once on your own computer and keep a backup somewhere safe. If you lose it, you can never publish an update to the same app again.

  ```bash
  keytool -genkeypair -v -keystore kaizen-release.jks -alias kaizen \
    -keyalg RSA -keysize 2048 -validity 10000
  base64 -w0 kaizen-release.jks   # macOS: base64 -i kaizen-release.jks
  ```

  Without these secrets, releases are signed with the debug key, and the release notes say so. Moving from a debug-signed install to a release-signed one means uninstalling first, so **export a backup** in Settings before you do.

**Build locally.** You need JDK 21 and the Android SDK (Android Studio installs both).

```bash
npm run android:sync   # build the web app and copy it into android/
npm run android:open   # open in Android Studio to run on a device or emulator
npm run android:apk    # or build a debug APK from the command line
```

After changing web code, run `npm run android:sync` again. Icons and the splash screen are generated from `assets/` with `npx @capacitor/assets generate --android`.

Differences in the native app:
- Exports open the Android share sheet, so you can save the file to Files, Drive or email.
- Haptics use the phone's vibration engine.
- The back button closes the open sheet or camera first, then returns to Today, and only then leaves the app.
- The camera asks for permission the first time you take a progress photo.

## Stack

It uses React 19, TypeScript and Vite, with no UI or state libraries.

- Habits and logs are stored in `localStorage`.
- Photos are stored in IndexedDB.
- There is no backend, and nothing leaves the device.

```
src/lib/habits.ts     status, streaks + shields, strength, XP  (tested)
src/lib/store.ts      tiny external store (useSyncExternalStore)
src/lib/photos.ts     IndexedDB photo storage + compression
src/components/       Today, Calendar, Progress, Diary, HabitForm, Camera…
```
