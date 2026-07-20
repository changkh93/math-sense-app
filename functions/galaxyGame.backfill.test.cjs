const assert = require('node:assert/strict');
const {
  calculateLifetimeLearningOre,
  isEligibleLearningOreTransaction,
} = require('./galaxyGame').__test;

function createHarness({ user = {}, transactions = [], markerIds = [], beforeTransaction = null } = {}) {
  const state = {
    user: { ...user },
    userExists: true,
    markers: new Map(markerIds.map((id) => [id, { transactionId: id }])),
    userWrites: 0,
    markerWrites: 0,
  };
  let beforeTransactionUsed = false;

  const userRef = {
    kind: 'user',
    collection(name) {
      if (name === 'galaxyLearningOreEvents') {
        return {
          doc(id) {
            return { kind: 'marker', id };
          },
        };
      }
      if (name !== 'crystal_transactions') throw new Error(`Unexpected collection: ${name}`);
      let cursor = '';
      let queryLimit = 200;
      const query = {
        orderBy() { return query; },
        limit(value) { queryLimit = value; return query; },
        startAfter(value) { cursor = value; return query; },
        async get() {
          const docs = transactions
            .filter((row) => row.id > cursor)
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, queryLimit)
            .map((row) => ({ id: row.id, data: () => ({ ...row.data }) }));
          if (!beforeTransactionUsed && beforeTransaction) {
            beforeTransactionUsed = true;
            beforeTransaction(state);
          }
          return { docs, size: docs.length, empty: docs.length === 0 };
        },
      };
      return query;
    },
  };

  const snapshotFor = (ref) => {
    if (ref.kind === 'user') {
      return {
        exists: state.userExists,
        data: () => (state.userExists ? { ...state.user } : undefined),
      };
    }
    if (ref.kind === 'marker') {
      return {
        exists: state.markers.has(ref.id),
        data: () => state.markers.get(ref.id),
      };
    }
    throw new Error(`Unexpected ref kind: ${ref.kind}`);
  };

  const db = {
    async runTransaction(callback) {
      const transaction = {
        async get(ref) { return snapshotFor(ref); },
        set(ref, data) {
          if (ref.kind === 'user') {
            if (!state.userExists) throw new Error('Test detected a deleted user resurrection write.');
            state.user = { ...state.user, ...data };
            state.userWrites += 1;
            return;
          }
          if (ref.kind === 'marker') {
            state.markers.set(ref.id, { ...data });
            state.markerWrites += 1;
            return;
          }
          throw new Error(`Unexpected set ref kind: ${ref.kind}`);
        },
      };
      return callback(transaction);
    },
  };
  const admin = {
    firestore: {
      FieldPath: { documentId: () => '__name__' },
      FieldValue: { serverTimestamp: () => 'server-timestamp' },
    },
  };

  return { admin, db, state, userRef };
}

function makeTransactions(count, amount = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: `tx_${String(index).padStart(4, '0')}`,
    data: { amount, type: 'lesson_reward' },
  }));
}

async function testExactPageMultipleNeedsEmptyPage() {
  const harness = createHarness({ transactions: makeTransactions(200) });
  const first = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    harness.state.user,
  );
  assert.equal(first.complete, false);
  assert.equal(first.scanned, 200);
  assert.equal(first.creditedEvents, 200);
  assert.equal(first.total, 200);
  assert.equal(harness.state.markers.size, 200);

  const second = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    harness.state.user,
  );
  assert.equal(second.complete, true);
  assert.equal(second.scanned, 0);
  assert.equal(second.total, 200);
  assert.equal(harness.state.user.galaxyLearningLedgerComplete, true);
}

