import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DIRECT_MEMO_DAILY_LIMIT,
  computeDirectMemoDeliveryPlan,
} = require('../functions/directMemoPolicy');

const hour = 60 * 60 * 1000;
const now = Date.UTC(2026, 6, 31, 0, 0, 0);

const first = computeDirectMemoDeliveryPlan({ nowMillis: now });
assert.equal(first.status, 'delivered');
assert.equal(first.deliverAtMillis, now);

const second = computeDirectMemoDeliveryPlan({ nowMillis: now + hour });
assert.equal(second.status, 'delivered');
assert.equal(second.deliverAtMillis, now + hour);

const nearWindow = computeDirectMemoDeliveryPlan({ nowMillis: now + 23 * hour });
assert.equal(nearWindow.status, 'delivered');
assert.equal(nearWindow.deliverAtMillis, now + 23 * hour);

const queued = computeDirectMemoDeliveryPlan({ nowMillis: now + 2 * hour });
assert.equal(queued.status, 'delivered');
assert.equal(queued.deliverAtMillis, now + 2 * hour);

assert.equal(DIRECT_MEMO_DAILY_LIMIT, 30);

console.log('direct memo policy tests passed');
