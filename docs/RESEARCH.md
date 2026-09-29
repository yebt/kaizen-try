# UX / UI research — habit trackers

This note covers what the best habit apps and the behavioral-science research get right and wrong. It also says how Kaizen applies each finding.
Items marked ⚠ could not be checked against a primary source.

## 1. What leading apps teach us

| App | Does well | Pitfall | → Kaizen |
|---|---|---|---|
| **Streaks** (Apple Design Award 2016) | One big circular tap target per habit. Supports "negative" tasks. Very opinionated. | A hard cap of 24 tasks frustrates power users. | Quit habits sit in the same list as build habits. One tap to check off. |
| **Loop Habit Tracker** | A *habit strength* score using exponential smoothing: one miss dents it, it never resets. Numeric habits with a unit and a target. | Dense, utilitarian UI. | A **habit strength %** sits next to the streak. Count habits have a unit, a minimum and a goal. |
| **Habitify** | Explicit states: Done / Skip / Fail. Skip is streak-neutral. | — | **Rest day** state that never breaks a streak. |
| **Productive** | Groups habits by morning, afternoon and evening, so the day feels less daunting. | — | The Today list is grouped **Anytime / Morning / Afternoon / Evening / Leaving behind**. |
| **Finch** | No punishment: the pet never dies, and rewards only build up. | Cluttered quests UI. | **XP never goes down.** Gamification stays secondary to the one-tap check. |
| **Habitica** | — | Health-point damage and party punishment demoralised users, and the app had to add "Pause damage". | **No penalties.** Nothing is taken away from you. |
| **Structured** (4.8★, 154k ratings) | Color-coded blocks on a vertical timeline that show start, end and duration. | ⚠ gesture details not verified | A Calendar tab with colored blocks and the time range shown. |
| **Google Calendar** | Drag moves an event in 15-minute steps. Dragging the bottom edge resizes it. Every change gets an **Undo** toast. Tap an empty slot to create an event. Red "now" line. | — | All of these are implemented, plus long-press to start a drag so it doesn't fight scrolling. |

Sources: [Streaks](https://apps.apple.com/us/app/streaks/id963034692) · [uhabits](https://github.com/iSoron/uhabits) · [Habitify skip/fail](https://intercom.help/habitify-app/en/articles/9614405-automation-to-mark-habits-as-skip-or-fail) · [Habitica #3161](https://github.com/HabitRPG/habitica/issues/3161) · [Structured](https://apps.apple.com/us/app/structured-daily-planner-todo/id1499198946) · [Google Calendar drag](https://9to5google.com/2017/07/19/google-calendar-android-quick-time-edit-gesture/)

## 2. Behavioral science

- **Forming a habit takes about 66 days** (median; the range is 18–254), and **missing one day doesn't derail it** (Lally et al. 2009, UCL; a 2024 meta-analysis found 59–66 days). → Kaizen has a 66-day milestone ("This is who you are now"). A single miss uses up a shield instead of resetting the streak. [Surrey](https://www.surrey.ac.uk/news/does-it-really-take-66-days-form-habit-we-asked-expert-dr-pippa-lally)
- **Never miss twice** (James Clear). → The day after a miss, the card shows *"Never miss twice — today gets you back on track"* rather than a reset. [jamesclear.com](https://jamesclear.com/habit-tracker)
- **Implementation intentions** ("when X, where Y, I will Z") have an effect size of d = 0.65 across 94 tests (Gollwitzer & Sheeran 2006). → Each habit gets an optional start time and a **Cue** field ("After my morning coffee…").
- **Identity-based habits and the two-minute rule.** → Each habit has an optional **Why** field ("I'm someone who…"). The **minimum** field is the tiny version, and it still counts as a win.
- **Fresh-start effect** (Dai, Milkman & Riis 2014): motivation spikes at the start of a new week or month. → Kaizen shows a "Fresh start" banner on Mondays and on the 1st of the month. [Management Science](https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901)
- **Quit habits** (I Am Sober): a days-clean counter, milestones, and slips logged without shame. The **abstinence-violation effect** means that after a slip, "I blew it" thinking leads to collapse. → Kaizen shows an honest *days clean* counter, keeps *total clean days* visible, and replies to a slip with "A lapse isn't a relapse — your progress still counts." Every slip can be undone.

## 3. Streak design

- An intact streak raises engagement and a broken one lowers it. The effect is purely about how the record is displayed (Silverman & Barasch, *JCR* 2023). Unlimited repairs weaken the effect. → **Streak shields are earned** (1 for every 7 consecutive wins, at most 2). They are limited, so the streak still means something. Rest days show as skipped, not broken. [JCR](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414)
- **Duolingo** holds at most 2 freezes, earned in advance. Making the daily bar "one lesson" raised daily active users. → Kaizen caps shields at 2. **Hitting the minimum keeps the streak**, so the bar stays low. ⚠ The "freezes cut churn 21%" figure comes from secondary sources only.
- **Streak anxiety** ⚠ is widely claimed, but no primary study was found. Kaizen mitigates it anyway: shields, rest days, a forgiving strength score, and XP that never decays.

## 4. Progress photos

- **Consistency** means the same place, time, light (facing a window), clothes, camera height and distance, with no filters, using 3–4 standard poses every 2–4 weeks. → Kaizen has an in-app **tips** panel, **pose tags** (front, side, back, other), a **self-timer** (3 s or 10 s), and a reminder only after 14 days without a photo. [MacroFactor](https://help.macrofactorapp.com/en/articles/117-tips-for-taking-good-progress-photos)
- **Ghost overlay** (GhostFrame, AlignShot, Fitness Camera): the last photo shows semi-transparently over the live camera, with adjustable opacity. → Implemented, using your last photo **in the same pose**.
- **Before/after slider.** → Implemented. By default it shows your first and latest photo of the same pose, or you can pick any two. Photos stay **on your device** in IndexedDB.

## 5. Visual conventions

- **Progress rings** (Apple Activity): the Gestalt closure pull toward a nearly full ring is the strongest completion drive. → There is a daily ring, a ring per habit, and **a tick on the ring marking the minimum**.
- **Heatmaps** (GitHub, Loop): partial days show as lighter shades. → Each habit gets a heatmap. Days a shield covered are shown in blue.
- **One-tap check**: a tap adds the default step, and tapping the number lets you type an exact amount. Undo is always available.
- **Haptics** (Apple HIG): a light tick on a tap and a distinct success pattern when you reach a goal. Never an error buzz for a miss.
- **Celebrations are rare**, so they stay special: confetti for a *perfect day* and for streak milestones (3, 7, 14, 21, 30, 66, 100…). `prefers-reduced-motion` is respected.

## 6. Ethics check (the gamification we chose *not* to build)

| Mechanism | Used? | Why |
|---|---|---|
| Streaks | Yes, with shields, rest days and "never miss twice" | Loss aversion that you can recover from and pause. |
| XP / levels | Yes, and XP never decreases | Anticipation, not fear. |
| Leaderboards | No | Social comparison and the pull to game the numbers (the points-badges-leaderboards trap). |
| Penalties / HP loss | No | Habitica's users show the harm. |
| Guilt copy after a miss | No | Lapse ≠ relapse. |
| Engagement notifications | No | The success metric is *habits done*, not *app opens*. |

The test we applied to every choice: would it survive being explained plainly to the user? And is the way out (rest day, undo, delete) as easy as the way in?
