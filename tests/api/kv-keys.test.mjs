import assert from 'node:assert/strict';

import {
  buildLicenseKey,
  buildRoomIndexMigrationStateKey,
  buildRoomMessageKey,
  buildRoomOwnerKey,
  buildRoomOwnerMissKey,
  collectRoomIndexEntries,
  createRoomIndexEntry,
  createRoomIndexTransition,
  getConfiguredLicenseCodes,
  normalizeLicenseCode,
  normalizeRoomCode,
} from '../../api/shared/kv-keys.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('normalize helpers uppercase and trim incoming values', () => {
  assert.equal(normalizeLicenseCode(' gb-20260401-abcd '), 'GB20260401ABCD');
  assert.equal(normalizeRoomCode(' 001234 '), '001234');
});

runTest('key builders keep broadcast storage layout predictable', () => {
  assert.equal(buildLicenseKey(' gb-20260401-abcd '), 'license:GB20260401ABCD');
  assert.equal(buildRoomOwnerKey('001234'), 'br:owner:001234');
  assert.equal(buildRoomOwnerMissKey('001234'), 'br:owner-miss:001234');
  assert.equal(buildRoomMessageKey('001234'), 'br:msg:001234');
});

runTest('createRoomIndexTransition deletes stale owner key when room changes', () => {
  const transition = createRoomIndexTransition({
    license: 'GB-20260401-ABCD',
    previousRoomCode: '100001',
    nextRoomCode: '100002',
  });

  assert.deepEqual(transition, {
    license: 'GB20260401ABCD',
    previousRoomCode: '100001',
    nextRoomCode: '100002',
    ownerKey: 'br:owner:100002',
    missKey: 'br:owner-miss:100002',
    cleanupOwnerKeys: ['br:owner:100001', 'br:owner-miss:100001'],
  });
});

runTest('createRoomIndexTransition does not emit cleanup when room stays unchanged', () => {
  const transition = createRoomIndexTransition({
    license: 'GB-20260401-ABCD',
    previousRoomCode: '100002',
    nextRoomCode: '100002',
  });

  assert.deepEqual(transition.cleanupOwnerKeys, []);
  assert.equal(transition.ownerKey, 'br:owner:100002');
});

runTest('createRoomIndexEntry extracts active room ownership from metadata', () => {
  const entry = createRoomIndexEntry('gb-20260401-abcd', { a: ' 100003 ' });

  assert.deepEqual(entry, {
    license: 'GB20260401ABCD',
    roomCode: '100003',
    ownerKey: 'br:owner:100003',
    missKey: 'br:owner-miss:100003',
    messageKey: 'br:msg:100003',
  });
});

runTest('createRoomIndexEntry returns null when metadata has no active room', () => {
  assert.equal(createRoomIndexEntry('GB-20260401-ABCD', { a: '' }), null);
  assert.equal(createRoomIndexEntry('GB-20260401-ABCD', {}), null);
});

runTest('collectRoomIndexEntries keeps the first room owner and skips invalid or duplicate rooms', () => {
  const result = collectRoomIndexEntries([
    { license: 'GB-20260401-ABCD', metadata: { a: '100003' } },
    { license: 'GB-20260401-EFGH', metadata: { a: '100003' } },
    { license: 'GB-20260401-IJKL', metadata: {} },
    { license: 'GB-20260401-MNOP', metadata: { a: '100004' } },
  ]);

  assert.deepEqual(result, {
    entries: [
      {
        license: 'GB20260401ABCD',
        roomCode: '100003',
        ownerKey: 'br:owner:100003',
        missKey: 'br:owner-miss:100003',
        messageKey: 'br:msg:100003',
      },
      {
        license: 'GB20260401MNOP',
        roomCode: '100004',
        ownerKey: 'br:owner:100004',
        missKey: 'br:owner-miss:100004',
        messageKey: 'br:msg:100004',
      },
    ],
    skipped: 2,
  });
});

runTest('buildRoomIndexMigrationStateKey keeps migration marker stable', () => {
  assert.equal(buildRoomIndexMigrationStateKey(), 'br:index-state:v1');
  assert.equal(buildRoomIndexMigrationStateKey('v2'), 'br:index-state:v2');
});

runTest('getConfiguredLicenseCodes normalizes, deduplicates, and drops blanks', () => {
  const codes = getConfiguredLicenseCodes(' GB-20260401-ABCD, gb20260401abcd, , ZD-20260401-FFFF ');
  assert.deepEqual(codes, ['GB20260401ABCD', 'ZD20260401FFFF']);
});
