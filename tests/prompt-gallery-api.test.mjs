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
  assert.match(apiSource, /kv\.set\(promptGalleryEntryKey\(entry\.id\), entry\)/);
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

runTest('prompt gallery api protects mutations with hashed admin auth and validates image limits', () => {
  assert.match(apiSource, /PROMPT_GALLERY_ADMIN_PASSWORD_HASH/);
  assert.match(apiSource, /process\.env\.PROMPT_GALLERY_ADMIN_HASH/);
  assert.match(apiSource, /adminToken === \(process\.env\.PROMPT_GALLERY_ADMIN_HASH \|\| PROMPT_GALLERY_ADMIN_PASSWORD_HASH\)/);
  assert.match(apiSource, /assertPromptGalleryEntryWithinLimits\(entry\)/);
  assert.match(apiSource, /管理员密码不正确/);
  assert.doesNotMatch(apiSource, /juzimiadmin/);
});
