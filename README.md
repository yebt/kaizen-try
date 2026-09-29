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

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for habit / streak / XP logic
npm run build      # static build in dist/ (deploy anywhere)
```

Open it on your phone. To install it, use your browser's **Add to Home Screen**. The camera needs HTTPS or `localhost`. Without it, the app falls back to the system photo picker.

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
