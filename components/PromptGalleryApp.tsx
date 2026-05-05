import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Edit3,
  ImagePlus,
  Loader2,
  Lock,
  LogOut,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  PROMPT_GALLERY_ADMIN_PASSWORD_HASH,
  PROMPT_GALLERY_MAX_IMAGES,
  PROMPT_GALLERY_MAX_IMAGE_BYTES,
  PROMPT_GALLERY_MAX_COVER_BYTES,
  PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES,
  PROMPT_GALLERY_DEFAULT_LIMIT,
  getDataUrlByteSize,
  normalizePromptGalleryEntry,
} from './promptGalleryLogic.js';

interface PromptGalleryImage {
  id: string;
  name: string;
  dataUrl: string;
  url?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
  originalSize?: number;
}

interface PromptGallerySummary {
  id: string;
  title: string;
  model: string;
  tags: string[];
  coverImage: string;
  imageCount: number;
  promptPreview: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptGalleryEntry extends PromptGallerySummary {
  prompt: string;
  images: PromptGalleryImage[];
}

const blankForm = {
  id: '',
  title: '',
  model: 'GPT Image 2',
  prompt: '',
  tagsText: '',
  coverImage: '',
  images: [] as PromptGalleryImage[],
  createdAt: '',
};

const ADMIN_SESSION_KEY = 'prompt_gallery_admin_token';
const IMAGE_PREVIEW_DEFAULT_ZOOM = 1.4;
const IMAGE_PREVIEW_MIN_ZOOM = 1;
const IMAGE_PREVIEW_MAX_ZOOM = 4;
const IMAGE_PREVIEW_ZOOM_STEP = 0.35;

const digestPassword = async (value: string) => {
  const input = new TextEncoder().encode(value.trim());
  const buffer = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const callPromptGalleryApi = async (action: string, data?: any, adminToken?: string) => {
  const response = await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, adminToken }),
  });
  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || `接口请求失败 (${response.status})`);
  }
  return result.data;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const formatBytes = (value = 0) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
};

const loadImageFromFile = (file: File) => (
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    image.src = url;
  })
);

const drawImageToCanvas = (
  image: HTMLImageElement,
  maxLongEdge: number,
  dimensionScale: number,
) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const baseScale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  const scale = baseScale * dimensionScale;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持图片压缩');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const compressImageElement = (
  image: HTMLImageElement,
  maxLongEdge: number,
  targetBytes: number,
  startQuality: number,
) => {
  const dimensionScales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28];
  const qualities = [...new Set([startQuality, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36, 0.3, 0.24])];
  let best = {
    dataUrl: '',
    width: 0,
    height: 0,
    size: Number.POSITIVE_INFINITY,
  };

  for (const dimensionScale of dimensionScales) {
    const canvas = drawImageToCanvas(image, maxLongEdge, dimensionScale);
    for (const quality of qualities) {
      const dataUrl = canvas.toDataURL('image/webp', quality);
      const size = getDataUrlByteSize(dataUrl);
      best = size < best.size ? { dataUrl, width: canvas.width, height: canvas.height, size } : best;
      if (size <= targetBytes) return best;
    }
  }

  return best;
};

