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

**Get an APK without installing anything.** Every push to `main` or `feature/**` runs the **Android APK** GitHub Actions workflow. Open the run, download the `kaizen-debug-apk` artifact, unzip it and install `app-debug.apk` on your phone. You need to allow installs from unknown sources.

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
