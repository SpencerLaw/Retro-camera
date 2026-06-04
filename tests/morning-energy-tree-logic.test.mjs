import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, force) => {
      if (typeof force === 'boolean') {
        if (force) {
          values.add(name);
          return true;
        }
        values.delete(name);
        return false;
      }
      if (values.has(name)) {
        values.delete(name);
        return false;
      }
      values.add(name);
      return true;
    },
  };
}

function createCanvasContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(_target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') {
        return () => gradient;
      }
      return () => {};
    },
    set() {
      return true;
    },
  });
}

function createElement(id = '') {
  return {
    id,
    dataset: {},
    style: {
      setProperty(name, value) {
        this[name] = value;
      },
    },
    value: '',
    textContent: '',
    innerHTML: '',
    classList: createClassList(),
    appendChild() {},
    addEventListener() {},
    remove() {},
    setAttribute(name, value) {
      this[name] = value;
    },
    getAttribute(name) {
      return this[name] || null;
    },
    querySelector() {
      return createElement();
    },
    querySelectorAll() {
      return [];
    },
    animate() {},
  };
}

function loadMorningTree() {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, createElement(id));
    }
    return elements.get(id);
  };

  const canvas = getElement('tree-canvas');
  canvas.width = 1280;
  canvas.height = 720;
  canvas.getContext = () => createCanvasContext();

  const storage = new Map();
  const document = {
    getElementById: getElement,
    querySelector: () => createElement(),
    querySelectorAll: () => [],
    createElement: () => createElement(),
    addEventListener() {},
  };

  const sandbox = {
    console,
    document,
    window: {
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener() {},
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
    fetch: async () => ({ json: async () => ({}) }),
    alert() {},
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame() {},
    Date,
    Math,
    parseInt,
    Number,
    Boolean,
    String,
    JSON,
  };

  sandbox.window.document = document;
  sandbox.window.localStorage = sandbox.localStorage;

  const source = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');
  vm.runInNewContext(`
    ${source}
    globalThis.__morningTreeTestApi = {
      STATE,
      updateState,
      triggerSuperMode,
      startReportSession: typeof startReportSession === 'function' ? startReportSession : undefined,
      finalizeReportSession: typeof finalizeReportSession === 'function' ? finalizeReportSession : undefined,
      loadStoredReports: typeof loadStoredReports === 'function' ? loadStoredReports : undefined,
      renderReportFocus: typeof renderReportFocus === 'function' ? renderReportFocus : undefined,
      getNextEnergy: typeof getNextEnergy === 'function' ? getNextEnergy : undefined,
      getSessionGrowthRate: typeof getSessionGrowthRate === 'function' ? getSessionGrowthRate : undefined,
      syncSessionGrowthRate: typeof syncSessionGrowthRate === 'function' ? syncSessionGrowthRate : undefined,
      getNextVisualEnergy: typeof getNextVisualEnergy === 'function' ? getNextVisualEnergy : undefined,
      updateVisualEnergy: typeof updateVisualEnergy === 'function' ? updateVisualEnergy : undefined,
      getTreeDisplayEnergy: typeof getTreeDisplayEnergy === 'function' ? getTreeDisplayEnergy : undefined,
      getTreeDisplayLifecycleStage: typeof getTreeDisplayLifecycleStage === 'function' ? getTreeDisplayLifecycleStage : undefined,
      getFinalTreeMorphProgress: typeof getFinalTreeMorphProgress === 'function' ? getFinalTreeMorphProgress : undefined,
      getTreeSizeForEnergy: typeof getTreeSizeForEnergy === 'function' ? getTreeSizeForEnergy : undefined,
      getTreeRenderSize: typeof getTreeRenderSize === 'function' ? getTreeRenderSize : undefined,
      applySensitivityToDb: typeof applySensitivityToDb === 'function' ? applySensitivityToDb : undefined,
      clampSensitivity: typeof clampSensitivity === 'function' ? clampSensitivity : undefined,
      getSensitivityProfile: typeof getSensitivityProfile === 'function' ? getSensitivityProfile : undefined,
      REPORT_WEEKDAYS: typeof REPORT_WEEKDAYS !== 'undefined' ? REPORT_WEEKDAYS : undefined,
      createDefaultWeeklyTasks: typeof createDefaultWeeklyTasks === 'function' ? createDefaultWeeklyTasks : undefined,
      getCurrentWeekdayKey: typeof getCurrentWeekdayKey === 'function' ? getCurrentWeekdayKey : undefined,
      getWeeklyDayGroups: typeof getWeeklyDayGroups === 'function' ? getWeeklyDayGroups : undefined,
      getTaskDayGroups: typeof getTaskDayGroups === 'function' ? getTaskDayGroups : undefined,
      getTreeLifecycleStage: typeof getTreeLifecycleStage === 'function' ? getTreeLifecycleStage : undefined,
      drawBloomingEnergyTree: typeof drawBloomingEnergyTree === 'function' ? drawBloomingEnergyTree : undefined,
      getAudioActivation: typeof getAudioActivation === 'function' ? getAudioActivation : undefined,
      getFinalTreeVisualState: typeof getFinalTreeVisualState === 'function' ? getFinalTreeVisualState : undefined,
      updateFinalEnergyVisuals: typeof updateFinalEnergyVisuals === 'function' ? updateFinalEnergyVisuals : undefined,
      createSessionRewardState: typeof createSessionRewardState === 'function' ? createSessionRewardState : undefined,
      updateSessionRewards: typeof updateSessionRewards === 'function' ? updateSessionRewards : undefined,
      getRewardEnergyBonus: typeof getRewardEnergyBonus === 'function' ? getRewardEnergyBonus : undefined,
      applyRewardEnergyBonus: typeof applyRewardEnergyBonus === 'function' ? applyRewardEnergyBonus : undefined,
      getRewardProgress: typeof getRewardProgress === 'function' ? getRewardProgress : undefined,
      renderRewardPanel: typeof renderRewardPanel === 'function' ? renderRewardPanel : undefined,
      setActiveRewardHelp: typeof setActiveRewardHelp === 'function' ? setActiveRewardHelp : undefined,
      getRewardHelpContent: typeof getRewardHelpContent === 'function' ? getRewardHelpContent : undefined,
      getRewardBonusLabel: typeof getRewardBonusLabel === 'function' ? getRewardBonusLabel : undefined,
      flashRewardEnergyBonus: typeof flashRewardEnergyBonus === 'function' ? flashRewardEnergyBonus : undefined,
      spawnRewardAnimation: typeof spawnRewardAnimation === 'function' ? spawnRewardAnimation : undefined,
      drawRewardEffects: typeof drawRewardEffects === 'function' ? drawRewardEffects : undefined,
      getRewardEffectCount: typeof getRewardEffectCount === 'function' ? getRewardEffectCount : undefined,
      getGravityWaterPoint: typeof getGravityWaterPoint === 'function' ? getGravityWaterPoint : undefined,
      initEnvironment: typeof initEnvironment === 'function' ? initEnvironment : undefined,
      getMeadowEnvironmentSummary: typeof getMeadowEnvironmentSummary === 'function' ? getMeadowEnvironmentSummary : undefined,
      drawMeadowCritters: typeof drawMeadowCritters === 'function' ? drawMeadowCritters : undefined,
      drawMeadowPlants: typeof drawMeadowPlants === 'function' ? drawMeadowPlants : undefined,
      updateRenderPerformance: typeof updateRenderPerformance === 'function' ? updateRenderPerformance : undefined,
      getRenderMode: typeof getRenderMode === 'function' ? getRenderMode : undefined,
      getFxLimit: typeof getFxLimit === 'function' ? getFxLimit : undefined,
      trimVisualEffectQueues: typeof trimVisualEffectQueues === 'function' ? trimVisualEffectQueues : undefined,
      feedMeadowGrowth: typeof feedMeadowGrowth === 'function' ? feedMeadowGrowth : undefined,
      spreadMeadowSunlight: typeof spreadMeadowSunlight === 'function' ? spreadMeadowSunlight : undefined,
      Frog: typeof Frog === 'function' ? Frog : undefined,
      Dragonfly: typeof Dragonfly === 'function' ? Dragonfly : undefined,
      Ladybug: typeof Ladybug === 'function' ? Ladybug : undefined,
      resetGame: typeof resetGame === 'function' ? resetGame : undefined,
      openForestModal: typeof openForestModal === 'function' ? openForestModal : undefined,
      APP_MODES: typeof APP_MODES !== 'undefined' ? APP_MODES : undefined,
      selectAppMode: typeof selectAppMode === 'function' ? selectAppMode : undefined,
      showModePicker: typeof showModePicker === 'function' ? showModePicker : undefined,
      normalizeCompetitionConfig: typeof normalizeCompetitionConfig === 'function' ? normalizeCompetitionConfig : undefined,
      createCompetitionSession: typeof createCompetitionSession === 'function' ? createCompetitionSession : undefined,
      startCompetitionGroupAttempt: typeof startCompetitionGroupAttempt === 'function' ? startCompetitionGroupAttempt : undefined,
      finishCompetitionGroupAttempt: typeof finishCompetitionGroupAttempt === 'function' ? finishCompetitionGroupAttempt : undefined,
      updateCompetitionSessionMetrics: typeof updateCompetitionSessionMetrics === 'function' ? updateCompetitionSessionMetrics : undefined,
      getCompetitionCompletion: typeof getCompetitionCompletion === 'function' ? getCompetitionCompletion : undefined,
      getNextPendingCompetitionGroup: typeof getNextPendingCompetitionGroup === 'function' ? getNextPendingCompetitionGroup : undefined,
      getCompetitionRankings: typeof getCompetitionRankings === 'function' ? getCompetitionRankings : undefined,
      getCompetitionWinner: typeof getCompetitionWinner === 'function' ? getCompetitionWinner : undefined,
      buildCompetitionReportPayload: typeof buildCompetitionReportPayload === 'function' ? buildCompetitionReportPayload : undefined,
      renderCompetitionPanel: typeof renderCompetitionPanel === 'function' ? renderCompetitionPanel : undefined,
      loadStoredForest: typeof loadStoredForest === 'function' ? loadStoredForest : undefined,
      getTreeSnapshotFromReport: typeof getTreeSnapshotFromReport === 'function' ? getTreeSnapshotFromReport : undefined
    };
  `, sandbox);

  return {
    api: sandbox.__morningTreeTestApi,
    elements,
  };
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('morning energy keeps the final tree manifested after quiet moments', () => {
  const { api, elements } = loadMorningTree();
  api.STATE.isListening = true;
  api.STATE.energy = 100;
  api.STATE.visualEnergy = 100;
  api.STATE.currentDB = 38;
  api.STATE.hasManifested = true;
  api.STATE.isSuperMode = false;
  api.STATE.finalHoldUntil = Date.now() - 1000;

  api.updateState(3);

  assert.equal(api.STATE.energy, 100);
  assert.equal(api.STATE.hasManifested, true);
  assert.equal(elements.get('energy-fill').style.width, '100%');
});

runTest('final energy tree holds its full form after manifesting', () => {
  const { api, elements } = loadMorningTree();

  api.STATE.isListening = true;
  api.STATE.energy = 100;
  api.STATE.visualEnergy = 100;
  api.STATE.currentDB = 60;
  api.triggerSuperMode();
  api.STATE.visualEnergy = 100;
  api.STATE.finalHoldUntil = Date.now() - 1000;
  api.updateState(1);

  assert.equal(api.STATE.energy, 100);
  assert.equal(api.STATE.hasManifested, true);
  assert.equal(elements.get('energy-fill').style.width, '100%');
});

runTest('top energy bar follows displayed tree growth instead of raw full energy', () => {
  const { api, elements } = loadMorningTree();

  api.STATE.isListening = true;
  api.STATE.energy = 100;
  api.STATE.visualEnergy = 82;
  api.STATE.currentDB = 80;
  api.STATE.hasManifested = true;

  api.updateState(1);

  const displayedWidth = Number.parseFloat(elements.get('energy-fill').style.width);
  assert.equal(api.STATE.energy, 100);
  assert.ok(api.STATE.visualEnergy > 82);
  assert.ok(api.STATE.visualEnergy < 90);
  assert.ok(displayedWidth > 82);
  assert.ok(displayedWidth < 90);
});

runTest('final tree dims while quiet and glows when reading is strong', () => {
  const { api, elements } = loadMorningTree();

  assert.equal(typeof api.getFinalTreeVisualState, 'function');
  assert.equal(typeof api.updateFinalEnergyVisuals, 'function');

  const quiet = api.getFinalTreeVisualState({
    manifested: true,
    currentDB: 38,
    readingHoldSeconds: 0
  });
  const loud = api.getFinalTreeVisualState({
    manifested: true,
    currentDB: 88,
    readingHoldSeconds: 2
  });

  assert.equal(quiet.active, true);
  assert.equal(loud.active, true);
  assert.ok(quiet.brightness < loud.brightness);
  assert.ok(quiet.canopyAlpha < loud.canopyAlpha);
  assert.ok(quiet.glowAlpha < loud.glowAlpha);
  assert.equal(quiet.quiet, true);

  api.STATE.hasManifested = true;
  api.STATE.currentDB = 38;
  api.STATE.readingHoldSeconds = 0;
  assert.equal(api.updateFinalEnergyVisuals(), 'quiet');
  assert.equal(elements.get('app-container').dataset.finalVoice, 'quiet');

  api.STATE.currentDB = 88;
  api.STATE.readingHoldSeconds = 2;
  assert.equal(api.updateFinalEnergyVisuals(), 'glow');
  assert.equal(elements.get('app-container').dataset.finalVoice, 'glow');
});

runTest('final tree visual growth eases instead of jumping to mature form', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getNextVisualEnergy, 'function');
  assert.equal(typeof api.updateVisualEnergy, 'function');
  assert.equal(typeof api.getTreeDisplayLifecycleStage, 'function');
  assert.equal(typeof api.getFinalTreeMorphProgress, 'function');

  api.STATE.energy = 82;
  api.STATE.visualEnergy = 82;
  api.STATE.hasManifested = false;

  api.triggerSuperMode();
  api.updateVisualEnergy(1);

  assert.equal(api.STATE.energy, 100);
  assert.ok(api.STATE.visualEnergy > 82);
  assert.ok(api.STATE.visualEnergy < 90);
  assert.notEqual(api.getTreeDisplayLifecycleStage().key, 'final');

  for (let i = 0; i < 80; i += 1) {
    api.updateVisualEnergy(0.25);
  }

  const finalStage = api.getTreeDisplayLifecycleStage();
  assert.equal(finalStage.key, 'final');
  assert.ok(finalStage.finalReveal > 0.95);
  assert.ok(api.getTreeDisplayEnergy() >= 99.4);
});

