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

  const featuredSentence = filteredSentences[0];
  const secondarySentences = filteredSentences.slice(1);

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
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#171310] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(199,164,108,0.24),transparent_30%),linear-gradient(135deg,rgba(17,19,24,0.06),transparent_42%)]" />
        <div className="absolute left-0 top-0 h-full w-[12vw] bg-[#14110f]" />
        <div className="absolute right-[-10vw] top-[8vh] h-[70vh] w-[34vw] rounded-full border border-[#c7a46c]/30" />
      </div>

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

      <main className="relative z-10 px-5 md:px-10 pb-12 pt-8 md:pt-14 max-w-7xl mx-auto">
        <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-12 items-end mb-10 md:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a46c]/50 bg-white/60 px-4 py-2 text-xs font-black tracking-[0.28em] uppercase text-[#8c6b3f] mb-7">
              <Sparkles size={14} /> Juzimi Magazine
            </div>
            <h1 className="font-serif text-[clamp(4.5rem,14vw,11rem)] leading-[0.78] tracking-[-0.05em] text-[#171310]">
              句子迷
            </h1>
            <p className="mt-7 max-w-2xl text-lg md:text-xl leading-9 text-[#5f5448] font-medium">
              像翻开一本安静的杂志，把值得停留的句子放在光里。
            </p>
          </div>

          <div className="rounded-[2rem] bg-[#171310] text-[#f4efe7] p-5 md:p-7 shadow-[0_28px_80px_rgba(23,19,16,0.28)]">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="text-xs font-black tracking-[0.24em] uppercase text-[#c7a46c]">Index</div>
              <div className="text-sm font-black text-white/65">{sentences.length} sentences</div>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索句子、作者、标签"
                className="w-full h-13 rounded-2xl bg-white/10 border border-white/10 pl-11 pr-4 outline-none text-white placeholder:text-white/35 font-bold focus:border-[#c7a46c]"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {showAdminPanel && (
          <section className="mb-10 rounded-[2rem] bg-white/85 backdrop-blur border border-black/10 shadow-[0_20px_60px_rgba(23,19,16,0.12)] overflow-hidden">
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
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleLogin();
                  }}
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
                    className="min-h-[190px] rounded-3xl border border-black/10 bg-[#f8f3eb] p-5 font-serif text-2xl leading-10 outline-none focus:border-[#c7a46c] resize-none"
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
                      className="min-h-[82px] rounded-2xl border border-black/10 bg-[#f8f3eb] p-4 font-bold outline-none focus:border-[#c7a46c] resize-none"
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
                      <Save size={18} /> {form.id ? '保存编辑句子' : '发布新建句子'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {loading ? (
          <div className="py-24 text-center font-black text-[#8c6b3f]">正在翻页...</div>
        ) : filteredSentences.length === 0 ? (
          <section className="rounded-[2.5rem] border border-dashed border-[#c7a46c]/50 bg-white/55 p-10 md:p-16 text-center">
            <Feather size={42} className="mx-auto text-[#8c6b3f] mb-4" />
            <h2 className="text-3xl font-black text-[#171310] mb-3">还没有句子</h2>
            <p className="text-[#6f6254] font-bold">管理员登录后，可以把第一条喜欢的句子放进来。</p>
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-6 md:gap-8">
            {featuredSentence && (
              <article className="rounded-[2.7rem] bg-white shadow-[0_28px_80px_rgba(23,19,16,0.14)] border border-black/10 overflow-hidden min-h-[520px] flex flex-col">
                <div className="p-6 md:p-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-4 mb-10">
                    <div className="text-xs font-black tracking-[0.3em] uppercase text-[#8c6b3f]">Cover Story</div>
                    <div className="text-sm font-black text-slate-400">{formatDate(featuredSentence.updatedAt || featuredSentence.createdAt)}</div>
                  </div>
                  <blockquote className="font-serif text-[clamp(2.4rem,5vw,5.8rem)] leading-[1.02] tracking-[-0.04em] text-[#171310]">
                    “{featuredSentence.text}”
                  </blockquote>
                  <div className="mt-auto pt-10">
                    <div className="text-xl font-black text-[#171310]">
                      {featuredSentence.author || '佚名'}
                    </div>
                    {featuredSentence.source && (
                      <div className="mt-1 text-sm font-bold text-[#786b5e]">《{featuredSentence.source}》</div>
                    )}
                    {featuredSentence.note && (
                      <p className="mt-5 text-base leading-8 text-[#5f5448] font-medium border-l-4 border-[#c7a46c] pl-4">
                        {featuredSentence.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-6 md:px-10 pb-7 flex flex-wrap gap-2">
                  {featuredSentence.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-[#f4efe7] border border-[#c7a46c]/35 px-3 py-1 text-xs font-black text-[#8c6b3f]">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            )}

            <div className="grid grid-cols-1 gap-5">
              {secondarySentences.map((sentence, index) => (
                <article
                  key={sentence.id}
                  className={`rounded-[2rem] border border-black/10 bg-white/80 backdrop-blur p-5 md:p-6 shadow-sm ${
                    index % 2 === 0 ? 'lg:translate-x-5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="text-xs font-black tracking-[0.18em] uppercase text-[#8c6b3f]">No. {String(index + 2).padStart(2, '0')}</div>
                    {isAdmin && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(sentence)}
                          className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700"
                          aria-label="编辑句子"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(sentence)}
                          className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-red-50 hover:text-red-700"
                          aria-label="删除句子"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="font-serif text-2xl md:text-3xl leading-snug text-[#171310]">“{sentence.text}”</p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-black text-[#6f6254]">
                    <span>{sentence.author || '佚名'}</span>
                    {sentence.source && <span className="text-[#c7a46c]">/ {sentence.source}</span>}
                  </div>
                  {sentence.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {sentence.tags.map(tag => (
                        <span key={tag} className="rounded-full bg-[#f4efe7] px-2.5 py-1 text-[11px] font-black text-[#8c6b3f]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {featuredSentence && isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(featuredSentence)}
                    className="flex-1 h-12 rounded-2xl bg-white border border-black/10 font-black flex items-center justify-center gap-2"
                  >
                    <Edit3 size={17} /> 编辑句子
                  </button>
                  <button
                    onClick={() => handleDelete(featuredSentence)}
                    className="flex-1 h-12 rounded-2xl bg-red-50 text-red-700 border border-red-100 font-black flex items-center justify-center gap-2"
                  >
                    <Trash2 size={17} /> 删除句子
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default JuzimiApp;
