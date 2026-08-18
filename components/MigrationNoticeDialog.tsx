import React from 'react';
import { ExternalLink, Megaphone, ShieldCheck, X } from 'lucide-react';

const MIGRATION_NOTICE_STORAGE_KEY = 'smartteach_migration_notice_dismissed';
const FOCUSABLE_MIGRATION_NOTICE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export const MigrationNoticeDialog: React.FC = () => {
  const [isMigrationNoticeOpen, setIsMigrationNoticeOpen] = React.useState(false);
  const [shouldHideMigrationNotice, setShouldHideMigrationNotice] = React.useState(false);
  const migrationNoticeRef = React.useRef<HTMLDivElement>(null);
  const migrationNoticeCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const shouldHideMigrationNoticeRef = React.useRef(false);

  const rememberMigrationNoticePreference = React.useCallback(() => {
    if (!shouldHideMigrationNoticeRef.current) return;

    try {
      window.localStorage.setItem(MIGRATION_NOTICE_STORAGE_KEY, 'true');
    } catch (error) {
      console.debug('[Migration Notice] storage write skipped', error);
    }
  }, []);

  const closeMigrationNotice = React.useCallback(() => {
    rememberMigrationNoticePreference();
    setIsMigrationNoticeOpen(false);
  }, [rememberMigrationNoticePreference]);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(MIGRATION_NOTICE_STORAGE_KEY) === 'true') return;
    } catch (error) {
      console.debug('[Migration Notice] storage read skipped', error);
    }
    setIsMigrationNoticeOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isMigrationNoticeOpen) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    migrationNoticeCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMigrationNotice();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = migrationNoticeRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_MIGRATION_NOTICE_SELECTOR)
      ).filter((element) => element.offsetParent !== null);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [closeMigrationNotice, isMigrationNoticeOpen]);

  if (!isMigrationNoticeOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-[#16324F]/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={closeMigrationNotice}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-notice-title"
        ref={migrationNoticeRef}
        className="relative max-h-[94dvh] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden overflow-y-auto rounded-[28px] border-4 border-white bg-white shadow-[0_16px_0_#7DD3FC,0_24px_54px_rgba(15,23,42,0.38)] animate-in zoom-in duration-300 sm:max-w-3xl sm:rounded-[36px] sm:border-[6px] sm:shadow-[0_24px_0_#7DD3FC,0_34px_70px_rgba(15,23,42,0.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={migrationNoticeCloseButtonRef}
          type="button"
          aria-label="关闭迁移提示"
          onClick={closeMigrationNotice}
          className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#FF6B6B] text-white shadow-lg transition-transform hover:scale-110 hover:rotate-90 focus:outline-none focus:ring-4 focus:ring-[#7DD3FC]"
        >
          <X size={24} />
        </button>

        <div className="bg-gradient-to-br from-[#E0F2FE] via-white to-[#FFE5EC] px-4 pb-6 pt-7 sm:px-10 sm:pb-9 sm:pt-10">
          <div className="mb-5 flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#0984E3] text-white shadow-[0_10px_22px_rgba(9,132,227,0.32)] sm:h-14 sm:w-14">
              <Megaphone size={30} />
            </div>
            <div className="min-w-0 pr-10 sm:pr-0">
              <p className="text-sm font-black text-[#0984E3]">重要通知</p>
              <h2 id="migration-notice-title" className="text-2xl font-black leading-tight text-[#0F172A] sm:text-5xl">
                <span className="block">网站已迁移至</span>
                <span className="block whitespace-nowrap">新域名</span>
              </h2>
            </div>
          </div>

          <a
            href="https://smartteach.online"
            onClick={rememberMigrationNoticePreference}
            className="relative mb-6 block min-w-0 rounded-[22px] border-4 border-[#7DD3FC] bg-white px-4 py-4 pr-12 text-[15px] font-black text-[#0369A1] shadow-inner transition-transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-[#FFB5E8] sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-[26px] sm:px-5 sm:pr-5 sm:text-3xl"
          >
            <span className="block min-w-0 whitespace-nowrap">https://smartteach.online</span>
            <ExternalLink className="absolute right-4 top-1/2 shrink-0 -translate-y-1/2 sm:static sm:translate-y-0" size={30} />
          </a>

          <div className="rounded-[24px] border-4 border-dashed border-[#C4E538] bg-white/90 p-4 text-[#334155] shadow-inner sm:rounded-[28px] sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-lg font-black text-[#047857] sm:text-2xl">
              <ShieldCheck size={28} />
              <span className="whitespace-nowrap">原授权码继续有效</span>
            </div>
            <p className="text-base font-bold leading-relaxed sm:text-2xl">
              <span className="block">由于浏览器安全机制，</span>
              <span className="block">
                <span className="whitespace-nowrap">新域名</span>首次打开需重新输入
                <span className="whitespace-nowrap">原授权码</span>，
              </span>
              <span className="block">之后会自动记住，不影响<span className="whitespace-nowrap">正常使用</span>。</span>
            </p>
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/80 p-4 text-base font-bold text-[#475569] shadow-sm">
            <input
              type="checkbox"
              checked={shouldHideMigrationNotice}
              onChange={(event) => {
                shouldHideMigrationNoticeRef.current = event.target.checked;
                setShouldHideMigrationNotice(event.target.checked);
              }}
              className="h-5 w-5 accent-[#0984E3]"
            />
            <span>再也不显示此提示</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-10">
          <button
            type="button"
            onClick={closeMigrationNotice}
            className="min-h-12 rounded-full bg-gradient-to-br from-[#74B9FF] to-[#0984E3] px-8 py-3 text-lg font-black text-white shadow-[0_8px_20px_rgba(9,132,227,0.32)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#FFB5E8]"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