runTest('final tree morph progress starts slowly before the crown fills in', () => {
  const { api } = loadMorningTree();

  assert.equal(api.getFinalTreeMorphProgress({ key: 'final', finalReveal: 0 }), 0);
  assert.ok(api.getFinalTreeMorphProgress({ key: 'final', finalReveal: 0.08 }) < 0.02);
  assert.ok(api.getFinalTreeMorphProgress({ key: 'final', finalReveal: 0.25 }) < 0.16);
  assert.ok(api.getFinalTreeMorphProgress({ key: 'final', finalReveal: 0.5 }) >= 0.49);
  assert.equal(api.getFinalTreeMorphProgress({ key: 'final', finalReveal: 1 }), 1);
});

runTest('morning tree size returns to sapling range at low energy', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getTreeSizeForEnergy, 'function');
  assert.ok(api.getTreeSizeForEnergy(0) <= 60);
  assert.ok(api.getTreeSizeForEnergy(50) > api.getTreeSizeForEnergy(0));
  assert.equal(api.getTreeSizeForEnergy(100), 240);
});

runTest('final tree render size is capped so the mature canopy stays in frame', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getTreeRenderSize, 'function');

  const desktopFinalSize = api.getTreeRenderSize(100, { width: 1920, height: 900 });
  const compactFinalSize = api.getTreeRenderSize(100, { width: 1024, height: 720 });
  const halfEnergySize = api.getTreeRenderSize(50, { width: 1920, height: 900 });

  assert.ok(desktopFinalSize < api.getTreeSizeForEnergy(100));
  assert.ok(desktopFinalSize <= 172);
  assert.ok(compactFinalSize <= 140);
  assert.ok(halfEnergySize < desktopFinalSize);
});

