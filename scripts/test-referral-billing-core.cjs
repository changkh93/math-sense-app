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

console.log('Referral billing core tests passed.');
