import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function loadThemeModule() {
  const modulePath = 'components/juzimiTheme.js';
  assert.equal(fs.existsSync(modulePath), true, 'components/juzimiTheme.js should exist');
  return import(pathToFileURL(fs.realpathSync(modulePath)).href);
}

await runTest('juzimi theme preference defaults and rejects invalid stored values', async () => {
  const { normalizeJuzimiThemePreference } = await loadThemeModule();

  assert.deepEqual(normalizeJuzimiThemePreference(), { family: 'morning', mode: 'day' });
  assert.deepEqual(normalizeJuzimiThemePreference({ family: 'unknown', mode: 'midnight' }), { family: 'morning', mode: 'day' });
  assert.deepEqual(normalizeJuzimiThemePreference({ family: 'studio', mode: 'night' }), { family: 'studio', mode: 'night' });
});

await runTest('juzimi theme controls cycle family and day night mode', async () => {
  const { getNextJuzimiThemeFamily, getNextJuzimiThemeMode } = await loadThemeModule();

  assert.equal(getNextJuzimiThemeFamily('morning'), 'studio');
  assert.equal(getNextJuzimiThemeFamily('studio'), 'morning');
  assert.equal(getNextJuzimiThemeFamily('unknown'), 'morning');
  assert.equal(getNextJuzimiThemeMode('day'), 'night');
  assert.equal(getNextJuzimiThemeMode('night'), 'day');
  assert.equal(getNextJuzimiThemeMode('unknown'), 'day');
});

await runTest('juzimi mode toggle labels the next action instead of current state', async () => {
  const { getJuzimiThemeModeAction } = await loadThemeModule();

  assert.deepEqual(getJuzimiThemeModeAction('day'), { mode: 'night', label: '黑夜' });
  assert.deepEqual(getJuzimiThemeModeAction('night'), { mode: 'day', label: '白天' });
  assert.deepEqual(getJuzimiThemeModeAction('unknown'), { mode: 'day', label: '白天' });
});

await runTest('juzimi family toggle labels the next theme instead of current state', async () => {
  const { getJuzimiThemeFamilyAction } = await loadThemeModule();

  assert.deepEqual(getJuzimiThemeFamilyAction('morning'), { family: 'studio', label: '流光' });
  assert.deepEqual(getJuzimiThemeFamilyAction('studio'), { family: 'morning', label: '晨光' });
  assert.deepEqual(getJuzimiThemeFamilyAction('unknown'), { family: 'morning', label: '晨光' });
});

await runTest('juzimi card heights vary for a waterfall layout', async () => {
  const { getJuzimiCardMinHeight } = await loadThemeModule();
  const shortSentence = { text: '短句。' };
  const longSentence = { text: '这是一条更长的句子，用来验证卡片高度会随着文本内容和顺序自然变化，而不是所有卡片都排成一样高的整齐网格。' };

  assert.notEqual(getJuzimiCardMinHeight(shortSentence, 0, 'poster'), getJuzimiCardMinHeight(longSentence, 0, 'poster'));
  assert.notEqual(getJuzimiCardMinHeight(shortSentence, 0, 'studio'), getJuzimiCardMinHeight(shortSentence, 1, 'studio'));
  assert.ok(getJuzimiCardMinHeight(longSentence, 0, 'poster') > getJuzimiCardMinHeight(shortSentence, 0, 'poster'));
});

await runTest('juzimi has complete visual theme configs for both families and modes', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_FAMILIES, JUZIMI_THEME_MODES } = await loadThemeModule();

  assert.deepEqual(JUZIMI_THEME_FAMILIES, ['morning', 'studio']);
  assert.deepEqual(JUZIMI_THEME_MODES, ['day', 'night']);

  for (const family of JUZIMI_THEME_FAMILIES) {
    for (const mode of JUZIMI_THEME_MODES) {
      const theme = getJuzimiTheme({ family, mode });
      assert.equal(theme.family, family);
      assert.equal(theme.mode, mode);
      assert.equal(typeof theme.name, 'string');
      assert.equal(typeof theme.modeLabel, 'string');
      assert.ok(Array.isArray(theme.cardAccents));
      assert.ok(theme.cardAccents.length >= 4);
      assert.equal(typeof theme.backgroundBase, 'string');
      assert.equal(typeof theme.searchPanelClass, 'string');
      assert.equal(typeof theme.inputClass, 'string');
    }
  }
});

await runTest('juzimi themes avoid background orbit lines and framed empty states', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_FAMILIES, JUZIMI_THEME_MODES } = await loadThemeModule();

  for (const family of JUZIMI_THEME_FAMILIES) {
    for (const mode of JUZIMI_THEME_MODES) {
      const theme = getJuzimiTheme({ family, mode });
      assert.equal(theme.orbitClass, undefined);
      assert.doesNotMatch(theme.emptyStateClass, /\bborder\b/);
      assert.doesNotMatch(theme.emptyStateClass, /\bdashed\b/);
    }
  }
});