runTest('sensitivity profile gives teachers a meaningful control range', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.applySensitivityToDb, 'function');
  assert.equal(typeof api.clampSensitivity, 'function');
  assert.equal(typeof api.getSensitivityProfile, 'function');

  const lowestSensitivity = api.clampSensitivity(0);
  const highestSensitivity = api.clampSensitivity(100);
  const lowProfile = api.getSensitivityProfile(lowestSensitivity);
  const defaultProfile = api.getSensitivityProfile(50);
  const highProfile = api.getSensitivityProfile(highestSensitivity);

  assert.ok(lowProfile.readingThreshold > defaultProfile.readingThreshold);
  assert.ok(lowProfile.growthMultiplier < defaultProfile.growthMultiplier);
  assert.ok(lowProfile.minimumReadingSeconds > defaultProfile.minimumReadingSeconds);
  assert.ok(highProfile.readingThreshold < defaultProfile.readingThreshold);
  assert.ok(highProfile.growthMultiplier > defaultProfile.growthMultiplier);
  assert.ok(api.applySensitivityToDb(65, lowestSensitivity) < 70);
  assert.ok(api.applySensitivityToDb(60, 85) > api.applySensitivityToDb(60, 50));
});

runTest('lowest sensitivity ignores borderline reading that used to grow too quickly', () => {
  const { api } = loadMorningTree();

  const lowestSensitivity = api.clampSensitivity(0);
  const lowProfile = api.getSensitivityProfile(lowestSensitivity);
  const adjustedDb = api.applySensitivityToDb(75, lowestSensitivity);
  const nextEnergy = api.getNextEnergy(30, adjustedDb, api.STATE.baseGrowthRate, {
    sensitivity: lowestSensitivity,
    deltaSeconds: 1,
    readingHoldSeconds: lowProfile.minimumReadingSeconds + 0.1,
  });

  assert.ok(adjustedDb < lowProfile.readingThreshold);
  assert.ok(nextEnergy < 30);
});

runTest('lowest sensitivity still allows truly loud sustained reading to grow slowly', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getNextEnergy, 'function');

  const lowestSensitivity = api.clampSensitivity(0);
  const lowProfile = api.getSensitivityProfile(lowestSensitivity);
  const loudAdjustedDb = api.applySensitivityToDb(90, lowestSensitivity);
  const lowNextEnergy = api.getNextEnergy(0, loudAdjustedDb, api.STATE.baseGrowthRate, {
    sensitivity: lowestSensitivity,
    deltaSeconds: 1,
    readingHoldSeconds: lowProfile.minimumReadingSeconds + 0.1,
  });
  const defaultNextEnergy = api.getNextEnergy(0, 75, api.STATE.baseGrowthRate, {
    sensitivity: 50,
    deltaSeconds: 1,
    readingHoldSeconds: api.getSensitivityProfile(50).minimumReadingSeconds + 0.1,
  });

  assert.ok(loudAdjustedDb >= lowProfile.readingThreshold);
  assert.ok(lowNextEnergy > 0);
  assert.ok(lowNextEnergy < defaultNextEnergy);
});

runTest('energy growth is proportional to elapsed seconds instead of frame count', () => {
  const { api } = loadMorningTree();
  const profile = api.getSensitivityProfile(50);

  const halfSecond = api.getNextEnergy(0, 75, api.STATE.baseGrowthRate, {
    sensitivity: 50,
    deltaSeconds: 0.5,
    readingHoldSeconds: profile.minimumReadingSeconds + 0.1,
  });
  const fullSecond = api.getNextEnergy(0, 75, api.STATE.baseGrowthRate, {
    sensitivity: 50,
    deltaSeconds: 1,
    readingHoldSeconds: profile.minimumReadingSeconds + 0.1,
  });

  assert.ok(fullSecond > halfSecond);
  assert.ok(fullSecond < 0.75);
  assert.ok(Math.abs(fullSecond - (halfSecond * 2)) < 0.02);
});

runTest('base growth speed syncs with the selected morning reading duration', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getSessionGrowthRate, 'function');
  assert.equal(typeof api.syncSessionGrowthRate, 'function');

  const tenMinutes = api.getSessionGrowthRate(10);
  const thirtyMinutes = api.getSessionGrowthRate(30);
  const sixtyMinutes = api.getSessionGrowthRate(60);

  assert.ok(tenMinutes > thirtyMinutes);
  assert.ok(thirtyMinutes > sixtyMinutes);

  api.STATE.sessionDuration = 45;
  assert.equal(api.syncSessionGrowthRate(), api.getSessionGrowthRate(45));
  assert.equal(api.STATE.baseGrowthRate, api.getSessionGrowthRate(45));
});

runTest('short sound spikes do not grow the tree before the sustain gate opens', () => {
  const { api } = loadMorningTree();
  const lowestSensitivity = api.clampSensitivity(0);
  const lowProfile = api.getSensitivityProfile(lowestSensitivity);
  const loudAdjustedDb = api.applySensitivityToDb(95, lowestSensitivity);
  const nextEnergy = api.getNextEnergy(20, loudAdjustedDb, api.STATE.baseGrowthRate, {
    sensitivity: lowestSensitivity,
    deltaSeconds: 0.2,
    readingHoldSeconds: Math.max(0, lowProfile.minimumReadingSeconds - 0.3),
  });

  assert.ok(loudAdjustedDb >= lowProfile.readingThreshold);
  assert.ok(nextEnergy <= 20);
});

