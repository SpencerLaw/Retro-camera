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

runTest('memory race mode uses bilingual import with Chinese prompts and letter clicks', () => {
  assert.match(source, /parseBilingualWordListText/);
  assert.match(source, /challengePairs/);
  assert.match(source, /createBilingualChallengeProblem/);
  assert.match(source, /mode\?: 'spelling' \| 'challenge'/);
  assert.doesNotMatch(source, /answerLanguage/);
});

runTest('word mode rule selector explains spelling tug and memory race in plain words', () => {
  assert.match(source, /英文单词玩法说明/);
  assert.match(source, /英文单词怎么玩/);
  assert.match(source, /拼词拔河：/);
  assert.match(source, /导入英文或中英词表/);
  assert.match(source, /记忆竞速：/);
  assert.match(source, /先闪现中文和英文/);
  assert.match(source, /挑战做几题/);
  assert.match(source, /做完这个数量就赢，不看拉绳子的分数/);
  assert.match(source, /只针对英文单词模式/);
  assert.doesNotMatch(source, /中英挑战/);
  assert.doesNotMatch(source, /Game Rule/);
  assert.doesNotMatch(source, /Target Words/);
});

runTest('word problems share Chinese hints and apply the teacher selected helper mode across both modes', () => {
  assert.match(source, /type WordPlayMode = 'shuffle' \| 'flash' \| 'cloze' \| 'edge_hint'/);
  assert.match(source, /wordPlayMode\?: WordPlayMode/);
  assert.match(source, /本局单词玩法/);
  assert.match(source, /普通拼词/);
  assert.match(source, /闪现记忆/);
  assert.match(source, /长词完形/);
  assert.match(source, /首尾提示/);
  assert.match(source, /isWordPreviewActive/);
  assert.match(source, /prepareWordProblem/);
  assert.match(source, /if \(!problem\.previewMs\) return problem/);
  assert.match(source, /buildWordAnswerAttempt/);
  assert.match(source, /fixedLetterIndices/);
  assert.match(source, /记住英文/);
  assert.match(source, /2 秒后开始拼/);
  assert.match(source, /wordPlayMode: settings\.wordPlayMode \|\| 'shuffle'/);
  assert.match(source, /nextWordFromPool\(blueWordPoolRef\.current, wordBank, challengePairs, wordProblemOptions\)/);
  assert.match(source, /nextWordFromPool\(redWordPoolRef\.current, wordBank, challengePairs, wordProblemOptions\)/);
});

runTest('flash memory hides the Chinese prompt after the preview ends', () => {
  assert.match(source, /const shouldHidePromptAfterFlash = problem\.wordPlayMode === 'flash' && !previewActive/);
  assert.match(source, /const showPromptPanel = Boolean\(problem\.prompt\) && !shouldHidePromptAfterFlash/);
  assert.match(source, /shouldHidePromptAfterFlash \? '闪现记忆 · 拼英文' : problem\.prompt \? '看中文 · 拼英文' : t\('tugOfWar\.spellPrompt'\)/);
  assert.match(source, /\{showPromptPanel && \(/);
  assert.doesNotMatch(source, /\{problem\.prompt && \(/);
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

runTest('winner dialog shows readable elapsed time', () => {
  assert.match(source, /const formatElapsedTime = /);
  assert.match(source, /Math\.floor\(seconds \/ 60\)/);
  assert.match(source, /return `\$\{minutes\}分\$\{remainingSeconds\}秒`/);
  assert.match(source, /耗时：\{formatElapsedTime\(timeElapsed\)\}/);
  assert.doesNotMatch(source, /耗时: \{timeElapsed\} 秒/);
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
