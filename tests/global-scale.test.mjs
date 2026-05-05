import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexSource = fs.readFileSync('index.html', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('app root renders at an 80 percent global zoom with layout compensation', () => {
  assert.match(indexSource, /--app-global-scale:\s*0\.8/);
  assert.match(indexSource, /zoom:\s*var\(--app-global-scale\)/);
  assert.match(indexSource, /width:\s*calc\(100% \/ var\(--app-global-scale\)\)/);
  assert.match(indexSource, /min-height:\s*calc\(100vh \/ var\(--app-global-scale\)\)/);
  assert.match(indexSource, /transform:\s*scale\(var\(--app-global-scale\)\)/);
});
