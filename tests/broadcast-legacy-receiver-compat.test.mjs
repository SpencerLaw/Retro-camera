import assert from 'node:assert/strict';
import fs from 'node:fs';

const receiverSource = fs.readFileSync('broadcast-assistant/Receiver.tsx', 'utf8');
const apiSource = fs.readFileSync('api/broadcast/index.ts', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('receiver fetches broadcasts without browser cache and has an XHR fallback', () => {
  assert.match(receiverSource, /cache:\s*'no-store'/);
  assert.match(receiverSource, /'Cache-Control':\s*'no-cache'/);
  assert.match(receiverSource, /new XMLHttpRequest\(\)/);
  assert.match(receiverSource, /BROADCAST_POLL_VISIBLE_MS\s*=\s*10000/);
  assert.match(receiverSource, /BROADCAST_POLL_HIDDEN_MS\s*=\s*30000/);
});

runTest('receiver tolerates temporary notFound states before leaving a room', () => {
  assert.match(receiverSource, /data\.notFound/);
  assert.match(receiverSource, /failCount\s*>=\s*15/);
});

runTest('broadcast fetch responses disable caches and still return a direct message if owner index is missing', () => {
  assert.match(apiSource, /res\.setHeader\('Cache-Control',\s*'no-store, no-cache, max-age=0, must-revalidate'\)/);
  assert.match(apiSource, /if \(!state\.owner && !state\.message\)/);
  assert.match(apiSource, /await hydrateRoomOwner\(uppercaseCode, cleanLicense\)/);
});
