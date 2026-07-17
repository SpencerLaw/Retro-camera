import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  Download,
  Folder,
  Search,
  Sun,
} from 'lucide-react';
import {
  buildTslSkinFileName,
  getOfficialExampleWrapsForTemplate,
  getTeslaTemplateById,
  TESLA_MODEL_TEMPLATES,
} from './tslSkinLogic.js';
import type {
  TslSkinPreviewDialogActions,
  TslSkinPreviewDialogViewModel,
} from './TslSkinPreviewDialog';
import { TslSkinGalleryGrid } from './TslSkinGalleryGrid';
import type { TslSkinGalleryItem } from './TslSkinGalleryGrid';
import TslWrapStudio from './tsl-skin/TslWrapStudio';

const TslSkinPreviewDialog = React.lazy(() => import('./TslSkinPreviewDialog').then((module) => ({
  default: module.TslSkinPreviewDialog,
})));

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

type OfficialWrapExample = TslSkinGalleryItem;

type WorkspaceMode = 'download' | 'design';
type GallerySortMode = 'newest' | 'popular';

type PreviewDialogTarget =
  | { readonly kind: 'gallery'; readonly wrap: OfficialWrapExample }
  | { readonly kind: 'custom' };

type PreviewDialogContext = {
  readonly open: boolean;
  readonly target: PreviewDialogTarget | null;
  readonly template: TeslaModelTemplate;
  readonly wrapColor: string;
  readonly isDayMode: boolean;
  readonly status: string;
  readonly customRenderUrl: string | null;
};

const FLOW_STEPS = [
  { id: 'download', title: '下载贴纸', detail: '选择车型与喜欢的图案', icon: Download },
  { id: 'folder', title: '复制到 U 盘', detail: '放入根目录 Wraps 文件夹', icon: Folder },
  { id: 'setup', title: '车机设置', detail: 'Toybox 里打开 Paint Shop', icon: Car },
];

function getGalleryTimestamp(item: OfficialWrapExample) {
  const time = new Date(item.createdAt || '').getTime();
  return Number.isFinite(time) ? time : 0;
}

function getGalleryPopularity(item: OfficialWrapExample) {
  return Number(item.downloads || 0) + Number(item.likes || 0) * 3;
}

function buildPreviewDialogViewModel(context: PreviewDialogContext): TslSkinPreviewDialogViewModel {
  const common = {
    wrapColor: context.wrapColor,
    isDayMode: context.isDayMode,
    model: context.template,
    status: context.status,
  };
  const target = context.target;

  if (!target) {
    return {
      ...common,
      open: false,
      title: '三维预览',
      sourceLabel: '请选择皮肤',
      riskTags: [],
      wrapImageUrl: null,
      texturePending: false,
    };
  }

  switch (target.kind) {
    case 'gallery':
      return {
        ...common,
        open: context.open,
        title: target.wrap.title,
        sourceLabel: target.wrap.sourceLabel,
        riskTags: target.wrap.riskTags || [],
        wrapImageUrl: target.wrap.imageUrl,
        texturePending: false,
      };
    case 'custom':
      return {
        ...common,
        open: context.open,
        title: '自定义车衣设计',
        sourceLabel: '本地自定义',
        riskTags: [],
        wrapImageUrl: context.customRenderUrl,
        texturePending: !context.customRenderUrl,
      };
  }

  const exhaustiveTarget: never = target;
  return exhaustiveTarget;
}

