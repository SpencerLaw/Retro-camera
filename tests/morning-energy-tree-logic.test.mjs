import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name) => {
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
      finalizeReportSession: typeof finalizeReportSession === 'function' ? finalizeReportSession : undefined,
      loadStoredReports: typeof loadStoredReports === 'function' ? loadStoredReports : undefined,
      renderReportFocus: typeof renderReportFocus === 'function' ? renderReportFocus : undefined,
      getNextEnergy: typeof getNextEnergy === 'function' ? getNextEnergy : undefined,
      getTreeSizeForEnergy: typeof getTreeSizeForEnergy === 'function' ? getTreeSizeForEnergy : undefined,
      applySensitivityToDb: typeof applySensitivityToDb === 'function' ? applySensitivityToDb : undefined,
      clampSensitivity: typeof clampSensitivity === 'function' ? clampSensitivity : undefined,
      getSensitivityProfile: typeof getSensitivityProfile === 'function' ? getSensitivityProfile : undefined
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

runTest('morning tree size returns to sapling range at low energy', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.getTreeSizeForEnergy, 'function');
  assert.ok(api.getTreeSizeForEnergy(0) <= 60);
  assert.ok(api.getTreeSizeForEnergy(50) > api.getTreeSizeForEnergy(0));
  assert.equal(api.getTreeSizeForEnergy(100), 240);
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
