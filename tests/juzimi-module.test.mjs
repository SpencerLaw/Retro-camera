import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const appFileExists = fs.existsSync('components/JuzimiApp.tsx');
const appComponentSource = appFileExists ? fs.readFileSync('components/JuzimiApp.tsx', 'utf8') : '';
const logicFileExists = fs.existsSync('components/juzimiLogic.js');
const logicSource = logicFileExists ? fs.readFileSync('components/juzimiLogic.js', 'utf8') : '';
const apiFileExists = fs.existsSync('api/juzimi.ts');
const apiSource = apiFileExists ? fs.readFileSync('api/juzimi.ts', 'utf8') : '';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('juzimi route and homepage entry are wired', () => {
  assert.match(appSource, /import JuzimiApp from '\.\/components\/JuzimiApp'/);
  assert.match(appSource, /<Route path="\/juzimi" element=\{<JuzimiApp \/>\} \/>/);
  assert.match(homeSource, /to="\/juzimi"/);
  assert.match(homeSource, /句子迷/);
});

runTest('juzimi admin check hides the plain password in frontend source', () => {
  assert.equal(appFileExists, true);
  assert.equal(logicFileExists, true);
  assert.match(logicSource, /JUZIMI_ADMIN_PASSWORD_HASH/);
  assert.match(logicSource, /17d3fc231a5c679f6904650d4cf0770e615106147f2de1c74b5ce9dd38e9c9ac/);
  assert.match(appComponentSource, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(appComponentSource, /管理员/);
  assert.match(appComponentSource, /新建句子/);
  assert.match(appComponentSource, /编辑句子/);
  assert.match(appComponentSource, /删除句子/);
  assert.doesNotMatch(appComponentSource, /juzimiadmin/);
  assert.doesNotMatch(logicSource, /juzimiadmin/);
});

runTest('juzimi admin editor opens in a fixed dialog instead of pushing the page top', () => {
  assert.match(appComponentSource, /showAdminPanel && \(/);
  assert.match(appComponentSource, /fixed inset-0 z-50 flex items-center justify-center/);
  assert.match(appComponentSource, /role="dialog"/);
  assert.match(appComponentSource, /aria-modal="true"/);
  assert.match(appComponentSource, /aria-label=\{isAdmin \? \(form\.id \? '编辑句子' : '新建句子'\) : '管理员登录'\}/);
  assert.match(appComponentSource, /max-h-\[92vh\]/);
  assert.match(appComponentSource, /overflow-y-auto/);
  assert.doesNotMatch(appComponentSource, /<main[\s\S]*showAdminPanel && \([\s\S]*<section className=\{theme\.panelClass\}[\s\S]*Sentence grid/);
});

runTest('juzimi admin dialog uses a readable frosted glass surface', () => {
  assert.match(appComponentSource, /adminDialogSurfaceClass/);
  assert.match(appComponentSource, /adminDialogInputClass/);
  assert.match(appComponentSource, /backdrop-blur-2xl/);
  assert.match(appComponentSource, /shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.28\)\]/);
  assert.match(appComponentSource, /bg-black\/64/);
  assert.match(appComponentSource, /theme\.mode === 'night'/);
});

runTest('juzimi admin editor fields keep typed text readable over glass backgrounds', () => {
  assert.match(appComponentSource, /adminDialogInputClass/);
  assert.match(appComponentSource, /adminDialogTextAreaClass/);
  assert.match(appComponentSource, /bg-\[#fffdf4\]\/92/);
  assert.match(appComponentSource, /text-\[#211914\]/);
  assert.match(appComponentSource, /placeholder:text-\[#7a6143\]\/72/);
  assert.match(appComponentSource, /caret-\[#211914\]/);
  assert.match(appComponentSource, /selection:bg-\[#d6b16e\]\/30/);
});

runTest('juzimi retreat theme renders the reference-style image glass card UI', () => {
  assert.match(appComponentSource, /theme\.cardVariant === 'retreat'/);
  assert.match(appComponentSource, /backgroundImage: `linear-gradient/);
  assert.match(appComponentSource, /aria-hidden="true"/);
  assert.match(appComponentSource, /阅读句子/);
  assert.match(appComponentSource, /rounded-\[2\.15rem\]/);
  assert.match(appComponentSource, /minHeight: cardMinHeight/);
  assert.doesNotMatch(appComponentSource, /aspect-\[0\.68\]/);
  assert.doesNotMatch(appComponentSource, /min-h-\[510px\]/);
});

runTest('juzimi sentence grid uses masonry columns for every theme', () => {
  assert.match(appComponentSource, /className="columns-1 sm:columns-2 xl:columns-3 gap-4 md:gap-5"/);
  assert.match(appComponentSource, /className="break-inside-avoid mb-4 md:mb-5"/);
  assert.doesNotMatch(appComponentSource, /theme\.cardVariant === 'retreat' \? 'grid grid-cols-1/);
  assert.doesNotMatch(appComponentSource, /theme\.cardVariant === 'retreat' \? '' : 'break-inside-avoid/);
});

runTest('juzimi theme family selector shows all themes as borderless tabs', () => {
  assert.match(appComponentSource, /JUZIMI_THEME_FAMILIES\.map/);
  assert.match(appComponentSource, /role="tablist"/);
  assert.match(appComponentSource, /role="tab"/);
  assert.match(appComponentSource, /themeFamilyLabels\[family\]/);
  assert.match(appComponentSource, /setThemeFamily/);
  assert.doesNotMatch(appComponentSource, /role="tablist"[\s\S]{0,220}\bborder\b/);
  assert.doesNotMatch(appComponentSource, /role="tab"[\s\S]{0,360}\bborder\b/);
  assert.doesNotMatch(appComponentSource, /getJuzimiThemeFamilyAction/);
  assert.doesNotMatch(appComponentSource, /toggleThemeFamily/);
});

runTest('juzimi sentence cards render without visible border strokes', () => {
  assert.doesNotMatch(appComponentSource, /rounded-\[2\.15rem\][^"]*\bborder\b/);
  assert.doesNotMatch(appComponentSource, /rounded-\[2rem\] p-4[^"]*\bborder\b/);
  assert.doesNotMatch(appComponentSource, /rounded-\[1\.65rem\] p-6[^"]*\bborder\b/);
  assert.doesNotMatch(appComponentSource, /borderColor: accent\.glass\.border/);
  assert.doesNotMatch(appComponentSource, /inset-\[1px\][^"]*\bborder\b/);
  assert.doesNotMatch(appComponentSource, /border border-white\/(?:18|20|22|24|34)/);
});

runTest('juzimi retreat card removes the top-left mood label', () => {
  assert.doesNotMatch(appComponentSource, /<div className="rounded-full bg-black\/22[\s\S]*?\{accent\.mood\}[\s\S]*?<\/div>/);
  assert.doesNotMatch(appComponentSource, /accent\.mood/);
  assert.match(appComponentSource, /\{accent\.price\}/);
});

runTest('juzimi retreat card uses feathered blur and stronger text contrast', () => {
  assert.match(appComponentSource, /backdrop-blur-\[12px\]/);
  assert.match(appComponentSource, /\[mask-image:linear-gradient\(to_bottom,transparent_0%,transparent_32%,black_56%,black_100%\)\]/);
  assert.match(appComponentSource, /text-white\/90/);
  assert.match(appComponentSource, /bg-white\/88/);
  assert.match(appComponentSource, /text-\[#111315\]/);
  assert.match(appComponentSource, /shadow-\[0_10px_24px_rgba\(0,0,0,0\.24\),inset_0_1px_0_rgba\(255,255,255,0\.72\)\]/);
  assert.doesNotMatch(appComponentSource, /bg-black\/28/);
  assert.doesNotMatch(appComponentSource, /text-white\/96/);
  assert.doesNotMatch(appComponentSource, /bottom-0 h-\[58%\] backdrop-blur-\[2px\]/);
});

runTest('juzimi retreat card draws its edge with a subtle pink glow shadow', () => {
  assert.match(appComponentSource, /0 0 0 1px \$\{accent\.glass\.edge\}/);
  assert.match(appComponentSource, /0 0 30px \$\{accent\.glass\.glow\}/);
  assert.doesNotMatch(appComponentSource, /rounded-\[2\.15rem\][^"]*\bborder\b/);
});

runTest('juzimi sentence cards wobble gently on hover with reduced motion support', () => {
  assert.match(appComponentSource, /@keyframes juzimi-card-hover-wobble/);
  assert.match(appComponentSource, /\.juzimi-card-hover:hover/);
  assert.match(appComponentSource, /animation: juzimi-card-hover-wobble 900ms ease-in-out both/);
  assert.match(appComponentSource, /\.juzimi-card-hover \{/);
  assert.match(appComponentSource, /will-change: transform/);
  assert.match(appComponentSource, /prefers-reduced-motion: reduce[\s\S]*\.juzimi-card-hover/);
});

runTest('juzimi api stores sentences in Vercel KV', () => {
  assert.equal(apiFileExists, true);
  assert.match(apiSource, /import \{ kv \} from '@vercel\/kv'/);
  assert.match(apiSource, /const JUZIMI_SENTENCES_KEY = 'juzimi:sentences'/);
  assert.match(apiSource, /action === 'list'/);
  assert.match(apiSource, /action === 'create'/);
  assert.match(apiSource, /action === 'update'/);
  assert.match(apiSource, /action === 'delete'/);
  assert.match(apiSource, /adminToken === \(process\.env\.JUZIMI_ADMIN_HASH \|\| JUZIMI_ADMIN_PASSWORD_HASH\)/);
  assert.doesNotMatch(apiSource, /juzimiadmin/);
});
