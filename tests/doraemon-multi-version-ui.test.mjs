import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const gateSource = fs.readFileSync('doraemon-monitor/DoraemonVersionGate.tsx', 'utf8');
const monitorSource = fs.readFileSync('doraemon-monitor/DoraemonMonitorApp.tsx', 'utf8');
const modernCss = fs.readFileSync('doraemon-monitor/doraemon-modern.css', 'utf8');
const legacyCss = fs.readFileSync('doraemon-monitor/doraemon-monitor.css', 'utf8');
const designDoc = fs.readFileSync('doraemon-monitor/DESIGN.md', 'utf8');
const scaleCss = fs.readFileSync('public/global-scale.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('/doraemon opens the version chooser instead of one fixed monitor skin', () => {
  assert.match(appSource, /import DoraemonVersionGate from '.\/doraemon-monitor\/DoraemonVersionGate'/);
  assert.match(appSource, /path="\/doraemon" element=\{<DoraemonVersionGate \/>\}/);
});

runTest('the chooser exposes legacy, campus signal, and pocket classroom as real choices', () => {
  assert.match(gateSource, /value: 'legacy'/);
  assert.match(gateSource, /value: 'campus'/);
  assert.match(gateSource, /value: 'pocket'/);
  assert.match(gateSource, /旧版/);
  assert.match(gateSource, /校园声场/);
  assert.match(gateSource, /未来口袋教室/);
});

runTest('the redesigned chooser uses real visual previews for both featured modern versions', () => {
  assert.match(gateSource, /campus-signal-preview\.png/);
  assert.match(gateSource, /pocket-classroom-preview\.png/);
  assert.match(gateSource, /className="dm-version-image"/);
  assert.match(gateSource, /className="dm-featured-versions"/);
  assert.match(gateSource, /className="dm-legacy-lane"/);
  assert.doesNotMatch(gateSource, /dm-preview-face|dm-preview-value/);
});

runTest('the chooser does not persist a previous choice and passes one variant into the shared state owner', () => {
  assert.doesNotMatch(gateSource, /localStorage|sessionStorage/);
  assert.match(gateSource, /<DoraemonMonitorApp[\s\S]*?variant=\{selectedVariant\}[\s\S]*?onChooseVersion=/);
});

