import assert from 'node:assert/strict';
import katex from 'katex';
import {
  isWorkbookMathDisplayValue,
  normalizeWorkbookMathForKatex,
  unwrapWorkbookMathDelimiters,
} from '../src/utils/workbookMathDisplayUtils.js';

const longDivision = String.raw`\displaystyle\begin{array}{r@{\,}c} &5\\[-2pt]1\big)&\overline{\,5\,}\end{array}`;

assert.equal(isWorkbookMathDisplayValue(longDivision), true);
assert.equal(isWorkbookMathDisplayValue(String.raw`\frac{1}{2}`), true);
assert.equal(isWorkbookMathDisplayValue('10을 5등분하면 2씩 나누어진다.'), false);
assert.equal(isWorkbookMathDisplayValue(String.raw`\(\frac{1}{10}\)의 자리`), false);
assert.equal(isWorkbookMathDisplayValue(String.raw`$\frac{1}{10}$의 자리`), false);
assert.equal(isWorkbookMathDisplayValue(String.raw`\frac{1}{10}의 자리`), false);
assert.equal(unwrapWorkbookMathDelimiters(`$$${longDivision}$$`), longDivision);
assert.equal(unwrapWorkbookMathDelimiters(String.raw`\[\frac{1}{2}\]`), String.raw`\frac{1}{2}`);
assert.equal(unwrapWorkbookMathDelimiters(String.raw`\(\frac{1}{2}\)`), String.raw`\frac{1}{2}`);
assert.match(normalizeWorkbookMathForKatex(longDivision), /\\begin\{array\}\{rc\}/);
assert.doesNotThrow(() => katex.renderToString(normalizeWorkbookMathForKatex(longDivision), { displayMode: true, throwOnError: true }));

console.log('Workbook math display tests passed.');

