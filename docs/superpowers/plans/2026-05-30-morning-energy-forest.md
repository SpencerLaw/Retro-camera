# Morning Energy Forest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the local-only Morning Energy Forest with seven-day records, forest map, refined tree stages, stronger audio feedback, safe rewards, and student/group branches.

**Architecture:** Keep the existing plain HTML/CSS/JS module and extend it with small helper functions inside `public/morning-energy-tree/script.js`, then let the build mirror it into `dist`. Data remains in localStorage and all new behavior is exercised through the existing VM test harness.

**Tech Stack:** Plain JavaScript, canvas, HTML, CSS, localStorage, Vite build, Node VM tests.

---

### Task 1: Model Tests

**Files:**
- Modify: `tests/morning-energy-tree-logic.test.mjs`

- [ ] Add failing tests for Monday-Sunday day groups, current weekday mapping, lifecycle stages, audio activation correlation, rewards, participant branch updates, forest snapshot persistence, and required HTML containers.
- [ ] Run `node tests/morning-energy-tree-logic.test.mjs` and confirm the new tests fail because the feature helpers and UI containers do not exist yet.

### Task 2: Data And Algorithm Helpers

**Files:**
- Modify: `public/morning-energy-tree/script.js`

- [ ] Add `sat` and `sun` to `REPORT_WEEKDAYS`.
- [ ] Add local storage keys for forest snapshots and participant config.
- [ ] Implement lifecycle, reward, audio activation, participant normalization, participant metric update, and forest snapshot helpers.
- [ ] Run `node tests/morning-energy-tree-logic.test.mjs` and confirm the model tests pass.

### Task 3: Session Integration

**Files:**
- Modify: `public/morning-energy-tree/script.js`

- [ ] Reset reward and participant session state at session start/reset.
- [ ] Update reward/over-loud/participant metrics during `updateState`.
- [ ] Persist new report fields and upsert daily forest records in `finalizeReportSession`.
- [ ] Update reports and tasks to use Monday-Sunday date ranges.
- [ ] Run `node tests/morning-energy-tree-logic.test.mjs`.

### Task 4: UI And Responsive Experience

**Files:**
- Modify: `public/morning-energy-tree/index.html`
- Modify: `public/morning-energy-tree/style.css`
- Modify: `public/morning-energy-tree/script.js`
- Modify: `public/locales/zh-CN.json`
- Modify: `public/locales/en.json`

- [ ] Add forest map trigger/modal and participant panel.
- [ ] Render forest map, daily detail, and branch stats.
- [ ] Render richer report metrics for stage, rewards, and over-loud count.
- [ ] Improve canvas rendering with staged seed/sprout/branch/leaf/flower/fruit/final visuals and branch overlays.
- [ ] Ensure small-screen CSS uses adaptive widths, no text overlap, and touch targets of at least 44 px.
- [ ] Run `node tests/morning-energy-tree-logic.test.mjs`.

### Task 5: Build And Verification

**Files:**
- Build output under `dist/morning-energy-tree/*`

- [ ] Install dependencies if needed for the isolated worktree.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Review `git status --short` and stage only morning-energy-tree, locale, test, and docs changes.
- [ ] Commit with a focused message.
