import assert from 'node:assert/strict';

import {
  buildWordAnswerAttempt,
  calculateFlashPreviewMs,
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

runTest('parseWordListText preserves teacher English display from mixed text', () => {
  const words = parseWordListText("1. apple 苹果\nbanana; Thailand\nIce-Cream\nO'Neill\nA\ncat");

  assert.deepEqual(words, [
    { text: 'apple', weight: 1 },
    { text: 'banana', weight: 1 },
    { text: 'Thailand', weight: 1 },
    { text: 'Ice-Cream', weight: 1 },
    { text: "O'Neill", weight: 1 },
    { text: 'cat', weight: 1 },
  ]);
});

runTest('isWordAnswerCorrect requires exact English capitalization but ignores separators', () => {
  assert.equal(isWordAnswerCorrect('ice cream', 'ice-cream'), true);
  assert.equal(isWordAnswerCorrect('thailand', 'Thailand'), false);
  assert.equal(isWordAnswerCorrect('Thailand', 'Thailand'), true);
  assert.equal(isWordAnswerCorrect('applf', 'apple'), false);
});

runTest('createWordProblem builds a clickable-letter spelling problem', () => {
  const problem = createWordProblem([{ text: 'apple', weight: 1 }], () => 0);

  assert.equal(problem.answer, 'apple');
  assert.deepEqual(problem.fixedLetterIndices, []);
  assert.equal(problem.previewMs, 0);
  assert.equal(problem.letters.length, 5);
  assert.deepEqual([...problem.letters].sort(), ['a', 'e', 'l', 'p', 'p']);
});

runTest('parseBilingualWordListText extracts Chinese prompts with original English display', () => {
  const pairs = parseBilingualWordListText("苹果 apple\nThailand 泰国\nIce-Cream 冰淇淋\nO'Neill 人名\napple 苹果");

  assert.deepEqual(pairs, [
    { chinese: '苹果', english: 'apple' },
    { chinese: '泰国', english: 'Thailand' },
    { chinese: '冰淇淋', english: 'Ice-Cream' },
    { chinese: '人名', english: "O'Neill" },
  ]);
});

runTest('createBilingualChallengeProblem shows Chinese and builds case-sensitive clickable English letters', () => {
  const problem = createBilingualChallengeProblem({ chinese: '泰国', english: 'Thailand' }, () => 0);

  assert.equal(problem.type, 'word');
  assert.equal(problem.mode, 'challenge');
  assert.equal(problem.prompt, '泰国');
  assert.equal(problem.answer, 'Thailand');
  assert.equal(problem.displayAnswer, 'Thailand');
  assert.deepEqual(problem.fixedLetterIndices, []);
  assert.equal(problem.previewMs, 0);
  assert.equal(problem.letters.length, 8);
  assert.deepEqual([...problem.letters].sort(), ['T', 'a', 'd', 'h', 'i', 'l', 'n', 'a'].sort());
});

runTest('isBilingualChallengeAnswerCorrect requires exact English capitalization', () => {
  assert.equal(isBilingualChallengeAnswerCorrect('IceCream', 'Ice-Cream'), true);
  assert.equal(isBilingualChallengeAnswerCorrect('icecream', 'Ice-Cream'), false);
  assert.equal(isBilingualChallengeAnswerCorrect('ice cram', 'Ice-Cream'), false);
});

runTest('word problems display teacher spelling while keyboard uses clickable letters', () => {
  const spellingProblem = createWordProblem([{ text: 'Ice-Cream', weight: 1 }], () => 0);
  assert.equal(spellingProblem.answer, 'IceCream');
  assert.equal(spellingProblem.displayAnswer, 'Ice-Cream');
  assert.deepEqual([...spellingProblem.letters].sort(), ['C', 'I', 'a', 'c', 'e', 'e', 'm', 'r']);

  const challengeProblem = createBilingualChallengeProblem({ chinese: '人名', english: "O'Neill" }, () => 0);
  assert.equal(challengeProblem.answer, 'ONeill');
  assert.equal(challengeProblem.displayAnswer, "O'Neill");
  assert.deepEqual([...challengeProblem.letters].sort(), ['N', 'O', 'e', 'i', 'l', 'l']);
});

runTest('spelling problems reuse bilingual Chinese prompts without forcing a helper mode', () => {
  const problem = createWordProblem(
    [{ text: 'pear', weight: 1 }],
    () => 0,
    [{ chinese: '梨', english: 'pear' }],
  );

  assert.equal(problem.prompt, '梨');
  assert.equal(problem.previewMs, 0);
  assert.deepEqual(problem.fixedLetterIndices, []);
  assert.equal(problem.isCloze, false);
  assert.deepEqual([...problem.letters].sort(), ['a', 'e', 'p', 'r']);
});

runTest('listening mode hides Chinese prompts and mixes distractor letters into the keyboard', () => {
  const problem = createWordProblem(
    [{ text: 'Thai', weight: 1 }],
    () => 0,
    [{ chinese: '泰国', english: 'Thai' }],
    { wordPlayMode: 'listening' },
  );

  assert.equal(problem.mode, 'spelling');
  assert.equal(problem.prompt, '');
  assert.equal(problem.wordPlayMode, 'listening');
  assert.equal(problem.answer, 'Thai');
  assert.equal(problem.displayAnswer, 'Thai');
  assert.equal(problem.fixedLetterIndices.length, 0);
  assert.equal(problem.previewMs, 0);
  assert.equal(problem.letters.length, 7);
  for (const letter of ['T', 'h', 'a', 'i']) {
    assert.ok(problem.letters.includes(letter));
  }
  assert.ok(problem.letters.some(letter => !['T', 'h', 'a', 'i'].includes(letter)));
  assert.equal(problem.letters.includes('t'), false);
});

runTest('flash memory mode previews the whole word but still asks for all letters', () => {
  const problem = createBilingualChallengeProblem(
    { chinese: '香蕉', english: 'banana' },
    () => 0,
    { wordPlayMode: 'flash' },
  );

  assert.equal(problem.previewMs, 800);
  assert.deepEqual(problem.fixedLetterIndices, []);
  assert.equal(problem.isCloze, false);
  assert.deepEqual([...problem.letters].sort(), ['a', 'a', 'a', 'b', 'n', 'n']);
});

runTest('flash memory preview time is dynamic by word length and can be overridden by teacher', () => {
  assert.equal(calculateFlashPreviewMs('pear'), 500);
  assert.equal(calculateFlashPreviewMs('banana'), 800);
  assert.equal(calculateFlashPreviewMs('pineapple'), 1200);
  assert.equal(calculateFlashPreviewMs('strawberry'), 1500);

  const problem = createBilingualChallengeProblem(
    { chinese: '苹果', english: 'apple' },
    () => 0,
    { wordPlayMode: 'flash', flashPreviewMs: 1000 },
  );

  assert.equal(problem.previewMs, 1000);
});

runTest('edge hint mode only fixes the first and last letters', () => {
  const problem = createWordProblem(
    [{ text: 'strawberry', weight: 1 }],
    () => 0,
    [],
    { wordPlayMode: 'edge_hint' },
  );

  assert.deepEqual(problem.fixedLetterIndices, [0, 9]);
  assert.equal(problem.previewMs, 0);
  assert.equal(problem.isCloze, false);
  assert.equal(problem.letters.length, 8);
});

runTest('cloze mode automatically downgrades long words with only missing letters and two distractors', () => {
  const problem = createBilingualChallengeProblem(
    { chinese: '大象', english: 'elephant' },
    () => 0,
    { wordPlayMode: 'cloze' },
  );
  const fixed = new Set(problem.fixedLetterIndices);
  const missingLetters = problem.answer.split('').filter((_, index) => !fixed.has(index));

  assert.equal(problem.mode, 'challenge');
  assert.equal(problem.prompt, '大象');
  assert.equal(problem.previewMs, 0);
  assert.equal(problem.isCloze, true);
  assert.equal(fixed.has(0), true);
  assert.equal(fixed.has(problem.answer.length - 1), true);
  assert.ok(problem.fixedLetterIndices.length > 2);
  assert.equal(problem.letters.length, missingLetters.length + 2);
  for (const letter of missingLetters) {
    assert.ok(problem.letters.includes(letter));
  }
});

runTest('cloze mode leaves short words as normal shuffled spelling', () => {
  const problem = createWordProblem(
    [{ text: 'pear', weight: 1 }],
    () => 0,
    [],
    { wordPlayMode: 'cloze' },
  );

  assert.deepEqual(problem.fixedLetterIndices, []);
  assert.equal(problem.isCloze, false);
  assert.deepEqual([...problem.letters].sort(), ['a', 'e', 'p', 'r']);
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

runTest('buildWordAnswerAttempt keeps fixed capital letters from proper nouns', () => {
  const problem = {
    type: 'word',
    answer: 'Thailand',
    letters: [],
    fixedLetterIndices: [0, 7],
  };

  assert.equal(buildWordAnswerAttempt(problem, 'hailan'), 'Thailand');
  assert.equal(buildWordAnswerAttempt(problem, 'Hailan'), 'THailand');
});

runTest('cloze distractors avoid lowercase duplicates of imported capital letters', () => {
  const problem = createBilingualChallengeProblem(
    { chinese: '泰国', english: 'Thailand' },
    () => 0,
    { wordPlayMode: 'cloze' },
  );

  assert.equal(problem.answer, 'Thailand');
  assert.equal(problem.displayAnswer, 'Thailand');
  assert.equal(problem.letters.includes('t'), false);
});
