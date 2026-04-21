import assert from 'node:assert/strict';

import {
  getParticleCount,
  getSpectacleGlyphs,
  getSpectacleIntensity,
  getTeamMomentum,
} from '../components/tugOfWarSpectacleLogic.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('team momentum follows the tug score direction', () => {
  assert.equal(getTeamMomentum('blue', -5, 10), 0.5);
  assert.equal(getTeamMomentum('red', -5, 10), 0);
  assert.equal(getTeamMomentum('red', 7, 10), 0.7);
});

runTest('fresh correct answers and streaks raise spectacle intensity', () => {
  const quiet = getSpectacleIntensity({
    team: 'blue',
    score: 0,
    winScore: 10,
    streak: 0,
    lastCorrectAt: 0,
    now: 10_000,
  });

  const active = getSpectacleIntensity({
    team: 'blue',
    score: -6,
    winScore: 10,
    streak: 5,
    lastCorrectAt: 9_500,
    now: 10_000,
  });

  assert.equal(quiet, 0);
  assert.ok(active > 0.75);
  assert.ok(active <= 1);
});

runTest('compact layouts use fewer particles than desktop layouts', () => {
  const desktop = getParticleCount(0.8, false);
  const compact = getParticleCount(0.8, true);

  assert.ok(desktop > compact);
  assert.ok(compact >= 4);
});

runTest('math and word modes get different celebratory glyphs', () => {
  assert.deepEqual(getSpectacleGlyphs('math').slice(0, 3), ['+', '-', 'x']);
  assert.deepEqual(getSpectacleGlyphs('word').slice(0, 3), ['A', 'B', 'C']);
});
