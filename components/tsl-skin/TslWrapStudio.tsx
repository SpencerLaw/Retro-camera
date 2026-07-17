import * as React from 'react';
import type Konva from 'konva';
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import {
  ArrowDown,
  ArrowUp,
  Car,
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  FlipHorizontal,
  ImagePlus,
  Layers3,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Palette,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  WRAP_CANVAS_SIZE,
  cloneLayers,
  decodeUploadedImage,
  estimateEffectiveDpi,
  fitLayerToBounds,
  generateTemplateMask,
  loadImageElement,
  reconcileLayerObjectUrls,
  renderWrapTexture,
  type TemplateMaskResult,
  type WrapArtworkMode,
  type WrapFitMode,
  type WrapLayer,
} from './modelAwareImage';

interface TeslaTemplateProfile {
  id: string;
  label: string;
  templateUrl: string;
}

interface TslWrapStudioProps {
  template: TeslaTemplateProfile;
  templates: TeslaTemplateProfile[];
  wrapColor: string;
  isDayMode: boolean;
  onTemplateChange: (templateId: string) => void;
  onWrapColorChange: (color: string) => void;
  onTextureChange: (imageUrl: string | null) => void;
  onOpen3DPreview: () => void;
  onStatusChange?: (status: string) => void;
}

type MobilePanel = 'image' | 'layout' | 'adjust' | 'layers' | null;

const PAINT_COLORS = [
  '#ffffff',
  '#050505',
  '#1f2937',
  '#3e6ae1',
  '#e82127',
  '#8b1e2d',
  '#0f6b55',
  '#7b6a58',
  '#c6c8ca',
  '#f1d7a8',
];

