# Prompt Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private image prompt gallery with admin-managed prompt entries and up to five compressed images per entry.

**Architecture:** Follow the existing Juzimi pattern for admin login and CRUD, but split list metadata from entry details so image data is fetched only when a card is opened. Store compact records in Vercel KV using one index key plus one key per prompt entry.

**Tech Stack:** React 19, Vite, Vercel Functions, `@vercel/kv`, browser canvas image compression, Node static/logic tests.

---

### Task 1: Data Model And Tests

**Files:**
- Create: `components/promptGalleryLogic.js`
- Create: `tests/prompt-gallery-logic.test.mjs`

- [ ] Write tests for prompt normalization, image validation, list summaries, search text, and total image payload caps.
- [ ] Implement pure helpers used by both API and UI.
- [ ] Run `node tests/prompt-gallery-logic.test.mjs`.

### Task 2: API

**Files:**
- Create: `api/prompts.ts`
- Create: `tests/prompt-gallery-api.test.mjs`

- [ ] Write static API tests for KV keys, actions, admin auth, pagination, detail lookup, and per-entry storage.
- [ ] Implement `list`, `detail`, `create`, `update`, and `delete` actions.
- [ ] Run `node tests/prompt-gallery-api.test.mjs`.

### Task 3: React App

**Files:**
- Create: `components/PromptGalleryApp.tsx`
- Modify: `App.tsx`
- Modify: `components/HomePage.tsx`
- Create: `tests/prompt-gallery-ui.test.mjs`

- [ ] Write static UI tests for route, homepage card, admin upload control, copy button, and image compression.
- [ ] Implement gallery page, modal detail view, admin form, and browser-side WebP compression.
- [ ] Run `node tests/prompt-gallery-ui.test.mjs`.

### Task 4: Verification

**Files:**
- Modify only if verification exposes defects.

- [ ] Run prompt-gallery tests.
- [ ] Run Juzimi tests to ensure the reference page was not broken.
- [ ] Run `npm run build`.