const TslSkinApp: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('modely-2025-premium');
  const [wrapColor, setWrapColor] = React.useState('#ffffff');
  const [activeWorkspace, setActiveWorkspace] = React.useState<WorkspaceMode>('download');
  const [isDayMode, setIsDayMode] = React.useState(true);
  const [status, setStatus] = React.useState('选择皮肤后可直接预览，也可以上传图片自己设计。');
  const [searchWrapQuery, setSearchWrapQuery] = React.useState('');
  const [selectedWrapTag, setSelectedWrapTag] = React.useState('');
  const [gallerySort, setGallerySort] = React.useState<GallerySortMode>('popular');
  const [remoteFreeWraps, setRemoteFreeWraps] = React.useState<OfficialWrapExample[]>([]);
  const [remoteIndexStatus, setRemoteIndexStatus] = React.useState('正在加载本地皮肤库...');
  const [showRiskWraps, setShowRiskWraps] = React.useState(true);
  const [selectedPreviewWrap, setSelectedPreviewWrap] = React.useState<OfficialWrapExample | null>(null);
  const [previewDialogTarget, setPreviewDialogTarget] = React.useState<PreviewDialogTarget | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = React.useState(false);
  const [customRenderUrl, setCustomRenderUrl] = React.useState<string | null>(null);

  const selectedTemplate = getTeslaTemplateById(selectedTemplateId) as TeslaModelTemplate;
  const officialExamples = React.useMemo(
    () => getOfficialExampleWrapsForTemplate(selectedTemplateId) as OfficialWrapExample[],
    [selectedTemplateId],
  );
  const remoteExamples = React.useMemo(
    () =>
      remoteFreeWraps.filter((item) => {
        const belongsToSelectedModel = item.modelIds.includes(selectedTemplateId);
        const hasRisk = Boolean(item.riskTags?.length);
        return belongsToSelectedModel && (showRiskWraps || !hasRisk);
      }),
    [remoteFreeWraps, selectedTemplateId, showRiskWraps],
  );
  const hiddenRiskCount = React.useMemo(
    () =>
      remoteFreeWraps.filter((item) => item.modelIds.includes(selectedTemplateId) && item.riskTags?.length).length,
    [remoteFreeWraps, selectedTemplateId],
  );
  const galleryItems = React.useMemo(
    () => [...officialExamples, ...remoteExamples],
    [officialExamples, remoteExamples],
  );
  const galleryTags = React.useMemo(
    () =>
      [...new Set(galleryItems.flatMap((item) => item.tags || []))]
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    [galleryItems],
  );
  const galleryStats = React.useMemo(
    () => ({
      total: galleryItems.length,
      downloads: galleryItems.reduce((total, item) => total + Number(item.downloads || 0), 0),
    }),
    [galleryItems],
  );
  const filteredGalleryItems = React.useMemo(() => {
    const query = searchWrapQuery.trim().toLowerCase();
    const tag = selectedWrapTag.trim().toLowerCase();
    const filtered = galleryItems.filter((item) => {
      const searchText =
        `${item.title} ${item.fileName} ${item.sourceLabel} ${item.author || ''} ${(item.tags || []).join(' ')} ${(item.riskTags || []).join(' ')}`
          .toLowerCase();
      const matchesQuery = !query || searchText.includes(query);
      const matchesTag = !tag || (item.tags || []).some((itemTag) => String(itemTag).toLowerCase() === tag);
      return matchesQuery && matchesTag;
    });

    return filtered.sort((a, b) => {
      if (gallerySort === 'newest') {
        return getGalleryTimestamp(b) - getGalleryTimestamp(a);
      }

      return getGalleryPopularity(b) - getGalleryPopularity(a);
    });
  }, [galleryItems, gallerySort, searchWrapQuery, selectedWrapTag]);
  const previewDialogViewModel = React.useMemo(
    () => buildPreviewDialogViewModel({
      open: isPreviewDialogOpen,
      target: previewDialogTarget,
      template: selectedTemplate,
      wrapColor,
      isDayMode,
      status,
      customRenderUrl,
    }),
    [customRenderUrl, isDayMode, isPreviewDialogOpen, previewDialogTarget, selectedTemplate, status, wrapColor],
  );

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

  React.useEffect(() => {
    let cancelled = false;

    const loadRemoteFreeIndex = async () => {
      try {
        const response = await fetch('/tsl-skins/free-wrap-index.json', { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error('本地皮肤库索引不存在');
        }

        const payload = await response.json();
        const supportedModelIds = new Set(TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => template.id));
        const items = Array.isArray(payload.items) ? payload.items : [];
        const nextRemoteWraps = items
          .filter((item) => {
            const imageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl : '';
            const isLocalAsset = imageUrl.startsWith('/tsl-skins/local-wraps/');
            const isHttpsAsset = imageUrl.startsWith('https://');

            return (
              (item?.isLocal === true || item?.isRemote === true) &&
              (isLocalAsset || isHttpsAsset) &&
              Array.isArray(item.modelIds) &&
              item.modelIds.some((modelId: string) => supportedModelIds.has(modelId))
            );
          })
          .map((item) => {
            const imageUrl = String(item.imageUrl);

            return {
              id: String(item.id),
              title: String(item.title || '本地皮肤'),
              fileName: String(item.fileName || `${item.id || 'local-wrap'}.png`),
              imageUrl,
              downloadUrl: String(item.downloadUrl || imageUrl),
              modelIds: item.modelIds.filter((modelId: string) => supportedModelIds.has(modelId)),
              sourceLabel: String(item.sourceLabel || '本地皮肤库'),
              sourceName: item.sourceName ? String(item.sourceName) : undefined,
              sourcePageUrl: item.sourcePageUrl ? String(item.sourcePageUrl) : undefined,
              isRemote: item.isRemote === true,
              isLocal: item.isLocal === true,
              originalImageUrl: item.originalImageUrl ? String(item.originalImageUrl) : undefined,
              originalDownloadUrl: item.originalDownloadUrl ? String(item.originalDownloadUrl) : undefined,
              riskTags: Array.isArray(item.riskTags) ? item.riskTags.map(String) : [],
              tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
              downloads: Number(item.downloads || 0),
              likes: Number(item.likes || 0),
              author: item.author ? String(item.author) : undefined,
              createdAt: item.createdAt ? String(item.createdAt) : undefined,
            };
          });

        if (!cancelled) {
          setRemoteFreeWraps(nextRemoteWraps);
          setRemoteIndexStatus(`本地皮肤库已加载 ${nextRemoteWraps.length} 款。`);
        }
      } catch {
        if (!cancelled) {
          setRemoteFreeWraps([]);
          setRemoteIndexStatus('本地皮肤库暂时不可用，可先使用官方示例。');
        }
      }
    };

    void loadRemoteFreeIndex();

    return () => {
      cancelled = true;
    };
  }, []);

  const openWrapPreview = React.useCallback((example: OfficialWrapExample) => {
    setSelectedPreviewWrap(example);
    setPreviewDialogTarget({ kind: 'gallery', wrap: example });
    setIsPreviewDialogOpen(true);
    setStatus(`${example.title} 已打开三维预览。`);
  }, []);

  const openCustomPreview = () => {
    if (!customRenderUrl) {
      setStatus('高清纹理正在生成，请稍后再打开三维预览。');
      return;
    }
    setPreviewDialogTarget({ kind: 'custom' });
    setIsPreviewDialogOpen(true);
    setStatus('已打开当前自定义皮肤的三维预览。');
  };

  const closePreviewDialog = () => {
    setIsPreviewDialogOpen(false);
    setPreviewDialogTarget(null);
  };

  const getWrapAssetBytes = async (example: OfficialWrapExample) => {
    const response = await fetch(example.downloadUrl || example.imageUrl);
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
      link.href = example.downloadUrl || example.imageUrl;
      link.download = example.fileName || buildTslSkinFileName(selectedTemplate.label);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      setStatus(`${example.title} 已在新窗口打开，可保存图片。`);
    }
  };

  const downloadCanvas = () => {
    if (!customRenderUrl) {
      setStatus('车型纹理还没有准备好，请稍后重试。');
      return;
    }

    const link = document.createElement('a');
    link.download = buildTslSkinFileName(selectedTemplate.label);
    link.href = customRenderUrl;
    link.click();
    setStatus('图片已导出，可复制到 U 盘皮肤文件夹。');
  };

  const downloadPreviewTarget = (): void => {
    const target = previewDialogTarget;
    if (!target) {
      setStatus('请先选择要下载的皮肤。');
      return;
    }

    switch (target.kind) {
      case 'gallery':
        void downloadWrapExample(target.wrap);
        return;
      case 'custom':
        downloadCanvas();
        return;
    }

    const exhaustiveTarget: never = target;
    return exhaustiveTarget;
  };

  const previewDialogActions: TslSkinPreviewDialogActions = {
    close: closePreviewDialog,
    download: downloadPreviewTarget,
    setPaintColor: setWrapColor,
  };

  const rootClassName = isDayMode
    ? 'tsl-skin-shell min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4f4f4] text-slate-950'
    : 'tsl-skin-shell min-h-screen w-full max-w-full overflow-x-hidden bg-[#0b0f16] text-slate-100';
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
      <main className="tsl-skin-studio-workbench mx-auto min-h-screen w-full max-w-[1440px] overflow-x-hidden px-3 py-3 lg:px-5 lg:py-5">
        <section className={`tsl-skin-gallery-board min-w-0 overflow-hidden rounded-xl border shadow-sm ${sidebarClassName}`}>
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
                <div className={`mt-0.5 text-xs font-bold ${mutedTextClassName}`}>现有皮肤与自定义上传</div>
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

            <div className={activeWorkspace === 'download' ? 'tsl-skin-flow-steps mt-4 grid gap-2 md:grid-cols-3' : 'hidden'}>
              {FLOW_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`rounded-lg border p-3 ${index === 0 ? 'border-[#3e6ae1] bg-[#3e6ae1] text-white shadow-md' : subtlePanelClassName}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-black">
                      <StepIcon size={17} />
                      {index + 1}. {step.title}
                    </div>
                    <div className={`mt-1 text-xs font-bold ${index === 0 ? 'text-white/80' : mutedTextClassName}`}>{step.detail}</div>
                  </div>
                );
              })}
            </div>

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
              <div className="tsl-skin-filter-bar grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[220px_150px_minmax(220px,1fr)_auto_auto] lg:items-center">
                <select
                  value={selectedTemplateId}
                  onChange={(event) => {
                    closePreviewDialog();
                    setSelectedPreviewWrap(null);
                    setSelectedTemplateId(event.target.value);
                  }}
                  className={`h-11 w-full min-w-0 rounded-md border px-3 text-sm font-bold outline-none focus:border-[#3e6ae1] ${
                    isDayMode ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-slate-900 text-white'
                  }`}
                  aria-label="选择车型"
                >
                  {TESLA_MODEL_TEMPLATES.map((template: TeslaModelTemplate) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedWrapTag}
                  onChange={(event) => setSelectedWrapTag(event.target.value)}
                  className={`h-11 w-full min-w-0 rounded-md border px-3 text-sm font-bold outline-none focus:border-[#3e6ae1] ${
                    isDayMode ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-slate-900 text-white'
                  }`}
                  aria-label="选择标签"
                >
                  <option value="">全部标签</option>
                  {galleryTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>

                <label className="relative block min-w-0 w-full">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchWrapQuery}
                    onChange={(event) => setSearchWrapQuery(event.target.value)}
                    placeholder="搜索贴纸名称、标签或来源"
                    className={`h-11 w-full rounded-md border pl-10 pr-3 text-sm font-bold outline-none focus:border-[#3e6ae1] ${
                      isDayMode ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-slate-900 text-white'
                    }`}
                  />
                </label>

                <div className={`grid h-11 min-w-0 w-full grid-cols-2 rounded-md border p-1 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-900'}`}>
                  {[
                    { id: 'newest' as const, label: '最新' },
                    { id: 'popular' as const, label: '最热' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGallerySort(item.id)}
                      className={`rounded px-3 text-sm font-black transition ${
                        gallerySort === item.id ? 'bg-[#3e6ae1] text-white' : isDayMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className={`flex h-11 min-w-0 w-full items-center justify-start whitespace-nowrap text-xs font-black lg:justify-end ${mutedTextClassName}`}>
                  {galleryStats.total} 款 · {galleryStats.downloads.toLocaleString('zh-CN')} 次下载
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className={mutedTextClassName}>{remoteIndexStatus}</span>
                <label className="flex cursor-pointer items-center gap-2 font-black">
                  <input
                    type="checkbox"
                    checked={showRiskWraps}
                    onChange={(event) => setShowRiskWraps(event.target.checked)}
                  />
                  显示风险素材
                </label>
                {!showRiskWraps && hiddenRiskCount > 0 && (
                  <div className="w-full font-bold text-amber-600">
                    已隐藏 {hiddenRiskCount} 款疑似角色/IP或品牌素材。
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-black">现有皮肤</h1>
                  <p className={`mt-1 text-xs font-bold ${mutedTextClassName}`}>点击皮肤打开三维预览，在弹窗中旋转车辆并下载。</p>
                </div>
                <span className="rounded-full bg-[#3e6ae1]/10 px-3 py-1 text-xs font-black text-[#3e6ae1]">
                  {filteredGalleryItems.length}
                </span>
              </div>

              <TslSkinGalleryGrid
                items={filteredGalleryItems}
                selectedItemId={selectedPreviewWrap?.id || null}
                isDayMode={isDayMode}
                onOpen={openWrapPreview}
              />

              {filteredGalleryItems.length === 0 && (
                <div className={`mt-4 rounded-md border p-4 text-center text-sm ${subtlePanelClassName}`}>
                  没有找到匹配的皮肤。
                </div>
              )}
            </div>
          </section>

          <section className={activeWorkspace === 'design' ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3' : 'hidden'}>
            <TslWrapStudio
              template={selectedTemplate}
              templates={TESLA_MODEL_TEMPLATES}
              wrapColor={wrapColor}
              isDayMode={isDayMode}
              onTemplateChange={setSelectedTemplateId}
              onWrapColorChange={setWrapColor}
              onTextureChange={setCustomRenderUrl}
              onOpen3DPreview={openCustomPreview}
              onStatusChange={setStatus}
            />
          </section>
        </section>

      </main>

      {isPreviewDialogOpen && (
        <React.Suspense
          fallback={(
            <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="status">
              <div className="rounded-md border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-2xl">
                正在打开三维预览...
              </div>
            </div>
          )}
        >
          <TslSkinPreviewDialog viewModel={previewDialogViewModel} actions={previewDialogActions} />
        </React.Suspense>
      )}
    </div>
  );
};

export default TslSkinApp;