runTest('finalized report stores local metrics for teacher review', () => {
  const { api } = loadMorningTree();
  const startedAt = new Date(Date.now() - 12_000).toISOString();
  const manifestedAt = new Date(Date.now() - 5_000).toISOString();

  assert.equal(typeof api.finalizeReportSession, 'function');
  assert.equal(typeof api.loadStoredReports, 'function');

  api.STATE.sessionStartedAt = startedAt;
  api.STATE.curveBuffer = [42, 68, 81, 76, 62];
  api.STATE.energy = 96;
  api.STATE.hasManifested = true;
  api.STATE.manifestedAt = manifestedAt;
  api.STATE.manifestedElapsedSeconds = 7;
  api.STATE.reportEffectiveReadingSeconds = 8.4;
  api.STATE.reportPeakEnergy = 100;
  api.STATE.sensitivity = 35;

  api.finalizeReportSession();

  const [report] = api.loadStoredReports();
  assert.equal(report.peakDb, 81);
  assert.equal(report.finalEnergy, 96);
  assert.equal(report.peakEnergy, 100);
  assert.equal(report.sensitivity, 35);
  assert.equal(report.manifestedAt, manifestedAt);
  assert.equal(report.manifestedElapsedSeconds, 7);
  assert.equal(report.readingSeconds, 8);
  assert.ok(report.activeRatio > 0.6);
  assert.ok(Array.isArray(report.energyCurve));
});

runTest('weekly report renders enhanced metrics with legacy mature-time fallback', () => {
  const { api, elements } = loadMorningTree();

  assert.equal(typeof api.renderReportFocus, 'function');

  api.renderReportFocus({
    label: '周一',
    dateLabel: '05/30',
    records: [{
      id: 'legacy-report',
      startedAt: '2026-05-30T07:30:00.000Z',
      endedAt: '2026-05-30T07:40:00.000Z',
      durationSeconds: 600,
      curve: [42, 78, 63],
      peakDb: 78,
      lowDb: 42,
      averageDb: 61,
      manifested: true,
    }],
  });

  const html = elements.get('report-day-list').innerHTML;
  assert.match(html, /report-detail-grid/);
  assert.match(html, /长成时间/);
  assert.match(html, /旧记录未保存具体时间/);
  assert.match(html, /最终能量/);
  assert.match(html, /有效朗读/);

  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');
  const style = fs.readFileSync('public/morning-energy-tree/style.css', 'utf8');
  assert.match(script, /const axisFontSize = 14/);
  assert.match(script, /const tickFontSize = 14/);
  assert.match(script, /const manifestFontSize = 14/);
  assert.match(script, /const badgeFontSize = 14/);
  assert.match(style, /\.report-curve-svg\s*\{[\s\S]*height: 236px;/);
  assert.match(style, /\.report-curve-label\s*\{[\s\S]*font-size: 1\.05rem;/);
});

runTest('sensitivity control uses a slider instead of fixed three-level buttons', () => {
  const html = fs.readFileSync('public/morning-energy-tree/index.html', 'utf8');
  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');

  assert.match(html, /id="sensitivity-slider"/);
  assert.match(html, /type="range"/);
  assert.match(html, /id="sensitivity-value"/);
  assert.doesNotMatch(html, /class="sens-btn"/);
  assert.doesNotMatch(html, /data-sens="30"/);
  assert.doesNotMatch(html, /data-sens="50"/);
  assert.doesNotMatch(html, /data-sens="75"/);
  assert.doesNotMatch(script, /querySelectorAll\('\.sens-btn'\)/);
});

runTest('weekly reports and task boards cover Monday through Sunday', () => {
  const { api } = loadMorningTree();

  assert.deepEqual(Array.from(api.REPORT_WEEKDAYS, (day) => day.key), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(api.getCurrentWeekdayKey(new Date('2026-05-30T08:00:00+08:00')), 'sat');
  assert.equal(api.getCurrentWeekdayKey(new Date('2026-05-31T08:00:00+08:00')), 'sun');

  const taskMap = api.createDefaultWeeklyTasks();
  assert.ok(taskMap.sat);
  assert.ok(taskMap.sun);

  const monday = new Date('2026-05-25T00:00:00+08:00');
  const reportGroups = api.getWeeklyDayGroups([], monday);
  const taskGroups = api.getTaskDayGroups(taskMap, monday);
  assert.equal(reportGroups.length, 7);
  assert.equal(taskGroups.length, 7);
  assert.equal(reportGroups[6].key, 'sun');
});

runTest('tree lifecycle stages are fine grained from seed to final energy tree', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getTreeLifecycleStage, 'function');
  assert.equal(typeof api.drawBloomingEnergyTree, 'function');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 2 }).key, 'seed');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 18 }).key, 'sprout');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 35 }).key, 'branches');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 58 }).key, 'leaves');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 76 }).key, 'flowers');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 91 }).key, 'fruit');
  assert.equal(api.getTreeLifecycleStage({ finalEnergy: 100, manifested: true }).key, 'final');

  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');
  assert.match(script, /BLOOM_TREE_FINAL_COLORS/);
  assert.match(script, /const isFinalTree = stage\?\.key === 'final'/);
  assert.match(script, /const finalMorph = isFinalTree \? getFinalTreeMorphProgress\(finalReveal\) : 0/);
  assert.match(script, /densityBoost = stage\?\.key === 'final' \? 1\.18 \+ finalReveal \* 0\.37/);
  assert.match(script, /drawBloomingEnergyTree\(canvas\.width \/ 2, canvas\.height - 20, treeSize, lifecycleStage, renderMode\)/);
});

runTest('tree growth visuals include seed roots twigs and a natural final crown', () => {
  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');

  assert.match(script, /const TREE_SOIL_COLORS/);
  assert.match(script, /function drawSeedRoots/);
  assert.match(script, /function drawSurfaceRoots/);
  assert.match(script, /function drawNaturalTwigCluster/);
  assert.match(script, /function getVisibleBranchCount/);
  assert.match(script, /const finalCrownClusters = \[/);
  assert.match(script, /detailBase = stage\?\.key === 'final' \? Math\.round\(9 \+ finalReveal \* 9\)/);
  assert.match(script, /clusters\.slice\(0, finalBaseClusterCount\)\.concat\(finalCrownClusters\.slice\(0, finalClusterCount\)\)/);
});

runTest('audio activation makes light orbs clearly correlated with decibels', () => {
  const { api } = loadMorningTree();
  const profile = api.getSensitivityProfile(50);

  assert.equal(typeof api.getAudioActivation, 'function');

  const quiet = api.getAudioActivation(62, profile, 0.2);
  const medium = api.getAudioActivation(78, profile, 1.2);
  const loud = api.getAudioActivation(92, profile, 2.5);
  const veryLoud = api.getAudioActivation(104, profile, 2.5);

  assert.ok(medium.intensity > quiet.intensity);
  assert.ok(loud.intensity > medium.intensity);
  assert.ok(veryLoud.intensity >= loud.intensity);
  assert.equal(Object.hasOwn(veryLoud, 'overLoud'), false);
  assert.ok(loud.orbCount > quiet.orbCount);
});

runTest('loud reading earns water and fertilizer without over-loud warnings', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.createSessionRewardState, 'function');
  assert.equal(typeof api.updateSessionRewards, 'function');

  const stable = api.createSessionRewardState();
  api.updateSessionRewards(stable, {
    currentDB: 82,
    deltaSeconds: 30,
    isReadingLoudly: true,
    effectiveReadingSeconds: 30,
  });
  api.updateSessionRewards(stable, {
    currentDB: 84,
    deltaSeconds: 330,
    isReadingLoudly: true,
    effectiveReadingSeconds: 360,
  });

  assert.equal(stable.waterCount, 12);
  assert.equal(stable.fertilizerCount, 4);
  assert.equal(stable.nextWaterAt, 390);
  assert.equal(stable.nextFertilizerAt, 450);
  assert.equal(Object.hasOwn(stable, 'overLoudCount'), false);

  const veryLoud = api.createSessionRewardState();
  api.updateSessionRewards(veryLoud, {
    currentDB: 106,
    deltaSeconds: 90,
    isReadingLoudly: true,
    effectiveReadingSeconds: 90,
  });

  assert.equal(veryLoud.waterCount, 3);
  assert.equal(veryLoud.fertilizerCount, 1);
  assert.equal(Object.hasOwn(veryLoud, 'overLoudCount'), false);
});

