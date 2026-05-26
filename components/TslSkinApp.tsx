import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FlipHorizontal,
  Layers,
  Palette,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildTslSkinFileName,
  buildTslSkinZipFileName,
  buildWrapInstallGuide,
  createStoredZip,
  createSkinLayer,
  DOWNLOAD_PRICE_TIERS,
  EXTERNAL_WRAP_SOURCES,
  formatPriceCents,
  getCatalogProductsForTemplate,
  getOfficialExampleWrapsForTemplate,
  getTeslaTemplateById,
  SKIN_CATALOG_PRODUCTS,
  TESLA_MODEL_TEMPLATES,
} from './tslSkinLogic.js';

export type TeslaModelTemplate = {
  id: string;
  label: string;
  templateUrl: string;
  vehicleImageUrl: string;
};

export type SkinLayer = {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  clipMode: 'body' | 'full';
  name: string;
};

type SkinCatalogProduct = {
  id: string;
  title: string;
  priceCents: number;
  modelIds: string[];
  assetKind: string;
  tier: '单张' | '五张';
  deliveryLabel: string;
  accentColor: string;
  previewLabel: string;
  previewColors: string[];
  description: string;
};

type DownloadPriceTier = {
  id: string;
  title: string;
  priceCents: number;
  detail: string;
};

type OfficialWrapExample = {
  id: string;
  title: string;
  fileName: string;
  imageUrl: string;
  modelIds: string[];
  sourceLabel: string;
};

type ExternalWrapSource = {
  id: string;
  title: string;
  url: string;
  accessNote: string;
  usageNote: string;
  actionLabel: string;
};

type WorkspaceMode = 'download' | 'design';

type DragState = {
  layerId: string;
  startX: number;
  startY: number;
  layerX: number;
  layerY: number;
};

type ImageCropBounds = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

type ImageSampleColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const PRESET_COLORS = [
  '#ffffff',
  '#111827',
  '#e82127',
  '#3e6ae1',
  '#f5d0fe',
  '#14b8a6',
  '#fbbf24',
  '#cbd5e1',
];

const HANDLE_SIZE = 12;

function generateBodyMask(image: HTMLImageElement) {
  const width = image.naturalWidth || image.width || 1024;
  const height = image.naturalHeight || image.height || 1024;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;

  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    return sourceCanvas;
  }

  sourceContext.drawImage(image, 0, 0, width, height);
  const sourcePixels = sourceContext.getImageData(0, 0, width, height).data;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) {
    return maskCanvas;
  }

  const mask = maskContext.createImageData(width, height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = sourcePixels[offset];
    const g = sourcePixels[offset + 1];
    const b = sourcePixels[offset + 2];
    const a = sourcePixels[offset + 3];
    const isBodyPixel = a > 40 && r > 45 && g > 45 && b > 45;

    if (isBodyPixel) {
      mask.data[offset] = 255;
      mask.data[offset + 1] = 255;
      mask.data[offset + 2] = 255;
      mask.data[offset + 3] = 255;
    }
  }

  maskContext.putImageData(mask, 0, 0);
  return maskCanvas;
}

function getLayerSize(layer: SkinLayer) {
  return {
    width: (layer.image.naturalWidth || layer.image.width) * layer.scale,
    height: (layer.image.naturalHeight || layer.image.height) * layer.scale,
  };
}

function isPointInLayer(layer: SkinLayer, x: number, y: number) {
  const dx = x - layer.x;
  const dy = y - layer.y;
  const cos = Math.cos(-layer.rotation);
  const sin = Math.sin(-layer.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  const { width, height } = getLayerSize(layer);

  return Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2;
}

function drawLayer(context: CanvasRenderingContext2D, layer: SkinLayer) {
  const { width, height } = getLayerSize(layer);

  context.save();
  context.globalAlpha = layer.opacity;
  context.translate(layer.x, layer.y);
  context.rotate(layer.rotation);
  context.scale(layer.flipX ? -1 : 1, 1);
  context.drawImage(layer.image, -width / 2, -height / 2, width, height);
  context.restore();
}

function drawSelection(context: CanvasRenderingContext2D, layer: SkinLayer) {
  const { width, height } = getLayerSize(layer);

  context.save();
  context.translate(layer.x, layer.y);
  context.rotate(layer.rotation);
  context.strokeStyle = '#38bdf8';
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.strokeRect(-width / 2, -height / 2, width, height);
  context.setLineDash([]);
  context.fillStyle = '#f8fafc';
  context.strokeStyle = '#0f172a';

  [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [-width / 2, height / 2],
    [width / 2, height / 2],
  ].forEach(([x, y]) => {
    context.fillRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    context.strokeRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  });

  context.restore();
}

function getCanvasCoords(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawCatalogPattern(context: CanvasRenderingContext2D, product: SkinCatalogProduct, color: string) {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);

  if (product.id === 'apex-redline') {
    context.strokeStyle = product.accentColor;
    context.lineWidth = 44;
    context.globalAlpha = 0.96;
    context.beginPath();
    context.moveTo(width * 0.08, height * 0.26);
    context.lineTo(width * 0.92, height * 0.74);
    context.stroke();
    context.strokeStyle = '#f8fafc';
    context.lineWidth = 14;
    context.beginPath();
    context.moveTo(width * 0.16, height * 0.24);
    context.lineTo(width * 0.98, height * 0.71);
    context.stroke();
    context.globalAlpha = 1;
    return;
  }

  if (product.id === 'cyber-grid') {
    context.strokeStyle = product.accentColor;
    context.lineWidth = 2;
    context.globalAlpha = 0.32;
    for (let x = 64; x < width; x += 72) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 160, height);
      context.stroke();
    }
    for (let y = 80; y < height; y += 86) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y - 110);
      context.stroke();
    }
    context.globalAlpha = 0.9;
    context.strokeStyle = '#f8fafc';
    context.lineWidth = 5;
    context.strokeRect(width * 0.18, height * 0.32, width * 0.64, height * 0.26);
    context.globalAlpha = 1;
    return;
  }

  const gradient = context.createLinearGradient(0, height * 0.3, width, height * 0.7);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.45, product.accentColor);
  gradient.addColorStop(1, '#f8fafc');
  context.strokeStyle = gradient;
  context.lineWidth = 46;
  context.lineCap = 'round';
  context.globalAlpha = 0.82;
  context.beginPath();
  context.moveTo(width * 0.05, height * 0.64);
  context.bezierCurveTo(width * 0.28, height * 0.32, width * 0.56, height * 0.85, width * 0.95, height * 0.42);
  context.stroke();
  context.globalAlpha = 0.55;
  context.lineWidth = 18;
  context.beginPath();
  context.moveTo(width * 0.08, height * 0.7);
  context.bezierCurveTo(width * 0.34, height * 0.46, width * 0.64, height * 0.9, width * 0.98, height * 0.52);
  context.stroke();
  context.globalAlpha = 1;
}

