import assert from 'node:assert/strict';
import katex from 'katex';
import {
  protectLatexTextBlocks,
  restoreLatexTextBlocks,
  ensureKoreanInTextMacro,
  restoreLostLatexCommandSlashes,
  sanitizeLaTeX,
  repairLaTeXForEditing,
  URL_MATCH_PATTERN,
  trimUrlToken,
} from '../src/utils/latexFormatCore.js';
import {
  isWorkbookMathDisplayValue,
  normalizeWorkbookMathForKatex,
} from '../src/utils/workbookMathDisplayUtils.js';

// 1. Text macro block protection
const textWithMacro = String.raw`\frac{2}{4} \text{ of a triangle}`;
const { protectedText, protectedBlocks } = protectLatexTextBlocks(textWithMacro);
assert.match(protectedText, /@@LATEX_TEXT_MACRO_0@@/);
assert.equal(protectedBlocks[0], String.raw`\text{ of a triangle}`);
assert.equal(restoreLatexTextBlocks(protectedText, protectedBlocks), textWithMacro);

// 2. Lost LaTeX command slashes restoration should not corrupt words inside \text{}
const repairedTriangle = restoreLostLatexCommandSlashes(String.raw`\frac{2}{4} \text{ of a triangle}`);
assert.equal(repairedTriangle, String.raw`\frac{2}{4} \text{ of a triangle}`);

// Words inside \text{} like 'times', 'triangle', 'div', 'left', 'right', 'pm' should stay unescaped
const complexTextMacro = String.raw`\frac{1}{2} \text{ times a triangle is not parallel and left or right}`;
assert.equal(
  restoreLostLatexCommandSlashes(complexTextMacro),
  complexTextMacro
);

// 3. Lost LaTeX command outside \text{} SHOULD be restored
const missingSlashes = String.raw`frac{1}{2} + sqrt{9} \text{ triangle}`;
assert.equal(
  restoreLostLatexCommandSlashes(missingSlashes),
  String.raw`\frac{1}{2} + \sqrt{9} \text{ triangle}`
);

// 4. sanitizeLaTeX should produce valid KaTeX string for \frac{2}{4} \text{ of a triangle}
const sanitized = sanitizeLaTeX(String.raw`\frac{2}{4} \text{ of a triangle}`);
assert.equal(sanitized, String.raw`\frac{2}{4} \text{ of a triangle}`);
assert.doesNotThrow(() => katex.renderToString(sanitized, { displayMode: true, throwOnError: true }));

// 5. Check all 4 choices from fractions_chap1_unit5 page_1786151900559 item 6
const options = [
  String.raw`\frac{2}{4} \text{ of a triangle}`,
  String.raw`\frac{1}{4} \text{ of a triangle}`,
  String.raw`\frac{3}{4} \text{ of a triangle}`,
  String.raw`\frac{4}{4} \text{ of a triangle}`,
];

for (const opt of options) {
  assert.equal(isWorkbookMathDisplayValue(opt), true);
  const math = sanitizeLaTeX(normalizeWorkbookMathForKatex(opt));
  assert.doesNotThrow(
    () => katex.renderToString(math, { displayMode: true, throwOnError: true }),
    `Option "${opt}" must be renderable in KaTeX without throwing`
  );
}

// 6. Korean in and out of text macros
const koreanInMacro = String.raw`\frac{\text{분자}}{\text{분모}}`;
assert.equal(sanitizeLaTeX(koreanInMacro), koreanInMacro);

const rawKorean = String.raw`\frac{사과}{바나나}`;
assert.equal(sanitizeLaTeX(rawKorean), String.raw`\frac{\text{사과}}{\text{바나나}}`);

// 7. Shared URL helpers must remain exported for the JSX formatter.
assert.deepEqual(
  [...'문서: https://example.com/path?q=1.'.matchAll(new RegExp(URL_MATCH_PATTERN))].map((match) => trimUrlToken(match[0])),
  ['https://example.com/path?q=1']
);

console.log('LaTeX text repair & math format core tests passed.');