runTest('watering and fertilizer rewards keep cycling without a count cap', () => {
  const { api } = loadMorningTree();
  const rewardState = api.createSessionRewardState();

  api.updateSessionRewards(rewardState, {
    currentDB: 86,
    deltaSeconds: 1800,
    isReadingLoudly: true,
    effectiveReadingSeconds: 1800,
  });

  assert.equal(rewardState.waterCount, 60);
  assert.equal(rewardState.fertilizerCount, 20);
  assert.equal(rewardState.nextWaterAt, 1830);
  assert.equal(rewardState.nextFertilizerAt, 1890);

  const progress = api.getRewardProgress(rewardState, 1800);
  assert.equal(progress.waterComplete, false);
  assert.equal(progress.fertilizerComplete, false);
  assert.equal(progress.waterTargetSeconds, 1830);
  assert.equal(progress.fertilizerTargetSeconds, 1890);
});

runTest('water and fertilizer bonuses directly grow the top energy progress once', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getRewardEnergyBonus, 'function');
  assert.equal(typeof api.applyRewardEnergyBonus, 'function');

  const waterOnly = api.getRewardEnergyBonus(
    { waterCount: 0, fertilizerCount: 0 },
    { waterCount: 1, fertilizerCount: 0 }
  );
  assert.equal(waterOnly.totalBonus, 0.25);
  assert.equal(waterOnly.waterBonus, 0.25);
  assert.equal(waterOnly.fertilizerBonus, 0);
  assert.equal(api.applyRewardEnergyBonus(40, waterOnly), 40.25);

  const bothRewards = api.getRewardEnergyBonus(
    { waterCount: 0, fertilizerCount: 0 },
    { waterCount: 1, fertilizerCount: 1 }
  );
  assert.ok(Math.abs(bothRewards.totalBonus - 0.85) < 0.001);
  assert.ok(Math.abs(api.applyRewardEnergyBonus(96, bothRewards) - 96.85) < 0.001);

  const multipleRewards = api.getRewardEnergyBonus(
    { waterCount: 1, fertilizerCount: 1 },
    { waterCount: 3, fertilizerCount: 2 }
  );
  assert.ok(Math.abs(multipleRewards.totalBonus - 1.1) < 0.001);
  assert.equal(multipleRewards.waterBonus, 0.5);
  assert.equal(multipleRewards.fertilizerBonus, 0.6);

  const alreadyCounted = api.getRewardEnergyBonus(
    { waterCount: 1, fertilizerCount: 1 },
    { waterCount: 1, fertilizerCount: 1 }
  );
  assert.equal(alreadyCounted.totalBonus, 0);
});

runTest('live reward panel writes out watering and fertilizer trigger rules', () => {
  const html = fs.readFileSync('public/morning-energy-tree/index.html', 'utf8');
  const { api, elements } = loadMorningTree();
  const zh = JSON.parse(fs.readFileSync('public/locales/zh-CN.json', 'utf8'));

  assert.match(html, /能量树成长进度/);
  assert.match(html, /id="reward-panel"/);
  assert.match(html, /id="reward-live-panel"/);
  assert.match(html, /data-i18n="morningTree\.rewards\.waterRule"/);
  assert.match(html, /data-i18n="morningTree\.rewards\.fertilizerRule"/);
  assert.doesNotMatch(html, /data-i18n="morningTree\.rewards\.overLoudRule"/);
  assert.equal(typeof api.getRewardProgress, 'function');
  assert.equal(typeof api.renderRewardPanel, 'function');

  const rewardState = api.createSessionRewardState();
  rewardState.stableReadingSeconds = 18;
  const progress = api.getRewardProgress(rewardState, 45);
  assert.equal(progress.waterTargetSeconds, 30);
  assert.equal(progress.fertilizerTargetSeconds, 90);
  assert.equal(progress.waterRemainingSeconds, 12);
  assert.equal(progress.fertilizerRemainingSeconds, 45);

  api.STATE.rewardState = rewardState;
  api.STATE.reportEffectiveReadingSeconds = 45;
  api.renderRewardPanel();

  const panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /id="reward-water-count"/);
  assert.match(panelHtml, /id="reward-fertilizer-count"/);
  assert.match(panelHtml, /30s/);
  assert.match(panelHtml, /90s/);
  assert.doesNotMatch(panelHtml, /过响/);
  assert.doesNotMatch(panelHtml, /overLoud/);
  assert.equal(zh.morningTree.energyLabel, '🌳 能量树成长进度');
  assert.match(zh.morningTree.rewards.liveSub, /不需要老师手动点/);
  assert.match(zh.morningTree.rewards.waterRule, /30 秒/);
  assert.match(zh.morningTree.rewards.waterRule, /不设上限/);
  assert.match(zh.morningTree.rewards.waterRule, /\+0\.25%/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /90 秒/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /不设上限/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /\+0\.6%/);
  assert.equal(Object.hasOwn(zh.morningTree.rewards, 'overLoudRule'), false);
});

runTest('reward cards are clickable and reveal trigger explanations', () => {
  const html = fs.readFileSync('public/morning-energy-tree/index.html', 'utf8');
  const css = fs.readFileSync('public/morning-energy-tree/style.css', 'utf8');
  const { api, elements } = loadMorningTree();
  const zh = JSON.parse(fs.readFileSync('public/locales/zh-CN.json', 'utf8'));

  assert.match(html, /id="reward-energy-float"/);
  assert.equal(typeof api.setActiveRewardHelp, 'function');
  assert.equal(typeof api.getRewardHelpContent, 'function');

  const waterHelp = api.getRewardHelpContent('water');
  const fertilizerHelp = api.getRewardHelpContent('fertilizer');
  assert.match(waterHelp.condition, /30 秒/);
  assert.match(waterHelp.condition, /不设上限/);
  assert.match(waterHelp.effect, /\+0\.25%/);
  assert.match(fertilizerHelp.condition, /90 秒/);
  assert.match(fertilizerHelp.condition, /不设上限/);
  assert.match(fertilizerHelp.effect, /\+0\.6%/);

  api.renderRewardPanel();
  let panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /button[^>]+data-reward-help="water"/);
  assert.match(panelHtml, /button[^>]+data-reward-help="fertilizer"/);
  assert.doesNotMatch(panelHtml, /button[^>]+data-reward-help="overLoud"/);
  assert.match(panelHtml, /reward-help-mark/);
  assert.match(panelHtml, /奖励 \+0\.25%/);
  assert.doesNotMatch(panelHtml, /id="reward-help-water"/);

  api.setActiveRewardHelp('water');
  panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /id="reward-help-water"/);
  assert.match(panelHtml, /aria-expanded="true"/);
  assert.match(panelHtml, /触发条件/);
  assert.match(panelHtml, /稳定朗读区/);

  api.setActiveRewardHelp('fertilizer');
  panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /id="reward-help-fertilizer"/);
  assert.match(panelHtml, /有效朗读/);
  assert.doesNotMatch(panelHtml, /id="reward-help-water"/);

  assert.match(css, /\.reward-help-mark/);
  assert.match(css, /\.reward-card-help/);
  assert.match(css, /\.reward-energy-float/);
  assert.match(zh.morningTree.rewards.tapHint, /点击/);
});

