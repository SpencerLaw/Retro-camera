const GITHUB_TEMPLATE_ROOT = 'https://raw.githubusercontent.com/teslamotors/custom-wraps/master';

export const TESLA_MODEL_TEMPLATES = [
  { id: 'cybertruck', label: '赛博越野旅行车', templateUrl: `${GITHUB_TEMPLATE_ROOT}/cybertruck/template.png` },
  { id: 'model3', label: '三型车', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3/template.png` },
  { id: 'model3-2024-base', label: '三型车 2024 基础版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3-2024-base/template.png` },
  { id: 'model3-2024-performance', label: '三型车 2024 高性能版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3-2024-performance/template.png` },
  { id: 'modely', label: 'Y 型车', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely/template.png` },
  { id: 'modely-2025-base', label: 'Y 型车 2025 基础版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-base/template.png` },
  { id: 'modely-2025-premium', label: 'Y 型车 2025 高级版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-premium/template.png` },
  { id: 'modely-2025-performance', label: 'Y 型车 2025 高性能版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-performance/template.png` },
  { id: 'modely-l', label: 'Y 型长轴版', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-l/template.png` },
];

const ALL_MODEL_IDS = TESLA_MODEL_TEMPLATES.map((template) => template.id);
const MODEL_Y_2025_IDS = ['modely-2025-base', 'modely-2025-premium', 'modely-2025-performance'];

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
