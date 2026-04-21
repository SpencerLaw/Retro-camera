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
  assert.match(source, /英文单词怎么玩/);
  assert.match(source, /拼词拔河：/);
  assert.match(source, /导入英文单词/);
  assert.match(source, /中英挑战：/);
  assert.match(source, /只显示中文/);
  assert.match(source, /挑战做几题/);
  assert.match(source, /做完这个数量就赢，不看拉绳子的分数/);
  assert.match(source, /只针对英文单词模式/);
  assert.doesNotMatch(source, /Game Rule/);
  assert.doesNotMatch(source, /Target Words/);
});

runTest('tug win score uses plain words and is hidden for English challenge mode', () => {
  assert.match(source, /拉到几格获胜/);
  assert.match(source, /数字越大，比赛越久/);
  assert.match(source, /settings\.subjectMode !== 'word' \|\| settings\.gameRule !== 'speedrun'/);
  assert.doesNotMatch(source, /t\('tugOfWar\.winCondition'\)/);
});

runTest('challenge progress labels are not rotated upside down', () => {
  assert.match(source, /蓝队进度/);
  assert.match(source, /红队进度/);
  assert.doesNotMatch(source, /蓝队进度[\s\S]{0,220}rotate-180/);
  assert.doesNotMatch(source, /rotate-180[\s\S]{0,220}蓝队进度/);
});

runTest('math settings explain modes in plain classroom words', () => {
  assert.match(source, /数学怎么玩/);
  assert.match(source, /经典计算/);
  assert.match(source, /直接算答案/);
  assert.match(source, /凑数达人/);
  assert.match(source, /凑出目标数字/);
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
  assert.match(source, /怎么获得、怎么使用/);
  assert.match(source, /连续答对/);
  assert.match(source, /点击道具/);
  assert.doesNotMatch(source, /老师道具说明/);
  assert.doesNotMatch(source, /数学 \/ 英文通用/);
  assert.doesNotMatch(source, /冰冻：/);
  assert.doesNotMatch(source, /双倍：/);
  assert.doesNotMatch(source, /护盾：/);
});