runTest('reward boost creates a visible growth bonus label', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getRewardBonusLabel, 'function');
  assert.equal(api.getRewardBonusLabel({ waterBonus: 2, fertilizerBonus: 0, totalBonus: 2 }), '浇水 +2%');
  assert.equal(api.getRewardBonusLabel({ waterBonus: 0, fertilizerBonus: 5, totalBonus: 5 }), '施肥 +5%');
  assert.equal(api.getRewardBonusLabel({ waterBonus: 2, fertilizerBonus: 5, totalBonus: 7 }), '浇水 +2% · 施肥 +5%');
});

runTest('watering can stream falls downward under gravity', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getGravityWaterPoint, 'function');

  const spout = { x: 240, y: 120 };
  const target = { x: 180, y: 260 };
  const points = [0, 0.15, 0.35, 0.55, 0.75, 1].map(progress =>
    api.getGravityWaterPoint(spout, target, progress, 6)
  );

  for (let i = 1; i < points.length; i += 1) {
    assert.ok(points[i].y >= points[i - 1].y);
  }

  assert.ok(points[points.length - 1].y > spout.y);
  assert.ok(points[points.length - 1].y >= target.y);

  const uphillTarget = api.getGravityWaterPoint({ x: 0, y: 100 }, { x: 80, y: 70 }, 1, 0);
  assert.ok(uphillTarget.y > 100);
});

runTest('meadow starts grassy then grows flowers from reading energy without covering the sapling', () => {
  const { api } = loadMorningTree();
  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');

  assert.equal(typeof api.initEnvironment, 'function');
  assert.equal(typeof api.getMeadowEnvironmentSummary, 'function');
  assert.equal(typeof api.drawMeadowCritters, 'function');
  assert.equal(typeof api.drawMeadowPlants, 'function');
  assert.equal(typeof api.updateRenderPerformance, 'function');
  assert.equal(typeof api.getRenderMode, 'function');
  assert.equal(typeof api.getFxLimit, 'function');
  assert.equal(typeof api.feedMeadowGrowth, 'function');
  assert.equal(typeof api.spreadMeadowSunlight, 'function');
  assert.equal(typeof api.Frog, 'function');
  assert.equal(typeof api.Dragonfly, 'function');
  assert.equal(typeof api.Ladybug, 'function');

  api.initEnvironment();
  const summary = api.getMeadowEnvironmentSummary();

  assert.ok(summary.plantCount >= 120);
  assert.equal(summary.flowerCount, 0);
  assert.ok(summary.grassCount >= 120);
  assert.ok(summary.bloomPotentialCount > 80);
  assert.equal(summary.saplingProtectedFlowerCount, 0);

  for (let i = 0; i < 4; i += 1) {
    api.feedMeadowGrowth(160, 2.2, '#ffe082');
  }
  const energizedSummary = api.getMeadowEnvironmentSummary();
  assert.ok(energizedSummary.flowerCount > 0);
  assert.equal(energizedSummary.saplingProtectedFlowerCount, 0);

  api.STATE.isListening = true;
  api.STATE.visualEnergy = 72;
  api.spreadMeadowSunlight(10, 1.2);
  const sunlitSummary = api.getMeadowEnvironmentSummary();
  assert.ok(sunlitSummary.flowerCount >= energizedSummary.flowerCount);
  assert.equal(sunlitSummary.saplingProtectedFlowerCount, 0);

  assert.equal(summary.frogCount, 1);
  assert.equal(summary.dragonflyCount, 4);
  assert.equal(summary.beetleCount, 5);
  assert.equal('beeCount' in summary, false);
  assert.match(script, /protectSapling/);
  assert.match(script, /updateRenderPerformance\(rawDeltaSeconds\)/);
  assert.match(script, /trimVisualEffectQueues\(treeSize\)/);
  assert.match(script, /drawMeadowPlants\(renderMode\);\s+if \(lifecycleStage\.index >= 2/s);
  assert.match(script, /function shouldDrawMeadowAura/);
  assert.match(script, /RENDER_QUALITY_SCALE/);
  assert.match(script, /class Frog/);
  assert.match(script, /meadowCritters\.push\(new Frog\(0\)\)/);
  assert.match(script, /jumpState/);
  assert.match(script, /startJump\(\)/);
  assert.match(script, /Math\.sin\(Math\.PI \* t\) \* this\.jumpHeight/);
  assert.match(script, /this\.jumpHeight = 56 \+ Math\.random\(\) \* 48/);
  assert.match(script, /class Dragonfly/);
  assert.match(script, /drawDragonflyWing/);
  assert.match(script, /wingBeat/);
  assert.match(script, /rgba\(220, 252, 255, 0\.3\)/);
  assert.match(script, /class Ladybug/);
  assert.match(script, /shellColor/);
  assert.match(script, /spotCount/);
  assert.doesNotMatch(script, /class Bee/);
  assert.doesNotMatch(script, /new Bee/);
  assert.doesNotMatch(script, /beeCount/);
  assert.match(script, /drawMeadowCritters\(renderMode\)/);

  const frog = new api.Frog(0);
  frog.jumpCooldown = 0;
  frog.update();
  assert.equal(frog.jumpState, 'jump');
  assert.ok(frog.jumpHeight >= 56);
  const jumpStartY = frog.y;
  for (let i = 0; i < 12; i += 1) frog.update();
  assert.ok(frog.jumpProgress > 0);
  assert.ok(frog.y <= frog.groundY);
  assert.notEqual(frog.y, jumpStartY);

  const dragonfly = new api.Dragonfly(0);
  const startingWingBeat = dragonfly.wingBeat;
  dragonfly.update();
  assert.ok(dragonfly.wingBeat > startingWingBeat);
  assert.equal(typeof dragonfly.drawDragonflyWing, 'function');

  const beetle = new api.Ladybug(0);
  const beetleStartX = beetle.x;
  beetle.update();
  assert.notEqual(beetle.x, beetleStartX);
  assert.ok(beetle.spotCount >= 5);

  for (let i = 0; i < 12; i += 1) api.updateRenderPerformance(0.06);
  assert.equal(api.STATE.renderQuality, 'ultra');
  const ultraMode = api.getRenderMode(240);
  assert.equal(ultraMode.ultraLowPower, true);
  assert.ok(api.getFxLimit('energyParticles', 240) < 16);
});

runTest('watering and fertilizer rewards spawn visible tree animations', () => {
  const { api } = loadMorningTree();
  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');

  assert.equal(typeof api.spawnRewardAnimation, 'function');
  assert.equal(typeof api.getRewardEffectCount, 'function');
  assert.equal(typeof api.flashRewardEnergyBonus, 'function');
  assert.equal(typeof api.drawRewardEffects, 'function');
  assert.equal(api.getRewardEffectCount(), 0);

  const waterSpawned = api.spawnRewardAnimation('water', 1);
  assert.ok(waterSpawned >= 5);
  assert.ok(api.getRewardEffectCount('water') >= 5);

  const fertilizerSpawned = api.spawnRewardAnimation('fertilizer', 1);
  assert.ok(fertilizerSpawned >= 5);
  assert.ok(api.getRewardEffectCount('fertilizer') >= 5);

  api.flashRewardEnergyBonus({ waterBonus: 1, fertilizerBonus: 2, totalBonus: 3 });
  assert.ok(api.getRewardEffectCount('water') > waterSpawned);
  assert.ok(api.getRewardEffectCount('fertilizer') > fertilizerSpawned);
  api.drawRewardEffects(api.getTreeRenderSize(80, { width: 1280, height: 720 }));

  api.resetGame();
  assert.equal(api.getRewardEffectCount(), 0);
  assert.match(script, /class RewardWateringCan/);
  assert.match(script, /new RewardWateringCan/);
  assert.match(script, /class RewardWaterDrop/);
  assert.match(script, /class RewardFertilizerPour/);
  assert.match(script, /new RewardFertilizerPour/);
  assert.match(script, /class RewardFertilizerNutrient/);
  assert.match(script, /class RewardSoilPulse/);
  assert.match(script, /drawRewardEffects\(treeSize\)/);
});

runTest('competition metrics update only the selected group and rank by highest decibel', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.normalizeCompetitionConfig, 'function');
  assert.equal(typeof api.createCompetitionSession, 'function');
  assert.equal(typeof api.startCompetitionGroupAttempt, 'function');
  assert.equal(typeof api.finishCompetitionGroupAttempt, 'function');
  assert.equal(typeof api.updateCompetitionSessionMetrics, 'function');
  assert.equal(typeof api.getCompetitionCompletion, 'function');
  assert.equal(typeof api.getCompetitionWinner, 'function');

  api.STATE.activeMode = api.APP_MODES.COMPETITION;
  const config = api.normalizeCompetitionConfig({
    groupCount: 3,
    groups: [
      { id: 'a', name: '第一组' },
      { id: 'b', name: '第二组' },
      { id: 'c', name: '第三组' },
      { id: 'd', name: '第四组' },
      { id: 'e', name: '第五组' },
      { id: 'f', name: '第六组' },
    ],
  });
  const session = api.createCompetitionSession(config);

  api.startCompetitionGroupAttempt(session, 'b', new Date(Date.now() - 14_000).toISOString());
  api.updateCompetitionSessionMetrics(session, 'b', {
    currentDB: 86,
    deltaSeconds: 8,
    isAboveReadingThreshold: true,
    isReadingLoudly: true,
  });
  api.finishCompetitionGroupAttempt(session, 'b');

  api.startCompetitionGroupAttempt(session, 'a', new Date(Date.now() - 8_000).toISOString());
  api.updateCompetitionSessionMetrics(session, 'a', {
    currentDB: 92,
    deltaSeconds: 4,
    isAboveReadingThreshold: true,
    isReadingLoudly: false,
  });
  api.finishCompetitionGroupAttempt(session, 'a');

  assert.equal(config.groupCount, 3);
  assert.equal(config.groups.length, 5);
  assert.equal(session.groups.length, 3);
  assert.equal(session.groups.find(group => group.id === 'b').challengeSeconds, 8);
  assert.equal(session.groups.find(group => group.id === 'b').readingSeconds, 8);
  assert.equal(session.groups.find(group => group.id === 'b').peakDb, 86);
  assert.equal(session.groups.find(group => group.id === 'a').peakDb, 92);
  assert.equal(api.getCompetitionCompletion(session).completedCount, 2);
  assert.equal(api.getCompetitionWinner(session), null);

  api.startCompetitionGroupAttempt(session, 'c', new Date(Date.now() - 6_000).toISOString());
  api.updateCompetitionSessionMetrics(session, 'c', {
    currentDB: 78,
    deltaSeconds: 3,
    isAboveReadingThreshold: true,
    isReadingLoudly: false,
  });
  api.finishCompetitionGroupAttempt(session, 'c');

  assert.equal(api.getCompetitionCompletion(session).isComplete, true);
  assert.equal(api.getCompetitionWinner(session).id, 'a');
});

