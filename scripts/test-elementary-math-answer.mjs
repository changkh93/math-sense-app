import assert from 'node:assert/strict';
import {
  areElementaryAnswersEquivalent,
  normalizeElementaryAnswer,
  parseElementaryRational,
  splitFractionDisplayValue,
} from '../src/utils/elementaryMathAnswer.js';

assert.deepEqual(parseElementaryRational('2/4'), { numerator: 1, denominator: 2 });
assert.deepEqual(parseElementaryRational('1 1/2'), { numerator: 3, denominator: 2 });
assert.deepEqual(parseElementaryRational('1\\frac{1}{2}'), { numerator: 3, denominator: 2 });
assert.deepEqual(parseElementaryRational('0.5'), { numerator: 1, denominator: 2 });
assert.equal(areElementaryAnswersEquivalent('2/4', '1/2', { inputMode: 'fraction' }), true);
assert.equal(areElementaryAnswersEquivalent('1 2/4', '1 1/2', { inputMode: 'mixed-number' }), true);
assert.equal(areElementaryAnswersEquivalent('0.5', '1/2', { inputMode: 'decimal' }), true);
assert.equal(areElementaryAnswersEquivalent('18 ÷ 2', '18÷2', { inputMode: 'expression' }), true);
assert.equal(areElementaryAnswersEquivalent('18÷2', '9', { inputMode: 'expression' }), false);
assert.equal(normalizeElementaryAnswer('3 · 4'), '3×4');
assert.deepEqual(splitFractionDisplayValue('2 1/3', 'mixed-number'), { whole: '2', numerator: '1', denominator: '3' });
assert.deepEqual(splitFractionDisplayValue('3/5', 'fraction'), { whole: '', numerator: '3', denominator: '5' });

console.log('Elementary math answer tests passed.');
