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
