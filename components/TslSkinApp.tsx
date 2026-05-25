import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
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
} from 'lucide-react';
import {
  buildTslSkinFileName,
  buildTslSkinZipFileName,
  buildWrapInstallGuide,
  createStoredZip,
  createSkinLayer,
  DOWNLOAD_PRICE_TIERS,
  formatPriceCents,
  getCatalogProductsForTemplate,
  getTeslaTemplateById,
  SKIN_CATALOG_PRODUCTS,
  TESLA_MODEL_TEMPLATES,
} from './tslSkinLogic.js';

export type TeslaModelTemplate = {
  id: string;
  label: string;
  templateUrl: string;
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

type WorkspaceMode = 'download' | 'design';

type DragState = {
  layerId: string;
  startX: number;
  startY: number;
  layerX: number;
  layerY: number;
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

const TslSkinApp: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('modely-2025-premium');
  const [templateImage, setTemplateImage] = React.useState<HTMLImageElement | null>(null);
  const [wrapColor, setWrapColor] = React.useState('#ffffff');
  const [layers, setLayers] = React.useState<SkinLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [clipToBody, setClipToBody] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [activeWorkspace, setActiveWorkspace] = React.useState<WorkspaceMode>('download');
  const [isDayMode, setIsDayMode] = React.useState(false);
  const [status, setStatus] = React.useState('选择车型或上传原创素材，导出图片即可放入车机皮肤文件夹。');

  const selectedTemplate = getTeslaTemplateById(selectedTemplateId) as TeslaModelTemplate;
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const catalogProducts = React.useMemo(
    () => getCatalogProductsForTemplate(selectedTemplateId) as SkinCatalogProduct[],
    [selectedTemplateId],
  );
  const priceTiers = DOWNLOAD_PRICE_TIERS as DownloadPriceTier[];

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
    drawCanvas(true);
  }, [drawCanvas]);

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

  const rootClassName = isDayMode ? 'tsl-skin-day min-h-screen bg-sky-50 text-slate-950' : 'min-h-screen bg-[#070b12] text-slate-100';
  const backgroundClassName = isDayMode
    ? 'pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]'
    : 'pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(232,33,39,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))]';

  return (
    <div className={rootClassName}>
      <style>
        {`
          .tsl-skin-day aside,
          .tsl-skin-day section,
          .tsl-skin-day header + div {
            background: rgba(255, 255, 255, 0.82) !important;
            border-color: rgba(15, 23, 42, 0.12) !important;
            box-shadow: 0 18px 44px rgba(14, 116, 144, 0.12) !important;
          }
          .tsl-skin-day [class*="text-slate-"],
          .tsl-skin-day [class*="text-white"] {
            color: #334155 !important;
          }
          .tsl-skin-day [class*="bg-slate-950"],
          .tsl-skin-day [class*="bg-black"] {
            background-color: rgba(248, 250, 252, 0.92) !important;
          }
          .tsl-skin-day canvas {
            background-color: #020617 !important;
          }
        `}
      </style>
      <div className={backgroundClassName} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-slate-100 transition hover:bg-white/15"
              aria-label="返回首页"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-sky-300">特斯拉皮肤工坊</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">车机皮肤工作台</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDayMode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Sun size={18} />
              {isDayMode ? '深色模式' : '浅色模式'}
            </button>
            <button
              type="button"
              onClick={downloadCanvas}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Download size={18} />
              导出图片
            </button>
            <button
              type="button"
              onClick={downloadZipPackage}
              className="inline-flex items-center gap-2 rounded-md bg-[#e82127] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition hover:bg-[#ff3b40]"
            >
              <Download size={18} />
              下载压缩包
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            {[
              { id: 'download' as WorkspaceMode, label: '现有皮肤下载', hint: '选样张、看价格、导出包' },
              { id: 'design' as WorkspaceMode, label: '自己设计皮肤', hint: '上传图片、本地编辑' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveWorkspace(item.id)}
                className={`rounded-md px-4 py-3 text-left transition ${
                  activeWorkspace === item.id
                    ? 'bg-sky-300 text-slate-950 shadow-lg shadow-sky-950/30'
                    : 'bg-slate-950/70 text-slate-200 hover:bg-white/10'
                }`}
              >
                <span className="block text-sm font-black">{item.label}</span>
                <span className="mt-1 block text-xs opacity-75">{item.hint}</span>
              </button>
            ))}
          </div>
          <p className="max-w-xl px-2 text-xs leading-relaxed text-slate-300">
            图片仅在你的浏览器本地处理，不会上传服务器。导出图片或压缩包都由当前设备生成，不占用网站存储额度。
          </p>
        </div>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="space-y-4 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Palette size={18} className="text-sky-300" />
                车型与车漆
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                车型
              </label>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
              >
                {TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                车身颜色
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={wrapColor}
                  onChange={(event) => setWrapColor(event.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-md border border-white/15 bg-slate-950"
                  aria-label="选择车身颜色"
                />
                <span className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
                  当前颜色
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setWrapColor(color)}
                    className="h-10 rounded-md border border-white/15 transition hover:scale-105"
                    style={{ background: color }}
                    aria-label="套用预设颜色"
                  />
                ))}
              </div>
            </section>

            {activeWorkspace === 'design' && (
            <section className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Upload size={18} className="text-sky-300" />
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
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-sky-300/50 bg-sky-400/10 px-4 py-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20"
              >
                <Upload size={18} />
                上传原创贴图
              </button>
              <label className="flex items-start gap-3 rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={clipToBody}
                  onChange={(event) => setClipToBody(event.target.checked)}
                  className="mt-1"
                />
                <span>新上传贴图默认贴合车身区域</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLayers([]);
                    setSelectedLayerId(null);
                    setStatus('画布贴图已清空。');
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  <RefreshCcw size={16} />
                  清空
                </button>
              </div>
              <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-relaxed text-emerald-100">
                <ShieldCheck size={16} className="mb-2 inline text-emerald-300" />
                {' '}图片仅在你的浏览器本地处理，不会上传服务器。请仅上传原创或已授权素材。
              </p>
            </section>
            )}

            {activeWorkspace === 'download' && (
            <section className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <ShoppingBag size={18} className="text-sky-300" />
                  商品库
                </div>
                <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-1 text-[11px] font-bold text-sky-100">
                  样张预览
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                当前先用 {SKIN_CATALOG_PRODUCTS.length} 个原创程序化样张验证商品展示，后续可替换为设计师正式商品。
              </p>
              <div className="space-y-2">
                {catalogProducts.map((product) => (
                  <div key={product.id} className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{product.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{product.deliveryLabel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-sky-200">{formatPriceCents(product.priceCents)}</div>
                        <div className="mt-1 rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-200">
                          {product.tier}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        示例预览
                      </div>
                      <div className="flex h-14 overflow-hidden rounded-md border border-white/10">
                        {product.previewColors.map((color, colorIndex) => (
                          <div
                            key={`${product.id}-${color}`}
                            className="flex-1"
                            style={{
                              background:
                                colorIndex === 1
                                  ? `repeating-linear-gradient(135deg, ${color}, ${color} 8px, ${product.accentColor} 8px, ${product.accentColor} 12px)`
                                  : color,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">{product.previewLabel}</div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">{product.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full border border-white/10 px-2 py-1">{product.assetKind}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addCatalogProductLayer(product)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20"
                    >
                      <Sparkles size={16} />
                      加入画布预览
                    </button>
                  </div>
                ))}
              </div>
            </section>
            )}
          </aside>

          <section className="flex min-h-[520px] flex-col rounded-lg border border-white/10 bg-black/30 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
              <span>{status}</span>
              <span>{selectedTemplate.label} · 1024 画布</span>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.9),rgba(2,6,23,0.95))] p-2">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 text-sm font-bold text-sky-200">
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
                className="aspect-square max-h-[72vh] w-full max-w-[min(92vw,820px)] touch-none rounded-md border border-white/10 bg-slate-950 object-contain shadow-2xl shadow-black/60"
              />
            </div>
          </section>

          <aside className="space-y-4 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Layers size={18} className="text-sky-300" />
                  图层
                </div>
                <span className="text-xs text-slate-400">{layers.length}</span>
              </div>
              <div className="space-y-2">
                {layers.length === 0 && (
                  <div className="rounded-md border border-white/10 bg-slate-950/70 p-4 text-center text-sm text-slate-400">
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
                        ? 'border-sky-300 bg-sky-300/15 text-white'
                        : 'border-white/10 bg-slate-950/70 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{layer.name}</span>
                    <span className="ml-2 text-xs text-slate-500">#{index + 1}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4 border-t border-white/10 pt-4">
              <div className="text-sm font-bold text-slate-200">选中贴图</div>
              {!selectedLayer && (
                <p className="rounded-md border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
                  在画布或图层列表中选择一个贴图。
                </p>
              )}
              {selectedLayer && (
                <>
                  <div className="space-y-2 text-sm text-slate-300">
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
                              ? 'border-sky-300 bg-sky-300/20 text-sky-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-2 text-sm text-slate-300">
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
                  <label className="block space-y-2 text-sm text-slate-300">
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
                  <label className="block space-y-2 text-sm text-slate-300">
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
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
                    >
                      <FlipHorizontal size={16} />
                      翻转
                    </button>
                    <button
                      type="button"
                      onClick={deleteLayer}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                      删除
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(-1)}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
                    >
                      后移
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(1)}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
                    >
                      前移
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Sparkles size={18} className="text-sky-300" />
                使用说明
              </div>
              {[
                { title: '第一步：选现成皮肤', body: '左侧点“加入画布预览”，先看效果，再决定导出。' },
                { title: '第二步：自己上传图片', body: '切到“自己设计皮肤”，上传图片后可拖动、缩放、旋转。' },
                { title: '第三步：导出交付', body: '点“下载压缩包”，里面会包含皮肤图片和 U 盘放置说明。' },
              ].map((item) => (
                <div key={item.title} className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                  <div className="text-sm font-black text-white">{item.title}</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.body}</p>
                </div>
              ))}
            </section>

            <section className="space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <ShoppingBag size={18} className="text-sky-300" />
                价格说明
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                发小红书时可以直接写：2 元单张下载，9.99 元五张打包，30 元自定义设计。
              </p>
              {priceTiers.map((tier) => (
                <div key={tier.id} className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">{tier.title}</div>
                    <div className="text-lg font-black text-sky-200">{formatPriceCents(tier.priceCents)}</div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{tier.detail}</p>
                </div>
              ))}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default TslSkinApp;