function createCatalogProductImage(product: SkinCatalogProduct, color: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('画布不可用。'));
      return;
    }

    drawCatalogPattern(context, product, color);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图案预览生成失败。'));
    image.src = canvas.toDataURL('image/png');
  });
}

function loadRemoteWrapImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('官方示例加载失败。'));
    image.src = url;
  });
}

function getCanvasPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('画布导出失败。'));
        return;
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, 'image/png');
  });
}

function getSourceImageSize(image: HTMLCanvasElement | HTMLImageElement) {
  return {
    width: image instanceof HTMLCanvasElement ? image.width : image.naturalWidth || image.width,
    height: image instanceof HTMLCanvasElement ? image.height : image.naturalHeight || image.height,
  };
}

function getPixelSample(pixels: Uint8ClampedArray, width: number, x: number, y: number): ImageSampleColor {
  const offset = (y * width + x) * 4;
  return {
    r: pixels[offset],
    g: pixels[offset + 1],
    b: pixels[offset + 2],
    a: pixels[offset + 3],
  };
}

function getImageBackgroundSample(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ImageSampleColor {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];

  const total = points.reduce(
    (sum, [x, y]) => {
      const sample = getPixelSample(pixels, width, x, y);
      return {
        r: sum.r + sample.r,
        g: sum.g + sample.g,
        b: sum.b + sample.b,
        a: sum.a + sample.a,
      };
    },
    { r: 0, g: 0, b: 0, a: 0 },
  );

  return {
    r: total.r / points.length,
    g: total.g / points.length,
    b: total.b / points.length,
    a: total.a / points.length,
  };
}

function getBackgroundDistance(sample: ImageSampleColor, background: ImageSampleColor) {
  return (
    Math.abs(sample.r - background.r) +
    Math.abs(sample.g - background.g) +
    Math.abs(sample.b - background.b) +
    Math.abs(sample.a - background.a) * 0.5
  );
}

function getVisibleImageBounds(image: HTMLCanvasElement | HTMLImageElement): ImageCropBounds | null {
  const { width, height } = getSourceImageSize(image);
  if (!width || !height) {
    return null;
  }

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = width;
  scanCanvas.height = height;
  const scanContext = scanCanvas.getContext('2d', { willReadFrequently: true });
  if (!scanContext) {
    return null;
  }

  scanContext.drawImage(image, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = scanContext.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const step = Math.max(1, Math.floor(Math.max(width, height) / 900));
  const backgroundSample = getImageBackgroundSample(pixels, width, height);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const sample = getPixelSample(pixels, width, x, y);
      const backgroundDistance = getBackgroundDistance(sample, backgroundSample);
      const isForegroundPixel = sample.a > 12 && backgroundDistance > 54;
      if (!isForegroundPixel) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const padding = 12;
  const sx = Math.max(0, minX - padding);
  const sy = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding);
  const bottom = Math.min(height, maxY + padding);

  return {
    sx,
    sy,
    sw: right - sx,
    sh: bottom - sy,
  };
}

