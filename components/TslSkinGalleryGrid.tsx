import React from 'react';

export type TslSkinGalleryItem = {
  readonly id: string;
  readonly title: string;
  readonly fileName: string;
  readonly imageUrl: string;
  readonly downloadUrl?: string;
  readonly modelIds: readonly string[];
  readonly sourceLabel: string;
  readonly sourceName?: string;
  readonly sourcePageUrl?: string;
  readonly isRemote?: boolean;
  readonly isLocal?: boolean;
  readonly originalImageUrl?: string;
  readonly originalDownloadUrl?: string;
  readonly riskTags?: readonly string[];
  readonly tags?: readonly string[];
  readonly downloads?: number;
  readonly likes?: number;
  readonly author?: string;
  readonly createdAt?: string;
};

type TslSkinGalleryGridProps = {
  readonly items: readonly TslSkinGalleryItem[];
  readonly selectedItemId: string | null;
  readonly isDayMode: boolean;
  readonly onOpen: (item: TslSkinGalleryItem) => void;
};

type DeferredGalleryImageProps = {
  readonly item: TslSkinGalleryItem;
  readonly eager: boolean;
};

export const INITIAL_GALLERY_ITEM_COUNT = 24;
export const GALLERY_ITEM_BATCH_SIZE = 24;
const EAGER_GALLERY_IMAGE_COUNT = 6;

function formatRiskTags(riskTags?: readonly string[]): string {
  return riskTags?.length ? riskTags.join('、') : '疑似风险素材';
}

const DeferredGalleryImage: React.FC<DeferredGalleryImageProps> = ({ item, eager }) => {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [loadStatus, setLoadStatus] = React.useState<'pending' | 'loaded' | 'error'>('pending');
  const shouldLoad = eager || isIntersecting;

  React.useEffect(() => {
    if (shouldLoad) return;

    const image = imageRef.current;
    if (!image || typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(image);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div className="relative h-full w-full bg-slate-100">
      {loadStatus !== 'loaded' && (
        <span className="absolute inset-0 grid place-items-center px-2 text-center text-[10px] font-bold text-slate-400">
          {loadStatus === 'error' ? '图片暂不可用' : '图片载入中'}
        </span>
      )}
      <img
        ref={imageRef}
        src={shouldLoad ? item.imageUrl : undefined}
        crossOrigin="anonymous"
        alt={item.title}
        className={`h-full w-full object-contain p-1 transition-opacity duration-150 ${
          loadStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'auto' : 'low'}
        decoding="async"
        onLoad={() => setLoadStatus('loaded')}
        onError={() => setLoadStatus('error')}
      />
    </div>
  );
};

const TslSkinGalleryGridComponent: React.FC<TslSkinGalleryGridProps> = ({
  items,
  selectedItemId,
  isDayMode,
  onOpen,
}) => {
  const loadMoreRef = React.useRef<HTMLButtonElement | null>(null);
  const [visibleItemCount, setVisibleItemCount] = React.useState(INITIAL_GALLERY_ITEM_COUNT);
  const visibleItems = items.slice(0, visibleItemCount);
  const hasMoreItems = visibleItems.length < items.length;

  React.useLayoutEffect(() => {
    setVisibleItemCount(INITIAL_GALLERY_ITEM_COUNT);
  }, [items]);

  const loadMoreItems = React.useCallback(() => {
    setVisibleItemCount((currentCount) =>
      Math.min(items.length, currentCount + GALLERY_ITEM_BATCH_SIZE),
    );
  }, [items.length]);

  React.useEffect(() => {
    const loadMoreButton = loadMoreRef.current;
    if (!hasMoreItems || !loadMoreButton || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreItems();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(loadMoreButton);
    return () => observer.disconnect();
  }, [hasMoreItems, loadMoreItems, visibleItemCount]);

  return (
    <>
      <div className="tsl-skin-wrap-grid grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            aria-label={`${item.title}，点击查看三维效果`}
            className={`tsl-skin-wrap-card min-w-0 overflow-hidden rounded-md border transition ${
              selectedItemId === item.id
                ? 'border-[#3e6ae1] ring-2 ring-[#3e6ae1]/20'
                : isDayMode
                  ? 'border-slate-200 bg-white hover:border-[#3e6ae1]'
                  : 'border-white/10 bg-slate-900 hover:border-[#3e6ae1]'
            }`}
          >
            <div className="relative aspect-square bg-slate-100">
              <DeferredGalleryImage item={item} eager={index < EAGER_GALLERY_IMAGE_COUNT} />
              <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-slate-700 shadow-sm">
                {item.sourceLabel}
              </span>
              {Boolean(item.riskTags?.length) && (
                <span className="absolute right-1.5 top-7 max-w-[calc(100%-12px)] truncate rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700 shadow-sm">
                  {formatRiskTags(item.riskTags)}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-1.5 py-1 text-center text-[10px] font-black text-white backdrop-blur-sm">
                <span className="block truncate">{item.title}</span>
                <span className="mt-0.5 block text-[9px] font-bold text-white/80">点击查看 3D 效果</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {hasMoreItems && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            ref={loadMoreRef}
            type="button"
            onClick={loadMoreItems}
            className={`rounded-md border px-4 py-2 text-xs font-black transition active:scale-[0.98] ${
              isDayMode
                ? 'border-slate-200 bg-white text-slate-700 hover:border-[#3e6ae1] hover:text-[#3e6ae1]'
                : 'border-white/10 bg-slate-900 text-slate-200 hover:border-[#3e6ae1] hover:text-white'
            }`}
          >
            继续加载皮肤
          </button>
          <span className="text-[10px] font-bold text-slate-400" aria-live="polite">
            已显示 {visibleItems.length} / {items.length}
          </span>
        </div>
      )}
    </>
  );
};

export const TslSkinGalleryGrid = React.memo(TslSkinGalleryGridComponent);
