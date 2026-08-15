# Doraemon Classroom Monitor Design System

## Scope

This design system applies only to `/doraemon`. The legacy surface remains frozen; the tokens below govern the version selector and the `campus` / `pocket` modern surfaces.

## Principles

- Current decibels and room state are readable from across a classroom.
- Teacher actions are explicit, reachable, and visually secondary to the live state.
- Doraemon provides identity and warmth; the surrounding UI remains mature and instrument-like.
- Red is reserved for real warnings, errors, and destructive actions.
- Modern surfaces reuse one semantic component structure and one business-state owner.

## Shared Tokens

```css
--dm-accent: #1597ff;
--dm-danger: #ff4d55;
--dm-success: #16b979;
--dm-warning: #ffb02e;
--dm-success-ink-light: #08734c;
--dm-warning-ink-light: #8a4f00;
--dm-danger-ink-light: #c82431;
--dm-radius-card: 18px;
--dm-radius-control: 10px;
--dm-radius-pill: 999px;
--dm-control-min: 44px;
--dm-control-target-rendered: calc((var(--dm-control-min) + 0.25px) * var(--app-global-scale-inverse, 1));
--dm-content-max: 1680px;
--dm-reference-column: clamp(148px, 10vw, 184px);
--dm-stage-min-column: 680px;
--dm-console-column: clamp(226px, 17vw, 280px);
--dm-shadow-color: rgba(4, 28, 57, 0.18);
```

Radius rule: cards use 18px, controls use 10px, status badges use full-pill. No other radius scale is introduced.

Touch-target rule: the application-wide `0.8` body zoom reduces authored CSS dimensions, so every modern interactive hit area uses `--dm-control-target-rendered` to preserve a measured 44px minimum after scaling. The token includes a `0.25px` rounding guard so fractional browser layout cannot resolve a nominal 44px target just below the minimum. This includes header actions, selector navigation, sliders, inline help triggers, and warning reset actions. This is presentation-only and does not change the frozen legacy surface.

Signal foreground rule: the bright success, warning, and danger values remain the display colors for large numbers, `dB`, waveform, and glow. Small text on the Pocket Classroom light surface uses the corresponding `*-ink-light` token so state labels, pills, and reference labels meet WCAG AA without muting the display colors.

## Campus Signal Theme

- Canvas: `#031426` to `#051d36`
- Panel: `#082644`
- Panel strong: `#061d35`
- Border: `rgba(72, 169, 255, .38)`
- Text: `#f3f8ff`
- Muted: `#9cb7d2`
- Accent: `#28b8ff`
- Material: layered navy panels, thin cyan rules, restrained inset highlights.
- Typography: system sans for labels; system mono for large values and timers.
- Browser surface: the page scrollbar uses the campus navy track and a restrained blue thumb; unrelated global pink scrollbars must not leak into this route.

## Pocket Classroom Theme

- Canvas: `#f4f9fd` to `#eaf4fb`
- Device: `#fdfefe`
- Panel strong: `#07345e`
- Border: `#cbddea`
- Text: `#092b52`
- Muted: `#6e8196`
- Accent: `#0b91ed`
- Material: cold white device shell, crisp blue controls, one dark teacher console.
- Typography: system sans throughout; system mono only for numeric telemetry.
- Browser surface: the page scrollbar uses the pale canvas track and a soft teaching-blue thumb.

## Layout

- `>= 1180px`: three-zone desktop composition with capped side columns. The reference column uses `--dm-reference-column`, the teacher console uses `--dm-console-column`, and the live stage receives the remaining width through `minmax(var(--dm-stage-min-column), 1fr)`.
- `768–1179px`: live stage spans full width; secondary panels become two columns.
- `< 768px`: single column with live stage first, controls second, reference/summary third.
- `< 480px`: compact spacing, no ornamental device thickness, no clipped display title.

## Components

- Version cards: one full-card button, clear title, description, attribute labels, and preview motif.
- Header actions: icon plus text at desktop; icon-only actions retain accessible names on narrow screens.
- Live stage: one dominant dB value, visible textual state, mascot, and waveform.
- Decibel reference: a compact sound-scale rail, not a legacy thermometer panel. It uses a slim semantic gradient, six tick rows from 0-120 dB, a state-colored pointer, and compact range/label text so the center stage stays visually dominant.
- Alarm decoration: the alarm wash and hazard bands belong to the live stage background layer. They render below the mascot, number, waveform, and metrics and never use a fixed page overlay or giant text that competes with telemetry.
- Modern mascot: use transparent 3D artwork as the primary stage focal point. Campus uses the standing thumbs-up pose; Pocket uses the seated calm pose. The legacy flat SVG is retained only for the frozen legacy surface and compact header avatar.
- Modern emotion states: green uses each theme's smiling calm 3D mascot, orange uses the shared serious 3D mascot, and red uses the shared angry 3D mascot. Never simulate these states by recoloring the legacy SVG.
- Metrics: grouped by dividers or a shared band; avoid independent generic floating cards where hierarchy does not require them.
- Sliders: visible numeric value, label, min/max context, and browser-native keyboard behavior.
- Dialogs: one scroll surface, fixed header, calm backdrop, close control with accessible name.

## Motion

- Entry transitions: 180–280ms opacity and translate only.
- Active buttons: `transform: translateY(1px)`.
- Alarm uses a high-contrast red live-stage wash, a double red edge ring, stage-bound hazard bands, and one slow 1100ms opacity pulse. The mascot, number, `dB`, waveform, and metrics remain above the warning layer; the whole page never flashes.
- Under `prefers-reduced-motion: reduce`, animations and smooth transitions are disabled.

## Live Signal Semantics

- Calm: `currentDb < limit - 10`; green number, unit, waveform, and smiling 3D mascot.
- Caution: `limit - 10 <= currentDb < limit`; orange number, unit, waveform, and serious 3D mascot.
- Danger: `currentDb >= limit` or the existing monitor state is `alarm`; red number, unit, waveform, and angry 3D mascot.
- The danger color appears immediately at the threshold, while the existing two-second delay still exclusively controls warning counts, alarm audio, and the `需要安静` banner.
- Signal colors are presentation-only derivations from existing live values. They never write monitoring state or alter threshold behavior.

## Accessibility Checklist

- Text contrast meets WCAG AA.
- Every icon-only button has a name.
- Every range input has an accessible label.
- Touch targets are at least 44px.
- Focus is visible with a 3px accent outline and 2px offset.
- Status is communicated with text and icon/shape, never color alone.
