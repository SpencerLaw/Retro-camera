const GITHUB_TEMPLATE_ROOT = 'https://raw.githubusercontent.com/teslamotors/custom-wraps/master';
const EXTERNAL_PREVIEW_MODEL_ROOT = 'https://teslawrapgallery.com/tesla_3d_models';
const OBJ_PREVIEW_MODEL_ROOT = 'https://raw.githubusercontent.com/GewoonJaap/custom-tesla-wraps/master';

function createTeslaTemplate(id, label, previewModelFile = null, previewObjFolder = id) {
  return {
    id,
    label,
    templateUrl: `${GITHUB_TEMPLATE_ROOT}/${id}/template.png`,
    vehicleImageUrl: `${GITHUB_TEMPLATE_ROOT}/${id}/vehicle_image.png`,
    previewModelUrl: previewModelFile ? `${EXTERNAL_PREVIEW_MODEL_ROOT}/${previewModelFile}` : null,
    previewModelFile,
    previewObjUrl: previewObjFolder ? `${OBJ_PREVIEW_MODEL_ROOT}/${previewObjFolder}/vehicle.obj` : null,
    previewMtlUrl: previewObjFolder ? `${OBJ_PREVIEW_MODEL_ROOT}/${previewObjFolder}/vehicle.mtl` : null,
  };
}

export const TESLA_MODEL_TEMPLATES = [
  createTeslaTemplate('model3', 'Model 3（2024前）', 'Model3_High.gltf'),
  createTeslaTemplate('model3-2024-base', 'Model 3（2024+）标准/长续航', 'Poppyseed.gltf'),
  createTeslaTemplate('modely', 'Model Y（2025前）', 'ModelY_High.gltf'),
  createTeslaTemplate('modely-2025-base', 'Model Y（2025+）标准版', 'BayberryE41.gltf'),
  createTeslaTemplate('modely-2025-premium', 'Model Y（2025+）长续航', 'Bayberry.gltf'),
];

const MODEL_Y_2025_IDS = ['modely-2025-base', 'modely-2025-premium'];
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
const MODEL_3_Y_OFFICIAL_EXAMPLE_FILES = [
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

const OFFICIAL_EXAMPLE_FILES_BY_TEMPLATE = {
  model3: MODEL_3_Y_OFFICIAL_EXAMPLE_FILES,
  'model3-2024-base': MODEL_3_Y_OFFICIAL_EXAMPLE_FILES,
  modely: MODEL_3_Y_OFFICIAL_EXAMPLE_FILES,
  'modely-2025-base': MODEL_3_Y_OFFICIAL_EXAMPLE_FILES,
  'modely-2025-premium': MODEL_3_Y_OFFICIAL_EXAMPLE_FILES,
};
const OFFICIAL_EXAMPLE_TITLE_MAP = {
  Acid_Drip: '酸液流光',
  Ani: '动漫拼贴',
  Apocalypse: '废土风暴',
  Avocado_Green: '牛油果绿',
  Camo: '迷彩图案',
  Cosmic_Burst: '宇宙爆发',
  Divide: '双色分割',
  Doge: '趣味狗狗',
  Dot_Matrix: '点阵黑白',
  Ice_Cream: '冰淇淋色',
  Leopard: '豹纹',
  Pixel_Art: '像素艺术',
  Reindeer: '驯鹿节日',
  Rudi: '鲁迪节日',
  Sakura: '樱花粉绘',
  Sketch: '手绘线稿',
  String_Lights: '节日灯串',
  Valentine: '情人节',
  Vintage_Gradient: '复古渐变',
  Vintage_Stripes: '复古彩条',
};

export function getTeslaTemplateById(id) {
  return TESLA_MODEL_TEMPLATES.find((template) => template.id === id) || TESLA_MODEL_TEMPLATES[0];
}

function getOfficialExampleFilesForTemplate(templateId) {
  return OFFICIAL_EXAMPLE_FILES_BY_TEMPLATE[templateId] || [];
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

  return [...officialExamples, ...localExamples];
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
