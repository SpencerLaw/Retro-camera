import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('components/TugOfWarApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('challenge mode uses bilingual import with Chinese prompts and letter clicks', () => {
  assert.match(source, /parseBilingualWordListText/);
  assert.match(source, /challengePairs/);
  assert.match(source, /createBilingualChallengeProblem/);
  assert.match(source, /mode\?: 'spelling' \| 'challenge'/);
  assert.doesNotMatch(source, /answerLanguage/);
});

runTest('frozen state renders a reusable square cover with Chinese frozen text', () => {
  assert.match(source, /const FrozenSquareOverlay/);
  assert.match(source, /aspect-square/);
  assert.match(source, /冰冻中！！/);
  assert.doesNotMatch(source, /FROZEN!/);
});

runTest('power up usage is explained next to the game controls', () => {
  assert.match(source, /老师道具说明/);
  assert.match(source, /道具使用方法/);
  assert.match(source, /连续答对/);
  assert.match(source, /点击道具/);
  assert.match(source, /冰冻：/);
  assert.match(source, /双倍：/);
  assert.match(source, /护盾：/);
});
