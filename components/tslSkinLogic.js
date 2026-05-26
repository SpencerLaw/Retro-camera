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

export function getTeslaTemplateById(id) {
  return TESLA_MODEL_TEMPLATES.find((template) => template.id === id) || TESLA_MODEL_TEMPLATES[0];
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
