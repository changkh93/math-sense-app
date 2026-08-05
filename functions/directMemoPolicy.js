const DIRECT_MEMO_DAILY_LIMIT = 30;
const DIRECT_MEMO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function computeDirectMemoDeliveryPlan({ nowMillis }) {
  return {
    status: 'delivered',
    deliverAtMillis: nowMillis,
  };
}

module.exports = {
  DIRECT_MEMO_DAILY_LIMIT,
  DIRECT_MEMO_RETENTION_MS,
  computeDirectMemoDeliveryPlan,
};