runTest('competition mode report stores the end-of-session winner and rankings', () => {
  const { api } = loadMorningTree();
  const startedAt = new Date(Date.now() - 12_000).toISOString();

  assert.equal(typeof api.buildCompetitionReportPayload, 'function');

  api.STATE.activeMode = api.APP_MODES.COMPETITION;
  api.STATE.sessionStartedAt = startedAt;
  api.STATE.curveBuffer = [48, 74, 88, 83];
  api.STATE.energyCurveBuffer = [0, 20, 40, 58];
  api.STATE.energy = 58;
  api.STATE.reportEffectiveReadingSeconds = 8;
  api.STATE.reportPeakEnergy = 58;
  api.STATE.competitionSession = {
    startedAt,
    groups: [
      { id: 'a', name: '第一组', peakDb: 82, readingSeconds: 4 },
      { id: 'b', name: '第二组', peakDb: 91, readingSeconds: 3 },
      { id: 'c', name: '第三组', peakDb: 79, readingSeconds: 2 },
    ],
  };

  api.finalizeReportSession();

  const [report] = api.loadStoredReports();
  assert.equal(report.competition.winnerName, '第二组');
  assert.equal(report.competition.winnerPeakDb, 91);
  assert.equal(report.competition.rankings[0].name, '第二组');
  assert.equal(api.STATE.competitionLastResult.winnerId, 'b');
});

runTest('competition mode waits for every group before declaring a winner', () => {
  const { api } = loadMorningTree();

  api.STATE.activeMode = api.APP_MODES.COMPETITION;
  const session = api.createCompetitionSession(api.normalizeCompetitionConfig({
    groupCount: 3,
    groups: [
      { id: 'a', name: '第一组' },
      { id: 'b', name: '第二组' },
      { id: 'c', name: '第三组' },
    ],
  }));

  api.startCompetitionGroupAttempt(session, 'a', new Date(Date.now() - 10_000).toISOString());
  api.updateCompetitionSessionMetrics(session, 'a', {
    currentDB: 89,
    deltaSeconds: 5,
    isAboveReadingThreshold: true,
    isReadingLoudly: true,
  });
  api.finishCompetitionGroupAttempt(session, 'a');

  const incomplete = api.buildCompetitionReportPayload(session, api.APP_MODES.COMPETITION);
  assert.equal(incomplete.isComplete, false);
  assert.equal(incomplete.completedCount, 1);
  assert.equal(incomplete.winnerName, null);
  assert.equal(incomplete.lastCompletedGroupName, '第一组');
  assert.equal(api.getNextPendingCompetitionGroup(session).id, 'b');
});

