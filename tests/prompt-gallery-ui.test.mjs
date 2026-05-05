import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const componentFileExists = fs.existsSync('components/PromptGalleryApp.tsx');
const componentSource = componentFileExists ? fs.readFileSync('components/PromptGalleryApp.tsx', 'utf8') : '';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('prompt gallery route and homepage entry are wired', () => {
  assert.match(appSource, /import PromptGalleryApp from '\.\/components\/PromptGalleryApp'/);
  assert.match(appSource, /<Route path="\/prompts" element=\{<PromptGalleryApp \/>\} \/>/);
  assert.match(homeSource, /to="\/prompts"/);
  assert.match(homeSource, /提示词图库/);
});

runTest('prompt gallery page has admin upload controls and image compression', () => {
  assert.equal(componentFileExists, true);
  assert.match(componentSource, /PROMPT_GALLERY_MAX_IMAGES/);
  assert.match(componentSource, /PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES/);
  assert.match(componentSource, /type="file"/);
  assert.match(componentSource, /accept="image\/\*"/);
  assert.match(componentSource, /multiple/);
  assert.match(componentSource, /document\.createElement\('canvas'\)/);
  assert.match(componentSource, /toDataURL\('image\/webp'/);
  assert.match(componentSource, /compressImageElement\(image, 1800, PROMPT_GALLERY_MAX_IMAGE_BYTES, 0\.84\)/);
  assert.match(componentSource, /compressImageElement\(image, 960, PROMPT_GALLERY_MAX_COVER_BYTES, 0\.82\)/);
  assert.match(componentSource, /最多 5 张/);
  assert.match(componentSource, /自动压缩为 WebP/);
  assert.match(componentSource, /onDrop=\{handleDrop\}/);
  assert.match(componentSource, /onDragOver=\{handleDragOver\}/);
  assert.match(componentSource, /originalSize/);
  assert.match(componentSource, /压缩后/);
});

runTest('prompt gallery opens create and edit forms in a management dialog', () => {
  assert.match(componentSource, /showPromptFormDialog/);
  assert.match(componentSource, /role="dialog"/);
  assert.match(componentSource, /aria-label=\{form\.id \? '编辑提示词' : '新建提示词'\}/);
  assert.match(componentSource, /fixed inset-0 z-50 flex items-center justify-center/);
  assert.match(componentSource, /max-h-\[92vh\]/);
  assert.match(componentSource, /overflow-y-auto/);
  assert.doesNotMatch(componentSource, /items-start justify-center[\s\S]*md:items-center/);
  assert.doesNotMatch(componentSource, /showAdminPanel && \([\s\S]*提示词管理[\s\S]*完整提示工程[\s\S]*<\/section>/);
});

runTest('prompt gallery page explains upload failures and storage mode', () => {
  assert.match(componentSource, /getPromptImageUploadErrorMessage/);
  assert.match(componentSource, /HEIC\/HEIF/);
  assert.match(componentSource, /JPG、PNG 或 WebP/);
  assert.match(componentSource, /storageMode/);
  assert.match(componentSource, /Vercel Blob/);
  assert.match(componentSource, /KV 回退/);
});

runTest('prompt gallery page fetches list and detail separately', () => {
  assert.match(componentSource, /fetch\('\/api\/prompts'/);
  assert.match(componentSource, /response\.text\(\)/);
  assert.match(componentSource, /JSON\.parse/);
  assert.match(componentSource, /callPromptGalleryApi\('list'/);
  assert.match(componentSource, /callPromptGalleryApi\('detail'/);
  assert.match(componentSource, /callPromptGalleryApi\(form\.id \? 'update' : 'create'/);
  assert.match(componentSource, /callPromptGalleryApi\('delete'/);
});

runTest('prompt gallery list cards stay on thumbnails and details use full images', () => {
  assert.match(componentSource, /src=\{item\.coverImage\}/);
  assert.match(componentSource, /src=\{getImageSource\(activeImage\)\}/);
  assert.match(componentSource, /src=\{getImageThumbnail\(image\)\}/);
});

runTest('prompt gallery exposes model filters from the list API', () => {
  assert.match(componentSource, /availableModels/);
  assert.match(componentSource, /setAvailableModels\(data\.models \|\| \[\]\)/);
  assert.match(componentSource, /activeModel/);
  assert.match(componentSource, /model: activeModel/);
  assert.match(componentSource, /全部模型/);
});

runTest('prompt gallery automatically loads more entries near the bottom', () => {
  assert.match(componentSource, /useRef/);
  assert.match(componentSource, /loadMoreRef/);
  assert.match(componentSource, /IntersectionObserver/);
  assert.match(componentSource, /observer\.observe\(sentinel\)/);
  assert.match(componentSource, /loadList\(false\)/);
  assert.doesNotMatch(componentSource, /<button[\s\S]*onClick=\{\(\) => loadList\(false\)\}[\s\S]*加载更多[\s\S]*<\/button>/);
});

runTest('prompt gallery page includes prompt copy and multi-image detail controls', () => {
  assert.match(componentSource, /navigator\.clipboard\.writeText/);
  assert.match(componentSource, /复制提示词/);
  assert.match(componentSource, /activeImageIndex/);
  assert.doesNotMatch(componentSource, /negativePrompt/);
  assert.doesNotMatch(componentSource, /负面提示词/);
  assert.doesNotMatch(componentSource, /sourceUrl/);
  assert.doesNotMatch(componentSource, /category/);
  assert.doesNotMatch(componentSource, /note/);
  assert.doesNotMatch(componentSource, /分类|来源|备注/);
});

runTest('prompt detail dialog keeps admin edit and delete actions in the header', () => {
  assert.match(componentSource, /aria-label="编辑提示词"/);
  assert.match(componentSource, /aria-label="删除提示词"/);
  assert.match(componentSource, /onClick=\{\(\) => startEdit\(selectedEntry\)\}/);
  assert.match(componentSource, /onClick=\{\(\) => handleDelete\(selectedEntry\.id\)\}/);
  assert.doesNotMatch(componentSource, /border-t border-black\/10 p-4[\s\S]*<Edit3 size=\{16\} \/> 编辑/);
});

runTest('prompt detail dialog keeps the image compact and sticky on narrow screens', () => {
  assert.match(componentSource, /overflow-y-auto lg:overflow-hidden/);
  assert.match(componentSource, /sticky top-0 z-20/);
  assert.match(componentSource, /max-h-\[38vh\]/);
  assert.match(componentSource, /lg:max-h-\[66vh\]/);
  assert.match(componentSource, /min-h-\[52vh\]/);
  assert.match(componentSource, /overflow-y-visible lg:overflow-y-auto/);
});

runTest('prompt detail image uses a soft preview backdrop instead of plain black space', () => {
  assert.match(componentSource, /aria-hidden="true"/);
  assert.match(componentSource, /blur-2xl/);
  assert.match(componentSource, /scale-110/);
  assert.match(componentSource, /object-cover/);
  assert.match(componentSource, /object-contain/);
});

runTest('prompt detail image can open an enlarged image dialog', () => {
  assert.match(componentSource, /imagePreviewOpen/);
  assert.match(componentSource, /aria-label="放大图片"/);
  assert.match(componentSource, /aria-modal="true"/);
  assert.match(componentSource, /z-\[60\]/);
  assert.match(componentSource, /关闭放大图片/);
});

runTest('prompt gallery uses a quiet morning paper background without streaming-light copy', () => {
  assert.match(componentSource, /bg-\[#fff8ed\]/);
  assert.match(componentSource, /bg-\[#f8efe0\]/);
  assert.match(componentSource, /radial-gradient\(circle_at_12%_8%/);
  assert.doesNotMatch(componentSource, /流光/);
});
