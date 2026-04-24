export const normalizeWordAnswer = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-z]/gi, '');

export const normalizeWordDisplay = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .trim()
    .replace(/\s+/g, ' ');

const ENGLISH_CANDIDATE_RE = /[A-Za-z]+(?:['-][A-Za-z]+)*(?:(?:\s+|\s*\.\.\.\s*)[A-Za-z]+(?:['-][A-Za-z]+)*)*/g;
const PART_OF_SPEECH_TAGS = new Set([
  'n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'det', 'interj', 'num', 'art', 'pl',
  'noun', 'verb', 'adjective', 'adverb',
]);

const stripListPrefix = (value) =>
  String(value ?? '')
    .replace(/^\s*[\(\[（【]?\d+[\)\]）】]?\s*[.．、)]?\s*/, '')
    .replace(/^\s*[A-Za-z][.．、)]\s+/, '');

const stripPhonetics = (value) =>
  String(value ?? '')
    .replace(/\/[^/\n]+\/|\[[^\]\n]+\]/g, ' ');

const normalizeImportLine = (value) =>
  stripPhonetics(stripListPrefix(value))
    .replace(/[：:；;，,|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeChinesePrompt = (value) =>
  String(value ?? '')
    .match(/[\u3400-\u9FFF]+/g)
    ?.join('') ?? '';

const isImportHeaderLine = (line) => {
  const text = String(line ?? '').trim().toLowerCase();
  const chinese = normalizeChinesePrompt(text);
  const english = normalizeWordAnswer(text).toLowerCase();

  return (
    /英语单词|单词表|中英对照|英文短语|英文\/短语|中文释义|中文意思|释义|词汇表/.test(text)
    || /english.*(word|phrase|term)|chinese.*(meaning|definition)|meaning|definition/.test(text)
    || ['english', 'word', 'words', 'phrase', 'phrases', 'meaning', 'meanings', 'chinese'].includes(english)
    || ['英文', '短语', '中文释义', '释义'].includes(chinese)
  );
};

const removeTrailingPartOfSpeech = (value) => {
  const parts = normalizeWordDisplay(value).split(/\s+/).filter(Boolean);
  while (parts.length > 1 && PART_OF_SPEECH_TAGS.has(parts[parts.length - 1].replace(/\./g, '').toLowerCase())) {
    parts.pop();
  }
  return normalizeWordDisplay(parts.join(' '));
};

const getEnglishCandidatesFromLine = (line) => {
  if (isImportHeaderLine(line)) return [];

  const segments = String(line ?? '').split(/[；;，,|]+/);
  const candidates = [];

  for (const segment of segments) {
    const normalizedLine = normalizeImportLine(segment);
    const matches = normalizedLine.match(ENGLISH_CANDIDATE_RE) ?? [];

    for (const match of matches) {
      const displayWord = removeTrailingPartOfSpeech(match);
      const answerKey = normalizeWordAnswer(displayWord);
      if (answerKey.length >= 2 && !PART_OF_SPEECH_TAGS.has(displayWord.toLowerCase())) {
        candidates.push(displayWord);
      }
    }
  }

  return candidates;
};

export const parseWordListText = (text) => {
  const seen = new Set();
  const words = [];
  const lines = String(text ?? '').split(/\r?\n/);

  for (const line of lines) {
    for (const displayWord of getEnglishCandidatesFromLine(line)) {
      const answerKey = normalizeWordAnswer(displayWord);
      if (answerKey.length < 2 || seen.has(answerKey)) continue;
      seen.add(answerKey);
      words.push({ text: displayWord, weight: 1 });
    }
  }

  return words;
};

export const isWordAnswerCorrect = (input, answer) =>
  normalizeWordAnswer(input) === normalizeWordAnswer(answer);

export const parseBilingualWordListText = (text) => {
  const seen = new Set();
  const pairs = [];
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isImportHeaderLine(line));

  const addPair = (english, chinese) => {
    const displayEnglish = normalizeWordDisplay(english);
    const answerKey = normalizeWordAnswer(displayEnglish);
    const cleanChinese = normalizeChinesePrompt(chinese);
    if (answerKey.length < 2 || cleanChinese.length === 0) return;

    const key = `${cleanChinese}|${answerKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ chinese: cleanChinese, english: displayEnglish });
  };

  const lineTypes = lines.map(line => ({
    line,
    englishCandidates: getEnglishCandidatesFromLine(line),
    chinese: normalizeChinesePrompt(line),
  }));

  // Same-line formats: "fox 狐狸", "狐狸 fox", "dangerous adj. 危险的".
  for (const item of lineTypes) {
    if (item.englishCandidates.length > 0 && item.chinese.length > 0) {
      addPair(item.englishCandidates[0], item.chinese);
    }
  }

  // Word tables often extract as alternating lines: English, then Chinese.
  const consumedAdjacentLineIndexes = new Set();
  for (let index = 0; index < lineTypes.length - 1; index += 1) {
    if (consumedAdjacentLineIndexes.has(index)) continue;

    const current = lineTypes[index];
    const next = lineTypes[index + 1];
    const currentIsEnglishOnly = current.englishCandidates.length > 0 && current.chinese.length === 0;
    const currentIsChineseOnly = current.chinese.length > 0 && current.englishCandidates.length === 0;
    const nextIsEnglishOnly = next.englishCandidates.length > 0 && next.chinese.length === 0;
    const nextIsChineseOnly = next.chinese.length > 0 && next.englishCandidates.length === 0;

    if (currentIsEnglishOnly && nextIsChineseOnly) {
      addPair(current.englishCandidates[0], next.chinese);
      consumedAdjacentLineIndexes.add(index);
      consumedAdjacentLineIndexes.add(index + 1);
    } else if (currentIsChineseOnly && nextIsEnglishOnly) {
      addPair(next.englishCandidates[0], current.chinese);
      consumedAdjacentLineIndexes.add(index);
      consumedAdjacentLineIndexes.add(index + 1);
    }
  }

  return pairs;
};

export const isBilingualChallengeAnswerCorrect = (input, answer) =>
  normalizeWordAnswer(input) === normalizeWordAnswer(answer);

export const shuffleLetters = (answer, random = Math.random) => {
  const letters = normalizeWordAnswer(answer).split('');

  for (let index = letters.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
  }

  if (letters.length > 2 && letters.join('') === normalizeWordAnswer(answer)) {
    letters.push(letters.shift());
  }

  return letters;
};

const findChinesePromptForAnswer = (answer, bilingualPairs = []) => {
  const cleanAnswer = normalizeWordAnswer(answer);
  const pair = (bilingualPairs ?? []).find((item) => (
    normalizeWordAnswer(item?.english) === cleanAnswer
    && normalizeChinesePrompt(item?.chinese).length > 0
  )) ?? (bilingualPairs ?? []).find((item) => (
    normalizeWordAnswer(item?.english).toLowerCase() === cleanAnswer.toLowerCase()
    && normalizeChinesePrompt(item?.chinese).length > 0
  ));

  return pair ? normalizeChinesePrompt(pair.chinese) : '';
};

const getFixedLetterIndices = (answer, wordPlayMode = 'shuffle') => {
  const letters = normalizeWordAnswer(answer).split('');
  if (letters.length <= 2) return [];

  if (wordPlayMode === 'edge_hint') {
    return [0, letters.length - 1];
  }

  if (wordPlayMode !== 'cloze' || letters.length <= 5) {
    return [];
  }

  const fixed = new Set([0, letters.length - 1]);
  letters.forEach((_, index) => {
    if (index !== 0 && index !== letters.length - 1 && index % 3 !== 1) {
      fixed.add(index);
    }
  });

  return [...fixed].sort((a, b) => a - b);
};

const getDistractorLetters = (answer, count, random = Math.random) => {
  const cleanAnswer = normalizeWordAnswer(answer);
  const alphabet = /^[A-Z]+$/.test(cleanAnswer)
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    : 'abcdefghijklmnopqrstuvwxyz'.split('');
  const distractors = [];
  let offset = Math.floor(random() * alphabet.length);

  while (distractors.length < count && offset < alphabet.length * 2) {
    const letter = alphabet[offset % alphabet.length];
    if (
      !cleanAnswer.toLowerCase().includes(letter.toLowerCase())
      && !distractors.some(existing => existing.toLowerCase() === letter.toLowerCase())
    ) {
      distractors.push(letter);
    }
    offset += 1;
  }

  return distractors;
};

const getListeningDistractorCount = (answer) => {
  const length = normalizeWordAnswer(answer).length;
  if (length <= 4) return 3;
  if (length <= 8) return 4;
  return 5;
};

export const calculateFlashPreviewMs = (answer) => {
  const length = normalizeWordAnswer(answer).length;
  if (length <= 4) return 500;
  if (length <= 6) return 800;
  if (length <= 8) return 1000;
  if (length <= 9) return 1200;
  return 1500;
};

const createMemoryWordProblem = ({ answer, prompt = '', mode = 'spelling', random = Math.random, wordPlayMode = 'shuffle', flashPreviewMs }) => {
  const displayAnswer = normalizeWordDisplay(answer);
  const cleanAnswer = normalizeWordAnswer(answer);
  const fixedLetterIndices = getFixedLetterIndices(cleanAnswer, wordPlayMode);
  const fixed = new Set(fixedLetterIndices);
  const missingLetters = cleanAnswer.split('').filter((_, index) => !fixed.has(index));
  const isListening = wordPlayMode === 'listening';
  const isCloze = wordPlayMode === 'cloze' && cleanAnswer.length > 5;
  const letterChoices = isListening
    ? [...missingLetters, ...getDistractorLetters(cleanAnswer, getListeningDistractorCount(cleanAnswer), random)]
    : isCloze
    ? [...missingLetters, ...getDistractorLetters(cleanAnswer, 2, random)]
    : missingLetters;

  return {
    type: 'word',
    mode,
    prompt: isListening ? '' : prompt,
    answer: cleanAnswer,
    displayAnswer: displayAnswer || cleanAnswer,
    letters: shuffleLetters(letterChoices.join(''), random),
    fixedLetterIndices,
    previewMs: wordPlayMode === 'flash' ? (flashPreviewMs || calculateFlashPreviewMs(cleanAnswer)) : 0,
    isCloze,
    wordPlayMode,
  };
};

export const buildWordAnswerAttempt = (problem, input) => {
  const answer = normalizeWordAnswer(problem?.answer);
  const fixedLetterIndices = new Set(problem?.fixedLetterIndices ?? []);
  if (fixedLetterIndices.size === 0) return normalizeWordAnswer(input);

  const clickedLetters = normalizeWordAnswer(input).split('');
  let cursor = 0;
  return answer
    .split('')
    .map((letter, index) => (
      fixedLetterIndices.has(index) ? letter : (clickedLetters[cursor++] ?? '')
    ))
    .join('');
};

export const createWordProblem = (wordBank, random = Math.random, bilingualPairs = [], options = {}) => {
  const bankByAnswer = new Map();
  (wordBank ?? []).forEach(item => {
    const isObj = typeof item === 'object' && item !== null;
    const displayWord = normalizeWordDisplay(isObj ? item.text : item);
    const answerKey = normalizeWordAnswer(displayWord);
    if (answerKey.length >= 2 && !bankByAnswer.has(answerKey)) {
      bankByAnswer.set(answerKey, displayWord);
    }
  });
  const cleanBank = Array.from(bankByAnswer.values());

  if (cleanBank.length === 0) return null;

  const answer = cleanBank[Math.floor(random() * cleanBank.length)];

  return createMemoryWordProblem({
    answer,
    prompt: findChinesePromptForAnswer(answer, bilingualPairs),
    mode: 'spelling',
    random,
    wordPlayMode: options.wordPlayMode || 'shuffle',
    flashPreviewMs: options.flashPreviewMs,
  });
};

export const createBilingualChallengeProblem = (pair, random = Math.random, options = {}) => {
  if (!pair) return null;

  const answer = normalizeWordDisplay(pair.english);
  const prompt = normalizeChinesePrompt(pair.chinese);
  if (normalizeWordAnswer(answer).length < 2 || prompt.length === 0) return null;

  return createMemoryWordProblem({
    answer,
    prompt,
    mode: 'challenge',
    random,
    wordPlayMode: options.wordPlayMode || 'shuffle',
    flashPreviewMs: options.flashPreviewMs,
  });
};

export const buildBilingualChallengePool = (pairs, random = Math.random) => {
  const pool = [];
  const seen = new Set();

  (pairs ?? []).forEach((pair) => {
    const english = normalizeWordDisplay(pair?.english);
    const answerKey = normalizeWordAnswer(english);
    const chinese = normalizeChinesePrompt(pair?.chinese);
    if (answerKey.length < 2 || chinese.length === 0) return;
    const key = `${chinese}|${answerKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    pool.push({ chinese, english });
  });

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
};

export const nextBilingualChallengeFromPool = (pool, pairs, options = {}) => {
  if (pool.length === 0) {
    const newPool = buildBilingualChallengePool(pairs);
    pool.push(...newPool);
  }

  if (pool.length === 0) return null;

  return createBilingualChallengeProblem(pool.shift(), Math.random, options);
};

/**
 * 构建洗牌词池：对词库做 Fisher-Yates 洗牌，返回一个新数组队列。
 * 保证每个单词在一轮内只出现一次（除非权重 > 1）。
 */
export const buildWordPool = (wordBank, random = Math.random) => {
  const pool = [];

  (wordBank ?? []).forEach(item => {
    const isObj = typeof item === 'object' && item !== null;
    const text = isObj ? item.text : item;
    const weight = isObj ? (item.weight || 1) : 1;
    
    const displayWord = normalizeWordDisplay(text);
    const cleanWord = normalizeWordAnswer(displayWord);
    if (cleanWord.length >= 2) {
      for (let i = 0; i < weight; i++) {
        pool.push(displayWord);
      }
    }
  });

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
};

/**
 * 从词池中取下一个单词。
 * - pool 是一个可变数组（useRef.current）
 * - 当池为空时自动用 wordBank 重建并重新洗牌（进入下一轮）
 * - 返回 WordProblem 对象，或 null（词库为空时）
 */
export const nextWordFromPool = (pool, wordBank, bilingualPairs = [], options = {}) => {
  if (pool.length === 0) {
    const newPool = buildWordPool(wordBank);
    pool.push(...newPool);
  }

  if (pool.length === 0) return null;

  const answer = pool.shift();
  return createMemoryWordProblem({
    answer,
    prompt: findChinesePromptForAnswer(answer, bilingualPairs),
    mode: 'spelling',
    wordPlayMode: options.wordPlayMode || 'shuffle',
    flashPreviewMs: options.flashPreviewMs,
  });
};
