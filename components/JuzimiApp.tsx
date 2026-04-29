import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Feather, Lock, LogOut, Moon, Palette, Plus, Save, Search, Sun, Trash2, X } from 'lucide-react';
import {
  JUZIMI_ADMIN_PASSWORD_HASH,
  normalizeJuzimiSentence,
  sortJuzimiSentences,
} from './juzimiLogic.js';
import {
  JUZIMI_THEME_STORAGE_KEY,
  getJuzimiCardMinHeight,
  getJuzimiTheme,
  getJuzimiThemeModeAction,
  getNextJuzimiThemeFamily,
  getNextJuzimiThemeMode,
  normalizeJuzimiThemePreference,
} from './juzimiTheme.js';

interface JuzimiSentence {
  id: string;
  text: string;
  author: string;
  source: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const blankForm = {
  id: '',
  text: '',
  author: '',
  source: '',
  note: '',
  tagsText: '',
  createdAt: '',
};

const digestPassword = async (value: string) => {
  const input = new TextEncoder().encode(value.trim());
  const buffer = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const callJuzimiApi = async (action: string, data?: any, adminToken?: string) => {
  const response = await fetch('/api/juzimi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, adminToken }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || '操作失败');
  }
  return result.data || [];
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const sentenceToForm = (sentence: JuzimiSentence) => ({
  id: sentence.id,
  text: sentence.text,
  author: sentence.author,
  source: sentence.source,
  note: sentence.note,
  tagsText: sentence.tags.join('，'),
  createdAt: sentence.createdAt,
});

// ── Card accent colours cycling ──────────────────────────────────────────────
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E`;

const PREVIEW_MAX = 80; // chars before truncating in card

const readStoredJuzimiThemePreference = () => {
  if (typeof window === 'undefined') return normalizeJuzimiThemePreference();
  try {
    const raw = window.localStorage.getItem(JUZIMI_THEME_STORAGE_KEY);
    return normalizeJuzimiThemePreference(raw ? JSON.parse(raw) : undefined);
  } catch {
    return normalizeJuzimiThemePreference();
  }
};

// ── Dialog ───────────────────────────────────────────────────────────────────
const SentenceDialog = ({
  sentence,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
  theme,
}: {
  sentence: JuzimiSentence;
  onClose: () => void;
  onEdit: (s: JuzimiSentence) => void;
  onDelete: (s: JuzimiSentence) => void;
  isAdmin: boolean;
  theme: any;
}) => {
  const isNight = theme.mode === 'night';

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm ${isNight ? 'bg-black/70' : 'bg-black/50'}`}
      onClick={handleBackdrop}
    >
      <div className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-[0_40px_100px_rgba(23,19,16,0.36)] flex flex-col ${
        isNight
          ? 'bg-[#19130f] border border-[#d6b16e]/22 text-[#fff3e2]'
          : 'bg-[#f4efe7] border border-[#c7a46c]/30 text-[#171310]'
      }`}>
        {/* header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between gap-3 px-6 pt-6 pb-4 backdrop-blur-sm border-b ${
          isNight ? 'bg-[#19130f]/95 border-[#d6b16e]/18' : 'bg-[#f4efe7]/95 border-[#c7a46c]/20'
        }`}>
          <div className={`text-xs font-black tracking-[0.28em] uppercase ${theme.accentClass}`}>
            Juzimi · {formatDate(sentence.updatedAt || sentence.createdAt)}
          </div>
          <button
            onClick={onClose}
            className={isNight
              ? 'h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/16 transition-colors'
              : 'h-9 w-9 rounded-full bg-[#171310]/8 flex items-center justify-center hover:bg-[#171310]/14 transition-colors'
            }
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="px-6 md:px-8 py-6 flex-1">
          <blockquote className={`font-serif text-[clamp(1.7rem,5vw,2.6rem)] leading-[1.35] tracking-[-0.02em] ${theme.titleClass}`}>
            "{sentence.text}"
          </blockquote>

          <div className={`mt-6 flex flex-wrap items-baseline gap-2 text-base font-black ${theme.titleClass}`}>
            <span>{sentence.author || '佚名'}</span>
            {sentence.source && (
              <span className={`text-sm font-bold ${theme.accentClass}`}>《{sentence.source}》</span>
            )}
          </div>

