import assert from 'node:assert/strict';
import {
  evaluateWorkbookInteraction,
  getAdaptiveWorkbookHint,
  getAdaptiveWorkbookHintState,
  getDefaultInteractionConfig,
  normalizeInteractionConfig,
  recommendWorkbookInteraction,
} from '../src/utils/workbookInteractionUtils.js';

for (const type of ['grouping', 'number-line', 'matching', 'ordering', 'coloring']) {
  const config = normalizeInteractionConfig(type, getDefaultInteractionConfig(type));
  assert.ok(config, `${type} default config should normalize`);
  const correctResponse = type === 'number-line' ? config.answer : config.answer;
  assert.equal(evaluateWorkbookInteraction({ type, config }, correctResponse), true, `${type} correct response`);
}

const ordering = normalizeInteractionConfig('ordering', getDefaultInteractionConfig('ordering'));
assert.equal(evaluateWorkbookInteraction({ type: 'ordering', config: ordering }, [...ordering.answer].reverse()), false);

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

assert.throws(() => normalizeInteractionConfig('number-line', { min: 0, max: 100, step: 1, answer: 50 }), /최대 31개/);

console.log('Workbook interaction tests passed.');
