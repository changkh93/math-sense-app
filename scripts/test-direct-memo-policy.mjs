import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DIRECT_MEMO_MAX_QUEUE_MS,
  computeDirectMemoDeliveryPlan,
} = require('../functions/directMemoPolicy');

const hour = 60 * 60 * 1000;
const now = Date.UTC(2026, 6, 31, 0, 0, 0);

const first = computeDirectMemoDeliveryPlan({ nowMillis: now });
assert.equal(first.status, 'delivered');
assert.equal(first.deliverAtMillis, now);

const second = computeDirectMemoDeliveryPlan({
  nowMillis: now + hour,
  lastImmediateMillis: now,
  lastQueuedMillis: now,
});
assert.equal(second.status, 'scheduled');
assert.equal(second.deliverAtMillis, now + 24 * hour);

const nearWindow = computeDirectMemoDeliveryPlan({
  nowMillis: now + 23 * hour,
  lastImmediateMillis: now,
  lastQueuedMillis: now,
});
assert.equal(nearWindow.deliverAtMillis, now + 24 * hour);

const queued = computeDirectMemoDeliveryPlan({
  nowMillis: now + 2 * hour,
  lastImmediateMillis: now,
  lastQueuedMillis: now + 24 * hour,
});
assert.equal(queued.deliverAtMillis, now + 48 * hour);
assert.ok(queued.deliverAtMillis - (now + 2 * hour) < DIRECT_MEMO_MAX_QUEUE_MS);

const reopened = computeDirectMemoDeliveryPlan({
  nowMillis: now + 25 * hour,
  lastImmediateMillis: now,
  lastQueuedMillis: now,
});
assert.equal(reopened.status, 'delivered');

console.log('direct memo policy tests passed');
