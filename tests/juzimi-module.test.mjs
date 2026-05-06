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
  assert.match(appComponentSource, /aspect-\[0\.68\]/);
  assert.match(appComponentSource, /rounded-\[2\.15rem\]/);
  assert.match(appComponentSource, /theme\.cardVariant === 'retreat'\s*\?/);
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
