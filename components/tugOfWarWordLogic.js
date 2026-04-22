export const normalizeWordAnswer = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-z]/gi, '');

export const normalizeWordDisplay = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .trim()
    .replace(/\s+/g, ' ');

export const parseWordListText = (text) => {
  const seen = new Set();
  const words = [];
  const matches = String(text ?? '').match(/[A-Za-z]+(?:[-' \t]+[A-Za-z]+)*/g) ?? [];

  for (const token of matches) {
    const displayWord = normalizeWordDisplay(token);
    const answerKey = normalizeWordAnswer(displayWord);
    if (answerKey.length < 2 || seen.has(answerKey)) continue;
    seen.add(answerKey);
    words.push({ text: displayWord, weight: 1 });
  }

  return words;
};

export const isWordAnswerCorrect = (input, answer) =>
  normalizeWordAnswer(input) === normalizeWordAnswer(answer);

const normalizeChinesePrompt = (value) =>
  String(value ?? '')
    .match(/[\u3400-\u9FFF]+/g)
    ?.join('') ?? '';

export const parseBilingualWordListText = (text) => {
  const seen = new Set();
  const pairs = [];
  const lines = String(text ?? '').split(/\r?\n/);

  for (const line of lines) {
    const englishMatch = line.match(/[A-Za-z]+(?:[-' \t]+[A-Za-z]+)*/);
    const english = normalizeWordDisplay(englishMatch?.[0]);
    const answerKey = normalizeWordAnswer(english);
    const chinese = normalizeChinesePrompt(line);
    if (answerKey.length < 2 || chinese.length === 0) continue;

    const key = `${chinese}|${answerKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ chinese, english });
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
  const isCloze = wordPlayMode === 'cloze' && cleanAnswer.length > 5;
  const letterChoices = isCloze
    ? [...missingLetters, ...getDistractorLetters(cleanAnswer, 2, random)]
    : missingLetters;

  return {
    type: 'word',
    mode,
    prompt,
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
