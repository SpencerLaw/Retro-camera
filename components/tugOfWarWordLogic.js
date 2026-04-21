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
