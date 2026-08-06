import assert from 'node:assert/strict';
import {
  getMathKeypadOperatorKeys,
  MATH_KEYPAD_NUMBER_KEYS,
  resolveWorkbookInputMode,
} from '../src/utils/workbookInputModeUtils.js';

assert.deepEqual(MATH_KEYPAD_NUMBER_KEYS, ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0']);
assert.equal(resolveWorkbookInputMode({ inputMode: 'integer', answer: '4' }), 'integer');
assert.equal(resolveWorkbookInputMode({ inputMode: 'integer', answer: '-4' }), 'integer');
assert.equal(resolveWorkbookInputMode({ inputMode: 'integer', answer: '14÷2=7' }), 'expression');
assert.equal(resolveWorkbookInputMode({ inputMode: 'integer', answer: '4', acceptedAnswers: ['4', '16÷4=4'] }), 'expression');
assert.equal(resolveWorkbookInputMode({ inputMode: 'fraction', answer: '1/2' }), 'fraction');
assert.deepEqual(
  getMathKeypadOperatorKeys('expression').map(key => key.value),
  ['÷', '×', '-', '+', '.', '%', '='],
);
assert.deepEqual(getMathKeypadOperatorKeys('integer').map(key => key.value), ['-']);

console.log('Workbook input mode/keypad tests passed.');
