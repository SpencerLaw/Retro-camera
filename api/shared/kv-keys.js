export function normalizeLicenseCode(code) {
  return String(code || '').replace(/[-\s]/g, '').toUpperCase();
}

export function normalizeRoomCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function buildLicenseKey(code) {
  return `license:${normalizeLicenseCode(code)}`;
}

export function buildRoomOwnerKey(roomCode) {
  return `br:owner:${normalizeRoomCode(roomCode)}`;
}

export function buildRoomOwnerMissKey(roomCode) {
  return `br:owner-miss:${normalizeRoomCode(roomCode)}`;
}

export function buildRoomMessageKey(roomCode) {
  return `br:msg:${normalizeRoomCode(roomCode)}`;
}

export function buildRoomIndexMigrationStateKey(version = 'v1') {
  return `br:index-state:${version}`;
}

export function extractActiveRoomCode(metadata) {
  const roomCode = normalizeRoomCode(metadata?.a || '');
  return roomCode || null;
}

export function createRoomIndexTransition({ license, previousRoomCode, nextRoomCode }) {
  const normalizedLicense = normalizeLicenseCode(license);
  const previous = normalizeRoomCode(previousRoomCode);
  const next = normalizeRoomCode(nextRoomCode);
  const cleanupOwnerKeys = [];

  if (previous && previous !== next) {
    cleanupOwnerKeys.push(buildRoomOwnerKey(previous), buildRoomOwnerMissKey(previous));
  }

  return {
    license: normalizedLicense,
    previousRoomCode: previous,
    nextRoomCode: next,
    ownerKey: next ? buildRoomOwnerKey(next) : '',
    missKey: next ? buildRoomOwnerMissKey(next) : '',
    cleanupOwnerKeys,
  };
}

export function createRoomIndexEntry(license, metadata) {
  const normalizedLicense = normalizeLicenseCode(license);
  const roomCode = extractActiveRoomCode(metadata);

  if (!normalizedLicense || !roomCode) return null;

  return {
    license: normalizedLicense,
    roomCode,
    ownerKey: buildRoomOwnerKey(roomCode),
    missKey: buildRoomOwnerMissKey(roomCode),
    messageKey: buildRoomMessageKey(roomCode),
  };
}

export function collectRoomIndexEntries(items) {
  const entries = [];
  const seenRoomCodes = new Set();
  let skipped = 0;

  for (const item of items || []) {
    const entry = createRoomIndexEntry(item?.license, item?.metadata);
    if (!entry) {
      skipped++;
      continue;
    }

    if (seenRoomCodes.has(entry.roomCode)) {
      skipped++;
      continue;
    }

    seenRoomCodes.add(entry.roomCode);
    entries.push(entry);
  }

  return { entries, skipped };
}

export function getConfiguredLicenseCodes(envValue) {
  const seen = new Set();
  const codes = [];

  for (const rawCode of String(envValue || '').split(',')) {
    const normalized = normalizeLicenseCode(rawCode);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    codes.push(normalized);
  }

  return codes;
}
