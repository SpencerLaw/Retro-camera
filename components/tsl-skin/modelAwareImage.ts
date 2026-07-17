export const WRAP_CANVAS_SIZE = 1024;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_WORKING_IMAGE_EDGE = 4096;

export type WrapFitMode = 'smart' | 'contain' | 'cover';
export type WrapArtworkMode = 'subject' | 'texture';

export interface WrapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WrapLayer {
  id: string;
  name: string;
  src: string;
  blob: Blob;
  image: HTMLImageElement;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  artworkMode: WrapArtworkMode;
}

export interface TemplateMaskResult {
  canvas: HTMLCanvasElement;
  bounds: WrapBounds;
  pixelCount: number;
}

export interface UploadedWrapImage {
  image: HTMLImageElement;
  src: string;
  blob: Blob;
  width: number;
  height: number;
  wasDownscaled: boolean;
}

export function cloneLayers(layers: WrapLayer[]): WrapLayer[] {
  return layers.map((layer) => ({ ...layer }));
}

export interface ObjectUrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export function reconcileLayerObjectUrls(
  currentLayers: WrapLayer[],
  nextLayers: WrapLayer[],
  activeUrls: Set<string>,
  objectUrlApi: ObjectUrlApi = URL,
): WrapLayer[] {
  const nextIds = new Set(nextLayers.map((layer) => layer.id));
  const currentById = new Map(currentLayers.map((layer) => [layer.id, layer]));

  currentLayers.forEach((layer) => {
    if (!nextIds.has(layer.id) && activeUrls.delete(layer.src)) {
      objectUrlApi.revokeObjectURL(layer.src);
    }
  });

  return nextLayers.map((layer) => {
    const currentLayer = currentById.get(layer.id);
    if (currentLayer && activeUrls.has(currentLayer.src)) {
      return currentLayer.src === layer.src ? layer : { ...layer, src: currentLayer.src };
    }
    if (activeUrls.has(layer.src)) return layer;

    const src = objectUrlApi.createObjectURL(layer.blob);
    activeUrls.add(src);
    layer.image.src = src;
    return { ...layer, src };
  });
}

export function loadImageElement(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片读取失败'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.94): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('图片压缩失败'));
      }
    }, type, quality);
  });
}

export async function decodeUploadedImage(file: File): Promise<UploadedWrapImage> {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    throw new Error('仅支持 PNG、JPEG 和 WebP 图片');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('图片不能超过 20 MB');
  }

  const sourceUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await loadImageElement(sourceUrl);
    await image.decode?.();
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const longestEdge = Math.max(sourceWidth, sourceHeight);
  if (longestEdge <= MAX_WORKING_IMAGE_EDGE) {
    return {
      image,
      src: sourceUrl,
      blob: file,
      width: sourceWidth,
      height: sourceHeight,
      wasDownscaled: false,
    };
  }

  const scale = MAX_WORKING_IMAGE_EDGE / longestEdge;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('浏览器无法创建图片工作区');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');
  const workingUrl = URL.createObjectURL(blob);
  const workingImage = await loadImageElement(workingUrl);
  URL.revokeObjectURL(sourceUrl);

  return {
    image: workingImage,
    src: workingUrl,
    blob,
    width,
    height,
    wasDownscaled: true,
  };
}

