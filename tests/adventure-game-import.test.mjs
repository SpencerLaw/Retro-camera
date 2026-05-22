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

await runTest('adventure import accepts the exported stage JSON format', async () => {
  assert.equal(logicExists, true);
  const { normalizeAdventureDaresImport } = await import(pathToFileURL('adventure-game/adventureDaresLogic.js').href);

  const imported = normalizeAdventureDaresImport({
    stage1: ['Easy 1', 'Easy 2'],
    stage2: ['Normal 1'],
    stage3: ['Hard 1', 'Hard 2'],
  });

  assert.deepEqual(imported, {
    stage1: ['Easy 1', 'Easy 2'],
    stage2: ['Normal 1'],
    stage3: ['Hard 1', 'Hard 2'],
  });
});

await runTest('adventure import rejects files that do not contain all three stage arrays', async () => {
  const { normalizeAdventureDaresImport } = await import(pathToFileURL('adventure-game/adventureDaresLogic.js').href);

  assert.throws(
    () => normalizeAdventureDaresImport({ stage1: ['Only one stage'] }),
    /stage1, stage2, stage3/
  );
  assert.throws(
    () => normalizeAdventureDaresImport({ stage1: ['A'], stage2: ['B'], stage3: [123] }),
    /must contain text items/
  );
});

runTest('adventure editor exposes an import control next to export', () => {
  assert.match(editSource, /Upload/);
  assert.match(editSource, /handleImport/);
  assert.match(editSource, /type="file"/);
  assert.match(editSource, /accept="application\/json,\.json"/);
  assert.match(editSource, /t\('import'\)/);
});
