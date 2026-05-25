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
    priceCents: 2900,
    modelIds: ALL_MODEL_IDS,
    assetKind: 'procedural',
    deliveryLabel: 'Instant PNG download',
    accentColor: '#e82127',
    description: 'Sharp race stripe layer for quick previews and paid starter packs.',
  },
  {
    id: 'cyber-grid',
    title: 'Cyber Grid',
    priceCents: 4900,
    modelIds: ALL_MODEL_IDS,
    assetKind: 'procedural',
    deliveryLabel: 'Instant PNG download',
    accentColor: '#38bdf8',
    description: 'Technical grid pattern that works well on bright and dark body colors.',
  },
  {
    id: 'y-satin-wave',
    title: 'Model Y Satin Wave',
    priceCents: 6900,
    modelIds: MODEL_Y_2025_IDS,
    assetKind: 'procedural',
    deliveryLabel: 'Instant PNG download',
    accentColor: '#14b8a6',
    description: 'Flowing side graphic tuned for the 2025 Model Y family.',
  },
];

export const CUSTOM_WRAP_PACKAGES = [
  {
    id: 'quick-polish',
    title: 'Quick Polish',
    priceCents: 9900,
    revisionCount: 1,
    turnaroundLabel: '24-48h',
    features: ['Color match', 'One uploaded logo', 'Export-ready PNG'],
  },
  {
    id: 'full-custom',
    title: 'Full Custom',
    priceCents: 29900,
    revisionCount: 2,
    turnaroundLabel: '3-5 days',
    features: ['Full body concept', 'Two revisions', 'Commercial-use delivery file'],
  },
  {
    id: 'brand-drop',
    title: 'Brand Drop',
    priceCents: 59900,
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
  };
}

export function buildTslSkinFileName(modelLabel, timestamp = Date.now()) {
  const slug = String(modelLabel || 'tesla')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `tsl-skin-${slug || 'tesla'}-${timestamp}.png`;
}
