import assert from 'node:assert/strict';

import {
  WARNING_RESET_PASSWORD_STORAGE_KEY,
  createWarningResetPasswordRecord,
  hashWarningResetPassword,
  normalizeWarningResetPassword,
  parseWarningResetPasswordRecord,
  shouldRequireWarningResetPassword,
  validateWarningResetPasswordChange,
  validateWarningResetPasswordRemoval,
  verifyWarningResetPassword,
} from '../doraemon-monitor/utils/warningResetPassword.js';

function runTest(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

const pending = [];
const queueTest = (name, fn) => pending.push(runTest(name, fn));

queueTest('normalizeWarningResetPassword trims outer whitespace only', () => {
  assert.equal(normalizeWarningResetPassword(' 1234 '), '1234');
  assert.equal(normalizeWarningResetPassword(' 12 34 '), '12 34');
  assert.equal(normalizeWarningResetPassword('   '), '');
});

queueTest('hashWarningResetPassword returns a stable sha-256 hash', async () => {
  const hashed = await hashWarningResetPassword(' 1234 ');
  assert.match(hashed, /^[a-f0-9]{64}$/);
  assert.equal(hashed, await hashWarningResetPassword('1234'));
  assert.notEqual(hashed, '1234');
});

queueTest('createWarningResetPasswordRecord stores hash and timestamp', async () => {
  const record = await createWarningResetPasswordRecord('1234');
  assert.equal(record.key, WARNING_RESET_PASSWORD_STORAGE_KEY);
  assert.match(record.hash, /^[a-f0-9]{64}$/);
  assert.equal(typeof record.updatedAt, 'string');
});

queueTest('parseWarningResetPasswordRecord accepts valid JSON and rejects malformed values', () => {
  const parsed = parseWarningResetPasswordRecord('{"hash":"abc","updatedAt":"2026-04-01T00:00:00.000Z"}');
  assert.deepEqual(parsed, {
    hash: 'abc',
    updatedAt: '2026-04-01T00:00:00.000Z',
  });
  assert.equal(parseWarningResetPasswordRecord(''), null);
  assert.equal(parseWarningResetPasswordRecord('{"hash":1}'), null);
  assert.equal(parseWarningResetPasswordRecord('not-json'), null);
});

queueTest('shouldRequireWarningResetPassword depends on stored hash presence', () => {
  assert.equal(shouldRequireWarningResetPassword(null), false);
  assert.equal(shouldRequireWarningResetPassword({ hash: '' }), false);
  assert.equal(shouldRequireWarningResetPassword({ hash: 'abc' }), true);
});

queueTest('verifyWarningResetPassword matches the stored hash', async () => {
  const record = await createWarningResetPasswordRecord('2468');
  assert.equal(await verifyWarningResetPassword('2468', record), true);
  assert.equal(await verifyWarningResetPassword('1357', record), false);
  assert.equal(await verifyWarningResetPassword('', record), false);
});

queueTest('validateWarningResetPasswordChange allows first-time setup without current password', async () => {
  const error = await validateWarningResetPasswordChange({
    existingRecord: null,
    currentPassword: '',
    nextPassword: '2468',
    confirmPassword: '2468',
  });
  assert.equal(error, null);
});

queueTest('validateWarningResetPasswordChange requires the current password when updating an existing one', async () => {
  const record = await createWarningResetPasswordRecord('2468');
  const error = await validateWarningResetPasswordChange({
    existingRecord: record,
    currentPassword: '1357',
    nextPassword: '9999',
    confirmPassword: '9999',
  });
  assert.equal(error, 'current-password');
});

queueTest('validateWarningResetPasswordRemoval requires the current password', async () => {
  const record = await createWarningResetPasswordRecord('2468');
  assert.equal(await validateWarningResetPasswordRemoval({ existingRecord: record, currentPassword: '1111' }), 'current-password');
  assert.equal(await validateWarningResetPasswordRemoval({ existingRecord: record, currentPassword: '2468' }), null);
});

queueTest('validateWarningResetPasswordRemoval allows the admin recovery password', async () => {
  const record = await createWarningResetPasswordRecord('2468');
  assert.equal(await validateWarningResetPasswordRemoval({ existingRecord: record, currentPassword: '8888' }), null);
});

await Promise.all(pending);
