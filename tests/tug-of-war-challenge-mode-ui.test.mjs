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
  assert.match(source, /flashPreviewMs\?: number/);
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
  assert.match(source, /getPreviewDurationLabel\(problem\.previewMs\)/);
  assert.match(source, /flashPreviewMs: settings\.flashPreviewMs \|\| undefined/);
  assert.match(source, /wordPlayMode: settings\.wordPlayMode \|\| 'shuffle'/);
  assert.match(source, /nextWordFromPool\(blueWordPoolRef\.current, wordBank, challengePairs, wordProblemOptions\)/);
  assert.match(source, /nextWordFromPool\(redWordPoolRef\.current, wordBank, challengePairs, wordProblemOptions\)/);
  assert.doesNotMatch(source, /2 秒后开始拼/);
});

runTest('flash memory duration is configurable with smart default', () => {
  assert.match(source, /闪现时间/);
  assert.match(source, /自动：短词更快，长词稍久/);
  assert.match(source, /value=\{settings\.flashPreviewMs \? 'custom' : 'smart'\}/);
  assert.match(source, /<option value="smart">智能<\/option>/);
  assert.match(source, /<option value="custom">自定义<\/option>/);
  assert.match(source, /type="number"/);
  assert.match(source, /step="0\.1"/);
  assert.match(source, /min="0\.1"/);
  assert.match(source, /max="3"/);
  assert.match(source, /flashPreviewMs: Math\.round\(clampedSeconds \* 1000\)/);
  assert.match(source, /可输入 0\.1 到 3 秒/);
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

runTest('match results can be opened from the winner dialog and viewed by total or team', () => {
  assert.match(source, /const getMatchSummary = \(record: MatchRecord\)/);
  assert.match(source, /const getWordMatchHistory = \(records: MatchRecord\[\]\)/);
  assert.match(source, /const getWordStatReviewLabel = \(stats: TeamStats\)/);
  assert.match(source, /const openMatchHistory = \(matchId\?: string\)/);
  assert.match(source, /setSelectedMatchId\(newRecord\.id\)/);
  assert.match(source, /查看成绩总结/);
  assert.match(source, /openMatchHistory\(selectedMatchId \|\| wordMatchHistory\[0\]\?\.id\)/);
  assert.match(source, /英语成绩总结/);
  assert.match(source, /全班/);
  assert.match(source, /蓝队/);
  assert.match(source, /红队/);
  assert.match(source, /答错/);
  assert.match(source, /需要复习/);
  assert.match(source, /单词掌握情况/);
  assert.match(source, /historyViewMode === 'total'/);
  assert.match(source, /historyViewMode === 'blue'/);
  assert.match(source, /historyViewMode === 'red'/);
  assert.match(source, /if \(settings\.subjectMode === 'word'\) \{/);
  assert.match(source, /const wordMatchHistory = getWordMatchHistory\(matchHistory\)/);
  assert.doesNotMatch(source, /合并总计看/);
  assert.doesNotMatch(source, /红蓝分开看/);
  assert.doesNotMatch(source, /全局比赛数据面板/);
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
