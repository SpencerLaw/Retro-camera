const GITHUB_TEMPLATE_ROOT = 'https://raw.githubusercontent.com/teslamotors/custom-wraps/master';

function createTeslaTemplate(id, label) {
  return {
    id,
    label,
    templateUrl: `${GITHUB_TEMPLATE_ROOT}/${id}/template.png`,
    vehicleImageUrl: `${GITHUB_TEMPLATE_ROOT}/${id}/vehicle_image.png`,
  };
}

export const TESLA_MODEL_TEMPLATES = [
  createTeslaTemplate('cybertruck', '赛博越野旅行车'),
  createTeslaTemplate('model3', '三型车'),
  createTeslaTemplate('model3-2024-base', '三型车 2024 基础版'),
  createTeslaTemplate('model3-2024-performance', '三型车 2024 高性能版'),
  createTeslaTemplate('modely', 'Y 型车'),
  createTeslaTemplate('modely-2025-base', 'Y 型车 2025 基础版'),
  createTeslaTemplate('modely-2025-premium', 'Y 型车 2025 高级版'),
  createTeslaTemplate('modely-2025-performance', 'Y 型车 2025 高性能版'),
  createTeslaTemplate('modely-l', 'Y 型长轴版'),
];

const ALL_MODEL_IDS = TESLA_MODEL_TEMPLATES.map((template) => template.id);
const MODEL_Y_2025_IDS = ['modely-2025-base', 'modely-2025-premium', 'modely-2025-performance'];
const LOCAL_ORIGINAL_EXAMPLE_WRAPS = [
  {
    id: 'animal-city-patrol-modely-2025',
    title: '动物城市巡游',
    fileName: 'animal-city-patrol-modely-2025.png',
    imageUrl: '/tsl-skins/animal-city-patrol-modely-2025.png',
    modelIds: MODEL_Y_2025_IDS,
    sourceLabel: '原创可商用样张',
  },
];
const COMMON_OFFICIAL_EXAMPLE_FILES = [
  'Acid_Drip.png',
  'Ani.png',
  'Apocalypse.png',
  'Avocado_Green.png',
  'Camo.png',
  'Cosmic_Burst.png',
  'Divide.png',
  'Doge.png',
  'Dot_Matrix.png',
  'Ice_Cream.png',
  'Leopard.png',
  'Pixel_Art.png',
  'Reindeer.png',
  'Rudi.png',
  'Sakura.png',
  'Sketch.png',
  'String_Lights.png',
  'Valentine.png',
  'Vintage_Gradient.png',
  'Vintage_Stripes.png',
];
const CYBERTRUCK_OFFICIAL_EXAMPLE_FILES = [
  'Ani.png',
  'Camo_Blue.png',
  'Camo_Brown.png',
  'Camo_Green.png',
  'Camo_Pink.png',
  'Camo_Sand.png',
  'Camo_Snow.png',
  'Camo_Stealth.png',
  'Clay.png',
  'Cosmic_Burst.png',
  'Digital_Camo_Green.png',
  'Digital_Camo_Snow.png',
  'Digital_Camo_Stealth.png',
  'Doge_Camo.png',
  'Gradient_Black.png',
  'Gradient_Burn.png',
  'Gradient_Cotton_Candy.png',
  'Gradient_Green.png',
  'Gradient_Purple_Burn.png',
  'Gradient_Sunburst.png',
  'Graffiti_back.png',
  'Graffiti_green.png',
  'Graffiti_orange.png',
  'Grandmas_Sofa.png',
  'Houndstooth.png',
  'Leopard.png',
  'Mika.png',
  'Rc_prototype.png',
  'Retro.png',
  'Rudi.png',
  'Rust.png',
  'Valentine.png',
  'Woody.png',
  'Xmas_Camo.png',
  'Xmas_Lights.png',
  'Xray.png',
];
const OFFICIAL_EXAMPLE_TITLE_MAP = {
  Acid_Drip: '酸液流光',
  Ani: '动漫拼贴',
  Apocalypse: '废土风暴',
  Avocado_Green: '牛油果绿',
  Camo: '迷彩图案',
  Camo_Blue: '蓝色迷彩',
  Camo_Brown: '棕色迷彩',
  Camo_Green: '绿色迷彩',
  Camo_Pink: '粉色迷彩',
  Camo_Sand: '沙色迷彩',
  Camo_Snow: '雪地迷彩',
  Camo_Stealth: '隐形迷彩',
  Clay: '陶土质感',
  Cosmic_Burst: '宇宙爆发',
  Digital_Camo_Green: '数码绿迷彩',
  Digital_Camo_Snow: '数码雪地迷彩',
  Digital_Camo_Stealth: '数码隐形迷彩',
  Divide: '双色分割',
  Doge: '趣味狗狗',
  Doge_Camo: '狗狗迷彩',
  Dot_Matrix: '点阵黑白',
  Gradient_Black: '黑色渐变',
  Gradient_Burn: '火焰渐变',
  Gradient_Cotton_Candy: '糖果渐变',
  Gradient_Green: '绿色渐变',
  Gradient_Purple_Burn: '紫焰渐变',
  Gradient_Sunburst: '日落渐变',
  Graffiti_back: '涂鸦背板',
  Graffiti_green: '绿色涂鸦',
  Graffiti_orange: '橙色涂鸦',
  Grandmas_Sofa: '复古沙发',
  Houndstooth: '千鸟格',
  Ice_Cream: '冰淇淋色',
  Leopard: '豹纹',
  Mika: '米卡涂装',
  Pixel_Art: '像素艺术',
  Rc_prototype: '原型遥控',
  Reindeer: '驯鹿节日',
  Retro: '复古条纹',
  Rudi: '鲁迪节日',
  Rust: '锈蚀金属',
  Sakura: '樱花粉绘',
  Sketch: '手绘线稿',
  String_Lights: '节日灯串',
  Valentine: '情人节',
  Vintage_Gradient: '复古渐变',
  Vintage_Stripes: '复古彩条',
  Woody: '木纹旅行',
  Xmas_Camo: '圣诞迷彩',
  Xmas_Lights: '圣诞灯光',
  Xray: '透视蓝图',
};

