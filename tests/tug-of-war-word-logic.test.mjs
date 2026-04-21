import assert from 'node:assert/strict';

import {
  createBilingualChallengeProblem,
  createWordProblem,
  isBilingualChallengeAnswerCorrect,
  isWordAnswerCorrect,
  parseBilingualWordListText,
  parseWordListText,
} from '../components/tugOfWarWordLogic.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('parseWordListText extracts unique English words from mixed text', () => {
  const words = parseWordListText('1. apple 苹果\nbanana; APPLE\nice-cream\nA\ncat');

  assert.deepEqual(words, [
    { text: 'APPLE', weight: 1 },
    { text: 'BANANA', weight: 1 },
    { text: 'ICECREAM', weight: 1 },
    { text: 'CAT', weight: 1 },
  ]);
});

runTest('isWordAnswerCorrect ignores case and non-letter separators', () => {
  assert.equal(isWordAnswerCorrect('Ice Cream', 'ice-cream'), true);
  assert.equal(isWordAnswerCorrect('applf', 'apple'), false);
});

runTest('createWordProblem builds a clickable-letter spelling problem', () => {
  const problem = createWordProblem([{ text: 'apple', weight: 1 }], () => 0);

  assert.equal(problem.answer, 'APPLE');
  assert.equal(problem.letters.length, 5);
  assert.deepEqual([...problem.letters].sort(), ['A', 'E', 'L', 'P', 'P']);
});

runTest('parseBilingualWordListText extracts Chinese prompts with English answers', () => {
  const pairs = parseBilingualWordListText('苹果 apple\nbanana 香蕉\nice-cream 冰淇淋\napple 苹果');

  assert.deepEqual(pairs, [
    { chinese: '苹果', english: 'APPLE' },
    { chinese: '香蕉', english: 'BANANA' },
    { chinese: '冰淇淋', english: 'ICECREAM' },
  ]);
});

runTest('createBilingualChallengeProblem shows Chinese and builds clickable English letters', () => {
  const problem = createBilingualChallengeProblem({ chinese: '苹果', english: 'APPLE' }, () => 0);

  assert.equal(problem.type, 'word');
  assert.equal(problem.mode, 'challenge');
  assert.equal(problem.prompt, '苹果');
  assert.equal(problem.answer, 'APPLE');
  assert.equal(problem.letters.length, 5);
  assert.deepEqual([...problem.letters].sort(), ['A', 'E', 'L', 'P', 'P']);
});

runTest('isBilingualChallengeAnswerCorrect ignores English case and separators', () => {
  assert.equal(isBilingualChallengeAnswerCorrect('ice cream', 'ICECREAM'), true);
  assert.equal(isBilingualChallengeAnswerCorrect('ice cram', 'ICECREAM'), false);
});
