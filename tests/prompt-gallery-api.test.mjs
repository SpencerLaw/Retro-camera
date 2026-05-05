import assert from 'node:assert/strict';
import fs from 'node:fs';

const apiFileExists = fs.existsSync('api/prompts.ts');
const apiSource = apiFileExists ? fs.readFileSync('api/prompts.ts', 'utf8') : '';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('prompt gallery api stores an index and per-entry detail records in KV', () => {
  assert.equal(apiFileExists, true);
  assert.match(apiSource, /import \{ kv \} from '@vercel\/kv'/);
  assert.match(apiSource, /const PROMPT_GALLERY_INDEX_KEY = 'prompt-gallery:index'/);
  assert.match(apiSource, /promptGalleryEntryKey/);
  assert.match(apiSource, /prompt-gallery:entry:/);
  assert.match(apiSource, /kv\.get\(PROMPT_GALLERY_INDEX_KEY\)/);
  assert.match(apiSource, /kv\.get\(promptGalleryEntryKey\(entryId\)\)/);
  assert.match(apiSource, /kv\.set\(promptGalleryEntryKey\(entry\.id\), persistedEntry\)/);
});

runTest('prompt gallery api can offload images to Vercel Blob before storing KV records', () => {
  assert.match(apiSource, /import \{ del, put \} from '@vercel\/blob'/);
  assert.match(apiSource, /process\.env\.BLOB_READ_WRITE_TOKEN/);
  assert.match(apiSource, /persistPromptGalleryImages/);
  assert.match(apiSource, /dataUrlToBlobPayload/);
  assert.match(apiSource, /addRandomSuffix: true/);
  assert.match(apiSource, /url: detailBlob\?\.url/);
  assert.match(apiSource, /thumbnailUrl: thumbnailBlob\?\.url/);
});

runTest('prompt gallery api reports active image storage mode', () => {
  assert.match(apiSource, /getPromptGalleryStorageMode/);
  assert.match(apiSource, /storageMode: getPromptGalleryStorageMode\(\)/);
});

runTest('prompt gallery api cleans up blob urls removed during updates', () => {
  assert.match(apiSource, /getPromptGalleryRemovedBlobUrls/);
  assert.match(apiSource, /deletePromptGalleryBlobs\(getPromptGalleryRemovedBlobUrls\(existingEntry, persistedEntry\)\)/);
});

runTest('prompt gallery api exposes list detail create update and delete actions', () => {
  assert.match(apiSource, /action === 'list'/);
  assert.match(apiSource, /action === 'detail'/);
  assert.match(apiSource, /action === 'create'/);
  assert.match(apiSource, /action === 'update'/);
  assert.match(apiSource, /action === 'delete'/);
  assert.match(apiSource, /paginatePromptGallerySummaries/);
  assert.match(apiSource, /filterPromptGallerySummaries/);
  assert.match(apiSource, /summarizePromptGalleryEntry/);
});

runTest('prompt gallery api normalizes detail responses before returning legacy records', () => {
  assert.match(apiSource, /data: normalizePromptGalleryEntry\(entry\)/);
  assert.doesNotMatch(apiSource, /data: entry \}/);
});

runTest('prompt gallery api protects mutations with hashed admin auth and validates image limits', () => {
  assert.match(apiSource, /PROMPT_GALLERY_ADMIN_PASSWORD_HASH/);
  assert.match(apiSource, /process\.env\.PROMPT_GALLERY_ADMIN_HASH/);
  assert.match(apiSource, /adminToken === \(process\.env\.PROMPT_GALLERY_ADMIN_HASH \|\| PROMPT_GALLERY_ADMIN_PASSWORD_HASH\)/);
  assert.match(apiSource, /assertPromptGalleryEntryWithinLimits\(entry\)/);
  assert.match(apiSource, /管理员密码不正确/);
  assert.doesNotMatch(apiSource, /juzimiadmin/);
});
