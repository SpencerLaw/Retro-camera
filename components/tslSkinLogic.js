const GITHUB_TEMPLATE_ROOT = 'https://raw.githubusercontent.com/teslamotors/custom-wraps/master';

export const TESLA_MODEL_TEMPLATES = [
  { id: 'cybertruck', label: 'Cybertruck', templateUrl: `${GITHUB_TEMPLATE_ROOT}/cybertruck/template.png` },
  { id: 'model3', label: 'Model 3', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3/template.png` },
  { id: 'model3-2024-base', label: 'Model 3 2024 Base', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3-2024-base/template.png` },
  { id: 'model3-2024-performance', label: 'Model 3 2024 Performance', templateUrl: `${GITHUB_TEMPLATE_ROOT}/model3-2024-performance/template.png` },
  { id: 'modely', label: 'Model Y', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely/template.png` },
  { id: 'modely-2025-base', label: 'Model Y 2025 Base', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-base/template.png` },
  { id: 'modely-2025-premium', label: 'Model Y 2025 Premium', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-premium/template.png` },
  { id: 'modely-2025-performance', label: 'Model Y 2025 Performance', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-2025-performance/template.png` },
  { id: 'modely-l', label: 'Model Y L', templateUrl: `${GITHUB_TEMPLATE_ROOT}/modely-l/template.png` },
];

const ALL_MODEL_IDS = TESLA_MODEL_TEMPLATES.map((template) => template.id);
const MODEL_Y_2025_IDS = ['modely-2025-base', 'modely-2025-premium', 'modely-2025-performance'];

export const SKIN_CATALOG_PRODUCTS = [
  {
    id: 'apex-redline',
    title: 'Apex Redline',
    priceCents: 0,
    modelIds: ALL_MODEL_IDS,
    assetKind: 'procedural',
    tier: 'free',
    deliveryLabel: 'Free PNG sample',
    accentColor: '#e82127',
    previewLabel: 'Race stripe',
    previewColors: ['#e82127', '#f8fafc', '#0f172a'],
    description: 'Sharp race stripe layer for quick previews and paid starter packs.',
  },
  {
    id: 'cyber-grid',
    title: 'Cyber Grid',
    priceCents: 4900,
    modelIds: ALL_MODEL_IDS,
    assetKind: 'procedural',
    tier: 'premium',
    deliveryLabel: 'Instant PNG download',
    accentColor: '#38bdf8',
    previewLabel: 'Tech grid',
    previewColors: ['#38bdf8', '#0f172a', '#f8fafc'],
    description: 'Technical grid pattern that works well on bright and dark body colors.',
  },
  {
    id: 'y-satin-wave',
    title: 'Model Y Satin Wave',
    priceCents: 6900,
    modelIds: MODEL_Y_2025_IDS,
    assetKind: 'procedural',
    tier: 'premium',
    deliveryLabel: 'Instant PNG download',
    accentColor: '#14b8a6',
    previewLabel: 'Satin wave',
    previewColors: ['#14b8a6', '#f8fafc', '#3e6ae1'],
    description: 'Flowing side graphic tuned for the 2025 Model Y family.',
  },
];

export const CUSTOM_WRAP_PACKAGES = [
  {
    id: 'quick-polish',
    title: 'Quick Polish',
    priceCents: 9900,
    tier: 'custom',
    revisionCount: 1,
    turnaroundLabel: '24-48h',
    features: ['Color match', 'One uploaded logo', 'Export-ready PNG'],
  },
  {
    id: 'full-custom',
    title: 'Full Custom',
    priceCents: 29900,
    tier: 'custom',
    revisionCount: 2,
    turnaroundLabel: '3-5 days',
    features: ['Full body concept', 'Two revisions', 'Commercial-use delivery file'],
  },
  {
    id: 'brand-drop',
    title: 'Brand Drop',
    priceCents: 59900,
    tier: 'custom',
    revisionCount: 3,
    turnaroundLabel: '5-7 days',
    features: ['Campaign mini pack', 'Three model exports', 'Priority designer support'],
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

export function calculateCustomOrderQuote(options = {}) {
  const packageItem =
    CUSTOM_WRAP_PACKAGES.find((item) => item.id === options.packageId) || CUSTOM_WRAP_PACKAGES[0];
  const extraRevisionCount = Math.max(0, Number(options.extraRevisionCount || 0));
  const basePriceCents = packageItem.priceCents;
  const extraRevisionCents = extraRevisionCount * 3000;
  const rushCents = options.rush ? 8000 : 0;

  return {
    packageId: packageItem.id,
    basePriceCents,
    extraRevisionCents,
    rushCents,
    totalCents: basePriceCents + extraRevisionCents + rushCents,
  };
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
    'TSL Skin export package',
    '',
    `Model: ${modelLabel || 'Tesla'}`,
    `Wrap file: ${fileName}`,
    '',
    'Install guide:',
    '1. Copy wrap.png to your USB drive Custom Wraps / Wraps folder.',
    '2. Keep the file name as wrap.png unless your vehicle software asks for another name.',
    '3. Insert the U盘 / U 盘 into the Tesla and select the custom wrap from Paint Shop.',
    '',
    'Privacy:',
    'This package is generated in your browser locally. Images are not uploaded to a server.',
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
