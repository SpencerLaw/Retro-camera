export const WARNING_RESET_PASSWORD_STORAGE_KEY = 'doraemon_warning_reset_password_v1';

export function normalizeWarningResetPassword(value) {
  return String(value || '').trim();
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashWarningResetPassword(value) {
  const normalized = normalizeWarningResetPassword(value);
  const encoded = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(digest);
}

export function parseWarningResetPasswordRecord(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.hash !== 'string' || typeof parsed.updatedAt !== 'string') return null;

    return {
      hash: parsed.hash,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function shouldRequireWarningResetPassword(record) {
  return !!record?.hash;
}

export async function createWarningResetPasswordRecord(value) {
  return {
    key: WARNING_RESET_PASSWORD_STORAGE_KEY,
    hash: await hashWarningResetPassword(value),
    updatedAt: new Date().toISOString(),
  };
}

export async function verifyWarningResetPassword(input, record) {
  if (!record?.hash) return false;

  const normalized = normalizeWarningResetPassword(input);
  if (!normalized) return false;

  return (await hashWarningResetPassword(normalized)) === record.hash;
}

export async function validateWarningResetPasswordChange({ existingRecord, currentPassword, nextPassword, confirmPassword }) {
  const normalizedPassword = normalizeWarningResetPassword(nextPassword);
  const normalizedConfirm = normalizeWarningResetPassword(confirmPassword);

  if (!normalizedPassword) return 'empty';
  if (normalizedPassword !== normalizedConfirm) return 'mismatch';

  if (shouldRequireWarningResetPassword(existingRecord)) {
    const currentVerified = await verifyWarningResetPassword(currentPassword, existingRecord);
    if (!currentVerified) return 'current-password';
  }

  return null;
}

export async function validateWarningResetPasswordRemoval({ existingRecord, currentPassword }) {
  if (!shouldRequireWarningResetPassword(existingRecord)) return null;

  const currentVerified = await verifyWarningResetPassword(currentPassword, existingRecord);
  return currentVerified ? null : 'current-password';
}

export function loadWarningResetPasswordRecord(storage = globalThis.localStorage) {
  if (!storage) return null;
  return parseWarningResetPasswordRecord(storage.getItem(WARNING_RESET_PASSWORD_STORAGE_KEY));
}

export async function saveWarningResetPasswordRecord(value, storage = globalThis.localStorage) {
  if (!storage) return null;

  const record = await createWarningResetPasswordRecord(value);
  storage.setItem(record.key, JSON.stringify({ hash: record.hash, updatedAt: record.updatedAt }));
  return { hash: record.hash, updatedAt: record.updatedAt };
}

export function clearWarningResetPasswordRecord(storage = globalThis.localStorage) {
  if (!storage) return;
  storage.removeItem(WARNING_RESET_PASSWORD_STORAGE_KEY);
}