          {sentence.note && (
            <p className={`mt-5 text-[15px] leading-8 font-medium border-l-4 pl-4 ${theme.mutedClass} ${isNight ? 'border-[#d6b16e]' : 'border-[#c7a46c]'}`}>
              {sentence.note}
            </p>
          )}

          {sentence.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {sentence.tags.map(tag => (
                <span key={tag} className={`rounded-full px-3 py-1 text-xs font-black ${isNight ? 'bg-white/10 border border-[#d6b16e]/22 text-[#f3d9a0]' : 'bg-white border border-[#c7a46c]/35 text-[#8c6b3f]'}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* admin footer */}
        {isAdmin && (
          <div className={`sticky bottom-0 flex gap-3 px-6 pb-6 pt-4 backdrop-blur-sm border-t ${isNight ? 'bg-[#19130f]/95 border-[#d6b16e]/18' : 'bg-[#f4efe7]/95 border-[#c7a46c]/20'}`}>
            <button
              onClick={() => { onEdit(sentence); onClose(); }}
              className={`flex-1 h-12 text-sm ${theme.primaryButtonClass}`}
            >
              <Edit3 size={16} /> 编辑句子
            </button>
            <button
              onClick={() => onDelete(sentence)}
              className="flex-1 h-12 rounded-2xl bg-red-50 text-red-700 border border-red-100 font-black flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} /> 删除句子
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Single card ──────────────────────────────────────────────────────────────
const SentenceCard = ({
  sentence,
  index,
  onClick,
  theme,
}: {
  sentence: JuzimiSentence;
  index: number;
  onClick: () => void;
  theme: any;
}) => {
  const accent = theme.cardAccents[index % theme.cardAccents.length];
  const preview =
    sentence.text.length > PREVIEW_MAX
      ? sentence.text.slice(0, PREVIEW_MAX).trimEnd() + '…'
      : sentence.text;
  const cardMinHeight = getJuzimiCardMinHeight(sentence, index, theme.cardVariant);

  if (theme.cardVariant === 'studio') {
    return (
      <button
        onClick={onClick}
        className="group relative w-full text-left rounded-[1.55rem] p-4 shadow-[0_18px_52px_rgba(15,23,42,0.14)] hover:shadow-[0_24px_72px_rgba(15,23,42,0.2)] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col border border-white/18"
        style={{ background: accent.surface, color: accent.text, minHeight: cardMinHeight }}
      >
        <div
          className="absolute left-3 right-3 top-3 h-[118px] rounded-[1.2rem] overflow-hidden"
          style={{ background: accent.cover }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.68),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_48%)]" />
          <div
            className="absolute inset-0 opacity-[0.2] mix-blend-overlay"
            style={{ backgroundImage: `url("${NOISE_SVG}")` }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full pt-[92px]">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="h-14 w-14 rounded-full bg-white/88 shadow-[0_12px_32px_rgba(15,23,42,0.22)] border border-white/70 flex items-center justify-center text-[12px] font-black tracking-widest text-[#151518]">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div
              className="rounded-full px-3 py-1 text-[10px] font-black tracking-wide backdrop-blur-sm"
              style={{ backgroundColor: accent.tagBg, color: accent.tagText }}
            >
              Juzimi
            </div>
          </div>

          <h3
            className="font-serif text-[1.45rem] md:text-[1.62rem] leading-[1.2] tracking-tight mb-7"
            style={{ color: accent.text }}
          >
            {preview}
          </h3>

          <div className="flex-grow"></div>

          <div className="mb-5 w-5/6">
            <p className="text-[13px] leading-snug font-black" style={{ color: accent.sub }}>
              {sentence.author || '佚名'}
              {sentence.source && <><br />《{sentence.source}》</>}
            </p>
          </div>

          <div className="flex items-end justify-between mt-auto pt-2">
            <div className="text-[26px] leading-none font-serif opacity-80" style={{ color: accent.text }}>
              *
            </div>

            {sentence.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-end w-4/5">
                {sentence.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-[10px] font-medium tracking-wide backdrop-blur-sm"
                    style={{ backgroundColor: accent.tagBg, color: accent.tagText }}
                  >
                    {tag}
                  </span>
                ))}
                {sentence.tags.length > 3 && (
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-medium tracking-wide backdrop-blur-sm opacity-80"
                    style={{ backgroundColor: accent.tagBg, color: accent.tagText }}
                  >
                    +{sentence.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-[1.2rem] p-6 md:p-8 active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${theme.cardShadowClass}`}
      style={{ background: accent.bg, minHeight: cardMinHeight }}
    >
      {/* Noise Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Number eyebrow */}
        <div 
          className="text-[11px] mb-8 font-medium tracking-widest opacity-80" 
          style={{ color: accent.text }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Sentence */}
        <h3 
          className="font-serif text-[1.65rem] md:text-[1.85rem] leading-[1.12] tracking-tight mb-8 drop-shadow-sm"
          style={{ color: accent.text }}
        >
          {preview}
        </h3>

        <div className="flex-grow"></div>

        {/* Source/Note/Author info */}
        <div className="mb-6 w-5/6">
          <p className="text-[13px] leading-snug font-medium drop-shadow-sm" style={{ color: accent.text, opacity: 0.85 }}>
            {sentence.author || '佚名'}
            {sentence.source && <><br />《{sentence.source}》</>}
          </p>
        </div>

        {/* Bottom row: Asterisk & Tags */}
        <div className="flex items-end justify-between mt-auto pt-2">
          <div className="text-[26px] leading-none font-serif opacity-90" style={{ color: accent.text }}>
            *
          </div>
          
          {/* Tags */}
          {sentence.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end w-4/5">
              {sentence.tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  className="rounded-full px-3 py-1 text-[10px] font-medium tracking-wide backdrop-blur-sm"
                  style={{ backgroundColor: accent.tagBg, color: accent.tagText }}
                >
                  {tag}
                </span>
              ))}
              {sentence.tags.length > 3 && (
                <span 
                  className="rounded-full px-3 py-1 text-[10px] font-medium tracking-wide backdrop-blur-sm opacity-80"
                  style={{ backgroundColor: accent.tagBg, color: accent.tagText }}
                >
                  +{sentence.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const JuzimiApp: React.FC = () => {
  const navigate = useNavigate();
  const [sentences, setSentences] = useState<JuzimiSentence[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [dialogSentence, setDialogSentence] = useState<JuzimiSentence | null>(null);
  const [themePreference, setThemePreference] = useState(readStoredJuzimiThemePreference);

  const theme = useMemo(() => getJuzimiTheme(themePreference), [themePreference]);
  const themeModeAction = useMemo(() => getJuzimiThemeModeAction(theme.mode), [theme.mode]);

  const filteredSentences = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sentences;
    return sentences.filter(sentence => [
      sentence.text,
      sentence.author,
      sentence.source,
      sentence.note,
      sentence.tags.join(' '),
    ].join(' ').toLowerCase().includes(keyword));
  }, [query, sentences]);

  const loadSentences = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callJuzimiApi('list');
      setSentences(sortJuzimiSentences(data));
    } catch (err: any) {
      setError(err.message || '句子加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSentences();
    const storedToken = sessionStorage.getItem('juzimi_admin_token') || '';
    if (storedToken === JUZIMI_ADMIN_PASSWORD_HASH) {
      setAdminToken(storedToken);
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(JUZIMI_THEME_STORAGE_KEY, JSON.stringify(themePreference));
  }, [themePreference]);

  const handleLogin = async () => {
    const digest = await digestPassword(passwordInput);
    if (digest !== JUZIMI_ADMIN_PASSWORD_HASH) {
      setError('管理员密码不正确');
      return;
    }
    sessionStorage.setItem('juzimi_admin_token', digest);
    setAdminToken(digest);
    setIsAdmin(true);
    setShowAdminPanel(true);
    setPasswordInput('');
    setError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('juzimi_admin_token');
    setIsAdmin(false);
    setAdminToken('');
    setShowAdminPanel(false);
    setForm(blankForm);
  };

  const startCreate = () => {
    setForm(blankForm);
    setShowAdminPanel(true);
  };

  const startEdit = (sentence: JuzimiSentence) => {
    setForm(sentenceToForm(sentence));
    setShowAdminPanel(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const sentence = normalizeJuzimiSentence({
        id: form.id,
        text: form.text,
        author: form.author,
        source: form.source,
        note: form.note,
        tags: form.tagsText,
        createdAt: form.createdAt,
      });
      const data = await callJuzimiApi(sentence.id && form.id ? 'update' : 'create', sentence, adminToken);
      setSentences(sortJuzimiSentences(data));
      setForm(blankForm);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sentence: JuzimiSentence) => {
    if (!confirm('确定要删除这条句子吗？')) return;
    setSaving(true);
    setError('');
    try {
      const data = await callJuzimiApi('delete', { id: sentence.id }, adminToken);
      setSentences(sortJuzimiSentences(data));
      if (form.id === sentence.id) setForm(blankForm);
      if (dialogSentence?.id === sentence.id) setDialogSentence(null);
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleThemeFamily = () => {
    setThemePreference(prev => normalizeJuzimiThemePreference({
      ...prev,
      family: getNextJuzimiThemeFamily(prev.family),
    }));
  };

  const toggleThemeMode = () => {
    setThemePreference(prev => normalizeJuzimiThemePreference({
      ...prev,
      mode: getNextJuzimiThemeMode(prev.mode),
    }));
  };

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-700 ${theme.rootClass}`}>
      <style>{`
        @keyframes juzimi-breathe-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.72; }
          50% { transform: translate3d(4vw, -3vh, 0) scale(1.08); opacity: 0.98; }
        }

        @keyframes juzimi-breathe-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.58; }
          50% { transform: translate3d(-3vw, 4vh, 0) scale(1.12); opacity: 0.9; }
        }

        @keyframes juzimi-gradient-drift {
          0%, 100% { background-position: 0% 42%, 100% 10%, 50% 50%; }
          50% { background-position: 18% 36%, 82% 18%, 56% 46%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .juzimi-bg-drift,
          .juzimi-bg-breathe {
            animation: none !important;
          }
        }
      `}</style>
      {/* decorative background */}
      <div className="fixed inset-0 pointer-events-none opacity-100">
        <div className={`absolute inset-0 transition-colors duration-700 ${theme.backgroundBase}`} />
        <div
          className="juzimi-bg-drift absolute inset-0"
          style={theme.backgroundDriftStyle}
        />
        <div className={`absolute inset-0 ${theme.gridClass}`} />
        <div
          className={`absolute inset-0 ${theme.noiseClass}`}
          style={{ backgroundImage: `url("${NOISE_SVG}")` }}
        />
        {theme.glows.map((glow: any, index: number) => (
          <div key={`${theme.family}-${theme.mode}-glow-${index}`} className={glow.className} style={glow.style} />
        ))}
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-5 md:px-10 pt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className={theme.headerIconButtonClass}
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className={theme.switchWrapClass}>
            <button
              onClick={toggleThemeFamily}
              className={theme.switchButtonClass}
              aria-label="切换句子迷主题"
              title="切换主题"
            >
              <Palette size={15} /> {theme.name}
            </button>
            <button
              onClick={toggleThemeMode}
              className={theme.switchButtonClass}
              aria-label="切换白天黑夜模式"
              title="切换白天黑夜"
            >
              {themeModeAction.mode === 'day' ? <Sun size={15} /> : <Moon size={15} />}
              {themeModeAction.label}
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={startCreate}
              className={`h-11 rounded-full px-4 ${theme.primaryButtonClass}`}
            >
              <Plus size={18} /> 新建句子
            </button>
          )}
          <button
            onClick={() => isAdmin ? setShowAdminPanel(prev => !prev) : setShowAdminPanel(true)}
            className={theme.headerPillClass}
          >
            <Lock size={17} /> 管理员
          </button>
        </div>
      </header>

      <main className="relative z-10 px-5 md:px-10 pb-16 pt-8 max-w-7xl mx-auto">

        {/* ── Hero strip ── */}
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
          <div>

            <h1 className={`font-serif text-[clamp(3.2rem,10vw,7rem)] leading-[0.82] tracking-[-0.05em] ${theme.titleClass}`}>
              句子迷
            </h1>
            <p className={`mt-4 text-base md:text-lg leading-8 font-medium ${theme.mutedClass}`}>
              像翻开一本安静的杂志，把值得停留的句子放在光里。
            </p>
          </div>

          {/* search box */}
          <div className={theme.searchPanelClass}>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-xs font-black tracking-[0.22em] uppercase ${theme.accentClass}`}>Index</div>
              <div className={theme.searchCountClass}>{sentences.length} sentences</div>
            </div>
            <div className="relative">
              <Search size={16} className={theme.searchIconClass} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索句子、作者、标签"
                className={theme.inputClass}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className={theme.errorClass}>
            {error}
          </div>
        )}

        {/* ── Admin panel ── */}
        {showAdminPanel && (
          <section className={theme.panelClass}>
            <div className={theme.panelHeaderClass}>
              <div>
                <div className={`text-xs font-black tracking-[0.22em] uppercase ${theme.accentClass}`}>Editor Desk</div>
                <h2 className={`text-2xl font-black ${theme.titleClass}`}>{isAdmin ? '句子管理' : '管理员登录'}</h2>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className={theme.closeButtonClass}
              >
                <X size={18} />
              </button>
            </div>

            {!isAdmin ? (
              <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleLogin(); }}
                  placeholder="输入管理员密码"
                  className={`h-12 ${theme.panelInputClass}`}
                />
                <button
                  onClick={handleLogin}
                  className={`h-12 px-6 ${theme.primaryButtonClass}`}
                >
                  <Lock size={17} /> 进入管理
                </button>
              </div>
            ) : (
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.68fr] gap-4">
                  <textarea
                    value={form.text}
                    onChange={(event) => setForm(prev => ({ ...prev, text: event.target.value }))}
                    placeholder="写下句子..."
                    className={`min-h-[160px] ${theme.panelTextAreaClass}`}
                  />
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={form.author}
                      onChange={(event) => setForm(prev => ({ ...prev, author: event.target.value }))}
                      placeholder="作者"
                      className={`h-12 ${theme.panelInputClass}`}
                    />
                    <input
                      value={form.source}
                      onChange={(event) => setForm(prev => ({ ...prev, source: event.target.value }))}
                      placeholder="出处 / 书名"
                      className={`h-12 ${theme.panelInputClass}`}
                    />
                    <input
                      value={form.tagsText}
                      onChange={(event) => setForm(prev => ({ ...prev, tagsText: event.target.value }))}
                      placeholder="标签，用逗号分隔"
                      className={`h-12 ${theme.panelInputClass}`}
                    />
                    <textarea
                      value={form.note}
                      onChange={(event) => setForm(prev => ({ ...prev, note: event.target.value }))}
                      placeholder="短评 / 备注"
                      className={`min-h-[72px] p-4 resize-none ${theme.panelInputClass}`}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between">
                  <button
                    onClick={handleLogout}
                    className={`h-12 px-5 flex items-center justify-center gap-2 ${theme.secondaryButtonClass}`}
                  >
                    <LogOut size={18} /> 退出管理员
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setForm(blankForm)}
                      className={`h-12 px-5 ${theme.secondaryButtonClass}`}
                    >
                      清空
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.text.trim()}
                      className={`h-12 px-6 disabled:opacity-40 ${theme.primaryButtonClass}`}
                    >
                      <Save size={18} /> {form.id ? '保存编辑' : '发布句子'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Sentence grid ── */}
        {loading ? (
          <div className={`py-20 text-center font-black ${theme.accentClass}`}>正在翻页...</div>
        ) : filteredSentences.length === 0 ? (
          <section className={theme.emptyStateClass}>
            <Feather size={42} className={`mx-auto mb-4 ${theme.accentClass}`} />
            <h2 className={`text-3xl font-black mb-3 ${theme.titleClass}`}>还没有句子</h2>
            <p className={`font-bold ${theme.mutedClass}`}>管理员登录后，可以把第一条喜欢的句子放进来。</p>
          </section>
        ) : (
          /* Masonry-style responsive grid — 1 col → 2 col → 3 col */
          <section
            className="columns-1 sm:columns-2 xl:columns-3 gap-4 md:gap-5"
          >
            {filteredSentences.map((sentence, index) => (
              <div key={sentence.id} className="break-inside-avoid mb-4 md:mb-5">
                <SentenceCard
                  sentence={sentence}
                  index={index}
                  theme={theme}
                  onClick={() => setDialogSentence(sentence)}
                />
              </div>
            ))}
          </section>
        )}
      </main>

      {/* ── Dialog ── */}
      {dialogSentence && (
        <SentenceDialog
          sentence={dialogSentence}
          onClose={() => setDialogSentence(null)}
          onEdit={startEdit}
          onDelete={handleDelete}
          isAdmin={isAdmin}
          theme={theme}
        />
      )}
    </div>
  );
};

export default JuzimiApp;
