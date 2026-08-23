import assert from 'assert';
import {
  BOOK_STATUSES,
  validateBookForm,
  validatePageInput,
  normalizeString,
  getErrorMessage
} from '../src/utils/readingDomain.js';
import {
  getKSTDateString,
  getKSTTimeString,
  buildKSTDateTimeIso,
  parseKSTDateTime,
  verifyDateMatchesKST,
  formatKSTFullDateTime
} from '../src/utils/readingTime.js';
import { filterWesternClassicRegions } from '../src/constants/westernClassicNavigation.js';

console.log('=== Running client reading domain & time tests ===');

const validForm = validateBookForm({ title: '어린 왕자', author: '생텍쥐페리' });
assert.strictEqual(validForm.valid, true);

const wantToReadForm = validateBookForm({ title: '80일간의 세계 일주', author: '쥘 베른', status: BOOK_STATUSES.WANT_TO_READ });
assert.strictEqual(wantToReadForm.valid, true);
assert.strictEqual(wantToReadForm.status, 'want_to_read');

const invalidTitle = validateBookForm({ title: '', author: '저자' });
assert.strictEqual(invalidTitle.valid, false);
assert.strictEqual(validateBookForm({ title: '가'.repeat(201), author: '저자' }).valid, false);
assert.strictEqual(validateBookForm({ title: '책', author: '저자', status: 'unknown' }).valid, false);

const pageOk = validatePageInput(42);
assert.strictEqual(pageOk.valid, true);
assert.strictEqual(pageOk.page, 42);

const pageZero = validatePageInput(0);
assert.strictEqual(pageZero.valid, false);

// 2. Error message mapping
assert.strictEqual(getErrorMessage('BOOK_NOT_FOUND'), '선택한 책을 찾을 수 없거나 보관 처리되었습니다.');
assert.strictEqual(getErrorMessage('UNKNOWN_CODE', '기본 에러'), '기본 에러');

// 3. Timezone conversion and boundary checks
const iso = buildKSTDateTimeIso('2026-08-16', '20:15');
assert.strictEqual(iso, '2026-08-16T20:15:00+09:00');
assert.strictEqual(buildKSTDateTimeIso('2026-02-30', '20:15'), null);
assert.strictEqual(buildKSTDateTimeIso('2026-08-16', '24:00'), null);

const parsedDate = parseKSTDateTime('2026-08-16', '20:15');
assert(parsedDate instanceof Date);
assert.strictEqual(verifyDateMatchesKST(parsedDate, '2026-08-16'), true);

// Boundary: KST 23:59 vs 00:01 next day
const lateNight = parseKSTDateTime('2026-08-16', '23:59');
const nextMorning = parseKSTDateTime('2026-08-17', '00:01');
assert.strictEqual(verifyDateMatchesKST(lateNight, '2026-08-16'), true);
assert.strictEqual(verifyDateMatchesKST(nextMorning, '2026-08-17'), true);
assert.strictEqual(verifyDateMatchesKST(lateNight, '2026-08-17'), false);

const filteredRegions = filterWesternClassicRegions([
  { id: 'extra', title: '삭제 대상' },
  { id: 'fake', title: '네버랜드 클래식 복사본' },
  { id: 'reg_1776240768916', title: '노벨문학상 수상작' },
  { id: 'reg_1776154036888', title: '네버랜드 클래식' },
  { id: 'reg_1776158746744', title: '서양고전읽기' },
], 'western-classic');
assert.deepStrictEqual(filteredRegions.map((region) => region.id), [
  'reg_1776154036888',
  'reg_1776158746744',
  'reg_1776240768916',
]);

console.log('All client reading domain & time tests passed successfully!');