runTest('legacy keeps the existing doraemon root while modern skins use a separate semantic root', () => {
  assert.match(monitorSource, /variant === 'legacy'/);
  assert.match(monitorSource, /className=\{`doraemon-app /);
  assert.match(monitorSource, /doraemon-modern--\$\{variant\}/);
  assert.match(monitorSource, /data-doraemon-variant=\{variant\}/);
});

runTest('every rendered skin can return to the version chooser', () => {
  assert.match(monitorSource, /onChooseVersion/);
  assert.match(monitorSource, /className="dm-switch-version"/);
  assert.match(gateSource, /setSelectedVariant\(null\)/);
});

runTest('modern roots are not included in the legacy global-scale selectors', () => {
  assert.doesNotMatch(scaleCss, /\.doraemon-modern/);
  assert.match(modernCss, /\.doraemon-modern\s*\{/);
  assert.match(modernCss, /min-height:\s*100dvh/);
  assert.doesNotMatch(modernCss, /\.doraemon-modern\s*\{[^}]*zoom:/s);
});

runTest('modern sliders and icon controls expose accessible names', () => {
  assert.match(monitorSource, /aria-label=\{t\('doraemon\.sensitivity'\)\}/);
  assert.match(monitorSource, /aria-label=\{t\('doraemon\.threshold'\)\}/);
  assert.match(gateSource, /className="dm-gate-back"[\s\S]*?aria-label="返回应用中心"/);
  assert.match(monitorSource, /className="dm-modern-action"[\s\S]*?onClick=\{openReport\}[\s\S]*?aria-label=\{t\('doraemon\.report\.trigger'\)\}/);
  assert.equal(monitorSource.match(/aria-label="切换版本"/g)?.length, 2);
  assert.match(modernCss, /:focus-visible/);
  assert.match(modernCss, /prefers-reduced-motion:\s*reduce/);
});

runTest('both modern themes use dedicated 3D mascot assets instead of the legacy flat SVG', () => {
  assert.match(monitorSource, /doraemon-campus-3d\.png/);
  assert.match(monitorSource, /doraemon-pocket-3d\.png/);
  assert.match(monitorSource, /className="dm-modern-mascot-image"/);
  assert.match(monitorSource, /variant === 'campus' \? campusMascotUrl : pocketMascotUrl/);
});

runTest('pocket live stage renders the same device-shell structure promised by the selector preview', () => {
  assert.match(monitorSource, /className="dm-live-device-shell"/);
  assert.match(monitorSource, /className="dm-device-signal-dot"/);
  assert.match(monitorSource, /className="dm-device-visualizer"/);
  assert.match(monitorSource, /className="dm-device-mini-metrics"/);
  assert.match(designDoc, /--dm-radius-device:\s*42px;/);
  assert.match(designDoc, /Pocket Classroom device shell is the only exception/);
  assert.match(modernCss, /\.doraemon-modern--pocket \.dm-live-device-shell\s*\{/);
  assert.match(modernCss, /\.doraemon-modern--pocket \.dm-live-device-shell\s*\{[^}]*width:\s*min\(96%,\s*1320px\);/s);
  assert.doesNotMatch(modernCss, /\.doraemon-modern--pocket \.dm-live-device-shell\s*\{[^}]*width:\s*min\(92%,\s*820px\);/s);
  assert.match(modernCss, /\.doraemon-modern--pocket \.dm-device-content\s*\{[^}]*grid-template-columns:/s);
  assert.match(modernCss, /\.doraemon-modern--pocket \.dm-device-visualizer\s*\{[^}]*display:\s*block;/s);
  assert.match(modernCss, /\.doraemon-modern--pocket \.dm-modern-visualizer\s*\{[^}]*display:\s*none;/s);
});

runTest('pocket device shell becomes compact single-column on narrow phones', () => {
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.doraemon-modern--pocket \.dm-live-device-shell\s*\{[^}]*width:\s*100%;/s);
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.doraemon-modern--pocket \.dm-live-device-shell\s*\{[^}]*border-radius:\s*var\(--dm-radius-card\);/s);
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.doraemon-modern--pocket \.dm-device-content\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.doraemon-modern--pocket \.dm-device-visualizer\s*\{[^}]*height:\s*50px;/s);
});

runTest('modern warning states use serious and angry 3D assets instead of recoloring a flat mascot', () => {
  assert.match(monitorSource, /doraemon-serious-3d\.png/);
  assert.match(monitorSource, /doraemon-angry-3d\.png/);
  assert.match(monitorSource, /getModernEmotionTone/);
  assert.match(monitorSource, /modernMascotUrl/);
  assert.match(monitorSource, /dm-tone--\$\{modernEmotionTone\}/);
});

runTest('green orange and red tones control the live number unit waveform and warning atmosphere', () => {
  assert.match(modernCss, /\.dm-tone--calm/);
  assert.match(modernCss, /\.dm-tone--caution/);
  assert.match(modernCss, /\.dm-tone--danger/);
  assert.match(modernCss, /\.dm-live-number/);
  assert.match(modernCss, /\.dm-live-number-row\s*>\s*span/);
  assert.match(modernCss, /\.wave-bar/);
  assert.match(modernCss, /@media\s*\(prefers-reduced-motion:\s*no-preference\)[\s\S]*dm-alarm-mode/);
  assert.match(modernCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*dm-alarm-mode/);
});

runTest('modern reference content remains visible below the legacy tablet breakpoint', () => {
  // Given: the frozen legacy skin still hides its reference panel below 1024px.
  assert.match(legacyCss, /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.db-reference-panel\s*\{\s*display:\s*none;/);

  // When: the modern responsive rules are applied at tablet and phone widths.
  const modernTabletRules = modernCss.match(/@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';

  // Then: the modern scope explicitly restores the core reference content.
  assert.match(modernTabletRules, /\.doraemon-modern\s+\.db-reference-panel\s*\{[^}]*display:\s*block\s*!important;/s);
});

runTest('modern reference stack resets legacy fixed widths before mobile single-column layout', () => {
  // Given: legacy responsive CSS assigns fixed widths to the shared reference-stack class.
  // When: the same reference content renders inside either modern theme.
  // Then: the modern scope owns the full width of its responsive grid cell.
  assert.match(modernCss, /\.doraemon-modern\s+\.reference-stack\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*max-width:\s*none;/s);
});

runTest('legacy back controls keep their original app-center destination', () => {
  // Given: legacy and modern variants share the state owner.
  assert.match(monitorSource, /variant === 'legacy'/);

  // When: the legacy authorization, start, and monitor controls render.
  // Then: they navigate home instead of adopting the modern version-switch handler.
  assert.match(monitorSource, /onChooseVersion=\{variant === 'legacy' \? undefined : onChooseVersion\}/);
  assert.equal(monitorSource.match(/onClick=\{\(\) => navigate\('\/'\)\}/g)?.length, 2);
});

runTest('all modern header actions stay reachable with 44px targets on narrow screens', () => {
  // Given: narrow layouts replace labels with icon-only controls.
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)/);

  // When: the header is rendered on a phone.
  // Then: no action is hidden and every action keeps the documented touch target.
  assert.doesNotMatch(modernCss, /\.dm-modern-action:nth-of-type\(2\)\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(modernCss, /\.dm-modern-action--icon\s*\{\s*display:\s*none;/);
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.dm-modern-action\s*\{[^}]*min-height:\s*var\(--dm-control-target-rendered\);/s);
});

runTest('modern controls compensate for the app-wide 0.8 zoom before applying the 44px target', () => {
  // Given: global-scale renders authored CSS dimensions at 80%.
  assert.match(scaleCss, /--app-global-scale-inverse:\s*1\.25;/);

  // When: modern controls consume the logical touch-target token.
  // Then: their rendered target uses the inverse scale instead of shrinking below 44px.
  assert.match(modernCss, /--dm-control-target-rendered:\s*calc\(\(var\(--dm-control-min\)\s*\+\s*0\.25px\)\s*\*\s*var\(--app-global-scale-inverse,\s*1\)\);/);
  assert.match(modernCss, /\.dm-gate-back,[\s\S]*?\.dm-modern-action\s*\{[^}]*min-height:\s*var\(--dm-control-target-rendered\);/s);
  assert.match(modernCss, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.dm-switch-version,[\s\S]*?\.dm-modern-action\s*\{[^}]*width:\s*var\(--dm-control-target-rendered\);/s);
});

runTest('every core modern teacher control preserves a rendered 44px hit area', () => {
  // Given: the whole application renders authored CSS dimensions at 80%.
  // When: teachers use sliders, inline help, warning actions, or the selector back action.
  // Then: every hit area consumes the inverse-scaled control target instead of a raw size.
  assert.match(modernCss, /\.dm-modern-slider\s*\{[^}]*height:\s*var\(--dm-control-target-rendered\);/s);
  assert.match(modernCss, /\.dm-inline-help\s*\{[^}]*min-height:\s*var\(--dm-control-target-rendered\);/s);
  assert.match(modernCss, /\.dm-warning-actions button\s*\{[^}]*width:\s*var\(--dm-control-target-rendered\);[^}]*height:\s*var\(--dm-control-target-rendered\);/s);
  assert.match(modernCss, /\.dm-version-gate \.dm-gate-back\s*\{[^}]*min-height:\s*var\(--dm-control-target-rendered\);/s);
  assert.match(modernCss, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.dm-version-gate \.dm-gate-back\s*\{[^}]*width:\s*var\(--dm-control-target-rendered\);/s);
});

runTest('alarm decoration stays inside the live stage and behind readable telemetry', () => {
  const stageStart = monitorSource.indexOf('<section className="dm-live-stage"');
  const alarmBanner = monitorSource.indexOf('<div className="dm-alarm-banner"');
  const stageHeading = monitorSource.indexOf('<div className="dm-section-heading dm-live-heading"');

  assert.ok(stageStart >= 0, 'modern live stage must exist');
  assert.ok(alarmBanner > stageStart, 'alarm banner must be owned by the live stage');
  assert.ok(alarmBanner < stageHeading, 'alarm banner must render before readable stage content');
  assert.match(modernCss, /\.dm-alarm-banner\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*0;/s);
  assert.doesNotMatch(modernCss, /\.dm-alarm-banner\s*\{[^}]*position:\s*fixed;/s);
});

runTest('pocket status copy and reference labels use high-contrast semantic foreground tokens', () => {
  assert.match(modernCss, /--dm-success-ink-light:/);
  assert.match(modernCss, /--dm-warning-ink-light:/);
  assert.match(modernCss, /--dm-danger-ink-light:/);
  assert.match(modernCss, /\.doraemon-modern--pocket\.dm-tone--calm\s*\{[^}]*--dm-signal-ink:\s*var\(--dm-success-ink-light\);/s);
  assert.match(modernCss, /\.doraemon-modern--pocket\.dm-tone--caution\s*\{[^}]*--dm-signal-ink:\s*var\(--dm-warning-ink-light\);/s);
  assert.match(modernCss, /\.doraemon-modern--pocket\.dm-tone--danger\s*\{[^}]*--dm-signal-ink:\s*var\(--dm-danger-ink-light\);/s);
  assert.match(modernCss, /\.dm-live-status\s*\{[^}]*color:\s*var\(--dm-signal-ink\);/s);
  assert.match(modernCss, /\.dm-room-state\s*\{[^}]*color:\s*var\(--dm-signal-ink\);/s);
  assert.match(monitorSource, /className=\{`level-node \$\{isCurrentLevel \? 'is-current' : 'is-reference'\}`\}/);
  assert.match(modernCss, /\.doraemon-modern \.level-node\.is-reference\s*\{[^}]*opacity:\s*1\s*!important;/s);
});

runTest('modern desktop layout prioritizes the center live stage over both side panels', () => {
  // Given: classroom students read the central mascot and dB display first.
  assert.match(modernCss, /--dm-content-max:\s*var\(--app-scaled-viewport-width,\s*100vw\);/);
  assert.match(modernCss, /--dm-reference-column:\s*minmax\(132px,\s*1fr\);/);
  assert.match(modernCss, /--dm-stage-column:\s*minmax\(0,\s*8fr\);/);
  assert.match(modernCss, /--dm-console-column:\s*minmax\(172px,\s*1fr\);/);

  // When: the desktop grid is composed.
  // Then: the side columns use one share each and the center receives eight shares.
  assert.match(
    modernCss,
    /grid-template-columns:\s*var\(--dm-reference-column\)\s+var\(--dm-stage-column\)\s+var\(--dm-console-column\);/
  );
  assert.match(modernCss, /@media\s*\(min-width:\s*1181px\)[\s\S]*?\.doraemon-modern\s*\{[^}]*height:\s*var\(--app-scaled-viewport-height,\s*100dvh\);/s);
  assert.match(modernCss, /\.dm-modern-header\s*\{[^}]*width:\s*100%;/s);
});

runTest('modern teacher help uses legacy-style popovers instead of inline expansion', () => {
  // Given: clicking the help icon should not consume vertical space in the control panel.
  assert.match(monitorSource, /className="dm-control-help" role="dialog"/);
  assert.match(monitorSource, /className="dm-control-help-head"/);
  assert.match(monitorSource, /setShowThresholdHelp\(false\);[\s\S]*setShowHelp\(!showHelp\);/);
  assert.match(monitorSource, /setShowHelp\(false\);[\s\S]*setShowThresholdHelp\(!showThresholdHelp\);/);

  // When: the help body is rendered.
  // Then: CSS positions it as an overlay and the console allows the layer to escape.
  assert.match(modernCss, /\.dm-teacher-console\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(modernCss, /\.dm-control-help\s*\{[^}]*position:\s*absolute;[^}]*top:\s*calc\(100%\s*-\s*2px\);/s);
  assert.match(modernCss, /\.dm-control-help-head button\s*\{[^}]*width:\s*var\(--dm-control-target-rendered\);[^}]*height:\s*var\(--dm-control-target-rendered\);/s);
  assert.doesNotMatch(modernCss, /\.dm-control-help\s*\{[^}]*position:\s*relative;/s);
});

runTest('modern desktop stage is vertically capped so the metric band stays in the first viewport', () => {
  assert.match(modernCss, /\.dm-modern-header\s*\{[^}]*min-height:\s*78px;/s);
  assert.match(modernCss, /\.dm-modern-layout\s*\{[^}]*min-height:\s*calc\(var\(--app-scaled-viewport-height,\s*100dvh\)\s*-\s*78px\);/s);
  assert.match(modernCss, /\.dm-live-core\s*\{[^}]*min-height:\s*clamp\(310px,\s*34vh,\s*460px\);/s);
  assert.match(modernCss, /\.dm-modern-visualizer\s*\{[^}]*flex:\s*0\s+0\s+96px;/s);
  assert.match(modernCss, /\.dm-metric-cell\s*\{[^}]*min-height:\s*88px;/s);
  assert.match(modernCss, /@media\s*\(min-width:\s*1181px\)[\s\S]*?html:has\(\.doraemon-modern\),[\s\S]*?overflow:\s*hidden;/s);
  assert.match(modernCss, /@media\s*\(min-width:\s*1181px\)[\s\S]*?\.doraemon-modern\s*\{[^}]*height:\s*var\(--app-scaled-viewport-height,\s*100dvh\);/s);
});

runTest('modern decibel reference is a compact rail rather than the legacy thermometer block', () => {
  // Given: the old shared markup still renders the reference panel.
  assert.match(monitorSource, /className="dm-level-range"/);
  assert.match(monitorSource, /Math\.round\(currentDb\s*\/\s*120\s*\*\s*100\)/);
  assert.match(monitorSource, /if\s*\(variant === 'legacy'\)[\s\S]*?const pointerPos = Math\.min\(100,\s*Math\.max\(0,\s*currentDb\)\);/);
  assert.match(monitorSource, /style=\{\{ position:\s*'relative',\s*width:\s*'12px' \}\}/);
  assert.match(monitorSource, /if\s*\(variant === 'legacy'\)[\s\S]*?borderLeft:\s*`10px solid #0096E1`/);
  assert.match(monitorSource, /legacyLevels\.reverse\(\)\.map\(\(l,\s*i\)\s*=>\s*\(\s*<div key=\{i\} style=/);

  // When: modern CSS scopes the reused classes.
  // Then: it compresses the rail, removes the old 28px pointer, and wraps labels in compact rows.
  assert.match(modernCss, /\.doraemon-modern\s+\.vertical-meter-container\s*\{[^}]*grid-template-columns:\s*24px\s+minmax\(0,\s*1fr\);/s);
  assert.match(modernCss, /\.doraemon-modern\s+\.meter-bar-bg\s*\{[^}]*width:\s*8px;/s);
  assert.match(modernCss, /\.doraemon-modern\s+\.current-level-pointer\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/s);
  assert.match(modernCss, /\.doraemon-modern\s+\.level-nodes\s*\{[^}]*grid-template-rows:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\);/s);
});

runTest('modern stylesheet keeps balanced blocks after alarm decoration edits', () => {
  const openingBraces = [...modernCss].filter((character) => character === '{').length;
  const closingBraces = [...modernCss].filter((character) => character === '}').length;

  assert.equal(
    closingBraces,
    openingBraces,
    `modern CSS has ${openingBraces} opening braces and ${closingBraces} closing braces`
  );
});

runTest('version selector cards use the documented card radius token', () => {
  // Given: DESIGN.md defines one radius for cards.
  assert.match(modernCss, /--dm-radius-card:\s*18px;/);

  // When: featured and legacy selector cards are styled.
  // Then: both consume the shared token rather than introducing orphan radii.
  assert.match(modernCss, /\.dm-gallery-card\s*\{[^}]*border-radius:\s*var\(--dm-radius-card\);/s);
  assert.match(modernCss, /\.dm-legacy-lane\s*\{[^}]*border-radius:\s*var\(--dm-radius-card\);/s);
});