const compressPromptImageFile = async (file: File, index: number): Promise<PromptGalleryImage> => {
  const image = await loadImageFromFile(file);
  const detail = compressImageElement(image, 1800, PROMPT_GALLERY_MAX_IMAGE_BYTES, 0.84);
  const thumbnail = compressImageElement(image, 960, PROMPT_GALLERY_MAX_COVER_BYTES, 0.82);

  return {
    id: `image_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name.replace(/\.[^.]+$/, '.webp'),
    dataUrl: detail.dataUrl,
    thumbnail: thumbnail.dataUrl,
    width: detail.width,
    height: detail.height,
    size: detail.size,
    originalSize: file.size,
  };
};

const getPromptImageUploadErrorMessage = (error: any, files: File[] = []) => {
  const fileHints = files.map(file => `${file.name} ${file.type}`.toLowerCase()).join(' ');
  const message = String(error?.message || '');
  if (/\.(heic|heif)\b|image\/hei[cf]/i.test(fileHints)) {
    return '当前浏览器不支持 HEIC/HEIF，请先转成 JPG、PNG 或 WebP 后再上传';
  }
  if (/读取|decode|load|unsupported|not supported|invalid/i.test(message)) {
    return '图片无法读取，请换成 JPG、PNG 或 WebP 后重试';
  }
  return message || '图片压缩失败，请换成 JPG、PNG 或 WebP 后重试';
};

const getImageSource = (image?: PromptGalleryImage | null) => (
  image?.url || image?.dataUrl || ''
);

const getImageThumbnail = (image?: PromptGalleryImage | null) => (
  image?.thumbnailUrl || image?.thumbnail || getImageSource(image)
);

const promptEntryToForm = (entry: PromptGalleryEntry) => ({
  id: entry.id,
  title: entry.title,
  model: entry.model,
  prompt: entry.prompt,
  tagsText: entry.tags.join('，'),
  coverImage: entry.coverImage,
  images: entry.images || [],
  createdAt: entry.createdAt,
});

const PromptCard = ({
  item,
  onClick,
}: {
  item: PromptGallerySummary;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group mb-4 w-full break-inside-avoid overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-[0_18px_42px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(15,23,42,0.18)]"
  >
    <div className="relative bg-[#171717]">
      {item.coverImage ? (
        <img
          src={item.coverImage}
          alt={item.title}
          className="w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[linear-gradient(135deg,#111827_0%,#0f766e_45%,#f59e0b_100%)] text-white">
          <Sparkles size={40} />
        </div>
      )}
      <div className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
        {item.imageCount || 0} 图
      </div>
    </div>

    <div className="p-4">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(item.tags || []).slice(0, 3).map(tag => (
          <span key={tag} className="rounded-full bg-[#e7f6f3] px-2.5 py-1 text-[11px] font-black text-[#0f766e]">
            {tag}
          </span>
        ))}
      </div>
      <h2 className="text-lg font-black leading-snug text-[#111827]">{item.title}</h2>
      <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-[#4b5563]">
        {item.promptPreview || '点击查看完整提示工程'}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-xs font-black text-[#6b7280]">
        <span>{item.model || '未标注模型'}</span>
        <span>{formatDate(item.updatedAt)}</span>
      </div>
    </div>
  </button>
);

const PromptGalleryApp: React.FC = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<PromptGallerySummary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [storageMode, setStorageMode] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPromptFormDialog, setShowPromptFormDialog] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dialogSummary, setDialogSummary] = useState<PromptGallerySummary | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PromptGalleryEntry | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewZoom, setImagePreviewZoom] = useState(IMAGE_PREVIEW_DEFAULT_ZOOM);
  const [copied, setCopied] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const autoLoadRef = useRef(false);
  const promptDialogOpen = showPromptFormDialog || Boolean(dialogSummary) || imagePreviewOpen;

  const imageBytes = useMemo(() => (
    form.images.reduce((total, image) => (
      total + getDataUrlByteSize(image.dataUrl || '') + getDataUrlByteSize(image.thumbnail || '')
    ), 0)
  ), [form.images]);

  const loadList = async (reset = true) => {
    setLoading(true);
    setError('');
    try {
      const data = await callPromptGalleryApi('list', {
        query,
        tag: activeTag,
        model: activeModel,
        offset: reset ? 0 : summaries.length,
        limit: PROMPT_GALLERY_DEFAULT_LIMIT,
      });
      setSummaries(prev => reset ? data.items || [] : [...prev, ...(data.items || [])]);
      setAvailableTags(data.tags || []);
      setAvailableModels(data.models || []);
      setStorageMode(data.storageMode || '');
      setHasMore(Boolean(data.hasMore));
    } catch (err: any) {
      setError(err.message || '提示词加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList(true);
  }, [query, activeTag, activeModel]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting) || autoLoadRef.current) return;
      autoLoadRef.current = true;
      loadList(false).finally(() => {
        autoLoadRef.current = false;
      });
    }, { rootMargin: '640px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, summaries.length, query, activeTag, activeModel]);

  useEffect(() => {
    const storedToken = sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
    if (storedToken === PROMPT_GALLERY_ADMIN_PASSWORD_HASH) {
      setAdminToken(storedToken);
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!promptDialogOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [promptDialogOpen]);

  useEffect(() => {
    if (!imagePreviewOpen) return;
    setImagePreviewZoom(IMAGE_PREVIEW_DEFAULT_ZOOM);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImagePreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagePreviewOpen]);

  const changeImagePreviewZoom = (direction: 1 | -1) => {
    setImagePreviewZoom(prev => Math.min(
      IMAGE_PREVIEW_MAX_ZOOM,
      Math.max(IMAGE_PREVIEW_MIN_ZOOM, Math.round((prev + direction * IMAGE_PREVIEW_ZOOM_STEP) * 100) / 100),
    ));
  };

  const handleLogin = async () => {
    const digest = await digestPassword(passwordInput);
    if (digest !== PROMPT_GALLERY_ADMIN_PASSWORD_HASH) {
      setError('管理员密码不正确');
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, digest);
    setAdminToken(digest);
    setIsAdmin(true);
    setShowAdminPanel(false);
    setPasswordInput('');
    setError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminToken('');
    setIsAdmin(false);
    setShowAdminPanel(false);
    setShowPromptFormDialog(false);
    setForm(blankForm);
  };

  const openDetail = async (summary: PromptGallerySummary) => {
    setDialogSummary(summary);
    setSelectedEntry(null);
    setActiveImageIndex(0);
    setDetailLoading(true);
    setError('');
    try {
      const entry = await callPromptGalleryApi('detail', { id: summary.id });
      setSelectedEntry(entry);
    } catch (err: any) {
      setError(err.message || '详情加载失败');
      setDialogSummary(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const startCreate = () => {
    setForm(blankForm);
    setShowAdminPanel(false);
    setShowPromptFormDialog(true);
  };

  const startEdit = (entry: PromptGalleryEntry) => {
    setForm(promptEntryToForm(entry));
    setShowPromptFormDialog(true);
    setDialogSummary(null);
    setSelectedEntry(null);
  };

  const closePromptFormDialog = () => {
    if (saving || processingImages) return;
    setShowPromptFormDialog(false);
    setDragActive(false);
  };

  const processImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const availableSlots = Math.max(0, PROMPT_GALLERY_MAX_IMAGES - form.images.length);
    const selectedFiles = files.slice(0, availableSlots);
    if (selectedFiles.length === 0) {
      setError(`最多 5 张图片，请先删除一部分再上传`);
      return;
    }

    setProcessingImages(true);
    setError('');
    try {
      const compressed = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        compressed.push(await compressPromptImageFile(selectedFiles[index], form.images.length + index));
      }

      setForm(prev => {
        const images = [...prev.images, ...compressed].slice(0, PROMPT_GALLERY_MAX_IMAGES);
        return {
          ...prev,
          images,
          coverImage: images[0]?.thumbnail || prev.coverImage,
        };
      });
    } catch (err: any) {
      setError(getPromptImageUploadErrorMessage(err, selectedFiles));
    } finally {
      setProcessingImages(false);
      setDragActive(false);
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    processImageFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
    processImageFiles(files);
  };

  const removeImage = (imageId: string) => {
    setForm(prev => {
      const images = prev.images.filter(image => image.id !== imageId);
      return {
        ...prev,
        images,
        coverImage: images[0]?.thumbnail || '',
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const entry = normalizePromptGalleryEntry({
        id: form.id,
        title: form.title,
        model: form.model,
        prompt: form.prompt,
        tags: form.tagsText,
        coverImage: form.images[0]?.thumbnail || form.coverImage,
        images: form.images,
        createdAt: form.createdAt,
      });
      const data = await callPromptGalleryApi(form.id ? 'update' : 'create', entry, adminToken);
      setSummaries(data.list || []);
      setStorageMode(data.storageMode || storageMode);
      setForm(blankForm);
      setShowPromptFormDialog(false);
      setHasMore(false);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('确定要删除这个提示词案例吗？')) return;
    setSaving(true);
    setError('');
    try {
      const data = await callPromptGalleryApi('delete', { id: entryId }, adminToken);
      setSummaries(data.list || []);
      setStorageMode(data.storageMode || storageMode);
      setDialogSummary(null);
      setSelectedEntry(null);
      if (form.id === entryId) setForm(blankForm);
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  const copyPrompt = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const activeImage = selectedEntry?.images?.[activeImageIndex] || selectedEntry?.images?.[0];

  return (
    <div className="min-h-screen bg-[#fff8ed] text-[#111827]">
      <div className="fixed inset-0 pointer-events-none bg-[#f8efe0]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(255,244,214,0.92),rgba(255,248,237,0.56)_34%,transparent_62%)]" />

      <header className="relative z-10 border-b border-black/10 bg-white/82 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white hover:bg-[#eef4f0]"
              aria-label="返回首页"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-normal md:text-3xl">提示词图库</h1>
              <p className="text-sm font-bold text-[#5b6472]">图片案例、提示工程、标签检索，一处找齐。</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={startCreate}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-sm font-black text-white hover:bg-[#1f2937]"
              >
                <Plus size={17} /> 新建提示词
              </button>
            )}
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-4 text-sm font-black hover:bg-[#eef4f0]"
              >
                <LogOut size={17} /> 退出
              </button>
            ) : (
              <button
                onClick={() => setShowAdminPanel(prev => !prev)}
                className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-4 text-sm font-black hover:bg-[#eef4f0]"
              >
                <Lock size={17} /> 管理员
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_190px]">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、模型、提示词、标签"
                className="h-11 w-full rounded-lg border border-black/10 bg-white pl-10 pr-4 text-sm font-bold outline-none focus:border-[#0f766e]"
              />
            </div>
            <select
              value={activeTag}
              onChange={(event) => setActiveTag(event.target.value)}
              className="h-11 rounded-lg border border-black/10 bg-white px-3 text-sm font-black outline-none focus:border-[#0f766e]"
            >
              <option value="">全部标签</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <select
              value={activeModel}
              onChange={(event) => setActiveModel(event.target.value)}
              className="h-11 rounded-lg border border-black/10 bg-white px-3 text-sm font-black outline-none focus:border-[#0f766e]"
            >
              <option value="">全部模型</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-[#374151]">
            <Tags size={16} className="text-[#0f766e]" />
            {summaries.length} / {hasMore ? '更多' : '已加载'}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {showAdminPanel && !isAdmin && (
          <section className="mb-6 overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-4 md:px-5">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">Prompt Desk</div>
                <h2 className="text-xl font-black">管理员登录</h2>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb]"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto] md:p-5">
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleLogin(); }}
                placeholder="输入管理员密码"
                className="h-11 rounded-lg border border-black/10 bg-[#f9fafb] px-3 text-sm font-bold outline-none focus:border-[#0f766e]"
              />
              <button
                onClick={handleLogin}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#111827] px-5 text-sm font-black text-white"
              >
                <Lock size={17} /> 进入管理
              </button>
            </div>
          </section>
        )}

        {loading && summaries.length === 0 ? (
          <div className="py-20 text-center text-sm font-black text-[#0f766e]">正在加载提示词...</div>
        ) : summaries.length === 0 ? (
          <section className="py-20 text-center">
            <Upload size={42} className="mx-auto mb-3 text-[#0f766e]" />
            <h2 className="text-2xl font-black">还没有提示词案例</h2>
            <p className="mt-2 text-sm font-bold text-[#5b6472]">管理员登录后，可以上传第一组图片和提示工程。</p>
          </section>
        ) : (
          <section className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {summaries.map(item => (
              <PromptCard key={item.id} item={item} onClick={() => openDetail(item)} />
            ))}
          </section>
        )}

        {hasMore && (
          <div ref={loadMoreRef} className="mt-6 flex justify-center py-4 text-sm font-black text-[#0f766e]" aria-live="polite">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={17} />
                正在自动加载更多...
              </span>
            ) : (
              <span>继续向下滚动，自动加载更多</span>
            )}
          </div>
        )}
      </main>

      {showPromptFormDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/52 p-3 backdrop-blur-sm md:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? '编辑提示词' : '新建提示词'}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-[0_28px_100px_rgba(0,0,0,0.34)]"
          >
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-4 py-4 backdrop-blur md:px-5">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">Prompt Desk</div>
                <h2 className="text-xl font-black">{form.id ? '编辑提示词' : '新建提示词'}</h2>
              </div>
              <button
                onClick={closePromptFormDialog}
                disabled={saving || processingImages}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] disabled:opacity-40"
                aria-label="关闭提示词表单"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[1fr_320px] md:p-5">
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    value={form.title}
                    onChange={(event) => setForm(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="标题"
                    className="h-11 rounded-lg border border-black/10 bg-[#f9fafb] px-3 text-sm font-bold outline-none focus:border-[#0f766e]"
                  />
                  <input
                    value={form.model}
                    onChange={(event) => setForm(prev => ({ ...prev, model: event.target.value }))}
                    placeholder="模型"
                    className="h-11 rounded-lg border border-black/10 bg-[#f9fafb] px-3 text-sm font-bold outline-none focus:border-[#0f766e]"
                  />
                </div>

                <input
                  value={form.tagsText}
                  onChange={(event) => setForm(prev => ({ ...prev, tagsText: event.target.value }))}
                  placeholder="标签，用逗号或空格分隔"
                  className="h-11 rounded-lg border border-black/10 bg-[#f9fafb] px-3 text-sm font-bold outline-none focus:border-[#0f766e]"
                />

                <textarea
                  value={form.prompt}
                  onChange={(event) => setForm(prev => ({ ...prev, prompt: event.target.value }))}
                  placeholder="完整提示工程"
                  className="min-h-[320px] resize-y rounded-lg border border-black/10 bg-[#f9fafb] p-3 text-sm font-medium leading-7 outline-none focus:border-[#0f766e]"
                />
              </div>

              <aside className="flex flex-col gap-3">
                <label
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm font-black text-[#0f766e] hover:bg-[#dff8ea] ${dragActive ? 'border-[#f59e0b] bg-[#fff7ed]' : 'border-[#0f766e]/50 bg-[#ecfdf5]'}`}
                >
                  {processingImages ? <Loader2 className="mb-2 animate-spin" size={28} /> : <ImagePlus className="mb-2" size={30} />}
                  <span>{processingImages ? '正在压缩图片' : dragActive ? '松开后开始压缩' : '上传图片，最多 5 张'}</span>
                  <span className="mt-1 text-xs text-[#47635d]">大图会自动压缩为 WebP 后保存</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    className="hidden"
                  />
                </label>

                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.map((image, index) => (
                      <div key={image.id} className="relative overflow-hidden rounded-lg border border-black/10 bg-[#111827]">
                        <img
                          src={getImageThumbnail(image)}
                          alt={image.name}
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-white"
                          aria-label="删除图片"
                        >
                          <X size={15} />
                        </button>
                        <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-white">
                          {index + 1}
                        </div>
                        <div className="absolute inset-x-1 bottom-7 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-white">
                          原图 {formatBytes(image.originalSize || image.size)} {' -> '} 压缩后 {formatBytes(image.size)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg bg-[#f3f4f6] p-3 text-xs font-bold leading-6 text-[#4b5563]">
                  存储模式：{storageMode === 'blob' ? 'Vercel Blob' : 'KV 回退'}
                  <br />
                  当前图片体积：{formatBytes(imageBytes)}
                  <br />
                  保存上限：{formatBytes(PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES)}，封面缩略图约 960px。
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setForm(blankForm)}
                    disabled={saving || processingImages}
                    className="h-10 rounded-lg border border-black/10 bg-white px-4 text-sm font-black disabled:opacity-40"
                  >
                    清空
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || processingImages || !form.prompt.trim()}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 text-sm font-black text-white disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {form.id ? '保存编辑' : '发布'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {dialogSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/64 p-3 backdrop-blur-sm md:p-6">
          <div className="grid max-h-[94vh] w-full max-w-6xl grid-cols-1 overflow-y-auto lg:overflow-hidden rounded-lg bg-white shadow-[0_28px_100px_rgba(0,0,0,0.36)] lg:max-h-[92vh] lg:grid-cols-[1.2fr_0.8fr]">
            <div className="sticky top-0 z-20 min-h-0 bg-[#0b0f17] lg:static lg:min-h-[420px]">
              {detailLoading ? (
                <div className="flex min-h-[38vh] items-center justify-center text-white lg:h-full lg:min-h-[420px]">
                  <Loader2 className="animate-spin" size={30} />
                </div>
              ) : activeImage ? (
                <div className="flex h-full flex-col">
                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#111827] p-3">
                    <img
                      src={getImageSource(activeImage)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-black/24" />
                    <button
                      type="button"
                      onClick={() => setImagePreviewOpen(true)}
                      className="relative z-10 flex h-full w-full items-center justify-center cursor-zoom-in"
                      aria-label="放大图片"
                    >
                      <img
                        src={getImageSource(activeImage)}
                        alt={selectedEntry?.title || dialogSummary.title}
                        className="max-h-[38vh] w-full object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.45)] lg:max-h-[66vh]"
                      />
                      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur">
                        <Maximize2 size={17} />
                      </span>
                    </button>
                  </div>
                  {(selectedEntry?.images?.length || 0) > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">
                      {selectedEntry?.images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setActiveImageIndex(index)}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${index === activeImageIndex ? 'border-[#fbbf24]' : 'border-white/20'}`}
                        >
                          <img src={getImageThumbnail(image)} alt={image.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[38vh] items-center justify-center text-white lg:h-full lg:min-h-[420px]">
                  <Sparkles size={42} />
                </div>
              )}
            </div>

            <div className="flex min-h-[52vh] flex-col lg:max-h-[92vh] lg:min-h-0">
              <div className="flex items-start justify-between gap-3 border-b border-black/10 p-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#111827] px-2.5 py-1 text-[11px] font-black text-white">
                      {selectedEntry?.model || dialogSummary.model || '未标注模型'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black leading-tight">{selectedEntry?.title || dialogSummary.title}</h2>
                  <p className="mt-1 text-xs font-bold text-[#6b7280]">{formatDate(selectedEntry?.updatedAt || dialogSummary.updatedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && selectedEntry && (
                    <>
                      <button
                        onClick={() => startEdit(selectedEntry)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-white hover:bg-[#1f2937]"
                        aria-label="编辑提示词"
                        title="编辑提示词"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedEntry.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                        aria-label="删除提示词"
                        title="删除提示词"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setDialogSummary(null); setSelectedEntry(null); }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb]"
                    aria-label="关闭详情"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-visible lg:overflow-y-auto p-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  {(selectedEntry?.tags || dialogSummary.tags || []).map(tag => (
                    <span key={tag} className="rounded-full bg-[#e7f6f3] px-2.5 py-1 text-xs font-black text-[#0f766e]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-[#111827]">完整提示工程</h3>
                    <button
                      onClick={() => copyPrompt(selectedEntry?.prompt || '')}
                      disabled={!selectedEntry?.prompt}
                      className="flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3 text-xs font-black text-white disabled:opacity-40"
                    >
                      <Copy size={15} /> {copied ? '已复制' : '复制提示词'}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-[#f3f4f6] p-3 text-sm font-medium leading-7 text-[#1f2937]">
                    {selectedEntry?.prompt || dialogSummary.promptPreview || '正在加载...'}
                  </pre>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {imagePreviewOpen && activeImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/88 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg bg-black/65 p-1.5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur md:left-4 md:top-4">
            <button
              type="button"
              onClick={() => changeImagePreviewZoom(-1)}
              disabled={imagePreviewZoom <= IMAGE_PREVIEW_MIN_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12 hover:bg-white/20 disabled:opacity-35"
              aria-label="缩小图片"
            >
              <Minus size={18} />
            </button>
            <span className="min-w-[58px] text-center text-xs font-black tabular-nums">
              {Math.round(imagePreviewZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeImagePreviewZoom(1)}
              disabled={imagePreviewZoom >= IMAGE_PREVIEW_MAX_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12 hover:bg-white/20 disabled:opacity-35"
              aria-label="放大图片细节"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setImagePreviewZoom(IMAGE_PREVIEW_DEFAULT_ZOOM)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12 hover:bg-white/20"
              aria-label="重置图片缩放"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setImagePreviewOpen(false)}
            className="absolute right-3 top-3 z-20 flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-[#111827] shadow-[0_12px_40px_rgba(0,0,0,0.34)] hover:bg-[#f3f4f6] md:right-4 md:top-4"
            aria-label="关闭放大图片"
          >
            <X size={18} />
            关闭
          </button>
          <div className="h-full w-full overflow-auto px-4 pb-8 pt-20 md:px-8 md:pt-24">
            <div className="flex min-h-full min-w-full items-start justify-center">
              <img
                src={getImageSource(activeImage)}
                alt={selectedEntry?.title || dialogSummary?.title || '放大图片'}
                className="max-w-none object-contain shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
                style={{ width: `${imagePreviewZoom * 72}vw` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptGalleryApp;
