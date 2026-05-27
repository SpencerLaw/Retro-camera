import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FlipHorizontal,
  Layers,
  Palette,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildTslSkinFileName,
  createSkinLayer,
  getOfficialExampleWrapsForTemplate,
  getTeslaTemplateById,
  TESLA_MODEL_TEMPLATES,
} from './tslSkinLogic.js';
import TslVehicle3DPreview from './TslVehicle3DPreview';

export type TeslaModelTemplate = {
  id: string;
  label: string;
  templateUrl: string;
  vehicleImageUrl: string;
  previewModelUrl?: string | null;
  previewModelFile?: string | null;
  previewObjUrl?: string | null;
  previewMtlUrl?: string | null;
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

type OfficialWrapExample = {
  id: string;
  title: string;
  fileName: string;
  imageUrl: string;
  modelIds: string[];
  sourceLabel: string;
};

type WorkspaceMode = 'download' | 'design';

type DragState = {
  layerId: string;
  startX: number;
  startY: number;
  layerX: number;
  layerY: number;
};

const PRESET_COLORS = ['#ffffff', '#111827', '#e82127', '#3e6ae1', '#14b8a6', '#fbbf24', '#f5d0fe', '#cbd5e1'];
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
  context.strokeStyle = '#3e6ae1';
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.strokeRect(-width / 2, -height / 2, width, height);
  context.setLineDash([]);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#111827';

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
  const [isDayMode, setIsDayMode] = React.useState(true);
  const [status, setStatus] = React.useState('选择皮肤后可直接预览，也可以上传图片自己设计。');
  const [searchWrapQuery, setSearchWrapQuery] = React.useState('');
  const [selectedPreviewWrap, setSelectedPreviewWrap] = React.useState<OfficialWrapExample | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = React.useState<string | null>(null);
  const [customRenderUrl, setCustomRenderUrl] = React.useState<string | null>(null);

  const selectedTemplate = getTeslaTemplateById(selectedTemplateId) as TeslaModelTemplate;
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const officialExamples = React.useMemo(
    () => getOfficialExampleWrapsForTemplate(selectedTemplateId) as OfficialWrapExample[],
    [selectedTemplateId],
  );
  const galleryItems = officialExamples;
  const filteredGalleryItems = React.useMemo(() => {
    const query = searchWrapQuery.trim().toLowerCase();
    if (!query) {
      return galleryItems;
    }

    return galleryItems.filter((item) =>
      `${item.title} ${item.fileName} ${item.sourceLabel}`.toLowerCase().includes(query),
    );
  }, [galleryItems, searchWrapQuery]);
  const previewWrapUrl = customRenderUrl || customPreviewUrl || selectedPreviewWrap?.imageUrl || galleryItems[0]?.imageUrl || null;
  const previewWrapTitle = customRenderUrl || customPreviewUrl
    ? '自定义上传图片'
    : selectedPreviewWrap?.title || galleryItems[0]?.title || '未选择皮肤';

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const previousScale = root.style.getPropertyValue('--app-global-scale');
    const previousInverse = root.style.getPropertyValue('--app-global-scale-inverse');

    root.style.setProperty('--app-global-scale', '1');
    root.style.setProperty('--app-global-scale-inverse', '1');

    return () => {
      if (previousScale) {
        root.style.setProperty('--app-global-scale', previousScale);
      } else {
        root.style.removeProperty('--app-global-scale');
      }

      if (previousInverse) {
        root.style.setProperty('--app-global-scale-inverse', previousInverse);
      } else {
        root.style.removeProperty('--app-global-scale-inverse');
      }
    };
  }, []);

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

  React.useEffect(() => {
    if (!customPreviewUrl && layers.length === 0) {
      setCustomRenderUrl(null);
      return undefined;
    }

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || !templateImage) {
        return;
      }

      drawCanvas(false);
      try {
        const nextUrl = canvas.toDataURL('image/png');
        if (!cancelled) {
          setCustomRenderUrl(nextUrl);
        }
      } catch {
        if (!cancelled) {
          setCustomRenderUrl(customPreviewUrl);
        }
      } finally {
        requestAnimationFrame(() => drawCanvas(true));
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [customPreviewUrl, drawCanvas, layers.length, templateImage]);

  React.useEffect(() => {
    if (customPreviewUrl) {
      return;
    }

    setSelectedPreviewWrap((currentWrap) => {
      if (currentWrap && galleryItems.some((item) => item.id === currentWrap.id)) {
        return currentWrap;
      }

      return galleryItems[0] || null;
    });
  }, [customPreviewUrl, galleryItems]);

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

    setActiveWorkspace('design');
    files.forEach((file, index) => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        setStatus('仅支持常见图片格式。');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const previewUrl = String(reader.result);
        if (index === 0) {
          setCustomPreviewUrl(previewUrl);
          setSelectedPreviewWrap(null);
        }

        const image = new Image();
        image.onload = () => {
          const layerId = `layer_${Date.now()}_${index}`;
          const layer = {
            ...(createSkinLayer(layerId, image) as Omit<SkinLayer, 'name'>),
            clipMode: clipToBody ? 'body' as const : 'full' as const,
            name: file.name,
          };
          setLayers((currentLayers) => [...currentLayers, layer]);
          setSelectedLayerId(layerId);
          setStatus(`已添加 ${file.name}，可在画布中拖动位置。`);
        };
        image.src = previewUrl;
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const applyOfficialWrapToPreview = (example: OfficialWrapExample) => {
    setCustomPreviewUrl(null);
    setCustomRenderUrl(null);
    setLayers([]);
    setSelectedLayerId(null);
    setSelectedPreviewWrap(example);
    setStatus(`${example.title} 已显示在右侧三维渲染区。`);
  };

  const removeCustomWrap = () => {
    setCustomPreviewUrl(null);
    setCustomRenderUrl(null);
    setLayers([]);
    setSelectedLayerId(null);
    setSelectedPreviewWrap(galleryItems[0] || null);
    setStatus('自定义图片已删除，已恢复现有皮肤预览。');
  };

  const clearPreviewWrap = () => {
    setCustomPreviewUrl(null);
    setCustomRenderUrl(null);
    setSelectedPreviewWrap(null);
    setLayers([]);
    setSelectedLayerId(null);
    setStatus('右侧预览已清除，可选择现有皮肤或上传自定义图片。');
  };

  const getWrapAssetBytes = async (example: OfficialWrapExample) => {
    const response = await fetch(example.imageUrl);
    if (!response.ok) {
      throw new Error('皮肤文件下载失败。');
    }

    return new Uint8Array(await response.arrayBuffer());
  };

  const downloadWrapExample = async (example: OfficialWrapExample) => {
    try {
      const bytes = await getWrapAssetBytes(example);
      const blob = new Blob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = example.fileName || buildTslSkinFileName(selectedTemplate.label);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`${example.title} 下载已开始。`);
    } catch {
      const link = document.createElement('a');
      link.href = example.imageUrl;
      link.download = example.fileName || buildTslSkinFileName(selectedTemplate.label);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      setStatus(`${example.title} 已在新窗口打开，可保存图片。`);
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
      setStatus('画布还没有准备好，请稍后重试。');
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

  const downloadSelectedWrapAsset = () => {
    if (customPreviewUrl || customRenderUrl || layers.length > 0 || !selectedPreviewWrap) {
      downloadCanvas();
      return;
    }

    void downloadWrapExample(selectedPreviewWrap);
  };

  const rootClassName = isDayMode
    ? 'tsl-skin-shell min-h-screen overflow-x-hidden bg-[#f4f4f4] text-slate-950'
    : 'tsl-skin-shell min-h-screen overflow-x-hidden bg-[#0b0f16] text-slate-100';
  const sidebarClassName = isDayMode
    ? 'border-slate-200 bg-white text-slate-950'
    : 'border-white/10 bg-slate-950 text-slate-100';
  const panelClassName = isDayMode
    ? 'border-slate-200 bg-white text-slate-950'
    : 'border-white/10 bg-slate-900 text-slate-100';
  const mutedTextClassName = isDayMode ? 'text-slate-500' : 'text-slate-400';
  const subtlePanelClassName = isDayMode
    ? 'border-slate-200 bg-slate-50 text-slate-700'
    : 'border-white/10 bg-slate-900/70 text-slate-300';

  return (
    <div className={rootClassName}>
      <main className="tsl-skin-studio-workbench grid min-h-screen lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`tsl-skin-sidebar flex flex-col border-r lg:max-h-screen ${sidebarClassName}`}>
          <div className="border-b border-inherit p-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition ${
                  isDayMode ? 'border-slate-200 text-slate-600 hover:text-[#e82127]' : 'border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                aria-label="返回首页"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">特斯拉皮肤</div>
                <div className={`mt-0.5 truncate text-xs font-bold ${mutedTextClassName}`}>现有皮肤与自定义上传</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDayMode((current) => !current)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
                  isDayMode
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-[#e82127] hover:text-[#e82127]'
                    : 'border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Sun size={17} />
                {isDayMode ? '深色模式' : '浅色模式'}
              </button>
            </div>

            <label className="mt-3 block text-xs font-black text-slate-500">选择车型</label>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className={`mt-2 h-11 w-full rounded-md border px-3 text-sm font-bold outline-none ${
                isDayMode ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-slate-900 text-white'
              }`}
              aria-label="选择车型"
            >
              {TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: 'download' as const, label: '下载现有皮肤', detail: `${galleryItems.length} 款` },
                { id: 'design' as const, label: '自定义上传', detail: '本地处理' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveWorkspace(item.id)}
                  className={`rounded-md border px-3 py-3 text-left transition ${
                    activeWorkspace === item.id
                      ? 'border-[#3e6ae1] bg-[#3e6ae1] text-white'
                      : isDayMode
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#3e6ae1]'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-black">{item.label}</div>
                  <div className="mt-1 text-xs font-bold opacity-75">{item.detail}</div>
                </button>
              ))}
            </div>
          </div>

          <section className={activeWorkspace === 'download' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            <div className="border-b border-inherit p-3">
              <label className="relative block">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchWrapQuery}
                  onChange={(event) => setSearchWrapQuery(event.target.value)}
                  placeholder="搜索皮肤名称"
                  className={`h-11 w-full rounded-md border pl-10 pr-3 text-sm font-bold outline-none focus:border-[#3e6ae1] ${
                    isDayMode ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-slate-900 text-white'
                  }`}
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-black">现有皮肤</h1>
                  <p className={`mt-1 text-xs font-bold ${mutedTextClassName}`}>点击缩略图预览，底部按钮下载当前选中的皮肤。</p>
                </div>
                <span className="rounded-full bg-[#3e6ae1]/10 px-3 py-1 text-xs font-black text-[#3e6ae1]">
                  {filteredGalleryItems.length}
                </span>
              </div>

              <div className="tsl-skin-wrap-grid grid grid-cols-3 gap-2">
                {filteredGalleryItems.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    onClick={() => applyOfficialWrapToPreview(example)}
                    className={`tsl-skin-wrap-card min-w-0 overflow-hidden rounded-md border transition ${
                      selectedPreviewWrap?.id === example.id && !customPreviewUrl && !customRenderUrl
                        ? 'border-[#3e6ae1] ring-2 ring-[#3e6ae1]/20'
                        : isDayMode
                          ? 'border-slate-200 bg-white hover:border-[#3e6ae1]'
                          : 'border-white/10 bg-slate-900 hover:border-[#3e6ae1]'
                    }`}
                  >
                    <div className="relative aspect-square bg-slate-100">
                      <img
                        src={example.imageUrl}
                        crossOrigin="anonymous"
                        alt={example.title}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-1.5 py-1 text-center text-[10px] font-black text-white">
                        {example.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {filteredGalleryItems.length === 0 && (
                <div className={`mt-4 rounded-md border p-4 text-center text-sm ${subtlePanelClassName}`}>
                  没有找到匹配的皮肤。
                </div>
              )}
            </div>
          </section>

          <section className={activeWorkspace === 'design' ? 'flex min-h-0 flex-1 flex-col overflow-y-auto p-3' : 'hidden'}>
            <div className={`rounded-md border p-4 ${subtlePanelClassName}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">自定义上传裁剪</h2>
                  <div className={`mt-1 text-xs font-black ${mutedTextClassName}`}>上传自己的皮肤</div>
                  <p className={`mt-1 text-xs font-bold ${mutedTextClassName}`}>上传图片后拖动、缩放、旋转，右侧同步渲染。</p>
                </div>
                <ShieldCheck size={19} className="text-emerald-500" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              <div className={`relative flex min-h-[138px] items-center justify-center rounded-md border-2 border-dashed p-3 text-center ${
                isDayMode ? 'border-slate-300 bg-white' : 'border-white/10 bg-slate-950'
              }`}>
                {customPreviewUrl && (
                  <>
                    <button
                      type="button"
                      onClick={removeCustomWrap}
                      aria-label="删除自定义图片"
                      className="absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm transition hover:text-[#e82127]"
                    >
                      <X size={16} />
                    </button>
                    <img src={customPreviewUrl} alt="自定义上传预览" className="max-h-[120px] w-full object-contain" />
                  </>
                )}
                {!customPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-black"
                  >
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-200'}`}>
                      <Upload size={18} />
                    </span>
                    <span>拖入图片或点击上传</span>
                    <span className={`text-xs font-bold ${mutedTextClassName}`}>常见图片格式，建议一比一</span>
                  </button>
                )}
              </div>
              <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                图片仅在你的浏览器本地处理，不会上传服务器，也不会占用网站流量或存储额度。请仅上传原创或已授权素材。
              </p>
            </div>

            <div className={`mt-4 rounded-md border p-4 ${subtlePanelClassName}`}>
              <div className="flex items-center gap-2 text-sm font-black">
                <Palette size={17} className="text-[#3e6ae1]" />
                车身颜色
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="color"
                  value={wrapColor}
                  onChange={(event) => setWrapColor(event.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-md border border-slate-200 bg-white"
                  aria-label="选择车身颜色"
                />
                <div className={`text-xs font-bold ${mutedTextClassName}`}>未上传图片时，右侧会显示纯色车身效果。</div>
              </div>
              <div className="mt-3 grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setWrapColor(color)}
                    className="h-9 rounded-md border border-slate-200 transition hover:scale-105"
                    style={{ background: color }}
                    aria-label="套用预设颜色"
                  />
                ))}
              </div>
            </div>

            <div className={`mt-4 rounded-md border p-3 ${panelClassName}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-black">裁剪画布</div>
                <span className={`text-xs font-bold ${mutedTextClassName}`}>{selectedTemplate.label} · 一比一</span>
              </div>
              <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-slate-950 p-2">
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
                  className="aspect-square h-auto max-h-[52vh] w-full touch-none rounded-md border border-white/10 bg-slate-950"
                />
              </div>
              <p className={`mt-2 text-xs leading-5 ${mutedTextClassName}`}>{status}</p>
            </div>

            <div className={`mt-4 rounded-md border p-4 ${subtlePanelClassName}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black">
                  <Layers size={17} className="text-[#3e6ae1]" />
                  图层
                </div>
                <span className={`text-xs font-bold ${mutedTextClassName}`}>{layers.length}</span>
              </div>
              <label className={`mt-3 flex items-start gap-3 rounded-md border p-3 text-sm ${panelClassName}`}>
                <input
                  type="checkbox"
                  checked={clipToBody}
                  onChange={(event) => setClipToBody(event.target.checked)}
                  className="mt-1"
                />
                <span>新上传贴图默认贴合车身区域</span>
              </label>
              <div className="mt-3 space-y-2">
                {layers.length === 0 && (
                  <div className={`rounded-md border p-4 text-center text-sm ${panelClassName}`}>上传贴图后会出现在这里。</div>
                )}
                {layers.map((layer, index) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedLayerId === layer.id
                        ? 'border-[#3e6ae1] bg-[#3e6ae1]/10 text-[#3e6ae1]'
                        : isDayMode
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-[#3e6ae1]'
                          : 'border-white/10 bg-slate-900 text-slate-200 hover:border-[#3e6ae1]'
                    }`}
                  >
                    <span className="truncate">{layer.name}</span>
                    <span className="ml-2 text-xs opacity-60">#{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`mt-4 rounded-md border p-4 ${subtlePanelClassName}`}>
              <div className="text-sm font-black">选中贴图</div>
              {!selectedLayer && (
                <p className={`mt-3 rounded-md border p-4 text-sm ${panelClassName}`}>在画布或图层列表中选择一个贴图。</p>
              )}
              {selectedLayer && (
                <div className="mt-3 space-y-4">
                  <div className="space-y-2 text-sm">
                    <span className={mutedTextClassName}>裁剪模式</span>
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
                              ? 'border-[#3e6ae1] bg-[#3e6ae1]/10 text-[#3e6ae1]'
                              : isDayMode
                                ? 'border-slate-200 bg-white text-slate-600 hover:border-[#3e6ae1]'
                                : 'border-white/10 bg-slate-900 text-slate-200 hover:border-[#3e6ae1]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className={`block space-y-2 text-sm ${mutedTextClassName}`}>
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
                  <label className={`block space-y-2 text-sm ${mutedTextClassName}`}>
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
                  <label className={`block space-y-2 text-sm ${mutedTextClassName}`}>
                    <span>旋转 {Math.round((selectedLayer.rotation * 180) / Math.PI)}°</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={Math.round((selectedLayer.rotation * 180) / Math.PI)}
                      onChange={(event) => updateSelectedLayer({ rotation: (Number(event.target.value) * Math.PI) / 180 })}
                      className="w-full"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedLayer({ flipX: !selectedLayer.flipX })}
                      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition ${panelClassName}`}
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
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition ${panelClassName}`}
                    >
                      后移
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(1)}
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition ${panelClassName}`}
                    >
                      前移
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className={`mt-4 text-xs leading-5 ${mutedTextClassName}`}>
              使用顺序：先选车型，再上传图片调整位置，最后点击右下角下载当前皮肤。
            </p>
          </section>
        </aside>

        <section className={`tsl-skin-render-stage relative min-h-[580px] overflow-hidden lg:min-h-screen ${isDayMode ? 'bg-[#e5e7eb]' : 'bg-slate-900'}`}>
          <TslVehicle3DPreview
            wrapColor={wrapColor}
            wrapImageUrl={previewWrapUrl}
            modelUrl={selectedTemplate.previewModelUrl}
            objModelUrl={selectedTemplate.previewObjUrl}
            mtlModelUrl={selectedTemplate.previewMtlUrl}
            vehicleImageUrl={selectedTemplate.vehicleImageUrl}
            modelLabel={selectedTemplate.label}
            isDayMode={isDayMode}
          />

          <div className="pointer-events-none absolute left-5 top-5 max-w-[min(420px,calc(100%-40px))] rounded-md border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur">
            <div className="truncate text-sm font-black text-slate-900">{previewWrapTitle}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">右侧为三维动态预览，鼠标拖动旋转，滚轮缩放。</div>
          </div>

          <div className="absolute bottom-5 left-3 right-3 flex flex-col gap-3 rounded-lg border border-white/70 bg-white/90 p-3 shadow-2xl backdrop-blur sm:left-1/2 sm:right-auto sm:w-[min(820px,calc(100%-24px))] sm:-translate-x-1/2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-slate-800">{selectedTemplate.label}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{status}</div>
            </div>
            <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={clearPreviewWrap}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-black text-slate-700 transition hover:border-[#e82127]"
              >
                <RefreshCcw size={16} />
                清除皮肤
              </button>
              <button
                type="button"
                onClick={downloadSelectedWrapAsset}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#3e6ae1] px-3 text-sm font-black text-white transition hover:bg-[#3457b1]"
              >
                <Download size={16} />
                下载当前皮肤
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TslSkinApp;
