import assert from 'node:assert/strict';

import {
  createWordProblem,
  isWordAnswerCorrect,
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

  assert.deepEqual(words, ['APPLE', 'BANANA', 'ICECREAM', 'CAT']);
});

runTest('isWordAnswerCorrect ignores case and non-letter separators', () => {
  assert.equal(isWordAnswerCorrect('Ice Cream', 'ice-cream'), true);
  assert.equal(isWordAnswerCorrect('applf', 'apple'), false);
});

runTest('createWordProblem builds a clickable-letter spelling problem', () => {
  const problem = createWordProblem(['apple'], () => 0);

  assert.equal(problem.answer, 'APPLE');
  assert.equal(problem.letters.length, 5);
  assert.deepEqual([...problem.letters].sort(), ['A', 'E', 'L', 'P', 'P']);
});
