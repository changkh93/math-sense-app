const DIRECT_MEMO_IMMEDIATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DIRECT_MEMO_DAILY_LIMIT = 30;
const DIRECT_MEMO_MAX_QUEUE_MS = 7 * 24 * 60 * 60 * 1000;
const DIRECT_MEMO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function computeDirectMemoDeliveryPlan({ nowMillis, lastImmediateMillis = 0, lastQueuedMillis = 0 }) {
  const canDeliverImmediately = !lastImmediateMillis || (
    nowMillis - lastImmediateMillis >= DIRECT_MEMO_IMMEDIATE_WINDOW_MS &&
    lastQueuedMillis <= nowMillis
  );
  const deliverAtMillis = canDeliverImmediately
    ? nowMillis
    : (lastQueuedMillis > nowMillis
      ? lastQueuedMillis + DIRECT_MEMO_IMMEDIATE_WINDOW_MS
      : Math.max(nowMillis, lastImmediateMillis + DIRECT_MEMO_IMMEDIATE_WINDOW_MS));

  return {
    status: canDeliverImmediately ? 'delivered' : 'scheduled',
    deliverAtMillis,
    canDeliverImmediately,
  };
}

module.exports = {
  DIRECT_MEMO_DAILY_LIMIT,
  DIRECT_MEMO_MAX_QUEUE_MS,
  DIRECT_MEMO_RETENTION_MS,
  computeDirectMemoDeliveryPlan,
};
