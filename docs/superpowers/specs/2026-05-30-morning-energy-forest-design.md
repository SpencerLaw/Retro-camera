# Morning Energy Forest Design

## Goal

Build the existing morning reading tree into a polished local-only "Morning Energy Forest" for classroom reading. The experience should feel mature enough for high school students, give teachers meaningful sensitivity control, and turn each day of reading into a visible forest record.

## Product Shape

The live session keeps the tree as the main focus, but growth becomes staged and data-backed:

- Lifecycle stages: seed, sprout, branches, leaves, flowers, fruit, final energy tree.
- Decibel input creates visibly stronger light orbs as reading becomes louder and steadier.
- Tree growth is driven by sustained reading energy, not raw noise spikes.
- Over-loud sound above 100 dB is recorded and shown as a warning event.
- Water and fertilizer are earned from stable reading windows and effective reading time, not from unsafe shouting.
- Up to five student/group branches can be named locally. The teacher can pick the current speaker/group; that branch grows better when its assigned reading is strong and sustained.

## Data

All new data stays in `localStorage` on the user's computer.

- Existing weekly reports remain supported.
- Each finalized session stores peak dB, average dB, low dB, reading time, final energy, peak energy, sensitivity, maturity time, over-loud count, water/fertilizer counts, lifecycle stage, and participant branch stats.
- A new forest store keeps one daily tree snapshot per calendar date. If multiple sessions happen in one day, the daily tree keeps the strongest/final state and the session count.
- Legacy reports can still be displayed; missing new fields fall back gracefully.

## UI

The first screen stays as the usable classroom experience, not a landing page.

- Add a "Forest Map" control beside task/report controls.
- Forest map shows Monday through Sunday and the recent local daily trees, each labeled by date and stage.
- Clicking a day shows reading time, peak dB, final energy, maturity time, stage, rewards, and branch details.
- Report and task views switch from Monday-Friday to Monday-Sunday.
- Add a compact participant panel for up to five names/groups, with local editing and active speaker selection.
- Responsive behavior must fit small laptops, tablets, and phones without overlapping the canvas, controls, modals, or text.

## Algorithms

Sensitivity remains a teacher-facing slider, but it affects three things together:

- Sound gate: lower sensitivity raises the reading threshold.
- Sustained gate: lower sensitivity requires longer continuous reading.
- Growth multiplier: lower sensitivity slows growth and filters short spikes.

Light orb intensity uses a normalized audio activation score based on current dB, threshold, hold time, and over-loud damping. This makes louder sustained reading produce more and brighter orbs while keeping 100 dB+ from becoming the optimal strategy.

Water and fertilizer are awarded from classroom-friendly behavior:

- Water: one reward after a stable reading streak around the healthy loud-reading band.
- Fertilizer: one reward after a longer effective-reading milestone.
- 100 dB+ increments over-loud counters and warning visuals but does not directly award growth rewards.

## Testing

Use the existing VM-based `tests/morning-energy-tree-logic.test.mjs` harness.

Coverage must include:

- Seven-day week support for reports and tasks.
- Forest snapshot creation and legacy fallback.
- Lifecycle stage calculation.
- Audio activation correlation with dB.
- Reward logic that separates stable reading from over-loud warnings.
- Participant branch normalization and active-branch updates.
- Required UI containers in HTML.
