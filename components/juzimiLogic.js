export const JUZIMI_ADMIN_PASSWORD_HASH = '17d3fc231a5c679f6904650d4cf0770e615106147f2de1c74b5ce9dd38e9c9ac';

export const emptyJuzimiSentence = {
  id: '',
  text: '',
  author: '',
  source: '',
  note: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

export const normalizeJuzimiSentence = (sentence = {}) => {
  const now = new Date().toISOString();
  const text = String(sentence.text || '').trim();
  const tags = Array.isArray(sentence.tags)
    ? sentence.tags
    : String(sentence.tags || '')
      .split(/[，,\s]+/)
      .map(tag => tag.trim())
      .filter(Boolean);

  return {
    ...emptyJuzimiSentence,
    ...sentence,
    id: sentence.id || `sentence_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    author: String(sentence.author || '').trim(),
    source: String(sentence.source || '').trim(),
    note: String(sentence.note || '').trim(),
    tags: [...new Set(tags)].slice(0, 6),
    createdAt: sentence.createdAt || now,
    updatedAt: now,
  };
};

export const sortJuzimiSentences = (sentences = []) => (
  [...sentences].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
);

export const sanitizeJuzimiSentences = (sentences = []) => (
  sortJuzimiSentences(
    sentences
      .map(normalizeJuzimiSentence)
      .filter(sentence => sentence.text.length > 0)
  )
);
