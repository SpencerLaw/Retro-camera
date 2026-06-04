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

runTest('morning energy can decrease after the tree has manifested', () => {
  const { api, elements } = loadMorningTree();
  api.STATE.isListening = true;
  api.STATE.energy = 100;
  api.STATE.currentDB = 60;
  api.STATE.hasManifested = true;
  api.STATE.isSuperMode = false;

  api.updateState();

  assert.ok(api.STATE.energy < 100);
  assert.equal(api.STATE.hasManifested, true);
  assert.notEqual(elements.get('energy-fill').style.width, '100%');
});

runTest('final energy tree holds its full form briefly after manifesting', () => {
  const { api, elements } = loadMorningTree();

  api.STATE.isListening = true;
  api.STATE.energy = 100;
  api.STATE.currentDB = 60;
  api.triggerSuperMode();
  api.updateState(1);

  assert.equal(api.STATE.energy, 100);
  assert.equal(api.STATE.hasManifested, true);
  assert.equal(elements.get('energy-fill').style.width, '100%');
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
  assert.match(script, /drawBloomingEnergyTree\(canvas\.width \/ 2, canvas\.height - 20, treeSize, lifecycleStage, renderMode\)/);
});

runTest('audio activation makes light orbs clearly correlated with decibels', () => {
  const { api } = loadMorningTree();
  const profile = api.getSensitivityProfile(50);

  assert.equal(typeof api.getAudioActivation, 'function');

  const quiet = api.getAudioActivation(62, profile, 0.2);
  const medium = api.getAudioActivation(78, profile, 1.2);
  const loud = api.getAudioActivation(92, profile, 2.5);
  const overLoud = api.getAudioActivation(104, profile, 2.5);

  assert.ok(medium.intensity > quiet.intensity);
  assert.ok(loud.intensity > medium.intensity);
  assert.ok(overLoud.intensity >= loud.intensity);
  assert.equal(overLoud.overLoud, true);
  assert.ok(loud.orbCount > quiet.orbCount);
});

runTest('stable reading earns water and fertilizer while unsafe spikes only warn', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.createSessionRewardState, 'function');
  assert.equal(typeof api.updateSessionRewards, 'function');

  const stable = api.createSessionRewardState();
  api.updateSessionRewards(stable, {
    currentDB: 82,
    deltaSeconds: 8,
    isReadingLoudly: true,
    effectiveReadingSeconds: 8,
  });
  api.updateSessionRewards(stable, {
    currentDB: 84,
    deltaSeconds: 64,
    isReadingLoudly: true,
    effectiveReadingSeconds: 72,
  });

  assert.equal(stable.waterCount, 4);
  assert.equal(stable.fertilizerCount, 3);
  assert.equal(stable.overLoudCount, 0);

  const unsafe = api.createSessionRewardState();
  api.updateSessionRewards(unsafe, {
    currentDB: 106,
    deltaSeconds: 8,
    isReadingLoudly: true,
    effectiveReadingSeconds: 8,
  });

  assert.equal(unsafe.waterCount, 0);
  assert.equal(unsafe.fertilizerCount, 0);
  assert.equal(unsafe.overLoudCount, 1);
});

runTest('water and fertilizer bonuses directly grow the top energy progress once', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getRewardEnergyBonus, 'function');
  assert.equal(typeof api.applyRewardEnergyBonus, 'function');

  const waterOnly = api.getRewardEnergyBonus(
    { waterCount: 0, fertilizerCount: 0 },
    { waterCount: 1, fertilizerCount: 0 }
  );
  assert.equal(waterOnly.totalBonus, 1);
  assert.equal(waterOnly.waterBonus, 1);
  assert.equal(waterOnly.fertilizerBonus, 0);
  assert.equal(api.applyRewardEnergyBonus(40, waterOnly), 41);

  const bothRewards = api.getRewardEnergyBonus(
    { waterCount: 0, fertilizerCount: 0 },
    { waterCount: 1, fertilizerCount: 1 }
  );
  assert.equal(bothRewards.totalBonus, 3);
  assert.equal(api.applyRewardEnergyBonus(96, bothRewards), 99);

  const multipleRewards = api.getRewardEnergyBonus(
    { waterCount: 1, fertilizerCount: 1 },
    { waterCount: 3, fertilizerCount: 2 }
  );
  assert.equal(multipleRewards.totalBonus, 4);
  assert.equal(multipleRewards.waterBonus, 2);
  assert.equal(multipleRewards.fertilizerBonus, 2);

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
  assert.match(html, /data-i18n="morningTree\.rewards\.overLoudRule"/);
  assert.equal(typeof api.getRewardProgress, 'function');
  assert.equal(typeof api.renderRewardPanel, 'function');

  const rewardState = api.createSessionRewardState();
  rewardState.stableReadingSeconds = 6;
  rewardState.overLoudCount = 2;
  const progress = api.getRewardProgress(rewardState, 12);
  assert.equal(progress.waterTargetSeconds, 8);
  assert.equal(progress.fertilizerTargetSeconds, 24);
  assert.equal(progress.waterRemainingSeconds, 2);
  assert.equal(progress.fertilizerRemainingSeconds, 12);

  api.STATE.rewardState = rewardState;
  api.STATE.reportEffectiveReadingSeconds = 12;
  api.renderRewardPanel();

  const panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /id="reward-water-count"/);
  assert.match(panelHtml, /id="reward-fertilizer-count"/);
  assert.match(panelHtml, /8s/);
  assert.match(panelHtml, /24s/);
  assert.match(panelHtml, /2/);
  assert.equal(zh.morningTree.energyLabel, '🌳 能量树成长进度');
  assert.match(zh.morningTree.rewards.liveSub, /不需要老师手动点/);
  assert.match(zh.morningTree.rewards.waterRule, /8 秒/);
  assert.match(zh.morningTree.rewards.waterRule, /最多 4 次/);
  assert.match(zh.morningTree.rewards.waterRule, /\+1%/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /24 秒/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /最多 3 次/);
  assert.match(zh.morningTree.rewards.fertilizerRule, /\+2%/);
  assert.match(zh.morningTree.rewards.overLoudRule, /不浇水、不施肥/);
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
  const overLoudHelp = api.getRewardHelpContent('overLoud');
  assert.match(waterHelp.condition, /8 秒/);
  assert.match(waterHelp.effect, /\+1%/);
  assert.match(fertilizerHelp.condition, /24 秒/);
  assert.match(fertilizerHelp.effect, /\+2%/);
  assert.match(overLoudHelp.effect, /不浇水、不施肥/);

  api.renderRewardPanel();
  let panelHtml = elements.get('reward-live-panel').innerHTML;
  assert.match(panelHtml, /button[^>]+data-reward-help="water"/);
  assert.match(panelHtml, /button[^>]+data-reward-help="fertilizer"/);
  assert.match(panelHtml, /button[^>]+data-reward-help="overLoud"/);
  assert.match(panelHtml, /reward-help-mark/);
  assert.match(panelHtml, /奖励 \+1%/);
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

  api.resetGame();
  assert.equal(api.getRewardEffectCount(), 0);
  assert.match(script, /class RewardWateringCan/);
  assert.match(script, /new RewardWateringCan/);
  assert.match(script, /class RewardWaterDrop/);
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
    overLoudCount: 0,
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
