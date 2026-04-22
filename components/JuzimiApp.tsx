import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Feather, Lock, LogOut, Plus, Save, Search, Sparkles, Trash2, X } from 'lucide-react';
import {
  JUZIMI_ADMIN_PASSWORD_HASH,
  normalizeJuzimiSentence,
  sortJuzimiSentences,
} from './juzimiLogic.js';

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
const CARD_ACCENTS = [
  { bg: 'bg-white', border: 'border-black/10', tag: 'bg-[#f4efe7] text-[#8c6b3f]' },
  { bg: 'bg-[#171310]', border: 'border-transparent', tag: 'bg-white/10 text-[#c7a46c]' },
  { bg: 'bg-[#f4efe7]', border: 'border-[#c7a46c]/30', tag: 'bg-white/70 text-[#8c6b3f]' },
  { bg: 'bg-white', border: 'border-black/10', tag: 'bg-[#f4efe7] text-[#8c6b3f]' },
];

const PREVIEW_MAX = 80; // chars before truncating in card

// ── Dialog ───────────────────────────────────────────────────────────────────
const SentenceDialog = ({
  sentence,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
}: {
  sentence: JuzimiSentence;
  onClose: () => void;
  onEdit: (s: JuzimiSentence) => void;
  onDelete: (s: JuzimiSentence) => void;
  isAdmin: boolean;
}) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-[#f4efe7] shadow-[0_40px_100px_rgba(23,19,16,0.36)] border border-[#c7a46c]/30 flex flex-col">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 pt-6 pb-4 bg-[#f4efe7]/95 backdrop-blur-sm border-b border-[#c7a46c]/20">
          <div className="text-xs font-black tracking-[0.28em] uppercase text-[#8c6b3f]">
            Juzimi · {formatDate(sentence.updatedAt || sentence.createdAt)}
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#171310]/8 flex items-center justify-center hover:bg-[#171310]/14 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="px-6 md:px-8 py-6 flex-1">
          <blockquote className="font-serif text-[clamp(1.7rem,5vw,2.6rem)] leading-[1.35] tracking-[-0.02em] text-[#171310]">
            "{sentence.text}"
          </blockquote>

          <div className="mt-6 flex flex-wrap items-baseline gap-2 text-base font-black text-[#171310]">
            <span>{sentence.author || '佚名'}</span>
            {sentence.source && (
              <span className="text-sm font-bold text-[#8c6b3f]">《{sentence.source}》</span>
            )}
          </div>

          {sentence.note && (
            <p className="mt-5 text-[15px] leading-8 text-[#5f5448] font-medium border-l-4 border-[#c7a46c] pl-4">
              {sentence.note}
            </p>
          )}

          {sentence.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {sentence.tags.map(tag => (
                <span key={tag} className="rounded-full bg-white border border-[#c7a46c]/35 px-3 py-1 text-xs font-black text-[#8c6b3f]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* admin footer */}
        {isAdmin && (
          <div className="sticky bottom-0 flex gap-3 px-6 pb-6 pt-4 bg-[#f4efe7]/95 backdrop-blur-sm border-t border-[#c7a46c]/20">
            <button
              onClick={() => { onEdit(sentence); onClose(); }}
              className="flex-1 h-12 rounded-2xl bg-[#171310] text-white font-black flex items-center justify-center gap-2 text-sm"
            >
              <Edit3 size={16} /> 编辑
            </button>
            <button
              onClick={() => onDelete(sentence)}
              className="flex-1 h-12 rounded-2xl bg-red-50 text-red-700 border border-red-100 font-black flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} /> 删除
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
}: {
  sentence: JuzimiSentence;
  index: number;
  onClick: () => void;
}) => {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const isDark = index % CARD_ACCENTS.length === 1;
  const preview =
    sentence.text.length > PREVIEW_MAX
      ? sentence.text.slice(0, PREVIEW_MAX).trimEnd() + '…'
      : sentence.text;

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-[1.8rem] border ${accent.bg} ${accent.border} p-5 md:p-6 shadow-sm hover:shadow-[0_14px_40px_rgba(23,19,16,0.14)] active:scale-[0.98] transition-all duration-200 cursor-pointer`}
    >
      {/* eyebrow */}
      <div className={`text-[10px] font-black tracking-[0.28em] uppercase mb-3 ${isDark ? 'text-[#c7a46c]' : 'text-[#8c6b3f]'}`}>
        No. {String(index + 1).padStart(2, '0')}
      </div>

      {/* sentence preview */}
      <p className={`font-serif text-[1.18rem] md:text-[1.28rem] leading-snug ${isDark ? 'text-[#f4efe7]' : 'text-[#171310]'}`}>
        "{preview}"
      </p>

      {/* meta */}
      <div className={`mt-4 flex flex-wrap items-center gap-1.5 text-[13px] font-black ${isDark ? 'text-white/55' : 'text-[#6f6254]'}`}>
        <span>{sentence.author || '佚名'}</span>
        {sentence.source && (
          <>
            <span className={isDark ? 'text-white/25' : 'text-[#c7a46c]/60'}>/</span>
            <span className={isDark ? 'text-[#c7a46c]/80' : 'text-[#8c6b3f]'}>{sentence.source}</span>
          </>
        )}
      </div>

      {/* tags */}
      {sentence.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sentence.tags.slice(0, 4).map(tag => (
            <span key={tag} className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${accent.tag}`}>
              {tag}
            </span>
          ))}
          {sentence.tags.length > 4 && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${accent.tag} opacity-60`}>
              +{sentence.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* read more hint */}
      {sentence.text.length > PREVIEW_MAX && (
        <div className={`mt-3 text-[11px] font-black opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-[#c7a46c]' : 'text-[#8c6b3f]'}`}>
          点击查看全文 →
        </div>
      )}
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

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#171310] relative overflow-hidden">
      {/* decorative background */}
      <div className="fixed inset-0 pointer-events-none opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(199,164,108,0.24),transparent_30%),linear-gradient(135deg,rgba(17,19,24,0.06),transparent_42%)]" />
        <div className="absolute left-0 top-0 h-full w-[12vw] bg-[#14110f]" />
        <div className="absolute right-[-10vw] top-[8vh] h-[70vh] w-[34vw] rounded-full border border-[#c7a46c]/30" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-5 md:px-10 pt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="h-11 w-11 rounded-full bg-white/80 border border-black/10 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={startCreate}
              className="h-11 rounded-full bg-[#171310] text-white px-4 font-black flex items-center gap-2 shadow-lg"
            >
              <Plus size={18} /> 新建句子
            </button>
          )}
          <button
            onClick={() => isAdmin ? setShowAdminPanel(prev => !prev) : setShowAdminPanel(true)}
            className="h-11 rounded-full bg-white/85 border border-black/10 px-4 font-black flex items-center gap-2 shadow-sm hover:bg-white transition-colors"
          >
            <Lock size={17} /> 管理员
          </button>
        </div>
      </header>

      <main className="relative z-10 px-5 md:px-10 pb-16 pt-8 max-w-7xl mx-auto">

        {/* ── Hero strip ── */}
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a46c]/50 bg-white/60 px-4 py-2 text-xs font-black tracking-[0.28em] uppercase text-[#8c6b3f] mb-4">
              <Sparkles size={14} /> Juzimi Magazine
            </div>
            <h1 className="font-serif text-[clamp(3.2rem,10vw,7rem)] leading-[0.82] tracking-[-0.05em] text-[#171310]">
              句子迷
            </h1>
            <p className="mt-4 text-base md:text-lg leading-8 text-[#5f5448] font-medium">
              像翻开一本安静的杂志，把值得停留的句子放在光里。
            </p>
          </div>

          {/* search box */}
          <div className="w-full md:w-80 shrink-0 rounded-2xl bg-[#171310] p-4 shadow-[0_20px_60px_rgba(23,19,16,0.22)]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black tracking-[0.22em] uppercase text-[#c7a46c]">Index</div>
              <div className="text-sm font-black text-white/55">{sentences.length} sentences</div>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索句子、作者、标签"
                className="w-full h-11 rounded-xl bg-white/10 border border-white/10 pl-10 pr-4 outline-none text-white placeholder:text-white/30 font-bold text-sm focus:border-[#c7a46c] transition-colors"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {/* ── Admin panel ── */}
        {showAdminPanel && (
          <section className="mb-8 rounded-[2rem] bg-white/85 backdrop-blur border border-black/10 shadow-[0_20px_60px_rgba(23,19,16,0.12)] overflow-hidden">
            <div className="p-5 md:p-6 border-b border-black/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black tracking-[0.22em] uppercase text-[#8c6b3f]">Editor Desk</div>
                <h2 className="text-2xl font-black text-[#171310]">{isAdmin ? '句子管理' : '管理员登录'}</h2>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
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
                  className="h-12 rounded-2xl border border-black/10 bg-[#f8f3eb] px-4 font-bold outline-none focus:border-[#c7a46c]"
                />
                <button
                  onClick={handleLogin}
                  className="h-12 rounded-2xl bg-[#171310] text-white px-6 font-black flex items-center justify-center gap-2"
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
                    className="min-h-[160px] rounded-3xl border border-black/10 bg-[#f8f3eb] p-5 font-serif text-xl leading-9 outline-none focus:border-[#c7a46c] resize-none"
                  />
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={form.author}
                      onChange={(event) => setForm(prev => ({ ...prev, author: event.target.value }))}
                      placeholder="作者"
                      className="h-12 rounded-2xl border border-black/10 bg-[#f8f3eb] px-4 font-bold outline-none focus:border-[#c7a46c]"
                    />
                    <input
                      value={form.source}
                      onChange={(event) => setForm(prev => ({ ...prev, source: event.target.value }))}
                      placeholder="出处 / 书名"
                      className="h-12 rounded-2xl border border-black/10 bg-[#f8f3eb] px-4 font-bold outline-none focus:border-[#c7a46c]"
                    />
                    <input
                      value={form.tagsText}
                      onChange={(event) => setForm(prev => ({ ...prev, tagsText: event.target.value }))}
                      placeholder="标签，用逗号分隔"
                      className="h-12 rounded-2xl border border-black/10 bg-[#f8f3eb] px-4 font-bold outline-none focus:border-[#c7a46c]"
                    />
                    <textarea
                      value={form.note}
                      onChange={(event) => setForm(prev => ({ ...prev, note: event.target.value }))}
                      placeholder="短评 / 备注"
                      className="min-h-[72px] rounded-2xl border border-black/10 bg-[#f8f3eb] p-4 font-bold outline-none focus:border-[#c7a46c] resize-none"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between">
                  <button
                    onClick={handleLogout}
                    className="h-12 rounded-2xl bg-slate-100 text-slate-700 px-5 font-black flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> 退出管理员
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setForm(blankForm)}
                      className="h-12 rounded-2xl bg-white border border-black/10 text-slate-700 px-5 font-black"
                    >
                      清空
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.text.trim()}
                      className="h-12 rounded-2xl bg-[#171310] text-white px-6 font-black flex items-center justify-center gap-2 disabled:opacity-40"
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
          <div className="py-20 text-center font-black text-[#8c6b3f]">正在翻页...</div>
        ) : filteredSentences.length === 0 ? (
          <section className="rounded-[2.5rem] border border-dashed border-[#c7a46c]/50 bg-white/55 p-10 md:p-16 text-center">
            <Feather size={42} className="mx-auto text-[#8c6b3f] mb-4" />
            <h2 className="text-3xl font-black text-[#171310] mb-3">还没有句子</h2>
            <p className="text-[#6f6254] font-bold">管理员登录后，可以把第一条喜欢的句子放进来。</p>
          </section>
        ) : (
          /* Masonry-style responsive grid — 1 col → 2 col → 3 col */
          <section
            className="columns-1 sm:columns-2 xl:columns-3 gap-4 md:gap-5"
            style={{ columnFill: 'balance' }}
          >
            {filteredSentences.map((sentence, index) => (
              <div key={sentence.id} className="break-inside-avoid mb-4 md:mb-5">
                <SentenceCard
                  sentence={sentence}
                  index={index}
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
        />
      )}
    </div>
  );
};

export default JuzimiApp;
