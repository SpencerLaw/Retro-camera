export const normalizeWordAnswer = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();

export const parseWordListText = (text) => {
  const seen = new Set();
  const words = [];
  const matches = String(text ?? '').match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? [];

  for (const token of matches) {
    const word = normalizeWordAnswer(token);
    if (word.length < 2 || seen.has(word)) continue;
    seen.add(word);
    words.push({ text: word, weight: 1 });
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
    const englishMatch = line.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/);
    const english = normalizeWordAnswer(englishMatch?.[0]);
    const chinese = normalizeChinesePrompt(line);
    if (english.length < 2 || chinese.length === 0) continue;

    const key = `${chinese}|${english}`;
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

export const createWordProblem = (wordBank, random = Math.random) => {
  const cleanBank = Array.from(
    new Set((wordBank ?? []).map(item => {
      const isObj = typeof item === 'object' && item !== null;
      return normalizeWordAnswer(isObj ? item.text : item);
    }).filter((word) => word.length >= 2)),
  );

  if (cleanBank.length === 0) return null;

  const answer = cleanBank[Math.floor(random() * cleanBank.length)];

  return {
    type: 'word',
    answer,
    letters: shuffleLetters(answer, random),
  };
};

export const createBilingualChallengeProblem = (pair, random = Math.random) => {
  if (!pair) return null;

  const answer = normalizeWordAnswer(pair.english);
  const prompt = normalizeChinesePrompt(pair.chinese);
  if (answer.length < 2 || prompt.length === 0) return null;

  return {
    type: 'word',
    mode: 'challenge',
    prompt,
    answer,
    letters: shuffleLetters(answer, random),
  };
};

export const buildBilingualChallengePool = (pairs, random = Math.random) => {
  const pool = [];
  const seen = new Set();

  (pairs ?? []).forEach((pair) => {
    const english = normalizeWordAnswer(pair?.english);
    const chinese = normalizeChinesePrompt(pair?.chinese);
    if (english.length < 2 || chinese.length === 0) return;
    const key = `${chinese}|${english}`;
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

export const nextBilingualChallengeFromPool = (pool, pairs) => {
  if (pool.length === 0) {
    const newPool = buildBilingualChallengePool(pairs);
    pool.push(...newPool);
  }

  if (pool.length === 0) return null;

  return createBilingualChallengeProblem(pool.shift());
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
    
    const cleanWord = normalizeWordAnswer(text);
    if (cleanWord.length >= 2) {
      for (let i = 0; i < weight; i++) {
        pool.push(cleanWord);
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
export const nextWordFromPool = (pool, wordBank) => {
  if (pool.length === 0) {
    const newPool = buildWordPool(wordBank);
    pool.push(...newPool);
  }

  if (pool.length === 0) return null;

  const answer = pool.shift();
  return {
    type: 'word',
    answer,
    letters: shuffleLetters(answer),
  };
};
