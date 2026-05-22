import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const editSource = fs.readFileSync('adventure-game/AdventureGameEdit.tsx', 'utf8');
const logicExists = fs.existsSync('adventure-game/adventureDaresLogic.js');

function runTest(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => console.log(`PASS ${name}`));
    }
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await runTest('adventure import accepts only the editor exported JSON package', async () => {
  assert.equal(logicExists, true);
  const { createAdventureDaresExport, normalizeAdventureDaresImport } = await import(pathToFileURL('adventure-game/adventureDaresLogic.js').href);

  const exported = createAdventureDaresExport({
    stage1: ['Easy 1', 'Easy 2'],
    stage2: ['Normal 1'],
    stage3: ['Hard 1', 'Hard 2'],
  }, 'zh');

  assert.equal(exported.app, 'anypok-adventure-dares');
  assert.equal(exported.version, 1);
  assert.equal(exported.language, 'zh');

  const imported = normalizeAdventureDaresImport(exported);

  assert.deepEqual(imported, {
    stage1: ['Easy 1', 'Easy 2'],
    stage2: ['Normal 1'],
    stage3: ['Hard 1', 'Hard 2'],
  });
});

await runTest('adventure import rejects files not exported by this editor', async () => {
  const { normalizeAdventureDaresImport } = await import(pathToFileURL('adventure-game/adventureDaresLogic.js').href);

  assert.throws(
    () => normalizeAdventureDaresImport({
      stage1: ['Easy'],
      stage2: ['Normal'],
      stage3: ['Hard'],
    }),
    /exported from this editor/
  );
  assert.throws(
    () => normalizeAdventureDaresImport({ app: 'anypok-adventure-dares', dares: { stage1: ['Only one stage'] } }),
    /stage1, stage2, stage3/
  );
  assert.throws(
    () => normalizeAdventureDaresImport({ app: 'anypok-adventure-dares', dares: { stage1: ['A'], stage2: ['B'], stage3: [123] } }),
    /must contain text items/
  );
});

runTest('adventure editor exposes an import control next to export', () => {
  assert.match(editSource, /Upload/);
  assert.match(editSource, /handleImport/);
  assert.match(editSource, /handleImportClick/);
  assert.match(editSource, /type="file"/);
  assert.match(editSource, /accept="application\/json,\.json"/);
  assert.match(editSource, /t\('import'\)/);
  assert.match(editSource, /t\('importHint'\)/);
});

runTest('adventure editor shows the import guide dialog only before the first import', () => {
  assert.match(editSource, /adventure_import_guide_confirmed/);
  assert.match(editSource, /showImportGuide/);
  assert.match(editSource, /t\('importGuideTitle'\)/);
  assert.match(editSource, /t\('importGuideBody'\)/);
  assert.match(editSource, /t\('importGuideConfirm'\)/);
  assert.match(editSource, /t\('importGuideCancel'\)/);
  assert.match(editSource, /fileInputRef\.current\?\.click\(\)/);
});