runTest('class reading mode keeps the group competition panel and supports group rounds', () => {
  const { api, elements } = loadMorningTree();
  const css = fs.readFileSync('public/morning-energy-tree/style.css', 'utf8');

  api.STATE.activeMode = api.APP_MODES.CLASS;
  api.STATE.competitionConfig = api.normalizeCompetitionConfig({
    groupCount: 3,
    groups: [
      { id: 'a', name: '第一组' },
      { id: 'b', name: '第二组' },
      { id: 'c', name: '第三组' },
    ],
  });
  api.STATE.activeCompetitionGroupId = 'a';
  api.renderCompetitionPanel();

  assert.equal(elements.get('competition-panel').classList.contains('hidden'), false);
  assert.match(elements.get('competition-list').innerHTML, /第一组/);
  assert.match(elements.get('competition-list').innerHTML, /点击开始/);
  assert.match(elements.get('competition-list').innerHTML, /competition-chip-action ready/);
  assert.match(elements.get('competition-list').innerHTML, /aria-label="第一组，点击开始"/);
  assert.match(css, /\.competition-chip-action\.ready::before/);

  api.startReportSession({ competitionRound: false });
  assert.equal(api.STATE.competitionRoundActive, false);
  assert.equal(api.STATE.competitionSession, null);
  api.finalizeReportSession();

  api.STATE.activeMode = api.APP_MODES.CLASS;
  api.STATE.competitionConfig = api.normalizeCompetitionConfig({
    groupCount: 3,
    groups: [
      { id: 'a', name: '第一组' },
      { id: 'b', name: '第二组' },
      { id: 'c', name: '第三组' },
    ],
  });
  api.STATE.activeCompetitionGroupId = 'a';
  api.startReportSession({ competitionRound: true });
  api.STATE.sessionStartedAt = new Date(Date.now() - 12_000).toISOString();
  api.STATE.curveBuffer = [48, 76, 89, 84];
  api.STATE.energyCurveBuffer = [0, 18, 32, 45];
  api.updateCompetitionSessionMetrics(api.STATE.competitionSession, 'a', {
    currentDB: 89,
    deltaSeconds: 5,
    isAboveReadingThreshold: true,
    isReadingLoudly: true,
  });
  api.finalizeReportSession();

  assert.equal(api.STATE.activeMode, api.APP_MODES.CLASS);
  assert.equal(api.STATE.competitionLastResult.isComplete, false);
  assert.equal(api.STATE.competitionLastResult.completedCount, 1);
  assert.equal(api.STATE.competitionLastResult.winnerName, null);
  assert.equal(api.STATE.activeCompetitionGroupId, 'b');
});

runTest('finalized reports create a local forest day snapshot', () => {
  const { api } = loadMorningTree();
  const startedAt = new Date('2026-05-30T07:30:00+08:00').toISOString();
  const endedAt = new Date('2026-05-30T07:42:00+08:00').toISOString();

  assert.equal(typeof api.loadStoredForest, 'function');
  assert.equal(typeof api.getTreeSnapshotFromReport, 'function');

  api.STATE.sessionStartedAt = startedAt;
  api.STATE.curveBuffer = [46, 76, 83, 88, 79];
  api.STATE.energyCurveBuffer = [5, 30, 62, 88, 100];
  api.STATE.energy = 100;
  api.STATE.hasManifested = true;
  api.STATE.manifestedAt = endedAt;
  api.STATE.manifestedElapsedSeconds = 720;
  api.STATE.reportEffectiveReadingSeconds = 660;
  api.STATE.reportPeakEnergy = 100;
  api.STATE.rewardState = {
    waterCount: 2,
    fertilizerCount: 1,
    stableReadingSeconds: 0,
    nextWaterAt: 12,
    nextFertilizerAt: 60,
  };

  api.finalizeReportSession();

  const forest = api.loadStoredForest();
  assert.equal(forest.length, 1);
  assert.equal(forest[0].dateKey, '2026-05-30');
  assert.equal(forest[0].sessionCount, 1);
  assert.equal(forest[0].peakDb, 88);
  assert.equal(forest[0].treeStage.key, 'final');
  assert.equal(forest[0].rewards.waterCount, 2);
});

runTest('mode picker and competition controls are present while student branch controls are removed', () => {
  const html = fs.readFileSync('public/morning-energy-tree/index.html', 'utf8');

  assert.match(html, /id="mode-picker"/);
  assert.match(html, /data-mode-choice="class"/);
  assert.match(html, /data-mode-choice="competition"/);
  assert.match(html, /id="competition-panel"/);
  assert.match(html, /id="competition-group-count"/);
  assert.match(html, /id="competition-list"/);
  assert.match(html, /id="forest-trigger-btn"/);
  assert.match(html, /id="forest-modal"/);
  assert.match(html, /id="forest-body"/);
  assert.match(html, /id="forest-map-grid"/);
  assert.doesNotMatch(html, /id="participant-panel"/);
  assert.doesNotMatch(html, /学生枝干/);
});

runTest('forest modal uses a full-width map and resets scroll when opened', () => {
  const css = fs.readFileSync('public/morning-energy-tree/style.css', 'utf8');
  const { api, elements } = loadMorningTree();

  assert.match(css, /\.forest-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.forest-map-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7,\s*minmax\(96px,\s*1fr\)\)/s);
  assert.match(css, /\.forest-map-grid\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.forest-detail-empty\s*\{[^}]*min-height:\s*180px/s);
  assert.equal(typeof api.openForestModal, 'function');

  elements.get('forest-body').scrollTop = 96;
  api.openForestModal();

  assert.equal(elements.get('forest-body').scrollTop, 0);
});

runTest('competition mode copy replaces the removed student branch feature', () => {
  const html = fs.readFileSync('public/morning-energy-tree/index.html', 'utf8');
  const script = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');
  const zh = JSON.parse(fs.readFileSync('public/locales/zh-CN.json', 'utf8'));
  const en = JSON.parse(fs.readFileSync('public/locales/en.json', 'utf8'));

  assert.match(html, /data-i18n="morningTree\.mode\.title"/);
  assert.match(html, /data-i18n="morningTree\.competition\.title"/);
  assert.match(script, /APP_MODES/);
  assert.match(script, /createCompetitionSession/);
  assert.match(script, /winnerPeakDb/);
  assert.equal(zh.morningTree.mode.classTitle, '全班早读模式');
  assert.equal(zh.morningTree.competition.title, '小组竞赛');
  assert.match(zh.morningTree.competition.winnerToast, /本场冠军/);
  assert.match(en.morningTree.competition.winnerToast, /Winner/);
  assert.equal(zh.morningTree.participants, undefined);
  assert.equal(en.morningTree.participants, undefined);
});

runTest('left classroom stack uses a custom polished scrollbar', () => {
  const css = fs.readFileSync('public/morning-energy-tree/style.css', 'utf8');

  assert.match(css, /\.left-side-stack\s*\{[^}]*scrollbar-width:\s*thin/s);
  assert.match(css, /\.left-side-stack\s*\{[^}]*scrollbar-color:\s*rgba\(125,\s*249,\s*255/s);
  assert.match(css, /\.left-side-stack::-webkit-scrollbar\s*\{[^}]*width:\s*10px/s);
  assert.match(css, /\.left-side-stack::-webkit-scrollbar-thumb\s*\{[^}]*linear-gradient/s);
  assert.match(css, /\.left-side-stack::-webkit-scrollbar-thumb:hover/s);
});
