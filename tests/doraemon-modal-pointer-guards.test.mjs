import assert from 'node:assert/strict';

import {
  shouldStopModalMouseDown,
} from '../doraemon-monitor/utils/modalPointerGuards.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const createNode = (tagName, parentElement = null, attributes = {}) => ({
  tagName,
  parentElement,
  getAttribute(name) {
    return attributes[name] ?? null;
  },
});

runTest('shouldStopModalMouseDown keeps generic shell clicks trapped', () => {
  const shell = createNode('DIV');
  assert.equal(shouldStopModalMouseDown(shell), true);
});

runTest('shouldStopModalMouseDown lets direct form controls receive focus', () => {
  const input = createNode('INPUT');
  const textarea = createNode('TEXTAREA');
  const select = createNode('SELECT');

  assert.equal(shouldStopModalMouseDown(input), false);
  assert.equal(shouldStopModalMouseDown(textarea), false);
  assert.equal(shouldStopModalMouseDown(select), false);
});

runTest('shouldStopModalMouseDown also allows clicks inside labels tied to inputs', () => {
  const label = createNode('LABEL');
  const span = createNode('SPAN', label);

  assert.equal(shouldStopModalMouseDown(span), false);
});

runTest('shouldStopModalMouseDown allows contenteditable descendants', () => {
  const editor = createNode('DIV', null, { contenteditable: 'true' });
  const child = createNode('SPAN', editor);

  assert.equal(shouldStopModalMouseDown(child), false);
});
