import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/QuestionModal.jsx', import.meta.url), 'utf8');

assert.match(source, /pdf\.min\.mjs/,
  'PDF capture must load the available ESM pdf.js build');
assert.match(source, /pdf\.worker\.min\.mjs/,
  'PDF capture must configure the available ESM worker build');
assert.doesNotMatch(source, /pdf\.min\.js['"]/,
  'PDF capture must not request the nonexistent legacy pdf.js build');
assert.doesNotMatch(source, /pdf\.worker\.min\.js['"]/,
  'PDF capture must not request the nonexistent legacy worker build');
assert.match(source, /import\(\/\* @vite-ignore \*\/ PDFJS_MODULE_URL\)/,
  'The remote ESM module must be loaded without Vite rewriting its URL');
assert.match(source, /attemptNativeTabCapture\(\)/,
  'Cross-origin PDF capture must fall back to a browser current-tab capture');
assert.doesNotMatch(source, /PDF 문서 영역/,
  'Failed PDF capture must not attach a misleading placeholder image');
assert.match(source, /throw new Error\('IMAGE_UPLOAD_FAILED'\)/,
  'An attachment upload failure must abort question creation');
assert.match(source, /disabled=\{isSubmitting \|\| !content\.trim\(\)\}/,
  'The client submission contract must require the same non-empty content as the server');
assert.match(source, /질문은 등록되지 않았습니다/,
  'Upload failure feedback must tell the student that no question was created');

console.log('Agora PDF capture contract checks passed.');