export const SKIN_CATALOG_PRODUCTS = [
  {
    id: 'apex-redline',
    title: '红线竞速',
    priceCents: 200,
    modelIds: ALL_MODEL_IDS,
    assetKind: '原创样张',
    tier: '单张',
    deliveryLabel: '单张下载 2 元',
    accentColor: '#e82127',
    previewLabel: '红白赛车线条',
    previewColors: ['#e82127', '#f8fafc', '#0f172a'],
    description: '适合小红书展示的红白竞速风格，点击即可加入画布预览。',
  },
  {
    id: 'cyber-grid',
    title: '赛博网格',
    priceCents: 200,
    modelIds: ALL_MODEL_IDS,
    assetKind: '原创样张',
    tier: '单张',
    deliveryLabel: '单张下载 2 元',
    accentColor: '#38bdf8',
    previewLabel: '蓝色科技网格',
    previewColors: ['#38bdf8', '#0f172a', '#f8fafc'],
    description: '科技感网格线条，适合深色和浅色车身预览。',
  },
  {
    id: 'y-satin-wave',
    title: '丝缎流线',
    priceCents: 999,
    modelIds: MODEL_Y_2025_IDS,
    assetKind: '原创样张',
    tier: '五张',
    deliveryLabel: '五张打包 9.99 元',
    accentColor: '#14b8a6',
    previewLabel: '青色流线图案',
    previewColors: ['#14b8a6', '#f8fafc', '#3e6ae1'],
    description: '适合新款车型的流线图案，可作为五张打包里的展示款。',
  },
];

