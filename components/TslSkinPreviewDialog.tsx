import React from 'react';
import { Download, MousePointer2, X } from 'lucide-react';
import TslVehicle3DPreview from './TslVehicle3DPreview';

export type TslSkinPreviewDialogModel = {
  readonly label: string;
  readonly previewModelUrl?: string | null;
  readonly previewObjUrl?: string | null;
  readonly previewMtlUrl?: string | null;
  readonly vehicleImageUrl?: string | null;
};

export type TslSkinPreviewDialogViewModel = {
  readonly open: boolean;
  readonly title: string;
  readonly sourceLabel: string;
  readonly status: string;
  readonly riskTags: readonly string[];
  readonly wrapColor: string;
  readonly wrapImageUrl: string | null;
  readonly isDayMode: boolean;
  readonly model: TslSkinPreviewDialogModel;
};

export type TslSkinPreviewDialogActions = {
  readonly close: () => void;
  readonly download: () => void;
  readonly setPaintColor: (color: string) => void;
};

type TslSkinPreviewDialogProps = {
  readonly viewModel: TslSkinPreviewDialogViewModel;
  readonly actions: TslSkinPreviewDialogActions;
};

const PREVIEW_TITLE_ID = 'tsl-skin-preview-title';
const PREVIEW_HELP_ID = 'tsl-skin-preview-help';
const PAINT_COLOR_OPTIONS = [
  { label: '白色车漆', color: '#ffffff', swatchClassName: 'bg-white' },
  { label: '黑色车漆', color: '#111827', swatchClassName: 'bg-slate-950' },
] as const;

export const TslSkinPreviewDialog: React.FC<TslSkinPreviewDialogProps> = ({ viewModel, actions }) => {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const closeDialog = React.useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  }, []);

  React.useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (viewModel.open && !dialog.open) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }

    if (!viewModel.open && dialog.open) {
      dialog.close();
    }
  }, [viewModel.open]);

  React.useEffect(() => {
    if (!viewModel.open) {
      return undefined;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [viewModel.open]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  const handleClose = () => {
    actions.close();
    triggerRef.current?.focus();
  };

  const shellClassName = viewModel.isDayMode
    ? 'border-slate-200 bg-white text-[#171a20]'
    : 'border-white/10 bg-slate-950 text-slate-100';
  const headerClassName = viewModel.isDayMode
    ? 'border-slate-200 bg-white/95'
    : 'border-white/10 bg-slate-950/95';
  const footerClassName = viewModel.isDayMode
    ? 'border-slate-200 bg-white/95'
    : 'border-white/10 bg-slate-950/95';
  const mutedTextClassName = viewModel.isDayMode ? 'text-[#5c5e62]' : 'text-slate-400';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={PREVIEW_TITLE_ID}
      aria-describedby={PREVIEW_HELP_ID}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className="tsl-skin-preview-dialog m-auto h-[min(92dvh,900px)] w-[min(94vw,1280px)] max-h-none max-w-none overflow-hidden rounded-xl border border-white/20 bg-transparent p-0 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm max-sm:h-[100dvh] max-sm:w-screen max-sm:rounded-none max-sm:border-0"
    >
      <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[inherit] border ${shellClassName}`}>
        <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-5 ${headerClassName}`}>
          <div className="min-w-0">
            <div className={`mb-1 text-xs font-bold ${mutedTextClassName}`}>三维动态预览</div>
            <h2 id={PREVIEW_TITLE_ID} className="truncate text-lg font-bold">
              {viewModel.title}
            </h2>
            <p className={`mt-1 line-clamp-2 text-xs font-medium sm:line-clamp-1 ${mutedTextClassName}`}>
              <span className="whitespace-nowrap">{viewModel.model.label}</span>
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> · </span>
              <span className="whitespace-nowrap">{viewModel.sourceLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            autoFocus
            aria-label="关闭三维预览"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-[#e82127] hover:text-[#e82127] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <X size={19} />
          </button>
        </header>

        <article className={`relative min-h-0 flex-1 overflow-hidden ${viewModel.isDayMode ? 'bg-[#e5e7eb]' : 'bg-[#101827]'}`}>
          {viewModel.open && (
            <TslVehicle3DPreview
              wrapColor={viewModel.wrapColor}
              wrapImageUrl={viewModel.wrapImageUrl}
              modelUrl={viewModel.model.previewModelUrl}
              objModelUrl={viewModel.model.previewObjUrl}
              mtlModelUrl={viewModel.model.previewMtlUrl}
              vehicleImageUrl={viewModel.model.vehicleImageUrl}
              modelLabel={viewModel.model.label}
              isDayMode={viewModel.isDayMode}
            />
          )}
        </article>

        <footer className={`flex shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${footerClassName}`}>
          <div className="min-w-0">
            <p id={PREVIEW_HELP_ID} className={`flex items-center gap-2 text-xs font-medium ${mutedTextClassName}`}>
              <MousePointer2 size={15} className="shrink-0" />
              鼠标拖动旋转，滚轮缩放，按 Esc 关闭。
            </p>
            <p aria-live="polite" className={`mt-1 truncate text-xs font-medium ${mutedTextClassName}`}>
              {viewModel.status}
            </p>
            {viewModel.riskTags.length > 0 && (
              <p className="mt-1 text-xs font-bold text-amber-600">
                风险提示：{viewModel.riskTags.join('、')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${mutedTextClassName}`}>车漆</span>
              {PAINT_COLOR_OPTIONS.map((option) => {
                const selected = viewModel.wrapColor.toLowerCase() === option.color;
                return (
                  <button
                    key={option.color}
                    type="button"
                    onClick={() => actions.setPaintColor(option.color)}
                    aria-pressed={selected}
                    aria-label={option.label}
                    title={option.label}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1] focus-visible:ring-offset-2 active:scale-[0.98] ${
                      selected ? 'border-[#3e6ae1] ring-2 ring-[#3e6ae1]/20' : 'border-slate-300 hover:border-[#3e6ae1]'
                    }`}
                  >
                    <span className={`h-5 w-5 rounded-full border border-slate-300 ${option.swatchClassName}`} />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={actions.download}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#3e6ae1] px-5 text-sm font-bold text-white transition hover:bg-[#3457b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <Download size={17} />
              下载当前皮肤
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
};
