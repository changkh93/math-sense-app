import assert from 'node:assert/strict';
import {
  MONTHLY_EVALUATION_UNIT_CONFIG,
  buildDiscoveredMonthlyUnitConfig,
  getConfiguredUnitIdsForMonth,
  getEvaluationUnitEntriesForMonth,
  getEvaluationUnitIdForGrade,
  normalizeGradeValue,
  parseMonthlyEvaluationUnit,
} from '../src/utils/monthlyEvaluationAwards.js';

console.log('--- Testing monthlyEvaluationAwards.js ---');

// 1. Check normalizeGradeValue
assert.equal(normalizeGradeValue('초3'), 'elementary3');
assert.equal(normalizeGradeValue('초등학교 3학년'), 'elementary3');
assert.equal(normalizeGradeValue('중1'), 'middle1');
assert.equal(normalizeGradeValue('중학교 1학년'), 'middle1');

// 2. Check static 2026-8 configuration
const config2026_8 = MONTHLY_EVALUATION_UNIT_CONFIG['2026-8'];
assert.ok(config2026_8, '2026-8 static config should exist');
assert.equal(config2026_8.elementary3, 'reg_1774390167801_chap_1774390176943_unit_1787551996415');
assert.equal(config2026_8.middle1, 'reg_1774698354292_chap_1774698491426_unit_1787555107499');

// 3. Test parseMonthlyEvaluationUnit for elementary
const parsedElem = parseMonthlyEvaluationUnit(
  { id: 'unit_123', docId: 'reg_elem_chap_unit_123', title: '9월 평가' },
  { id: 'chap_elem_3', regionId: 'reg_1774390167801', title: '3학년' },
  { id: 'reg_1774390167801', title: '초등수학 월간평가', clusterId: 'cluster_elementary' }
);
assert.ok(parsedElem, 'Should parse elementary unit');
assert.equal(parsedElem.grade, 'elementary3');
assert.equal(parsedElem.month, 9);
assert.equal(parsedElem.year, 2026);
assert.equal(parsedElem.unitId, 'reg_elem_chap_unit_123');
assert.equal(parsedElem.courseClusterId, 'cluster_elementary');

// 4. Test parseMonthlyEvaluationUnit for middle
const parsedMiddle = parseMonthlyEvaluationUnit(
  { id: 'unit_mid_456', docId: 'reg_mid_chap_unit_456', title: '중2-9월평가' },
  { id: 'chap_mid_monthly', regionId: 'reg_1774698354292', title: '월간평가' },
  { id: 'reg_1774698354292', title: '단원평가&모의고사', clusterId: 'middle-math' }
);
assert.ok(parsedMiddle, 'Should parse middle unit');
assert.equal(parsedMiddle.grade, 'middle2');
assert.equal(parsedMiddle.month, 9);
assert.equal(parsedMiddle.year, 2026);
assert.equal(parsedMiddle.unitId, 'reg_mid_chap_unit_456');
assert.equal(parsedMiddle.courseClusterId, 'middle-math');

// 5. Test buildDiscoveredMonthlyUnitConfig
const mockUnits = [
  { id: 'unit_e3_9', docId: 'reg_elem_chap_unit_e3_9', chapterId: 'chap_3', title: '9월 평가' },
  { id: 'unit_m1_9', docId: 'reg_mid_chap_unit_m1_9', chapterId: 'chap_mid', title: '중1-9월평가' },
];
const mockChapters = {
  chap_3: { id: 'chap_3', regionId: 'reg_1774390167801', title: '3학년' },
  chap_mid: { id: 'chap_mid', regionId: 'reg_1774698354292', title: '월간평가' },
};
const mockRegions = {
  reg_1774390167801: { id: 'reg_1774390167801', title: '초등수학 월간평가', clusterId: 'cluster_elementary' },
  reg_1774698354292: { id: 'reg_1774698354292', title: '단원평가&모의고사', clusterId: 'middle-math' },
};

const dynamicConfig = buildDiscoveredMonthlyUnitConfig(mockUnits, mockChapters, mockRegions);
assert.ok(dynamicConfig['2026-9'], 'Should have discovered 2026-9');
assert.equal(dynamicConfig['2026-9'].elementary3, 'reg_elem_chap_unit_e3_9');
assert.equal(dynamicConfig['2026-9'].middle1, 'reg_mid_chap_unit_m1_9');

// 6. Test dynamic getters with override
const unitIds9 = getConfiguredUnitIdsForMonth(2026, 9, dynamicConfig);
assert.deepEqual(unitIds9, ['reg_elem_chap_unit_e3_9', 'reg_mid_chap_unit_m1_9']);

const unitIdGrade = getEvaluationUnitIdForGrade(2026, 9, 'elementary3', dynamicConfig);
assert.equal(unitIdGrade, 'reg_elem_chap_unit_e3_9');

const entries9 = getEvaluationUnitEntriesForMonth(2026, 9, dynamicConfig);
assert.equal(entries9.length, 2);
assert.equal(entries9[0].grade, 'elementary3');
assert.equal(entries9[0].courseClusterId, 'cluster_elementary');
assert.equal(entries9[1].grade, 'middle1');
assert.equal(entries9[1].courseClusterId, 'middle-math');

console.log('All tests passed successfully!');
