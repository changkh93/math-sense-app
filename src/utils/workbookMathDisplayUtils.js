const RAW_LATEX_PATTERN = /\\(?:displaystyle|textstyle|begin|frac|dfrac|tfrac|sqrt|overline|underline|boxed|text|mbox|mathrm|left|right|big|Big|bigg|Bigg|div|times|cdot|neq|leq|geq|approx|equiv|angle|triangle|parallel|perp)(?:\b|\s*[{([])/;
const LATEX_TEXT_MACRO_PATTERN = /\\(?:text|mbox|mathrm)\s*\{[^{}]*\}/g;
const SIMPLE_LATEX_FRACTION_PATTERN = /^\\(?:frac|dfrac|tfrac)\s*\{((?:\\(?:text|mbox|mathrm)\s*\{[^{}]*\})|[^{}]+)\}\s*\{((?:\\(?:text|mbox|mathrm)\s*\{[^{}]*\})|[^{}]+)\}$/;
const EXACT_LATEX_TEXT_MACRO_PATTERN = /^\\(?:text|mbox|mathrm)\s*\{([^{}]*)\}$/;

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
  if (text.includes('\\(') || text.includes('$')) return false;
  // Korean inside a LaTeX text macro is valid math content (for example
  // `\\frac{\\text{펑}}{\\text{귄}}`). Only reject Korean that remains
  // outside those macros, which is usually prose mixed with an inline formula.
  const textOutsideLatexMacros = text.replace(LATEX_TEXT_MACRO_PATTERN, '');
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(textOutsideLatexMacros)) return false;
  return RAW_LATEX_PATTERN.test(text);
};

export const normalizeWorkbookMathForKatex = (value) => (
  unwrapWorkbookMathDelimiters(value)
    // KaTeX arrays do not support TeX's inter-column @{...} syntax.
    // Removing only that spacing directive preserves the long-division layout.
    .replace(/\\begin\{array\}\{([clr])@\{[^}]*\}([clr])\}/g, '\\begin{array}{$1$2}')
);

export const parseWorkbookSimpleFraction = (value) => {
  const math = unwrapWorkbookMathDelimiters(value);
  const match = math.match(SIMPLE_LATEX_FRACTION_PATTERN);
  if (!match) return null;

  const parsePart = (part) => {
    const trimmed = part.trim();
    const textMacro = trimmed.match(EXACT_LATEX_TEXT_MACRO_PATTERN);
    return textMacro
      ? { value: textMacro[1], mode: 'text' }
      : { value: trimmed, mode: 'math' };
  };
  return {
    numerator: parsePart(match[1]),
    denominator: parsePart(match[2]),
  };
};