const MIN_LAYER_SCALE = 0.02;
const MAX_LAYER_SCALE = 8;
const HISTORY_LIMIT = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sameLayerState(a: WrapLayer[], b: WrapLayer[]) {
  if (a.length !== b.length) return false;
  return a.every((layer, index) => {
    const other = b[index];
    return other
      && layer.id === other.id
      && layer.x === other.x
      && layer.y === other.y
      && layer.scaleX === other.scaleX
      && layer.scaleY === other.scaleY
      && layer.rotation === other.rotation
      && layer.opacity === other.opacity
      && layer.visible === other.visible
      && layer.locked === other.locked
      && layer.artworkMode === other.artworkMode;
  });
}

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function RangeControl({
  label,
  valueLabel,
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums text-slate-700 dark:text-slate-200">{valueLabel}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="w-full accent-[#3e6ae1]"
      />
    </label>
  );
}

export default function TslWrapStudio({
  template,
  templates,
  wrapColor,
  isDayMode,
  onTemplateChange,
  onWrapColorChange,
  onTextureChange,
  onOpen3DPreview,
  onStatusChange,
}: TslWrapStudioProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const transformerRef = React.useRef<Konva.Transformer | null>(null);
  const imageNodeRefs = React.useRef<Record<string, Konva.Image>>({});
  const canvasShellRef = React.useRef<HTMLDivElement | null>(null);
  const objectUrlsRef = React.useRef(new Set<string>());
  const wheelCommitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTemplateIdRef = React.useRef(template.id);
  const pinchRef = React.useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    layer: WrapLayer;
  } | null>(null);

  const [layers, setLayers] = React.useState<WrapLayer[]>([]);
  const layersRef = React.useRef<WrapLayer[]>(layers);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [templateImage, setTemplateImage] = React.useState<HTMLImageElement | null>(null);
  const [maskResult, setMaskResult] = React.useState<TemplateMaskResult | null>(null);
  const [templateStatus, setTemplateStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = React.useState('选择图片后，系统会根据当前车型自动适配。');
  const [displaySize, setDisplaySize] = React.useState(560);
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>(null);
  const [showCenterGuideX, setShowCenterGuideX] = React.useState(false);
  const [showCenterGuideY, setShowCenterGuideY] = React.useState(false);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [renderedTextureUrl, setRenderedTextureUrl] = React.useState<string | null>(null);

  const historyRef = React.useRef<WrapLayer[][]>([[]]);
  const historyIndexRef = React.useRef(0);

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const stageScale = displaySize / WRAP_CANVAS_SIZE;
  const panelSurface = isDayMode
    ? 'border-slate-200 bg-[#f8fafc] text-slate-900'
    : 'border-white/10 bg-[#111722] text-slate-100';
  const innerSurface = isDayMode
    ? 'border-slate-200 bg-white'
    : 'border-white/10 bg-[#0b1018]';

  React.useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const publishStatus = React.useCallback((message: string) => {
    setStatus(message);
    onStatusChange?.(message);
  }, [onStatusChange]);

  const pushHistory = React.useCallback((nextLayers: WrapLayer[]) => {
    const currentSnapshot = historyRef.current[historyIndexRef.current] || [];
    if (sameLayerState(currentSnapshot, nextLayers)) return;
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(cloneLayers(nextLayers));
    if (nextHistory.length > HISTORY_LIMIT) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, []);

  const commitCurrentHistory = React.useCallback(() => {
    pushHistory(layersRef.current);
  }, [pushHistory]);

  const setLayersWithHistory = React.useCallback((updater: (current: WrapLayer[]) => WrapLayer[]) => {
    setLayers((current) => {
      const next = reconcileLayerObjectUrls(current, updater(current), objectUrlsRef.current);
      layersRef.current = next;
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = reconcileLayerObjectUrls(
      layersRef.current,
      cloneLayers(historyRef.current[historyIndexRef.current]),
      objectUrlsRef.current,
    );
    layersRef.current = snapshot;
    setLayers(snapshot);
    setSelectedLayerId((current) => snapshot.some((layer) => layer.id === current) ? current : snapshot[0]?.id || null);
    publishStatus('已撤销上一步操作。');
  }, [publishStatus]);

  const redo = React.useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = reconcileLayerObjectUrls(
      layersRef.current,
      cloneLayers(historyRef.current[historyIndexRef.current]),
      objectUrlsRef.current,
    );
    layersRef.current = snapshot;
    setLayers(snapshot);
    setSelectedLayerId((current) => snapshot.some((layer) => layer.id === current) ? current : snapshot[0]?.id || null);
    publishStatus('已恢复下一步操作。');
  }, [publishStatus]);

  React.useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) return undefined;
    const updateSize = () => {
      const rect = shell.getBoundingClientRect();
      const viewportCap = window.innerWidth >= 1280 ? window.innerHeight * 0.66 : rect.width;
      const nextSize = clamp(Math.floor(Math.min(rect.width - 24, viewportCap, 720)), 270, 720);
      setDisplaySize(nextSize);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setTemplateStatus('loading');
    setTemplateImage(null);
    setMaskResult(null);
    setRenderedTextureUrl(null);
    onTextureChange(null);
    publishStatus(`正在加载 ${template.label} 官方 UV 模板...`);

    loadImageElement(template.templateUrl, true)
      .then((image) => {
        if (cancelled) return;
        const nextMask = generateTemplateMask(image);
        setTemplateImage(image);
        setMaskResult(nextMask);
        setTemplateStatus('ready');

        if (previousTemplateIdRef.current !== template.id && layersRef.current.length > 0) {
          const refitted = layersRef.current.map((layer) => fitLayerToBounds(layer, nextMask.bounds, 'smart'));
          layersRef.current = refitted;
          setLayers(refitted);
          pushHistory(refitted);
          publishStatus(`已切换为 ${template.label}，图片已按新车型重新适配。`);
        } else {
          publishStatus(`${template.label} 已就绪，可上传图片。`);
        }
        previousTemplateIdRef.current = template.id;
      })
      .catch(() => {
        if (cancelled) return;
        setTemplateStatus('error');
        publishStatus('车型模板加载失败，请检查网络后重试。');
      });

    return () => {
      cancelled = true;
    };
  }, [onTextureChange, publishStatus, pushHistory, template.id, template.label, template.templateUrl]);

  React.useEffect(() => {
    if (!maskResult) return undefined;
    setRenderedTextureUrl(null);
    onTextureChange(null);
    const timer = setTimeout(() => {
      try {
        const textureCanvas = renderWrapTexture(maskResult.canvas, layers, wrapColor);
        const nextTextureUrl = textureCanvas.toDataURL('image/png');
        setRenderedTextureUrl(nextTextureUrl);
        onTextureChange(nextTextureUrl);
      } catch {
        setRenderedTextureUrl(null);
        onTextureChange(null);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [layers, maskResult, onTextureChange, wrapColor]);

  React.useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const selectedNode = selectedLayerId ? imageNodeRefs.current[selectedLayerId] : null;
    transformer.nodes(selectedNode && !selectedLayer?.locked ? [selectedNode] : []);
    transformer.getLayer()?.batchDraw();
  }, [layers, selectedLayer?.locked, selectedLayerId]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (!selectedLayerId || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const amount = event.shiftKey ? 10 : 1;
      event.preventDefault();
      setLayers((current) => {
        const next = current.map((layer) => {
          if (layer.id !== selectedLayerId || layer.locked) return layer;
          if (event.key === 'ArrowUp') return { ...layer, y: layer.y - amount };
          if (event.key === 'ArrowDown') return { ...layer, y: layer.y + amount };
          if (event.key === 'ArrowLeft') return { ...layer, x: layer.x - amount };
          return { ...layer, x: layer.x + amount };
        });
        layersRef.current = next;
        return next;
      });
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) commitCurrentHistory();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [commitCurrentHistory, redo, selectedLayerId, undo]);

  React.useEffect(() => () => {
    if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const handleFiles = React.useCallback(async (files: File[]) => {
    if (!maskResult || files.length === 0) return;
    const accepted = files.slice(0, 8);
    let added = 0;
    let lastSelectedId: string | null = null;
    const newLayers: WrapLayer[] = [];

    for (const file of accepted) {
      try {
        const decoded = await decodeUploadedImage(file);
        objectUrlsRef.current.add(decoded.src);
        const id = `wrap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const baseLayer: WrapLayer = {
          id,
          name: file.name,
          src: decoded.src,
          blob: decoded.blob,
          image: decoded.image,
          width: decoded.width,
          height: decoded.height,
          x: WRAP_CANVAS_SIZE / 2,
          y: WRAP_CANVAS_SIZE / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          artworkMode: 'subject',
        };
        newLayers.push(fitLayerToBounds(baseLayer, maskResult.bounds, 'smart', 'subject'));
        lastSelectedId = id;
        added += 1;
        if (decoded.wasDownscaled) publishStatus(`${file.name} 尺寸较大，已生成流畅编辑副本。`);
      } catch (error) {
        publishStatus(error instanceof Error ? error.message : `${file.name} 读取失败。`);
      }
    }

    if (newLayers.length > 0) {
      setLayersWithHistory((current) => [...current, ...newLayers]);
      setSelectedLayerId(lastSelectedId);
      setMobilePanel(null);
      publishStatus(`已添加 ${added} 张图片，并按 ${template.label} 自动适配。`);
    }
  }, [maskResult, publishStatus, setLayersWithHistory, template.label]);

  const updateSelectedLayer = React.useCallback((updates: Partial<WrapLayer>, withHistory = false) => {
    if (!selectedLayerId) return;
    const updater = (current: WrapLayer[]) => current.map((layer) => layer.id === selectedLayerId ? { ...layer, ...updates } : layer);
    if (withHistory) {
      setLayersWithHistory(updater);
    } else {
      setLayers((current) => {
        const next = updater(current);
        layersRef.current = next;
        return next;
      });
    }
  }, [selectedLayerId, setLayersWithHistory]);

  const fitSelected = React.useCallback((mode: WrapFitMode) => {
    if (!selectedLayerId || !maskResult) return;
    setLayersWithHistory((current) => current.map((layer) => (
      layer.id === selectedLayerId ? fitLayerToBounds(layer, maskResult.bounds, mode) : layer
    )));
    const labels: Record<WrapFitMode, string> = { smart: '智能适配', contain: '完整显示', cover: '铺满车身' };
    publishStatus(`已应用“${labels[mode]}”。`);
  }, [maskResult, publishStatus, selectedLayerId, setLayersWithHistory]);

  const centerSelected = React.useCallback(() => {
    if (!selectedLayerId || !maskResult) return;
    updateSelectedLayer({
      x: maskResult.bounds.x + maskResult.bounds.width / 2,
      y: maskResult.bounds.y + maskResult.bounds.height / 2,
    }, true);
    publishStatus('图片已居中到当前车型有效区域。');
  }, [maskResult, publishStatus, selectedLayerId, updateSelectedLayer]);

  const setArtworkMode = React.useCallback((artworkMode: WrapArtworkMode) => {
    if (!selectedLayer || !maskResult) return;
    setLayersWithHistory((current) => current.map((layer) => (
      layer.id === selectedLayer.id
        ? fitLayerToBounds({ ...layer, artworkMode }, maskResult.bounds, 'smart', artworkMode)
        : layer
    )));
    publishStatus(artworkMode === 'subject' ? '已切换为主体图片布局。' : '已切换为连续纹理布局。');
  }, [maskResult, publishStatus, selectedLayer, setLayersWithHistory]);

  const deleteLayer = React.useCallback((layerId: string) => {
    setLayersWithHistory((current) => current.filter((layer) => layer.id !== layerId));
    setSelectedLayerId((current) => current === layerId ? null : current);
    publishStatus('贴图已删除，可通过撤销恢复。');
  }, [publishStatus, setLayersWithHistory]);

  const moveLayer = React.useCallback((layerId: string, direction: -1 | 1) => {
    setLayersWithHistory((current) => {
      const index = current.findIndex((layer) => layer.id === layerId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, [setLayersWithHistory]);

  const clearAllLayers = React.useCallback(() => {
    setLayersWithHistory(() => []);
    setSelectedLayerId(null);
    publishStatus('已清空当前设计，可通过撤销恢复。');
  }, [publishStatus, setLayersWithHistory]);

  const handleLayerDragMove = React.useCallback((event: any) => {
    if (!maskResult) return;
    const node = event.target as Konva.Image;
    const centerX = maskResult.bounds.x + maskResult.bounds.width / 2;
    const centerY = maskResult.bounds.y + maskResult.bounds.height / 2;
    const threshold = 12;
    const snapX = Math.abs(node.x() - centerX) <= threshold;
    const snapY = Math.abs(node.y() - centerY) <= threshold;
    if (snapX) node.x(centerX);
    if (snapY) node.y(centerY);
    setShowCenterGuideX(snapX);
    setShowCenterGuideY(snapY);
  }, [maskResult]);

  const handleLayerDragEnd = React.useCallback((event: any, layerId: string) => {
    const node = event.target as Konva.Image;
    const nextX = node.x();
    const nextY = node.y();
    setShowCenterGuideX(false);
    setShowCenterGuideY(false);
    setLayers((current) => {
      const next = current.map((layer) => layer.id === layerId ? { ...layer, x: nextX, y: nextY } : layer);
      layersRef.current = next;
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const handleTransformEnd = React.useCallback((event: any, layerId: string) => {
    const node = event.target as Konva.Image;
    const nextScaleX = clamp(node.scaleX(), -MAX_LAYER_SCALE, MAX_LAYER_SCALE);
    const nextScaleY = clamp(node.scaleY(), -MAX_LAYER_SCALE, MAX_LAYER_SCALE);
    setLayers((current) => {
      const next = current.map((layer) => layer.id === layerId ? {
        ...layer,
        x: node.x(),
        y: node.y(),
        scaleX: Math.abs(nextScaleX) < MIN_LAYER_SCALE ? Math.sign(nextScaleX || 1) * MIN_LAYER_SCALE : nextScaleX,
        scaleY: Math.abs(nextScaleY) < MIN_LAYER_SCALE ? Math.sign(nextScaleY || 1) * MIN_LAYER_SCALE : nextScaleY,
        rotation: node.rotation(),
      } : layer);
      layersRef.current = next;
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const scheduleWheelCommit = React.useCallback(() => {
    if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = setTimeout(() => commitCurrentHistory(), 260);
  }, [commitCurrentHistory]);

  const handleWheel = React.useCallback((event: any) => {
    if (!selectedLayer || selectedLayer.locked) return;
    event.evt.preventDefault();
    const stage = event.target.getStage() as Konva.Stage;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const point = { x: pointer.x / stageScale, y: pointer.y / stageScale };
    const direction = event.evt.deltaY > 0 ? 0.92 : 1.08;
    const currentScale = Math.max(MIN_LAYER_SCALE, Math.abs(selectedLayer.scaleX));
    const nextScale = clamp(currentScale * direction, MIN_LAYER_SCALE, MAX_LAYER_SCALE);
    const ratio = nextScale / currentScale;
    updateSelectedLayer({
      x: point.x - (point.x - selectedLayer.x) * ratio,
      y: point.y - (point.y - selectedLayer.y) * ratio,
      scaleX: Math.sign(selectedLayer.scaleX || 1) * nextScale,
      scaleY: Math.sign(selectedLayer.scaleY || 1) * nextScale,
    });
    scheduleWheelCommit();
  }, [scheduleWheelCommit, selectedLayer, stageScale, updateSelectedLayer]);

  const getTouchPoint = React.useCallback((touch: Touch) => {
    const rect = stageRef.current?.container().getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (touch.clientX - rect.left) / stageScale,
      y: (touch.clientY - rect.top) / stageScale,
    };
  }, [stageScale]);

  const handleTouchStart = React.useCallback((event: any) => {
    if (!selectedLayer || selectedLayer.locked || event.evt.touches.length !== 2) return;
    event.evt.preventDefault();
    const first = getTouchPoint(event.evt.touches[0]);
    const second = getTouchPoint(event.evt.touches[1]);
    pinchRef.current = {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      centerX: (first.x + second.x) / 2,
      centerY: (first.y + second.y) / 2,
      layer: { ...selectedLayer },
    };
  }, [getTouchPoint, selectedLayer]);

  const handleTouchMove = React.useCallback((event: any) => {
    const pinch = pinchRef.current;
    if (!pinch || event.evt.touches.length !== 2) return;
    event.evt.preventDefault();
    const first = getTouchPoint(event.evt.touches[0]);
    const second = getTouchPoint(event.evt.touches[1]);
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    const baseScale = Math.max(MIN_LAYER_SCALE, Math.abs(pinch.layer.scaleX));
    const nextScale = clamp(baseScale * (distance / Math.max(1, pinch.distance)), MIN_LAYER_SCALE, MAX_LAYER_SCALE);
    const ratio = nextScale / baseScale;
    updateSelectedLayer({
      x: centerX - (pinch.centerX - pinch.layer.x) * ratio,
      y: centerY - (pinch.centerY - pinch.layer.y) * ratio,
      scaleX: Math.sign(pinch.layer.scaleX || 1) * nextScale,
      scaleY: Math.sign(pinch.layer.scaleY || 1) * nextScale,
    });
  }, [getTouchPoint, updateSelectedLayer]);

  const handleTouchEnd = React.useCallback(() => {
    if (!pinchRef.current) return;
    pinchRef.current = null;
    commitCurrentHistory();
  }, [commitCurrentHistory]);

  const baseColorCanvas = React.useMemo(() => {
    if (!maskResult) return null;
    return renderWrapTexture(maskResult.canvas, [], wrapColor);
  }, [maskResult, wrapColor]);

  const selectedDpi = selectedLayer ? estimateEffectiveDpi(selectedLayer) : null;
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const uploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={templateStatus !== 'ready'}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3e6ae1] px-4 text-xs font-black text-white transition hover:bg-[#3457b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ImagePlus size={15} />
      添加图片
    </button>
  );

  const layersPanelContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <PanelTitle icon={<Layers3 size={14} />}>图层</PanelTitle>
        <span className="text-xs font-black tabular-nums text-slate-400">{layers.length}</span>
      </div>
      <div className="mt-3">{uploadButton}</div>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {layers.length === 0 && (
          <div className={`rounded-md border border-dashed p-4 text-center text-xs leading-5 text-slate-500 ${innerSurface}`}>
            暂无图片
          </div>
        )}
        {[...layers].reverse().map((layer) => {
          const realIndex = layers.findIndex((item) => item.id === layer.id);
          const active = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              className={`rounded-md border p-2 transition ${active ? 'border-[#3e6ae1] bg-[#3e6ae1]/10' : innerSurface}`}
            >
              <button
                type="button"
                onClick={() => setSelectedLayerId(layer.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                  <img src={layer.src} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-xs font-black leading-4">{layer.name}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-400">
                    {layer.artworkMode === 'subject' ? '主体图片' : '连续纹理'}
                  </span>
                </span>
              </button>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLayersWithHistory((current) => current.map((item) => item.id === layer.id ? { ...item, visible: !item.visible } : item))}
                  className="inline-flex h-11 items-center justify-center rounded border border-slate-200/70 text-slate-500 hover:text-[#3e6ae1]"
                  aria-label={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setLayersWithHistory((current) => current.map((item) => item.id === layer.id ? { ...item, locked: !item.locked } : item))}
                  className="inline-flex h-11 items-center justify-center rounded border border-slate-200/70 text-slate-500 hover:text-[#3e6ae1]"
                  aria-label={layer.locked ? '解锁图层' : '锁定图层'}
                >
                  {layer.locked ? <Lock size={13} /> : <LockOpen size={13} />}
                </button>
                <button type="button" onClick={() => moveLayer(layer.id, 1)} disabled={realIndex === layers.length - 1} className="inline-flex h-11 items-center justify-center rounded border border-slate-200/70 text-slate-500 disabled:opacity-25" aria-label="图层前移">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => moveLayer(layer.id, -1)} disabled={realIndex === 0} className="inline-flex h-11 items-center justify-center rounded border border-slate-200/70 text-slate-500 disabled:opacity-25" aria-label="图层后移">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => deleteLayer(layer.id)} className="inline-flex h-11 items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50" aria-label="删除图层">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {layers.length > 0 && (
        <button type="button" onClick={clearAllLayers} className="mt-3 text-left text-xs font-bold text-red-500 hover:text-red-600">
          清空全部图层
        </button>
      )}
    </div>
  );

  const layoutControls = selectedLayer ? (
    <div className="space-y-4">
      <div>
        <PanelTitle icon={<Sparkles size={14} />}>图片类型</PanelTitle>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            { id: 'subject' as const, label: '主体图片', detail: '照片 / Logo' },
            { id: 'texture' as const, label: '连续纹理', detail: '迷彩 / 图案' },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setArtworkMode(item.id)}
              className={`rounded-md border p-2 text-left transition ${selectedLayer.artworkMode === item.id ? 'border-[#3e6ae1] bg-[#3e6ae1]/10 text-[#3e6ae1]' : innerSurface}`}
            >
              <span className="block text-xs font-black">{item.label}</span>
              <span className="mt-0.5 block text-[10px] font-bold opacity-60">{item.detail}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <PanelTitle icon={<Maximize2 size={14} />}>车型适配</PanelTitle>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => fitSelected('smart')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black transition ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
            <Sparkles size={14} /> 智能适配
          </button>
          <button type="button" onClick={() => fitSelected('contain')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black transition ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
            <Minimize2 size={14} /> 完整显示
          </button>
          <button type="button" onClick={() => fitSelected('cover')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black transition ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
            <Maximize2 size={14} /> 铺满车身
          </button>
          <button type="button" onClick={centerSelected} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black transition ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
            <Crosshair size={14} /> 居中
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={`rounded-md border border-dashed p-4 text-center text-xs leading-5 text-slate-500 ${innerSurface}`}>
      选择图片后，可调整适配方式。
    </div>
  );

  const adjustControls = selectedLayer ? (
    <div className="space-y-5">
      {selectedDpi !== null && selectedDpi < 90 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
          当前图片放大较多，车机近距离查看时可能不够清晰。
        </div>
      )}
      <RangeControl
        label="透明度"
        valueLabel={`${Math.round(selectedLayer.opacity * 100)}%`}
        min={0}
        max={100}
        value={Math.round(selectedLayer.opacity * 100)}
        onChange={(value) => updateSelectedLayer({ opacity: value / 100 })}
        onCommit={commitCurrentHistory}
      />
      <RangeControl
        label="缩放"
        valueLabel={`${Math.round(Math.abs(selectedLayer.scaleX) * 100)}%`}
        min={2}
        max={800}
        value={Math.round(Math.abs(selectedLayer.scaleX) * 100)}
        onChange={(value) => {
          const scale = value / 100;
          updateSelectedLayer({
            scaleX: Math.sign(selectedLayer.scaleX || 1) * scale,
            scaleY: Math.sign(selectedLayer.scaleY || 1) * scale,
          });
        }}
        onCommit={commitCurrentHistory}
      />
      <RangeControl
        label="旋转"
        valueLabel={`${Math.round(selectedLayer.rotation)}°`}
        min={-180}
        max={180}
        value={Math.round(selectedLayer.rotation)}
        onChange={(value) => updateSelectedLayer({ rotation: value })}
        onCommit={commitCurrentHistory}
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => updateSelectedLayer({ scaleX: -selectedLayer.scaleX }, true)} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
          <FlipHorizontal size={14} /> 水平翻转
        </button>
        <button type="button" onClick={() => fitSelected('smart')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-black ${innerSurface} hover:border-[#3e6ae1] hover:text-[#3e6ae1]`}>
          <RotateCcw size={14} /> 重置
        </button>
      </div>
    </div>
  ) : (
    <div className={`rounded-md border border-dashed p-4 text-center text-xs leading-5 text-slate-500 ${innerSurface}`}>
      画布中选择图片后，可精确调整缩放、旋转和透明度。
    </div>
  );

  const imageControls = (
    <div className="space-y-4">
      <div className={`rounded-md border p-4 ${innerSurface}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3e6ae1]/10 text-[#3e6ae1]">
          <Upload size={20} />
        </div>
        <h3 className="mt-3 text-sm font-black">上传你的图片</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          <span className="block">PNG / JPEG / WebP</span>
          <span className="block">单张不超过 20 MB，可多选。</span>
        </p>
        <div className="mt-3">{uploadButton}</div>
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
        <span className="block">仅在当前浏览器处理。</span>
        <span className="block">图片不会上传。</span>
      </div>
      <div>
        <PanelTitle icon={<Palette size={14} />}>车身底色</PanelTitle>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {PAINT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onWrapColorChange(color)}
              className={`h-9 rounded-md border transition hover:scale-105 ${wrapColor.toLowerCase() === color ? 'ring-2 ring-[#3e6ae1] ring-offset-2' : 'border-slate-200'}`}
              style={{ backgroundColor: color }}
              aria-label={`车身颜色 ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const mobilePanelContent = mobilePanel === 'image'
    ? imageControls
    : mobilePanel === 'layout'
      ? layoutControls
      : mobilePanel === 'adjust'
        ? adjustControls
        : mobilePanel === 'layers'
          ? layersPanelContent
          : null;

  return (
    <div className={`relative flex min-h-[640px] flex-1 overflow-hidden rounded-lg border ${panelSurface}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          void handleFiles(Array.from(event.target.files || []));
          event.target.value = '';
        }}
        className="hidden"
      />

      <aside className={`hidden w-[176px] shrink-0 border-r p-3 xl:flex ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1018]'}`}>
        {layersPanelContent}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col pb-14 xl:pb-0">
        <header className={`flex min-h-16 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1018]'}`}>
          <div className="w-full min-w-0 sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#3e6ae1]/10 text-[#3e6ae1]">
                <Car size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-black sm:text-base">车型感知车衣工作台</h2>
                <label className="relative mt-1 block w-full min-w-0 sm:max-w-[300px]">
                  <span className="sr-only">选择自定义车型</span>
                  <select
                    value={template.id}
                    onChange={(event) => onTemplateChange(event.target.value)}
                    className={`h-11 w-full min-w-0 appearance-none rounded-md border py-0 pl-3 pr-9 text-sm font-bold outline-none transition focus:border-[#3e6ae1] ${isDayMode ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-[#111722] text-slate-200'}`}
                    aria-label="选择自定义车型"
                  >
                    {templates.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </label>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
            <button type="button" onClick={undo} disabled={!canUndo} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:text-[#3e6ae1] disabled:opacity-30" aria-label="撤销">
              <Undo2 size={15} />
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:text-[#3e6ae1] disabled:opacity-30" aria-label="重做">
              <Redo2 size={15} />
            </button>
            <button
              type="button"
              onClick={onOpen3DPreview}
              disabled={templateStatus !== 'ready' || !renderedTextureUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#3e6ae1] px-4 text-sm font-black text-white transition hover:bg-[#3457b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-40"
            >
              <Car size={14} />
              <span className="hidden sm:inline">查看 3D 效果</span>
              <span className="sm:hidden">3D</span>
            </button>
          </div>
        </header>

        <div
          ref={canvasShellRef}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraggingFile(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
            void handleFiles(Array.from(event.dataTransfer.files || []));
          }}
          className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5 ${isDayMode ? 'bg-[#e9edf2]' : 'bg-[#070b11]'}`}
        >
          <div
            className={`relative overflow-hidden rounded-lg border shadow-2xl transition ${isDraggingFile ? 'border-[#3e6ae1] ring-4 ring-[#3e6ae1]/20' : isDayMode ? 'border-slate-300' : 'border-white/10'}`}
            style={{ width: displaySize, height: displaySize }}
          >
            <Stage
              ref={stageRef}
              width={displaySize}
              height={displaySize}
              scaleX={stageScale}
              scaleY={stageScale}
              onMouseDown={(event) => {
                if (event.target === event.target.getStage()) setSelectedLayerId(null);
              }}
              onTap={(event) => {
                if (event.target === event.target.getStage()) setSelectedLayerId(null);
              }}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                <Rect x={0} y={0} width={WRAP_CANVAS_SIZE} height={WRAP_CANVAS_SIZE} fill="#080d14" listening={false} />
                {Array.from({ length: 7 }, (_, index) => (index + 1) * 128).flatMap((offset) => [
                  <Line key={`grid-v-${offset}`} points={[offset, 0, offset, WRAP_CANVAS_SIZE]} stroke="#ffffff" strokeWidth={1} opacity={0.035} listening={false} />,
                  <Line key={`grid-h-${offset}`} points={[0, offset, WRAP_CANVAS_SIZE, offset]} stroke="#ffffff" strokeWidth={1} opacity={0.035} listening={false} />,
                ])}
                {baseColorCanvas && <KonvaImage image={baseColorCanvas} x={0} y={0} width={WRAP_CANVAS_SIZE} height={WRAP_CANVAS_SIZE} listening={false} />}
                <Group>
                  {layers.map((layer) => (
                    <KonvaImage
                      key={layer.id}
                      ref={(node) => {
                        if (node) imageNodeRefs.current[layer.id] = node;
                        else delete imageNodeRefs.current[layer.id];
                      }}
                      id={layer.id}
                      image={layer.image}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      offsetX={layer.width / 2}
                      offsetY={layer.height / 2}
                      scaleX={layer.scaleX}
                      scaleY={layer.scaleY}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      visible={layer.visible}
                      draggable={!layer.locked}
                      listening={!layer.locked}
                      onMouseDown={(event) => {
                        event.cancelBubble = true;
                        setSelectedLayerId(layer.id);
                      }}
                      onTap={(event) => {
                        event.cancelBubble = true;
                        setSelectedLayerId(layer.id);
                      }}
                      onDragMove={handleLayerDragMove}
                      onDragEnd={(event) => handleLayerDragEnd(event, layer.id)}
                      onTransformEnd={(event) => handleTransformEnd(event, layer.id)}
                    />
                  ))}
                  {maskResult && (
                    <Group globalCompositeOperation="destination-in" listening={false}>
                      <KonvaImage image={maskResult.canvas} x={0} y={0} width={WRAP_CANVAS_SIZE} height={WRAP_CANVAS_SIZE} />
                    </Group>
                  )}
                </Group>
                {templateImage && (
                  <KonvaImage
                    image={templateImage}
                    x={0}
                    y={0}
                    width={WRAP_CANVAS_SIZE}
                    height={WRAP_CANVAS_SIZE}
                    opacity={0.3}
                    globalCompositeOperation="multiply"
                    listening={false}
                  />
                )}
                {maskResult && showCenterGuideX && (
                  <Line points={[maskResult.bounds.x + maskResult.bounds.width / 2, maskResult.bounds.y, maskResult.bounds.x + maskResult.bounds.width / 2, maskResult.bounds.y + maskResult.bounds.height]} stroke="#3e6ae1" strokeWidth={2} dash={[8, 8]} listening={false} />
                )}
                {maskResult && showCenterGuideY && (
                  <Line points={[maskResult.bounds.x, maskResult.bounds.y + maskResult.bounds.height / 2, maskResult.bounds.x + maskResult.bounds.width, maskResult.bounds.y + maskResult.bounds.height / 2]} stroke="#3e6ae1" strokeWidth={2} dash={[8, 8]} listening={false} />
                )}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  flipEnabled={false}
                  keepRatio
                  centeredScaling={false}
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                  borderStroke="#3e6ae1"
                  borderStrokeWidth={2}
                  borderDash={[7, 5]}
                  anchorFill="#ffffff"
                  anchorStroke="#3e6ae1"
                  anchorStrokeWidth={2}
                  anchorSize={12}
                  rotateAnchorOffset={30}
                  boundBoxFunc={(oldBox, newBox) => (
                    Math.abs(newBox.width) < 18 || Math.abs(newBox.height) < 18 ? oldBox : newBox
                  )}
                />
              </Layer>
            </Stage>

            {templateStatus === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 text-sm font-black text-white">
                正在加载车型模板...
              </div>
            )}
            {templateStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-white">
                <X size={24} className="text-red-400" />
                <p className="mt-3 text-sm font-black">车型模板加载失败</p>
                <p className="mt-1 text-xs text-slate-400">切换车型或刷新页面后重试。</p>
              </div>
            )}
            {templateStatus === 'ready' && layers.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/25 bg-slate-950/55 p-6 text-center text-white backdrop-blur-[2px] transition hover:border-[#3e6ae1] hover:bg-slate-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1]"
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white">
                  <Upload size={23} />
                </span>
                <span className="mt-4 text-base font-black">拖入图片或点击上传</span>
                <span className="mt-1 max-w-xs text-xs font-bold leading-5 text-slate-300">上传后会按 {template.label} 官方 UV 区域自动适配</span>
                <span className="mt-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-300">仅在本机处理</span>
              </button>
            )}
            {isDraggingFile && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#3e6ae1]/20 text-sm font-black text-white backdrop-blur-sm">
                松开即可添加图片
              </div>
            )}
          </div>
        </div>

        <footer className={`border-t px-3 py-2 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1018]'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[11px] font-bold leading-5 text-slate-500">{status}</p>
            <span className="hidden shrink-0 text-xs font-bold text-slate-400 sm:inline">先选车型 · 上传图片 · 调整布局 · 查看 3D</span>
          </div>
        </footer>

        <nav className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t shadow-[0_-8px_24px_rgba(15,23,42,0.12)] xl:hidden ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1018]'}`} aria-label="自定义工具">
          {([
            { id: 'image' as const, label: '图片', icon: ImagePlus },
            { id: 'layout' as const, label: '布局', icon: Sparkles },
            { id: 'adjust' as const, label: '调整', icon: SlidersHorizontal },
            { id: 'layers' as const, label: '图层', icon: Layers3 },
          ]).map((item) => {
            const Icon = item.icon;
            const active = mobilePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMobilePanel(active ? null : item.id)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-black transition ${active ? 'bg-[#3e6ae1]/10 text-[#3e6ae1]' : 'text-slate-500 hover:text-[#3e6ae1]'}`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </main>

      <aside className={`hidden w-[286px] shrink-0 flex-col border-l p-4 xl:flex ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1018]'}`}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {imageControls}
          <div className={`border-t pt-5 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>{layoutControls}</div>
          <div className={`border-t pt-5 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>{adjustControls}</div>
        </div>
      </aside>

      {mobilePanel && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 xl:hidden" onMouseDown={() => setMobilePanel(null)}>
          <div
            className={`max-h-[72%] w-full overflow-hidden rounded-t-xl border-t shadow-2xl ${isDayMode ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#111722] text-slate-100'}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-4 py-3 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
              <div className="flex items-center gap-2 text-sm font-black">
                {mobilePanel === 'image' && <ImagePlus size={16} />}
                {mobilePanel === 'layout' && <Sparkles size={16} />}
                {mobilePanel === 'adjust' && <SlidersHorizontal size={16} />}
                {mobilePanel === 'layers' && <Layers3 size={16} />}
                {mobilePanel === 'image' ? '图片与车漆' : mobilePanel === 'layout' ? '车型布局' : mobilePanel === 'adjust' ? '精确调整' : '图层管理'}
              </div>
              <button type="button" onClick={() => setMobilePanel(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="关闭工具面板">
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="max-h-[calc(72vh-56px)] overflow-y-auto p-4">{mobilePanelContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
