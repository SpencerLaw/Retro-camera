export const normalizeWordAnswer = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-z]/gi, '')
    .toUpperCase();

export const parseWordListText = (text) => {
  const seen = new Set();
  const words = [];
  const matches = String(text ?? '').match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? [];

  for (const token of matches) {
    const word = normalizeWordAnswer(token);
    if (word.length < 2 || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words;
};

export const isWordAnswerCorrect = (input, answer) =>
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
    new Set((wordBank ?? []).map(normalizeWordAnswer).filter((word) => word.length >= 2)),
  );

  if (cleanBank.length === 0) return null;

  const answer = cleanBank[Math.floor(random() * cleanBank.length)];

  return {
    type: 'word',
    answer,
    letters: shuffleLetters(answer, random),
  };
};

/**
 * 构建洗牌词池：对词库做 Fisher-Yates 洗牌，返回一个新数组队列。
 * 保证每个单词在一轮内只出现一次。
 */
export const buildWordPool = (wordBank, random = Math.random) => {
  const cleanBank = Array.from(
    new Set((wordBank ?? []).map(normalizeWordAnswer).filter((word) => word.length >= 2)),
  );

  // Fisher-Yates shuffle
  for (let i = cleanBank.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cleanBank[i], cleanBank[j]] = [cleanBank[j], cleanBank[i]];
  }

  return cleanBank;
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

