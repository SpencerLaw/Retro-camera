import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexSource = fs.readFileSync('index.html', 'utf8');
const scaleCssPath = 'public/global-scale.css';
const scaleCssSource = fs.existsSync(scaleCssPath) ? fs.readFileSync(scaleCssPath, 'utf8') : '';
const scaledHtmlFiles = [
  'index.html',
  'public/homework-crush/index.html',
  'public/magic-roll-call/index.html',
  'public/morning-energy-tree/index.html',
  'public/console-admin-8x92lz.html',
];

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('global scale stylesheet renders every deployed page at 80 percent', () => {
  assert.equal(fs.existsSync(scaleCssPath), true);
  assert.match(scaleCssSource, /--app-global-scale:\s*0\.8/);
  assert.match(scaleCssSource, /body/);
  assert.match(scaleCssSource, /width:\s*calc\(100vw \/ var\(--app-global-scale\)\)/);
  assert.match(scaleCssSource, /min-height:\s*calc\(100vh \/ var\(--app-global-scale\)\)/);
  assert.match(scaleCssSource, /left:\s*calc\(\(100vw - \(100vw \/ var\(--app-global-scale\)\)\) \/ 2\)/);
  assert.match(scaleCssSource, /transform:\s*scale\(var\(--app-global-scale\)\)/);
  assert.match(scaleCssSource, /transform-origin:\s*top center/);
  assert.match(scaleCssSource, /overflow-x:\s*hidden/);
  assert.doesNotMatch(scaleCssSource, /zoom:\s*var\(--app-global-scale\)/);
  assert.doesNotMatch(scaleCssSource, /width:\s*calc\(100% \/ var\(--app-global-scale\)\)/);
  assert.doesNotMatch(indexSource, /#root\s*\{[\s\S]*zoom:\s*var\(--app-global-scale\)/);
});

runTest('all directly deployed html pages load the global scale stylesheet', () => {
  for (const file of scaledHtmlFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /href="\/global-scale\.css"/, `${file} should load /global-scale.css`);
  }
});