export const DOWNLOAD_PRICE_TIERS = [
  {
    id: 'single',
    title: '单张下载',
    priceCents: 200,
    detail: '2 元任选一张皮肤，适合小红书单款成交。',
  },
  {
    id: 'five-pack',
    title: '五张打包',
    priceCents: 999,
    detail: '9.99 元任选五张，适合做合集和促销。',
  },
  {
    id: 'custom',
    title: '自定义设计',
    priceCents: 3000,
    detail: '30 元支持用户发图或描述，你再帮他做专属版本。',
  },
];

export function getTeslaTemplateById(id) {
  return TESLA_MODEL_TEMPLATES.find((template) => template.id === id) || TESLA_MODEL_TEMPLATES[0];
}

export function getCatalogProductsForTemplate(templateId) {
  return SKIN_CATALOG_PRODUCTS.filter((product) => product.modelIds.includes(templateId));
}

function getOfficialExampleFilesForTemplate(templateId) {
  return templateId === 'cybertruck' ? CYBERTRUCK_OFFICIAL_EXAMPLE_FILES : COMMON_OFFICIAL_EXAMPLE_FILES;
}

function getOfficialExampleTitle(fileName) {
  const key = fileName.replace(/\.png$/i, '');
  return OFFICIAL_EXAMPLE_TITLE_MAP[key] || '官方示例';
}

export function getOfficialExampleWrapsForTemplate(templateId) {
  const template = getTeslaTemplateById(templateId);
  const localExamples = LOCAL_ORIGINAL_EXAMPLE_WRAPS.filter((example) => example.modelIds.includes(template.id));
  const officialExamples = getOfficialExampleFilesForTemplate(template.id).map((fileName) => ({
    id: `${template.id}-${fileName.replace(/\.png$/i, '').toLowerCase().replace(/_/g, '-')}`,
    title: getOfficialExampleTitle(fileName),
    fileName,
    imageUrl: `${GITHUB_TEMPLATE_ROOT}/${template.id}/example/${fileName}`,
    modelIds: [template.id],
    sourceLabel: '特斯拉官方示例',
  }));

  return [...localExamples, ...officialExamples];
}

export function formatPriceCents(cents) {
  const amount = Number(cents || 0) / 100;
  return `¥${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function createSkinLayer(id, image) {
  return {
    id,
    image,
    x: 512,
    y: 512,
    scale: 1,
    rotation: 0,
    opacity: 1,
    flipX: false,
    clipMode: 'body',
  };
}

function buildTslSkinSlug(modelLabel) {
  const slug = String(modelLabel || 'tesla')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'tesla';
}

export function buildTslSkinFileName(modelLabel, timestamp = Date.now()) {
  return `tsl-skin-${buildTslSkinSlug(modelLabel)}-${timestamp}.png`;
}

export function buildTslSkinZipFileName(modelLabel, timestamp = Date.now()) {
  return `tsl-skin-${buildTslSkinSlug(modelLabel)}-${timestamp}.zip`;
}

export function buildWrapInstallGuide({ modelLabel, fileName = 'wrap.png' } = {}) {
  return [
    '特斯拉车机皮肤导出包',
    '',
    `车型：${modelLabel || '特斯拉'}`,
    `图片文件：${fileName}`,
    '',
    '使用方法：',
    '1. 把 wrap.png 复制到 U盘 / U 盘里的特斯拉皮肤文件夹。',
    '2. 文件名尽量保持为 wrap.png，方便车机识别。',
    '3. 插入车辆后，在车机皮肤设置里选择自定义皮肤。',
    '',
    '本下载包由浏览器本地生成，不会上传服务器。',
  ].join('\n');
}

const CRC_TABLE = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeZipText(value) {
  return new TextEncoder().encode(String(value));
}

function toZipBytes(data) {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return encodeZipText(data);
}

function writeUint16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

export function createStoredZip(files) {
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;

  files.forEach((file) => {
    const nameBytes = encodeZipText(file.name);
    const dataBytes = toZipBytes(file.data);
    const checksum = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);

    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, localOffset);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);

    localOffset += localHeader.length + dataBytes.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, localOffset);
  writeUint16(endRecord, 20, 0);

  return concatBytes([...localChunks, centralDirectory, endRecord]);
}
