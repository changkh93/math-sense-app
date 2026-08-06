const normalizeRandomValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Math.random();
  return Math.min(0.999999999999, Math.max(0, numeric));
};

export const shuffleWorkbookOptions = (options, random = Math.random) => {
  const source = Array.isArray(options) ? [...options] : [];
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizeRandomValue(random()) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((option, index) => option === source[index])) {
    const offset = 1 + Math.floor(normalizeRandomValue(random()) * (shuffled.length - 1));
    return [...source.slice(offset), ...source.slice(0, offset)];
  }

  return shuffled;
};
