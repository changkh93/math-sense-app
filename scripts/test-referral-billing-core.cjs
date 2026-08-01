const assert = require('assert');
const core = require('../functions/referralBilling').__test;

assert.equal(core.referralRate(0), 0);
assert.equal(core.referralRate(1), 0.2);
assert.equal(core.referralRate(2), 0.5);
assert.equal(core.referralRate(3), 1);
assert.equal(core.referralRate(9), 1);

assert.equal(
  core.scheduledFee({ baseMonthlyFee: 150000, feeSchedule: { '2026-08': 250000 } }, '2026-07'),
  150000,
);
assert.equal(
  core.scheduledFee({ baseMonthlyFee: 150000, feeSchedule: { '2026-08': 250000 } }, '2026-09'),
  250000,
);

assert.equal(core.enrollmentActiveForMonth({
  status: 'active_paid',
  activeFrom: '2026-07-12',
  activeThrough: '2026-08-31',
}, '2026-08'), true);
assert.equal(core.enrollmentActiveForMonth({
  status: 'active_paid',
  activeFrom: '2026-09-01',
}, '2026-08'), false);
assert.equal(core.enrollmentActiveForMonth({ status: 'ended' }, '2026-08'), false);

assert.deepEqual(core.monthBounds('2028-02'), {
  start: '2028-02-01',
  end: '2028-02-29',
});
assert.equal(core.addMonths('2026-12', 1), '2027-01');
assert.equal(core.normalizePhone('010-1234-5678'), '01012345678');
assert.equal(core.addDaysToIsoDate('2026-08-02', 27), '2026-08-29');
assert.equal(core.addDaysToIsoDate('2028-02-10', 27), '2028-03-08');

const referrals = [
  { id: 'r1', referredParentUid: 'family-a' },
  { id: 'r2', referredParentUid: 'family-b' },
];
const referralGroups = core.groupReferralsByFamily(referrals, 'referrer');
const enrollmentByFamily = new Map([
  ['family-a', [{ status: 'active_paid', activeFrom: '2026-08-01' }]],
  ['family-b', [{ status: 'active_paid', activeFrom: '2026-09-01' }]],
]);
const augustSnapshot = core.billingSnapshotFromData(
  { baseMonthlyFee: 100000 },
  referrals,
  referralGroups,
  enrollmentByFamily,
  '2026-08',
);
const septemberSnapshot = core.billingSnapshotFromData(
  { baseMonthlyFee: 100000 },
  referrals,
  referralGroups,
  enrollmentByFamily,
  '2026-09',
);
assert.equal(augustSnapshot.activeReferralCount, 1);
assert.equal(augustSnapshot.finalFee, 80000);
assert.equal(septemberSnapshot.activeReferralCount, 2);
assert.equal(septemberSnapshot.finalFee, 50000);

const notice = core.buildTuitionNoticeText({
  parentName: '김학부모',
  monthKey: '2026-08',
  start: '2026-08-01',
  end: '2026-08-31',
  baseFee: 250000,
  discountRate: 0.5,
  finalFee: 125000,
  referralUrl: 'https://math-sense-1f6a8.web.app/trial?ref=test-token',
});
assert.match(notice, /125,000원/);
assert.match(notice, /추천 50% 할인/);
assert.match(notice, /KEB하나은행 784-910004-58404 \(장기홍\)/);
assert.match(notice, /\/trial\?ref=test-token/);
const normalizedNotice = core.normalizeLmsText(notice);
assert.equal(normalizedNotice, normalizedNotice.normalize('NFC'));
assert.match(normalizedNotice, /\uB0A9\uBD80 \uC608\uC815 \uAE08\uC561: 125,000\uC6D0/);
assert.match(normalizedNotice, /\uC218\uAC15 \uAE30\uAC04:/);
assert.match(normalizedNotice, /\uC720\uB8CC \uC218\uAC15 \uC911\uC774\uBA74/);
assert.match(normalizedNotice, /\uCD94\uCC9C \uB9C1\uD06C/);
assert.doesNotMatch(normalizedNotice, /[\u1100-\u11ff]/);

console.log('Referral billing core tests passed.');
