import assert from 'node:assert/strict';
import {
  evaluateWorkbookInteraction,
  getAdaptiveWorkbookHint,
  getAdaptiveWorkbookHintState,
  getDefaultInteractionConfig,
  getWorkbookElementReference,
  normalizeInteractionConfig,
  recommendWorkbookInteraction,
  getWorkbookColoringMode,
} from '../src/utils/workbookInteractionUtils.js';

for (const type of ['grouping', 'number-line', 'matching', 'ordering', 'coloring']) {
  const config = normalizeInteractionConfig(type, getDefaultInteractionConfig(type));
  assert.ok(config, `${type} default config should normalize`);
  const correctResponse = type === 'number-line' ? config.answer : config.answer;
  assert.equal(evaluateWorkbookInteraction({ type, config }, correctResponse), true, `${type} correct response`);
}

const ordering = normalizeInteractionConfig('ordering', getDefaultInteractionConfig('ordering'));
assert.equal(evaluateWorkbookInteraction({ type: 'ordering', config: ordering }, [...ordering.answer].reverse()), false);

const paintOnlyColoring = normalizeInteractionConfig('coloring', {
  cells: [{ id: 'c1', label: '1칸' }, { id: 'c2', label: '2칸' }, { id: 'c3', label: '3칸' }],
  colors: [{ id: 'blue', label: '색칠', value: '#9bb8d6' }, { id: 'white', label: '색칠 안 함', value: '#fff' }],
  answer: { c1: 'blue', c2: 'blue', c3: 'white' },
});
assert.equal(getWorkbookColoringMode(paintOnlyColoring).isPaintOnly, true);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintOnlyColoring }, { c1: 'blue', c2: 'blue' }), true);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintOnlyColoring }, { c1: 'blue', c2: 'blue', c3: 'white' }), true);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintOnlyColoring }, { c1: 'blue' }), false);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintOnlyColoring }, { c1: 'blue', c2: 'blue', c3: 'blue' }), false);

const paintCountColoring = normalizeInteractionConfig('coloring', {
  cells: Array.from({ length: 6 }, (_, index) => ({ id: `c${index + 1}`, label: `${index + 1}칸` })),
  colors: [{ id: 'blue', label: '색칠', value: '#9bb8d6' }, { id: 'none', label: '색칠 안 함', value: 'transparent' }],
  answer: { c1: 'blue', c2: 'none', c3: 'none', c4: 'none', c5: 'none', c6: 'none' },
  columns: 3,
  selectionMode: 'paint-only',
  paintColorId: 'blue',
  gradingMode: 'paint-count',
});
assert.equal(paintCountColoring.gradingMode, 'paint-count');
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintCountColoring }, { c4: 'blue' }), true);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintCountColoring }, { c6: 'blue' }), true);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintCountColoring }, { c1: 'blue', c4: 'blue' }), false);
assert.equal(evaluateWorkbookInteraction({ type: 'coloring', config: paintCountColoring }, { unknown: 'blue' }), false);

const thirtySixCellColoring = normalizeInteractionConfig('coloring', {
  cells: Array.from({ length: 36 }, (_, index) => ({ id: `c${index + 1}`, label: `${index + 1}칸` })),
  colors: [{ id: 'blue', label: '색칠', value: '#9bb8d6' }, { id: 'white', label: '색칠 안 함', value: '#fff' }],
  answer: Object.fromEntries(Array.from({ length: 36 }, (_, index) => [`c${index + 1}`, index < 9 ? 'blue' : 'white'])),
  columns: 6,
  selectionMode: 'paint-only',
  paintColorId: 'blue',
});
assert.equal(thirtySixCellColoring.cells.length, 36);
assert.equal(thirtySixCellColoring.columns, 6);
assert.equal(thirtySixCellColoring.selectionMode, 'paint-only');

assert.equal(recommendWorkbookInteraction({ sourceText: '수직선에 알맞은 위치를 표시하세요.' }).type, 'number-line');
assert.equal(recommendWorkbookInteraction({ sourceText: '구슬을 두 모둠에 똑같이 나누세요.' }).type, 'grouping');
assert.equal(recommendWorkbookInteraction({ sourceText: '같은 값끼리 연결하세요.' }).type, 'matching');
assert.equal(recommendWorkbookInteraction({ sourceText: '작은 수부터 순서대로 놓으세요.' }).type, 'ordering');
assert.equal(recommendWorkbookInteraction({ sourceText: '알맞은 부분을 색칠하세요.' }).type, 'coloring');

const adaptiveElement = { type: 'grouping', hints: ['1단계 힌트', '2단계 힌트', '3단계 힌트'] };
assert.equal(getAdaptiveWorkbookHint(adaptiveElement, { workbookAverageScore: 90 }, 1), '1단계 힌트');
assert.equal(getAdaptiveWorkbookHint(adaptiveElement, { workbookAverageScore: 90 }, 2), '2단계 힌트');
assert.equal(getAdaptiveWorkbookHint(adaptiveElement, { workbookAverageScore: 90 }, 3), '3단계 힌트');
assert.deepEqual(
  getAdaptiveWorkbookHintState(adaptiveElement, { workbookAverageScore: 50 }, 1),
  { text: '2단계 힌트', level: 2, total: 3 }
);
const legacyHintState = getAdaptiveWorkbookHintState({ type: 'input', hint: '기존 단일 힌트' }, {}, 1);
assert.equal(legacyHintState.level, 1);
assert.equal(legacyHintState.total, 2);
assert.equal(getAdaptiveWorkbookHint({ type: 'input', hint: '기존 단일 힌트' }, {}, 2), '기존 단일 힌트');

assert.deepEqual(
  getWorkbookElementReference({ id: 'el_page_123_q2_total' }),
  { problemLabel: '(2)', responseLabel: '전체를 구하는 식', displayLabel: '교재 (2)번 · 전체를 구하는 식' }
);
assert.equal(
  getWorkbookElementReference({ id: 'el_page_123_q4_division' }).displayLabel,
  '교재 (4)번 · 나눗셈식'
);
assert.equal(
  getWorkbookElementReference({ problemLabel: '6', responseLabel: '짧은 답' }).displayLabel,
  '교재 (6)번 · 짧은 답'
);

assert.throws(() => normalizeInteractionConfig('number-line', { min: 0, max: 100, step: 1, answer: 50 }), /최대 31개/);

console.log('Workbook interaction tests passed.');
