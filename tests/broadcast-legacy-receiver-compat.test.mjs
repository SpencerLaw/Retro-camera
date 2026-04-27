import assert from 'node:assert/strict';
import fs from 'node:fs';

const receiverSource = fs.readFileSync('broadcast-assistant/Receiver.tsx', 'utf8');
const ttsSource = fs.readFileSync('broadcast-assistant/utils/ttsManager.ts', 'utf8');
const desktopMainSource = fs.readFileSync('broadcast-desktop/main.js', 'utf8');
const desktopPackageSource = fs.readFileSync('broadcast-desktop/package.json', 'utf8');
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
  assert.match(receiverSource, /BROADCAST_POLL_VISIBLE_MS\s*=\s*4000/);
  assert.match(receiverSource, /BROADCAST_POLL_HIDDEN_MS\s*=\s*8000/);
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

runTest('receiver surfaces autoplay blocks and unlocks audio from a user gesture', () => {
  assert.match(ttsSource, /AUDIO_PLAYBACK_BLOCKED/);
  assert.match(ttsSource, /public async unlockAudio\(\)/);
  assert.match(ttsSource, /reject\(this\.createPlaybackBlockedError\(\)\)/);
  assert.match(receiverSource, /await ttsManager\.unlockAudio\(\)/);
  assert.match(receiverSource, /setNeedsActivation\(true\)/);
  assert.match(receiverSource, /handleActivate\(\);\s*localStorage\.setItem\('br_receiver_roomId'/);
});

runTest('desktop receiver allows autoplay and uses ASCII installer shortcuts for old Windows', () => {
  assert.match(desktopMainSource, /appendSwitch\('autoplay-policy',\s*'no-user-gesture-required'\)/);
  assert.match(desktopPackageSource, /"productName":\s*"ClassBroadcastReceiver"/);
  assert.match(desktopPackageSource, /"shortcutName":\s*"ClassBroadcastReceiver"/);
  assert.match(desktopPackageSource, /"artifactName":\s*"ClassBroadcastReceiver_Setup\.\$\{ext\}"/);
});

runTest('receiver page offers separate modern and Windows 7 desktop downloads', () => {
  assert.match(receiverSource, /ClassBroadcast_Setup\.exe/);
  assert.match(receiverSource, /ClassBroadcastReceiver_Win7_Setup\.exe/);
  assert.match(receiverSource, /download="ClassBroadcastReceiver_Setup\.exe"/);
  assert.match(receiverSource, /download="ClassBroadcastReceiver_Win7_Setup\.exe"/);
  assert.match(receiverSource, /Windows 7 请使用专用版/);
});
