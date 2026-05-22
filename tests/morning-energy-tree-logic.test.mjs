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
      getNextEnergy: typeof getNextEnergy === 'function' ? getNextEnergy : undefined,
      getTreeSizeForEnergy: typeof getTreeSizeForEnergy === 'function' ? getTreeSizeForEnergy : undefined,
      applySensitivityToDb: typeof applySensitivityToDb === 'function' ? applySensitivityToDb : undefined,
      clampSensitivity: typeof clampSensitivity === 'function' ? clampSensitivity : undefined
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

runTest('lowest sensitivity still allows loud reading to grow the tree', () => {
  const { api } = loadMorningTree();

  assert.equal(typeof api.applySensitivityToDb, 'function');
  assert.equal(typeof api.clampSensitivity, 'function');

  const lowestSensitivity = api.clampSensitivity(0);
  const adjustedDb = api.applySensitivityToDb(75, lowestSensitivity);

  assert.equal(typeof api.getNextEnergy, 'function');
  assert.ok(adjustedDb >= 70);
  assert.ok(api.applySensitivityToDb(65, lowestSensitivity) < 70);
  assert.ok(api.applySensitivityToDb(60, 85) > api.applySensitivityToDb(60, 50));
  assert.ok(api.getNextEnergy(0, adjustedDb, api.STATE.baseGrowthRate) > 0);
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