async function testStaleCursorCannotRegressState() {
  const transactions = makeTransactions(200);
  const harness = createHarness({
    transactions,
    beforeTransaction(state) {
      state.user = {
        galaxyLearningBackfillCursor: transactions[99].id,
        galaxyLearningOreV2Total: 100,
        galaxyLearningLedgerVersion: 2,
        galaxyLearningLedgerComplete: false,
      };
    },
  });
  const result = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    {},
  );
  assert.equal(result.stale, true);
  assert.equal(result.total, 100);
  assert.equal(harness.state.user.galaxyLearningBackfillCursor, transactions[99].id);
  assert.equal(harness.state.markerWrites, 0);
  assert.equal(harness.state.userWrites, 0);
}

async function testDeletedUserIsNeverRecreated() {
  const harness = createHarness({
    transactions: makeTransactions(1, 5),
    beforeTransaction(state) {
      state.userExists = false;
      state.user = {};
    },
  });
  const result = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    {},
  );
  assert.equal(result.missing, true);
  assert.equal(harness.state.userExists, false);
  assert.equal(harness.state.userWrites, 0);
  assert.equal(harness.state.markerWrites, 0);
}

async function testFreshCompletionCannotRegress() {
  const transactions = makeTransactions(200);
  const harness = createHarness({
    transactions,
    beforeTransaction(state) {
      state.user = {
        galaxyLearningBackfillCursor: transactions[199].id,
        galaxyLearningOreV2Total: 200,
        galaxyLearningLedgerVersion: 2,
        galaxyLearningLedgerComplete: true,
      };
    },
  });
  const result = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    {},
  );
  assert.equal(result.complete, true);
  assert.equal(result.total, 200);
  assert.equal(harness.state.user.galaxyLearningLedgerComplete, true);
  assert.equal(harness.state.userWrites, 0);
  assert.equal(harness.state.markerWrites, 0);
}

async function testEmptyLedgerDoesNotRecreateDeletedUser() {
  const harness = createHarness({
    transactions: [],
    beforeTransaction(state) {
      state.userExists = false;
      state.user = {};
    },
  });
  const result = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    {},
  );
  assert.equal(result.missing, true);
  assert.equal(harness.state.userExists, false);
  assert.equal(harness.state.userWrites, 0);
}

async function testLongTransactionIdStaysCanonical() {
  const longId = `transaction_${'x'.repeat(220)}`;
  const harness = createHarness({
    transactions: [{ id: longId, data: { amount: 7, type: 'quiz_reward' } }],
  });
  const result = await calculateLifetimeLearningOre(
    harness.db,
    harness.admin,
    harness.userRef,
    {},
  );
  assert.equal(result.complete, true);
  assert.equal(result.total, 7);
  assert.equal(harness.state.user.galaxyLearningBackfillCursor, longId);
  assert.equal(harness.state.markers.has(longId), true);
}

function testLearningOreAmountValidation() {
  assert.equal(isEligibleLearningOreTransaction({ amount: 25, type: 'quiz_reward' }), true);
  assert.equal(isEligibleLearningOreTransaction({ amount: Number.POSITIVE_INFINITY, type: 'quiz_reward' }), false);
  assert.equal(isEligibleLearningOreTransaction({ amount: Number.MAX_SAFE_INTEGER, type: 'quiz_reward' }), false);
  assert.equal(isEligibleLearningOreTransaction({ amount: 10001, type: 'quiz_reward' }), false);
  assert.equal(isEligibleLearningOreTransaction({ amount: 1.5, type: 'quiz_reward' }), false);
  assert.equal(isEligibleLearningOreTransaction({ amount: 25, type: 'crystal_gift_received' }), false);
}

async function run() {
  await testExactPageMultipleNeedsEmptyPage();
  await testStaleCursorCannotRegressState();
  await testDeletedUserIsNeverRecreated();
  await testFreshCompletionCannotRegress();
  await testEmptyLedgerDoesNotRecreateDeletedUser();
  await testLongTransactionIdStaysCanonical();
  testLearningOreAmountValidation();
  console.log('Galaxy learning ledger backfill tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