export function generateTemplateMask(templateImage: HTMLImageElement): TemplateMaskResult {
  const width = templateImage.naturalWidth || templateImage.width || WRAP_CANVAS_SIZE;
  const height = templateImage.naturalHeight || templateImage.height || WRAP_CANVAS_SIZE;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = WRAP_CANVAS_SIZE;
  sourceCanvas.height = WRAP_CANVAS_SIZE;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('无法分析车型模板');
  }
  sourceContext.drawImage(templateImage, 0, 0, width, height, 0, 0, WRAP_CANVAS_SIZE, WRAP_CANVAS_SIZE);
  const sourcePixels = sourceContext.getImageData(0, 0, WRAP_CANVAS_SIZE, WRAP_CANVAS_SIZE).data;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = WRAP_CANVAS_SIZE;
  maskCanvas.height = WRAP_CANVAS_SIZE;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) {
    throw new Error('无法创建车型蒙版');
  }

  const mask = maskContext.createImageData(WRAP_CANVAS_SIZE, WRAP_CANVAS_SIZE);
  let minX = WRAP_CANVAS_SIZE;
  let minY = WRAP_CANVAS_SIZE;
  let maxX = 0;
  let maxY = 0;
  let pixelCount = 0;

  for (let index = 0; index < WRAP_CANVAS_SIZE * WRAP_CANVAS_SIZE; index += 1) {
    const offset = index * 4;
    const r = sourcePixels[offset];
    const g = sourcePixels[offset + 1];
    const b = sourcePixels[offset + 2];
    const a = sourcePixels[offset + 3];
    const isBodyPixel = a > 40 && r > 45 && g > 45 && b > 45;
    if (!isBodyPixel) continue;

    const x = index % WRAP_CANVAS_SIZE;
    const y = Math.floor(index / WRAP_CANVAS_SIZE);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    pixelCount += 1;
    mask.data[offset] = 255;
    mask.data[offset + 1] = 255;
    mask.data[offset + 2] = 255;
    mask.data[offset + 3] = 255;
  }
  maskContext.putImageData(mask, 0, 0);

  const bounds = pixelCount > 0
    ? {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX + 1),
        height: Math.max(1, maxY - minY + 1),
      }
    : { x: 0, y: 0, width: WRAP_CANVAS_SIZE, height: WRAP_CANVAS_SIZE };

  return { canvas: maskCanvas, bounds, pixelCount };
}

export function fitLayerToBounds(
  layer: WrapLayer,
  bounds: WrapBounds,
  mode: WrapFitMode,
  artworkMode: WrapArtworkMode = layer.artworkMode,
): WrapLayer {
  const horizontalPadding = artworkMode === 'subject' ? 0.1 : 0.02;
  const verticalPadding = artworkMode === 'subject' ? 0.1 : 0.02;
  const targetWidth = Math.max(1, bounds.width * (1 - horizontalPadding * 2));
  const targetHeight = Math.max(1, bounds.height * (1 - verticalPadding * 2));
  const containScale = Math.min(targetWidth / layer.width, targetHeight / layer.height);
  const coverScale = Math.max(bounds.width / layer.width, bounds.height / layer.height);
  const selectedScale = mode === 'contain'
    ? containScale
    : mode === 'cover'
      ? coverScale
      : artworkMode === 'texture'
        ? coverScale
        : containScale;
  const scale = Math.max(0.02, Math.min(8, selectedScale));

  return {
    ...layer,
    artworkMode,
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    scaleX: Math.sign(layer.scaleX || 1) * scale,
    scaleY: Math.sign(layer.scaleY || 1) * scale,
    rotation: mode === 'smart' ? 0 : layer.rotation,
  };
}

export function estimateEffectiveDpi(layer: WrapLayer): number {
  const displayedWidth = Math.max(1, layer.width * Math.abs(layer.scaleX));
  const sourcePixelsPerOutputPixel = layer.width / displayedWidth;
  return Math.round(150 * sourcePixelsPerOutputPixel);
}

export function renderWrapTexture(
  maskCanvas: HTMLCanvasElement,
  layers: WrapLayer[],
  wrapColor: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WRAP_CANVAS_SIZE;
  canvas.height = WRAP_CANVAS_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = WRAP_CANVAS_SIZE;
  baseCanvas.height = WRAP_CANVAS_SIZE;
  const baseContext = baseCanvas.getContext('2d');
  if (baseContext) {
    baseContext.fillStyle = wrapColor;
    baseContext.fillRect(0, 0, WRAP_CANVAS_SIZE, WRAP_CANVAS_SIZE);
    baseContext.globalCompositeOperation = 'destination-in';
    baseContext.drawImage(maskCanvas, 0, 0);
    context.drawImage(baseCanvas, 0, 0);
  }

  layers.forEach((layer) => {
    if (!layer.visible) return;
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = WRAP_CANVAS_SIZE;
    layerCanvas.height = WRAP_CANVAS_SIZE;
    const layerContext = layerCanvas.getContext('2d');
    if (!layerContext) return;
    layerContext.save();
    layerContext.globalAlpha = layer.opacity;
    layerContext.translate(layer.x, layer.y);
    layerContext.rotate((layer.rotation * Math.PI) / 180);
    layerContext.scale(layer.scaleX, layer.scaleY);
    layerContext.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    layerContext.restore();
    layerContext.globalCompositeOperation = 'destination-in';
    layerContext.drawImage(maskCanvas, 0, 0);
    context.drawImage(layerCanvas, 0, 0);
  });

  return canvas;
}
