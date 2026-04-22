import assert from 'node:assert/strict';

import {
  buildWordAnswerAttempt,
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
    { text: 'apple', weight: 1 },
    { text: 'banana', weight: 1 },
    { text: 'icecream', weight: 1 },
    { text: 'cat', weight: 1 },
  ]);
});

runTest('isWordAnswerCorrect ignores case and non-letter separators', () => {
  assert.equal(isWordAnswerCorrect('Ice Cream', 'ice-cream'), true);
  assert.equal(isWordAnswerCorrect('applf', 'apple'), false);
});

runTest('createWordProblem builds a clickable-letter spelling problem', () => {
  const problem = createWordProblem([{ text: 'apple', weight: 1 }], () => 0);

  assert.equal(problem.answer, 'apple');
  assert.deepEqual(problem.fixedLetterIndices, [0, 4]);
  assert.equal(problem.letters.length, 3);
  assert.deepEqual([...problem.letters].sort(), ['l', 'p', 'p']);
});

runTest('parseBilingualWordListText extracts Chinese prompts with English answers', () => {
  const pairs = parseBilingualWordListText('苹果 apple\nbanana 香蕉\nice-cream 冰淇淋\napple 苹果');

  assert.deepEqual(pairs, [
    { chinese: '苹果', english: 'apple' },
    { chinese: '香蕉', english: 'banana' },
    { chinese: '冰淇淋', english: 'icecream' },
  ]);
});

runTest('createBilingualChallengeProblem shows Chinese and builds clickable English letters', () => {
  const problem = createBilingualChallengeProblem({ chinese: '苹果', english: 'APPLE' }, () => 0);

  assert.equal(problem.type, 'word');
  assert.equal(problem.mode, 'challenge');
  assert.equal(problem.prompt, '苹果');
  assert.equal(problem.answer, 'apple');
  assert.deepEqual(problem.fixedLetterIndices, [0, 4]);
  assert.equal(problem.letters.length, 3);
  assert.deepEqual([...problem.letters].sort(), ['l', 'p', 'p']);
});

runTest('isBilingualChallengeAnswerCorrect ignores English case and separators', () => {
  assert.equal(isBilingualChallengeAnswerCorrect('ice cream', 'ICECREAM'), true);
  assert.equal(isBilingualChallengeAnswerCorrect('ice cram', 'ICECREAM'), false);
});

runTest('spelling problems reuse bilingual Chinese prompts and flash memory metadata', () => {
  const problem = createWordProblem(
    [{ text: 'pear', weight: 1 }],
    () => 0,
    [{ chinese: '梨', english: 'pear' }],
  );

  assert.equal(problem.prompt, '梨');
  assert.equal(problem.previewMs, 2000);
  assert.deepEqual(problem.fixedLetterIndices, [0, 3]);
  assert.equal(problem.isCloze, false);
  assert.deepEqual([...problem.letters].sort(), ['a', 'e']);
});

runTest('long word problems automatically become cloze with only missing letters and two distractors', () => {
  const problem = createBilingualChallengeProblem({ chinese: '大象', english: 'elephant' }, () => 0);
  const fixed = new Set(problem.fixedLetterIndices);
  const missingLetters = problem.answer.split('').filter((_, index) => !fixed.has(index));

  assert.equal(problem.mode, 'challenge');
  assert.equal(problem.prompt, '大象');
  assert.equal(problem.previewMs, 2000);
  assert.equal(problem.isCloze, true);
  assert.equal(fixed.has(0), true);
  assert.equal(fixed.has(problem.answer.length - 1), true);
  assert.ok(problem.fixedLetterIndices.length > 2);
  assert.equal(problem.letters.length, missingLetters.length + 2);
  for (const letter of missingLetters) {
    assert.ok(problem.letters.includes(letter));
  }
});

runTest('buildWordAnswerAttempt merges fixed slot hints with clicked letters', () => {
  const problem = {
    type: 'word',
    answer: 'elephant',
    letters: [],
    fixedLetterIndices: [0, 2, 3, 5, 6, 7],
  };

  assert.equal(buildWordAnswerAttempt(problem, 'lh'), 'elephant');
  assert.equal(buildWordAnswerAttempt(problem, 'lz'), 'elepzant');
});
