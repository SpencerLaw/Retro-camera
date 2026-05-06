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
  assert.deepEqual(normalizeJuzimiThemePreference({ family: 'retreat', mode: 'day' }), { family: 'retreat', mode: 'day' });
});

await runTest('juzimi theme controls cycle family and day night mode', async () => {
  const { getNextJuzimiThemeFamily, getNextJuzimiThemeMode } = await loadThemeModule();

  assert.equal(getNextJuzimiThemeFamily('morning'), 'studio');
  assert.equal(getNextJuzimiThemeFamily('studio'), 'retreat');
  assert.equal(getNextJuzimiThemeFamily('retreat'), 'morning');
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
  assert.deepEqual(getJuzimiThemeFamilyAction('studio'), { family: 'retreat', label: '旅影' });
  assert.deepEqual(getJuzimiThemeFamilyAction('retreat'), { family: 'morning', label: '晨光' });
  assert.deepEqual(getJuzimiThemeFamilyAction('unknown'), { family: 'morning', label: '晨光' });
});

await runTest('juzimi card heights vary for a waterfall layout', async () => {
  const { getJuzimiCardMinHeight } = await loadThemeModule();
  const shortSentence = { text: '短句。' };
  const longSentence = { text: '这是一条更长的句子，用来验证卡片高度会随着文本内容和顺序自然变化，而不是所有卡片都排成一样高的整齐网格。' };

  assert.notEqual(getJuzimiCardMinHeight(shortSentence, 0, 'poster'), getJuzimiCardMinHeight(longSentence, 0, 'poster'));
  assert.notEqual(getJuzimiCardMinHeight(shortSentence, 0, 'studio'), getJuzimiCardMinHeight(shortSentence, 1, 'studio'));
  assert.notEqual(getJuzimiCardMinHeight(shortSentence, 0, 'retreat'), getJuzimiCardMinHeight(shortSentence, 1, 'retreat'));
  assert.ok(getJuzimiCardMinHeight(longSentence, 0, 'retreat') > getJuzimiCardMinHeight(shortSentence, 0, 'retreat'));
  assert.ok(getJuzimiCardMinHeight(longSentence, 0, 'poster') > getJuzimiCardMinHeight(shortSentence, 0, 'poster'));
});

await runTest('juzimi has complete visual theme configs for both families and modes', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_FAMILIES, JUZIMI_THEME_MODES } = await loadThemeModule();

  assert.deepEqual(JUZIMI_THEME_FAMILIES, ['morning', 'studio', 'retreat']);
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

await runTest('juzimi retreat theme adds image-backed travel card tokens without replacing existing variants', async () => {
  const { getJuzimiTheme } = await loadThemeModule();

  assert.equal(getJuzimiTheme({ family: 'morning', mode: 'day' }).cardVariant, 'poster');
  assert.equal(getJuzimiTheme({ family: 'studio', mode: 'day' }).cardVariant, 'studio');

  const retreat = getJuzimiTheme({ family: 'retreat', mode: 'day' });
  assert.equal(retreat.cardVariant, 'retreat');
  assert.ok(retreat.cardAccents.length >= 6);

  for (const accent of retreat.cardAccents) {
    assert.match(accent.image, /^https:\/\/images\.unsplash\.com\//);
    assert.match(accent.mood, /[\u4e00-\u9fff]/);
    assert.match(accent.price, /^#\d{2}$/);
  }
});

await runTest('juzimi card accents expose frosted glass styling tokens', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_FAMILIES, JUZIMI_THEME_MODES } = await loadThemeModule();

  for (const family of JUZIMI_THEME_FAMILIES) {
    for (const mode of JUZIMI_THEME_MODES) {
      const theme = getJuzimiTheme({ family, mode });

      for (const accent of theme.cardAccents) {
        assert.equal(typeof accent.glass, 'object');
        assert.match(accent.glass.surface, /rgba\(/);
        assert.match(accent.glass.tint, /gradient/);
        assert.match(accent.glass.border, /rgba\(/);
        assert.match(accent.glass.shadow, /rgba\(/);
        assert.match(accent.glass.highlight, /rgba\(/);
      }
    }
  }
});

await runTest('juzimi retreat cards expose a soft pink glowing edge', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_MODES } = await loadThemeModule();

  for (const mode of JUZIMI_THEME_MODES) {
    const retreat = getJuzimiTheme({ family: 'retreat', mode });

    for (const accent of retreat.cardAccents) {
      assert.match(accent.glass.edge, /rgba\(255,19\d,21\d,0\.[34]\d\)/);
      assert.match(accent.glass.glow, /rgba\(255,16\d,19\d,0\.2\d\)/);
    }
  }
});

await runTest('juzimi retreat glass tint preserves image colour instead of blackening the bottom', async () => {
  const { getJuzimiTheme, JUZIMI_THEME_MODES } = await loadThemeModule();

  for (const mode of JUZIMI_THEME_MODES) {
    const retreat = getJuzimiTheme({ family: 'retreat', mode });

    for (const accent of retreat.cardAccents) {
      assert.doesNotMatch(accent.glass.tint, /rgba\(0,0,0/);
      assert.doesNotMatch(accent.glass.tint, /rgba\(9,14,18/);
      assert.doesNotMatch(accent.glass.tint, /rgba\(15,23,42/);
      assert.match(accent.glass.tint, /rgba\(255,2\d{2},2\d{2},0\.\d+\)/);
    }
  }
});

await runTest('juzimi retreat night background keeps cinematic color drift', async () => {
  const { getJuzimiTheme } = await loadThemeModule();
  const retreatNight = getJuzimiTheme({ family: 'retreat', mode: 'night' });

  assert.match(retreatNight.backgroundBase, /#07111f/);
  assert.match(retreatNight.backgroundBase, /#241020/);
  assert.match(retreatNight.backgroundBase, /#081714/);
  assert.match(retreatNight.backgroundDriftStyle.backgroundImage, /rgba\(68,93,255,0\.18\)/);
  assert.match(retreatNight.backgroundDriftStyle.backgroundImage, /rgba\(255,60,105,0\.26\)/);
  assert.match(retreatNight.backgroundDriftStyle.backgroundImage, /rgba\(43,210,190,0\.16\)/);
  assert.ok(retreatNight.glows.length >= 3);
  assert.match(retreatNight.glows.map(glow => glow.className).join(' '), /#3157ff/);
  assert.match(retreatNight.glows.map(glow => glow.className).join(' '), /#ff4f7a/);
  assert.match(retreatNight.glows.map(glow => glow.className).join(' '), /#22d3c5/);
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