const TslSkinApp: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const vehiclePreviewCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const galleryPreviewCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const vehicleImageBoundsRef = React.useRef<ImageCropBounds | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('modely-2025-premium');
  const [templateImage, setTemplateImage] = React.useState<HTMLImageElement | null>(null);
  const [vehicleImage, setVehicleImage] = React.useState<HTMLImageElement | null>(null);
  const [wrapColor, setWrapColor] = React.useState('#ffffff');
  const [layers, setLayers] = React.useState<SkinLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [clipToBody, setClipToBody] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [activeWorkspace, setActiveWorkspace] = React.useState<WorkspaceMode>('download');
  const [isDayMode, setIsDayMode] = React.useState(true);
  const [selectedGalleryExample, setSelectedGalleryExample] = React.useState<OfficialWrapExample | null>(null);
  const [galleryPreviewImage, setGalleryPreviewImage] = React.useState<HTMLImageElement | null>(null);
  const [status, setStatus] = React.useState('选择车型或上传原创素材，导出图片即可放入车机皮肤文件夹。');

  const selectedTemplate = getTeslaTemplateById(selectedTemplateId) as TeslaModelTemplate;
  const vehicleImageUrl = selectedTemplate.vehicleImageUrl || selectedTemplate.templateUrl.replace('template.png', 'vehicle_image.png');
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const catalogProducts = React.useMemo(
    () => getCatalogProductsForTemplate(selectedTemplateId) as SkinCatalogProduct[],
    [selectedTemplateId],
  );
  const officialExamples = React.useMemo(
    () => getOfficialExampleWrapsForTemplate(selectedTemplateId) as OfficialWrapExample[],
    [selectedTemplateId],
  );
  const priceTiers = DOWNLOAD_PRICE_TIERS as DownloadPriceTier[];
  const externalSources = EXTERNAL_WRAP_SOURCES as ExternalWrapSource[];

  const drawCanvas = React.useCallback(
    (showSelection = true) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#05070b';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (!templateImage || !maskCanvasRef.current) {
        context.fillStyle = '#94a3b8';
        context.font = '700 28px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText('正在加载车型模板...', canvas.width / 2, canvas.height / 2);
        return;
      }

      const wrapCanvas = document.createElement('canvas');
      wrapCanvas.width = canvas.width;
      wrapCanvas.height = canvas.height;
      const wrapContext = wrapCanvas.getContext('2d');

      if (wrapContext) {
        wrapContext.fillStyle = wrapColor;
        wrapContext.fillRect(0, 0, wrapCanvas.width, wrapCanvas.height);
        wrapContext.globalCompositeOperation = 'destination-in';
        wrapContext.drawImage(maskCanvasRef.current, 0, 0, wrapCanvas.width, wrapCanvas.height);
        wrapContext.globalCompositeOperation = 'source-over';
        context.drawImage(wrapCanvas, 0, 0);
      }

      context.save();
      context.globalCompositeOperation = 'multiply';
      context.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
      context.restore();

      layers.forEach((layer) => {
        if (layer.clipMode !== 'full' && maskCanvasRef.current) {
          const layerCanvas = document.createElement('canvas');
          layerCanvas.width = canvas.width;
          layerCanvas.height = canvas.height;
          const layerContext = layerCanvas.getContext('2d');
          if (layerContext) {
            drawLayer(layerContext, layer);
            layerContext.globalCompositeOperation = 'destination-in';
            layerContext.drawImage(maskCanvasRef.current, 0, 0, canvas.width, canvas.height);
            context.drawImage(layerCanvas, 0, 0);
          }
        } else {
          drawLayer(context, layer);
        }
      });

      if (showSelection && selectedLayer) {
        drawSelection(context, selectedLayer);
      }
    },
    [layers, selectedLayer, templateImage, wrapColor],
  );

  const drawVehiclePreview = React.useCallback(() => {
    const previewCanvas = vehiclePreviewCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    const context = previewCanvas?.getContext('2d');
    if (!previewCanvas || !context) {
      return;
    }

    const width = 960;
    const height = 620;
    if (previewCanvas.width !== width || previewCanvas.height !== height) {
      previewCanvas.width = width;
      previewCanvas.height = height;
    }

    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#111827');
    background.addColorStop(0.62, '#0b1120');
    background.addColorStop(1, '#020617');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const drawSmartContainedImage = (
      image: HTMLCanvasElement | HTMLImageElement,
      x: number,
      y: number,
      boxWidth: number,
      boxHeight: number,
      cropTransparent = false,
    ) => {
      const { width: imageWidth, height: imageHeight } = getSourceImageSize(image);
      if (!imageWidth || !imageHeight) {
        return;
      }

      const bounds = cropTransparent
        ? vehicleImageBoundsRef.current ?? getVisibleImageBounds(image)
        : null;
      if (cropTransparent && bounds) {
        vehicleImageBoundsRef.current = bounds;
      }

      const sourceX = bounds?.sx ?? 0;
      const sourceY = bounds?.sy ?? 0;
      const sourceWidth = bounds?.sw ?? imageWidth;
      const sourceHeight = bounds?.sh ?? imageHeight;
      const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const drawX = x + (boxWidth - drawWidth) / 2;
      const drawY = y + (boxHeight - drawHeight) / 2;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    };

    context.save();
    context.fillStyle = 'rgba(255, 255, 255, 0.045)';
    context.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(28, 28, 904, 352, 28);
    context.fill();
    context.stroke();
    context.restore();

    if (vehicleImage) {
      drawSmartContainedImage(vehicleImage, 24, 24, 912, 360, true);
    } else {
      context.fillStyle = '#94a3b8';
      context.font = '700 24px sans-serif';
      context.textAlign = 'center';
      context.fillText('正在加载官方渲染底图...', width / 2, 205);
    }

    context.save();
    context.fillStyle = 'rgba(15, 23, 42, 0.9)';
    context.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(46, 410, 186, 160, 18);
    context.fill();
    context.stroke();
    context.restore();

    if (sourceCanvas) {
      context.fillStyle = wrapColor;
      context.fillRect(66, 438, 146, 104);
      drawSmartContainedImage(sourceCanvas, 66, 438, 146, 104);
    }

    context.fillStyle = '#e2e8f0';
    context.font = '800 28px sans-serif';
    context.textAlign = 'left';
    context.fillText('车型渲染参考', 270, 454);
    context.font = '600 18px sans-serif';
    context.fillStyle = '#94a3b8';
    context.fillText('左侧缩略图是当前导出的皮肤贴图，渲染图保持官方比例，用于核对配色和方向。', 270, 492);
    context.fillStyle = '#e2e8f0';
    context.font = '800 18px sans-serif';
    context.fillText('当前皮肤贴图', 66, 424);
  }, [vehicleImage, wrapColor]);

  const drawGalleryPreview = React.useCallback(() => {
    const previewCanvas = galleryPreviewCanvasRef.current;
    const context = previewCanvas?.getContext('2d');
    if (!previewCanvas || !context || !selectedGalleryExample) {
      return;
    }

    const width = 960;
    const height = 620;
    if (previewCanvas.width !== width || previewCanvas.height !== height) {
      previewCanvas.width = width;
      previewCanvas.height = height;
    }

    const drawImageInBox = (
      image: HTMLCanvasElement | HTMLImageElement,
      x: number,
      y: number,
      boxWidth: number,
      boxHeight: number,
      cropVehicle = false,
    ) => {
      const { width: imageWidth, height: imageHeight } = getSourceImageSize(image);
      if (!imageWidth || !imageHeight) {
        return;
      }

      const bounds = cropVehicle ? vehicleImageBoundsRef.current ?? getVisibleImageBounds(image) : null;
      if (cropVehicle && bounds) {
        vehicleImageBoundsRef.current = bounds;
      }

      const sourceX = bounds?.sx ?? 0;
      const sourceY = bounds?.sy ?? 0;
      const sourceWidth = bounds?.sw ?? imageWidth;
      const sourceHeight = bounds?.sh ?? imageHeight;
      const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const drawX = x + (boxWidth - drawWidth) / 2;
      const drawY = y + (boxHeight - drawHeight) / 2;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    };

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, width, height);

    context.save();
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#e2e8f0';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(24, 24, 912, 572, 20);
    context.fill();
    context.stroke();
    context.restore();

    context.save();
    context.fillStyle = '#f1f5f9';
    context.beginPath();
    context.roundRect(312, 54, 580, 318, 18);
    context.fill();
    context.restore();

    if (vehicleImage) {
      drawImageInBox(vehicleImage, 330, 68, 544, 286, true);
    } else {
      context.fillStyle = '#64748b';
      context.font = '700 22px sans-serif';
      context.textAlign = 'center';
      context.fillText('正在加载车型渲染图...', 602, 220);
    }

    context.save();
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#e2e8f0';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(58, 54, 214, 318, 16);
    context.fill();
    context.stroke();
    context.restore();

    if (galleryPreviewImage) {
      drawImageInBox(galleryPreviewImage, 74, 72, 182, 282);
    }

    context.fillStyle = '#0f172a';
    context.font = '900 32px sans-serif';
    context.textAlign = 'left';
    context.fillText(selectedGalleryExample.title, 58, 440);
    context.font = '700 20px sans-serif';
    context.fillStyle = '#475569';
    context.fillText(selectedTemplate.label, 58, 476);
    context.fillStyle = '#e82127';
    context.font = '900 20px sans-serif';
    context.fillText('官方免费皮肤', 58, 516);
    context.fillStyle = '#64748b';
    context.font = '600 16px sans-serif';
    context.fillText('渲染图用于购买前核对车型比例和方向，最终车机效果以车辆三维模型为准。', 58, 552);
  }, [galleryPreviewImage, selectedGalleryExample, selectedTemplate.label, vehicleImage]);

  React.useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    setLoading(true);
    setStatus(`正在加载 ${selectedTemplate.label} 官方模板...`);

    image.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = image.naturalWidth || 1024;
        canvas.height = image.naturalHeight || 1024;
      }
      maskCanvasRef.current = generateBodyMask(image);
      setTemplateImage(image);
      setLoading(false);
      setStatus(`${selectedTemplate.label} 模板已加载。`);
    };

    image.onerror = () => {
      setLoading(false);
      setTemplateImage(null);
      setStatus('模板加载失败，请稍后重试或检查网络。');
    };

    image.src = selectedTemplate.templateUrl;
  }, [selectedTemplate.label, selectedTemplate.templateUrl]);

  React.useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      vehicleImageBoundsRef.current = null;
      setVehicleImage(image);
    };
    image.onerror = () => {
      vehicleImageBoundsRef.current = null;
      setVehicleImage(null);
    };
    image.src = vehicleImageUrl;
  }, [vehicleImageUrl]);

  React.useEffect(() => {
    drawCanvas(true);
    requestAnimationFrame(() => drawVehiclePreview());
  }, [drawCanvas, drawVehiclePreview]);

  React.useEffect(() => {
    if (!selectedGalleryExample) {
      setGalleryPreviewImage(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setGalleryPreviewImage(image);
    image.onerror = () => setGalleryPreviewImage(null);
    image.src = selectedGalleryExample.imageUrl;
  }, [selectedGalleryExample]);

  React.useEffect(() => {
    requestAnimationFrame(() => drawGalleryPreview());
  }, [drawGalleryPreview]);

  const updateSelectedLayer = React.useCallback((changes: Partial<SkinLayer>) => {
    if (!selectedLayerId) {
      return;
    }

    setLayers((currentLayers) =>
      currentLayers.map((layer) => (layer.id === selectedLayerId ? { ...layer, ...changes } : layer)),
    );
  }, [selectedLayerId]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    files.forEach((file, index) => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        setStatus('仅支持常见图片格式。');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const layerId = `layer_${Date.now()}_${index}`;
          const layer = {
            ...(createSkinLayer(layerId, image) as Omit<SkinLayer, 'name'>),
            clipMode: clipToBody ? 'body' : 'full',
            name: file.name,
          };
          setLayers((currentLayers) => [...currentLayers, layer]);
          setSelectedLayerId(layerId);
          setStatus(`已添加 ${file.name}，可在画布中拖动位置。`);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const addCatalogProductLayer = async (product: SkinCatalogProduct) => {
    try {
      const image = await createCatalogProductImage(product, wrapColor);
      const layerId = `catalog_${product.id}_${Date.now()}`;
      const layer = {
        ...(createSkinLayer(layerId, image) as Omit<SkinLayer, 'name'>),
        opacity: 0.92,
        name: `${product.title} 样张`,
      };
      setLayers((currentLayers) => [...currentLayers, layer]);
      setSelectedLayerId(layerId);
      setStatus(`${product.title} 已加入画布预览，可继续调整图层。`);
    } catch {
      setStatus('样张生成失败，请稍后重试。');
    }
  };

  const addOfficialExampleLayer = async (example: OfficialWrapExample) => {
    try {
      const image = await loadRemoteWrapImage(example.imageUrl);
      const layerId = `official_${example.id}_${Date.now()}`;
      const layer = {
        ...(createSkinLayer(layerId, image) as Omit<SkinLayer, 'name'>),
        clipMode: 'full' as const,
        name: `${example.title} 官方示例`,
      };
      setLayers((currentLayers) => [...currentLayers, layer]);
      setSelectedLayerId(layerId);
      setStatus(`${example.title} 已从特斯拉官方示例加入画布。`);
    } catch {
      setStatus('官方示例加载失败，请稍后重试。');
    }
  };

  const openSkinDetailDialog = (example: OfficialWrapExample) => {
    setSelectedGalleryExample(example);
    setStatus(`${example.title} 详情已打开，可查看渲染图或加入自定义编辑。`);
  };

  const addSelectedGalleryExampleToEditor = async () => {
    if (!selectedGalleryExample) {
      return;
    }

    setActiveWorkspace('design');
    await addOfficialExampleLayer(selectedGalleryExample);
    setSelectedGalleryExample(null);
    requestAnimationFrame(() => {
      document.getElementById('tsl-skin-custom-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const coords = getCanvasCoords(canvas, event);
    const hitLayer = [...layers].reverse().find((layer) => isPointInLayer(layer, coords.x, coords.y));

    if (!hitLayer) {
      setSelectedLayerId(null);
      dragRef.current = null;
      return;
    }

    setSelectedLayerId(hitLayer.id);
    dragRef.current = {
      layerId: hitLayer.id,
      startX: coords.x,
      startY: coords.y,
      layerX: hitLayer.x,
      layerY: hitLayer.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const dragState = dragRef.current;
    if (!canvas || !dragState) {
      return;
    }

    const coords = getCanvasCoords(canvas, event);
    const deltaX = coords.x - dragState.startX;
    const deltaY = coords.y - dragState.startY;

    setLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === dragState.layerId
          ? { ...layer, x: dragState.layerX + deltaX, y: dragState.layerY + deltaY }
          : layer,
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const moveLayer = (direction: -1 | 1) => {
    if (!selectedLayerId) {
      return;
    }

    setLayers((currentLayers) => {
      const index = currentLayers.findIndex((layer) => layer.id === selectedLayerId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= currentLayers.length) {
        return currentLayers;
      }

      const nextLayers = [...currentLayers];
      [nextLayers[index], nextLayers[target]] = [nextLayers[target], nextLayers[index]];
      return nextLayers;
    });
  };

  const deleteLayer = () => {
    if (!selectedLayerId) {
      return;
    }

    setLayers((currentLayers) => currentLayers.filter((layer) => layer.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    drawCanvas(false);

    try {
      const link = document.createElement('a');
      link.download = buildTslSkinFileName(selectedTemplate.label);
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('图片已导出，可复制到 U 盘皮肤文件夹。');
    } catch {
      setStatus('导出失败：浏览器阻止了画布下载，请刷新后重试。');
    } finally {
      requestAnimationFrame(() => drawCanvas(true));
    }
  };

  const downloadZipPackage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    drawCanvas(false);

    try {
      const pngBytes = await getCanvasPngBytes(canvas);
      const modelInfo = {
        app: '特斯拉皮肤工坊',
        modelId: selectedTemplate.id,
        modelLabel: selectedTemplate.label,
        exportedAt: new Date().toISOString(),
        localOnly: true,
        layers: layers.map((layer, index) => ({
          index: index + 1,
          name: layer.name,
          opacity: layer.opacity,
          clipMode: layer.clipMode,
        })),
      };
      const zipBytes = createStoredZip([
        { name: 'wrap.png', data: pngBytes },
        {
          name: 'install-guide.txt',
          data: buildWrapInstallGuide({
            modelLabel: selectedTemplate.label,
            fileName: 'wrap.png',
          }),
        },
        { name: 'model-info.json', data: JSON.stringify(modelInfo, null, 2) },
      ]);
      const blob = new Blob([zipBytes], { type: 'application/zip' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.download = buildTslSkinZipFileName(selectedTemplate.label);
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('压缩包已在浏览器本地生成，包含皮肤图片、车型说明和 U 盘放置教程。');
    } catch {
      setStatus('压缩包生成失败，请刷新后重试。');
    } finally {
      requestAnimationFrame(() => drawCanvas(true));
    }
  };

  const galleryItems = officialExamples;

  const scrollToEditor = (mode: WorkspaceMode = 'design') => {
    setActiveWorkspace(mode);
    requestAnimationFrame(() => {
      document.getElementById('tsl-skin-custom-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const rootClassName = isDayMode
    ? 'tsl-skin-shell min-h-screen bg-[#f5f6f8] text-slate-950'
    : 'tsl-skin-shell min-h-screen bg-[#0b0f16] text-slate-100';
  const surfaceClassName = isDayMode
    ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
    : 'border-white/10 bg-slate-900 text-slate-100 shadow-2xl shadow-black/30';
  const softSurfaceClassName = isDayMode
    ? 'border-slate-200 bg-slate-50 text-slate-700'
    : 'border-white/10 bg-slate-950 text-slate-300';
  const mutedTextClassName = isDayMode ? 'text-slate-500' : 'text-slate-400';
  const strongTextClassName = isDayMode ? 'text-slate-950' : 'text-white';

  return (
    <div className={rootClassName}>
      <header className={`sticky top-0 z-40 border-b ${isDayMode ? 'border-slate-200 bg-white/95' : 'border-white/10 bg-slate-950/95'} backdrop-blur`}>
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e82127] text-lg font-black text-white">
              特
            </span>
            <span className={`text-lg font-black ${strongTextClassName}`}>特斯拉皮肤</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className={`h-10 rounded-md border px-3 text-sm font-bold outline-none ${
                isDayMode ? 'border-slate-200 bg-white text-slate-800' : 'border-white/10 bg-slate-900 text-white'
              }`}
              aria-label="选择车型"
            >
              {TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsDayMode((current) => !current)}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
                isDayMode
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-[#e82127] hover:text-[#e82127]'
                  : 'border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sun size={17} />
              {isDayMode ? '深色模式' : '浅色模式'}
            </button>
            <button
              type="button"
              onClick={() => scrollToEditor('design')}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Upload size={17} />
              自定义上传裁剪
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-6 md:px-6">
        <section className={`tsl-skin-gallery-home rounded-lg border p-4 md:p-5 ${surfaceClassName}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#e82127]">下载现有皮肤</p>
              <h1 className={`mt-1 text-3xl font-black tracking-tight md:text-4xl ${strongTextClassName}`}>皮肤库</h1>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedTextClassName}`}>
                首页先显示已经有的皮肤，点击皮肤卡片查看渲染图。图片本地生成，不上传服务器。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveWorkspace('download')}
                className={`rounded-md border px-4 py-2 text-sm font-black transition ${
                  activeWorkspace === 'download'
                    ? 'border-[#e82127] bg-[#e82127] text-white'
                    : isDayMode
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-[#e82127]'
                      : 'border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                下载现有皮肤
              </button>
              <button
                type="button"
                onClick={() => scrollToEditor('design')}
                className={`rounded-md border px-4 py-2 text-sm font-black transition ${
                  activeWorkspace === 'design'
                    ? 'border-[#e82127] bg-[#e82127] text-white'
                    : isDayMode
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-[#e82127]'
                      : 'border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                上传图片自己裁剪
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="tsl-skin-card-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {galleryItems.map((example) => (
                <article
                  key={`skin-card-${example.id}`}
                  className={`tsl-skin-skin-card overflow-hidden rounded-lg border transition hover:-translate-y-0.5 hover:shadow-lg ${surfaceClassName}`}
                >
                  <button type="button" onClick={() => openSkinDetailDialog(example)} className="block w-full text-left">
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-white p-3">
                      <img
                        src={example.imageUrl}
                        crossOrigin="anonymous"
                        alt={example.title}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-[#e82127] px-3 py-1 text-xs font-black text-white">
                        {example.sourceLabel === '原创可商用样张' ? '原创' : '免费'}
                      </span>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h2 className={`line-clamp-1 text-lg font-black ${strongTextClassName}`}>{example.title}</h2>
                        <p className={`mt-1 text-sm ${mutedTextClassName}`}>{selectedTemplate.label}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 font-bold text-slate-600">
                          {example.sourceLabel === '原创可商用样张' ? '原' : '官'}
                        </span>
                        <span className="font-bold text-[#e82127]">{example.sourceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-500">
                        <span>适配车型</span>
                        <span className="text-[#e82127]">查看详情</span>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  本地处理
                </div>
                <p className="mt-2 text-xs leading-6">
                  图片仅在你的浏览器本地处理，不会上传服务器。用户购买后下载文件，不占用 Vercel 免费额度。
                </p>
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <ExternalLink size={18} className="text-sky-500" />
                    免费资源站
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
                    外链
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  可参考这些站点的筛选和预览体验。资源只做外链，不在本站镜像素材，确认授权后再入库。
                </p>
                <div className="mt-3 space-y-2">
                  {externalSources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`去原站下载 ${source.title}`}
                      className="block rounded-md border border-slate-200 bg-white p-3 transition hover:border-[#e82127]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-950">{source.title}</div>
                          <div className="mt-1 break-all text-[11px] font-bold text-slate-400">{source.url}</div>
                        </div>
                        <span className="shrink-0 text-xs font-black text-[#e82127]">{source.actionLabel}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{source.accessNote}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{source.usageNote}</p>
                    </a>
                  ))}
                </div>
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  <ShoppingBag size={18} className="text-[#e82127]" />
                  价格说明
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  单张下载 2 元，五张打包 9.99 元，自定义设计 30 元。
                </p>
                <div className="mt-3 space-y-2">
                  {priceTiers.map((tier) => (
                    <div key={tier.id} className="flex items-start justify-between gap-3 rounded-md bg-white/70 p-3 text-sm">
                      <div>
                        <div className="font-black text-slate-950">{tier.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{tier.detail}</div>
                      </div>
                      <div className="font-black text-[#e82127]">{formatPriceCents(tier.priceCents)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  <Sparkles size={18} className="text-sky-500" />
                  原创商品样张
                </div>
                <div className="mt-3 space-y-2">
                  {catalogProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace('design');
                        addCatalogProductLayer(product);
                        scrollToEditor('design');
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-[#e82127]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-black text-slate-950">{product.title}</span>
                        <span className="font-black text-[#e82127]">{formatPriceCents(product.priceCents)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">加入自定义编辑</div>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>

        <section id="tsl-skin-custom-editor" className={`mt-5 rounded-lg border p-4 md:p-5 ${surfaceClassName}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#e82127]">自定义上传裁剪</p>
              <h2 className={`mt-1 text-2xl font-black ${strongTextClassName}`}>上传图片自己裁剪</h2>
              <p className={`mt-1 text-sm ${mutedTextClassName}`}>上传 PNG、JPG 或 WebP，拖动、缩放、旋转后导出交付包。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadCanvas}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-[#e82127]"
              >
                <Download size={17} />
                导出图片
              </button>
              <button
                type="button"
                onClick={downloadZipPackage}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#e82127] px-4 text-sm font-black text-white transition hover:bg-[#c9151b]"
              >
                <Download size={17} />
                下载压缩包
              </button>
            </div>
          </div>

          <div className="tsl-skin-editor-grid mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className={`space-y-4 rounded-lg border p-4 ${softSurfaceClassName}`}>
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-black">
                  <Palette size={18} className="text-sky-500" />
                  车型与颜色
                </div>
                <label className="block text-xs font-bold text-slate-500">车型</label>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-[#e82127]"
                >
                  {TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-bold text-slate-500">车身颜色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wrapColor}
                    onChange={(event) => setWrapColor(event.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-md border border-slate-200 bg-white"
                    aria-label="选择车身颜色"
                  />
                  <span className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-700">
                    当前颜色
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWrapColor(color)}
                      className="h-10 rounded-md border border-slate-200 transition hover:scale-105"
                      style={{ background: color }}
                      aria-label="套用预设颜色"
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 text-sm font-black">
                  <Upload size={18} className="text-sky-500" />
                  贴图
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#e82127]/40 bg-[#e82127]/5 px-4 py-4 text-sm font-black text-[#e82127] transition hover:bg-[#e82127]/10"
                >
                  <Upload size={18} />
                  上传原创或已授权素材
                </button>
                <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={clipToBody}
                    onChange={(event) => setClipToBody(event.target.checked)}
                    className="mt-1"
                  />
                  <span>新上传贴图默认贴合车身区域</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLayers([]);
                    setSelectedLayerId(null);
                    setStatus('画布贴图已清空。');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#e82127]"
                >
                  <RefreshCcw size={16} />
                  清空
                </button>
                <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800">
                  图片仅在你的浏览器本地处理，不会上传服务器。请仅上传原创或已授权素材。
                </p>
              </section>
            </aside>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{status}</span>
                <span>{selectedTemplate.label} · 1024x1024 画布</span>
              </div>
              <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-3">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 text-sm font-bold text-white">
                    加载官方模板中...
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={1024}
                  height={1024}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="aspect-square h-auto max-h-[66vh] w-full max-w-[680px] touch-none rounded-md border border-white/10 bg-slate-950"
                />
              </div>
            </section>

            <aside className="space-y-4">
              <section className={`vehicle-reference-panel rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black">车型渲染参考</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">用于核对配色和图案方向。</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    官方渲染底图
                  </span>
                </div>
                <canvas
                  ref={vehiclePreviewCanvasRef}
                  width={960}
                  height={620}
                  className="mx-auto h-auto w-full max-w-[520px] rounded-md border border-slate-200 bg-slate-950"
                />
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <Layers size={18} className="text-sky-500" />
                    图层
                  </div>
                  <span className="text-xs text-slate-500">{layers.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {layers.length === 0 && (
                    <div className="rounded-md border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                      上传贴图后会出现在这里。
                    </div>
                  )}
                  {layers.map((layer, index) => (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedLayerId === layer.id
                          ? 'border-[#e82127] bg-[#e82127]/10 text-[#e82127]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-[#e82127]'
                      }`}
                    >
                      <span className="truncate">{layer.name}</span>
                      <span className="ml-2 text-xs text-slate-400">#{index + 1}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="text-sm font-black">选中贴图</div>
                {!selectedLayer && (
                  <p className="mt-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    在画布或图层列表中选择一个贴图。
                  </p>
                )}
                {selectedLayer && (
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2 text-sm text-slate-600">
                      <span>裁剪模式</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { mode: 'body' as const, label: '贴合车身' },
                          { mode: 'full' as const, label: '保留完整图案' },
                        ].map((item) => (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => updateSelectedLayer({ clipMode: item.mode })}
                            className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                              selectedLayer.clipMode === item.mode
                                ? 'border-[#e82127] bg-[#e82127]/10 text-[#e82127]'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#e82127]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block space-y-2 text-sm text-slate-600">
                      <span>透明度 {Math.round(selectedLayer.opacity * 100)}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(selectedLayer.opacity * 100)}
                        onChange={(event) => updateSelectedLayer({ opacity: Number(event.target.value) / 100 })}
                        className="w-full"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-slate-600">
                      <span>缩放 {Math.round(selectedLayer.scale * 100)}%</span>
                      <input
                        type="range"
                        min="5"
                        max="250"
                        value={Math.round(selectedLayer.scale * 100)}
                        onChange={(event) => updateSelectedLayer({ scale: Number(event.target.value) / 100 })}
                        className="w-full"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-slate-600">
                      <span>旋转 {Math.round((selectedLayer.rotation * 180) / Math.PI)}°</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={Math.round((selectedLayer.rotation * 180) / Math.PI)}
                        onChange={(event) =>
                          updateSelectedLayer({ rotation: (Number(event.target.value) * Math.PI) / 180 })
                        }
                        className="w-full"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateSelectedLayer({ flipX: !selectedLayer.flipX })}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#e82127]"
                      >
                        <FlipHorizontal size={16} />
                        翻转
                      </button>
                      <button
                        type="button"
                        onClick={deleteLayer}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                        删除
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayer(-1)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#e82127]"
                      >
                        后移
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayer(1)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#e82127]"
                      >
                        前移
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className={`rounded-lg border p-4 ${softSurfaceClassName}`}>
                <div className="flex items-center gap-2 text-sm font-black">
                  <Sparkles size={18} className="text-sky-500" />
                  三步完成
                </div>
                <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                  <p><span className="font-black text-slate-700">选择车型：</span>先选对应车型模板。</p>
                  <p><span className="font-black text-slate-700">预览调整：</span>上传图后拖动、缩放、旋转。</p>
                  <p><span className="font-black text-slate-700">导出交付包：</span>下载 1024x1024 图片，U 盘建议 exFAT，文件放入 Wraps 文件夹。</p>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>

      {selectedGalleryExample && (
        <div className="skin-detail-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭详情"
            onClick={() => setSelectedGalleryExample(null)}
          />
          <section className="relative z-10 grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white text-slate-950 shadow-2xl md:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="bg-slate-100 p-4">
              <canvas
                ref={galleryPreviewCanvasRef}
                width={960}
                height={620}
                className="h-auto w-full rounded-md border border-slate-200 bg-white"
              />
            </div>
            <aside className="flex flex-col gap-4 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#e82127]">皮肤详情</p>
                  <h2 className="mt-1 text-2xl font-black">{selectedGalleryExample.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{selectedTemplate.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGalleryExample(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[#e82127] hover:text-[#e82127]"
                  aria-label="关闭详情"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <img
                  src={selectedGalleryExample.imageUrl}
                  crossOrigin="anonymous"
                  alt={selectedGalleryExample.title}
                  className="mx-auto h-52 w-full object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-bold text-slate-500">来源</div>
                  <div className="mt-1 font-black">{selectedGalleryExample.sourceLabel}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-bold text-slate-500">下载</div>
                  <div className="mt-1 font-black text-[#e82127]">免费预览</div>
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-500">
                渲染图用于购买或下载前核对大致效果。最终车机显示仍以特斯拉三维模型为准。
              </p>

              <button
                type="button"
                onClick={addSelectedGalleryExampleToEditor}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#e82127] px-4 text-sm font-black text-white transition hover:bg-[#c9151b]"
              >
                <Sparkles size={18} />
                加入自定义编辑
              </button>
            </aside>
          </section>
        </div>
      )}
    </div>
  );
};

export default TslSkinApp;
