import assert from 'node:assert/strict';
import fs from 'node:fs';

const emotionModulePath = 'doraemon-monitor/modernEmotionState.ts';

// Given: the modern monitor needs one shared, testable traffic-light state model.
assert.equal(
  fs.existsSync(emotionModulePath),
  true,
  'modernEmotionState.ts must define the shared visual-state mapping'
);

const { getModernEmotionTone } = await import('../doraemon-monitor/modernEmotionState.ts');

const cases = [
  { currentDb: 49, limit: 60, monitorState: 'calm', expected: 'calm' },
  { currentDb: 50, limit: 60, monitorState: 'calm', expected: 'caution' },
  { currentDb: 59.9, limit: 60, monitorState: 'calm', expected: 'caution' },
  { currentDb: 60, limit: 60, monitorState: 'calm', expected: 'danger' },
  { currentDb: 40, limit: 60, monitorState: 'alarm', expected: 'danger' }
];

for (const testCase of cases) {
  // When: the existing dB reading, threshold, and monitor state are mapped to UI only.
  const actual = getModernEmotionTone(testCase);

  // Then: green, orange, and red boundaries remain deterministic.
  assert.equal(
    actual,
    testCase.expected,
    `${testCase.currentDb} dB at a ${testCase.limit} dB limit should be ${testCase.expected}`
  );
}

console.log('PASS modern Doraemon emotion state follows calm, caution, and danger boundaries');
