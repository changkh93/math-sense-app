const RAW_LATEX_PATTERN = /\\(?:displaystyle|textstyle|begin|frac|dfrac|tfrac|sqrt|overline|underline|boxed|left|right|big|Big|bigg|Bigg|div|times|cdot|neq|leq|geq|approx|equiv|angle|triangle|parallel|perp)(?:\b|\s*[{([])/;

export const unwrapWorkbookMathDelimiters = (value) => {
  const text = String(value ?? '').trim();
  if (text.startsWith('$$') && text.endsWith('$$') && text.length >= 4) return text.slice(2, -2).trim();
  if (text.startsWith('\\[') && text.endsWith('\\]') && text.length >= 4) return text.slice(2, -2).trim();
  if (text.startsWith('\\(') && text.endsWith('\\)') && text.length >= 4) return text.slice(2, -2).trim();
  if (text.startsWith('$') && text.endsWith('$') && text.length >= 2) return text.slice(1, -1).trim();
  return text;
};

export const isWorkbookMathDisplayValue = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if ((text.startsWith('$$') && text.endsWith('$$'))
    || (text.startsWith('\\[') && text.endsWith('\\]'))) return true;
  if (text.includes('\\(') || text.includes('$') || /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) return false;
  return RAW_LATEX_PATTERN.test(text);
};

export const normalizeWorkbookMathForKatex = (value) => (
  unwrapWorkbookMathDelimiters(value)
    // KaTeX arrays do not support TeX's inter-column @{...} syntax.
    // Removing only that spacing directive preserves the long-division layout.
    .replace(/\\begin\{array\}\{([clr])@\{[^}]*\}([clr])\}/g, '\\begin{array}{$1$2}')
);

