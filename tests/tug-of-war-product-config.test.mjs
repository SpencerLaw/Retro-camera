import assert from 'node:assert/strict';

import {
  getTugOfWarProductConfig,
} from '../components/tugOfWarProductConfig.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('word tug-of-war uses its own YW license prefix and product name', () => {
  const config = getTugOfWarProductConfig('word');

  assert.equal(config.licensePrefix, 'YW');
  assert.equal(config.title, '英语单词拔河');
  assert.equal(config.storagePrefix, 'yw');
});

runTest('math tug-of-war uses the SX license prefix', () => {
  const config = getTugOfWarProductConfig('math');

  assert.equal(config.licensePrefix, 'SX');
  assert.equal(config.title, '数学拔河');
  assert.equal(config.storagePrefix, 'sx');
});
