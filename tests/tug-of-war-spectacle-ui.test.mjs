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

runTest('tug-of-war renders a reusable spectacle layer for both teams', () => {
  assert.match(source, /const TeamSpectacleLayer = /);
  assert.match(source, /<TeamSpectacleLayer[\s\S]*team="blue"/);
  assert.match(source, /<TeamSpectacleLayer[\s\S]*team="red"/);
});

runTest('team play area stacks on compact screens and splits on desktop', () => {
  assert.match(source, /grid-cols-1 md:grid-cols-2/);
});

runTest('correct answers trigger a small team-side confetti burst', () => {
  assert.match(source, /const fireTeamConfetti = /);
  assert.match(source, /fireTeamConfetti\(team, settings\.subjectMode, currentStreak\)/);
});

runTest('match victory uses a much bigger celebration effect', () => {
  assert.match(source, /const fireVictoryCelebration = /);
  assert.match(source, /duration = 2600/);
  assert.match(source, /setInterval/);
  assert.match(source, /particleCount: 70/);
  assert.match(source, /particleCount: 42/);
  assert.match(source, /fireVictoryCelebration\(winner, settings\.subjectMode\)/);
});

runTest('english word battles show responsive encouragement bubbles for leaders and trailing teams', () => {
  assert.match(source, /const getWordEncouragement = /);
  assert.match(source, /You're awesome!/);
  assert.match(source, /Almost there!/);
  assert.match(source, /Keep going!/);
  assert.match(source, /You can do it!/);
  assert.match(source, /快到了/);
  assert.match(source, /别放弃/);
  assert.match(source, /subjectMode === 'word'/);
  assert.match(source, /encouragement\?\.tone === 'leader'/);
  assert.match(source, /encouragement\?\.tone === 'trailing'/);
});

runTest('word correct-answer burst uses praise words instead of ABCD glyphs', () => {
  assert.match(source, /const getCorrectBurstLabels = /);
  assert.match(source, /Good!/);
  assert.match(source, /Great!/);
  assert.match(source, /Nice!/);
  assert.match(source, /Super!/);
  assert.match(source, /getCorrectBurstLabels\(subjectMode\)/);
  assert.doesNotMatch(source, /glyphs\.slice\(0, 4\)\.map/);
});

runTest('correct-answer burst stays inside each team panel when scaled', () => {
  assert.match(source, /burstSideClass/);
  assert.match(source, /team === 'blue' \? 'left-4 md:left-10' : 'right-4 md:right-10'/);
  assert.match(source, /max-w-\[min\(78%,340px\)\]/);
  assert.match(source, /flex-wrap/);
  assert.match(source, /break-words/);
  assert.doesNotMatch(source, /style=\{\{ left: burstX \}\}/);
});

runTest('speed challenge keeps encouragement but removes tugging background clutter', () => {
  assert.match(source, /isTugRule/);
  assert.match(source, /settings\.gameRule !== 'speedrun'/);
  assert.match(source, /isTugRule && \(/);
  assert.match(source, /isTugRule && streak >= 2/);
  assert.match(source, /isTugRule && Array\.from/);
});
