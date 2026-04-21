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

runTest('word mode rule selector explains both English-only game rules', () => {
  assert.match(source, /英文单词玩法说明/);
  assert.match(source, /拼词拔河：/);
  assert.match(source, /导入英文单词/);
  assert.match(source, /中英挑战：/);
  assert.match(source, /只显示中文/);
  assert.match(source, /只针对英文单词模式/);
});

runTest('frozen state renders a reusable square cover with Chinese frozen text', () => {
  assert.match(source, /const FrozenSquareOverlay/);
  assert.match(source, /aspect-square/);
  assert.match(source, /冰冻中！！/);
  assert.doesNotMatch(source, /FROZEN!/);
});

runTest('power up usage is explained next to the game controls', () => {
  assert.match(source, /getPowerUpTeacherDescription/);
  assert.match(source, /{getPowerUpTeacherDescription\(p\)}/);
  assert.match(source, /老师道具说明/);
  assert.match(source, /数学 \/ 英文通用/);
  assert.match(source, /道具使用方法/);
  assert.match(source, /连续答对/);
  assert.match(source, /点击道具/);
  assert.match(source, /冰冻：/);
  assert.match(source, /双倍：/);
  assert.match(source, /护盾：/);
});
