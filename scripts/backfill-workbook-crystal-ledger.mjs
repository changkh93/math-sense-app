import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const apply = process.argv.includes('--apply');
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const users = await db.collection('users').select().get();
const missingLedger = [];
const historyLinks = [];
const conflicts = [];

for (const userDoc of users.docs) {
  const historySnap = await userDoc.ref.collection('history').where('type', '==', 'workbook').get();
  for (const historyDoc of historySnap.docs) {
    const row = historyDoc.data();
    const amount = Number(row.crystalsEarned || 0);
    if (amount <= 0) continue;

    const unitId = String(row.unitId || 'unknown');
    const score = Number(row.score || 0);
    const transactionId = `workbook_${unitId}_s${score}`;
    const transactionRef = userDoc.ref.collection('crystal_transactions').doc(transactionId);
    const transactionSnap = await transactionRef.get();

    if (transactionSnap.exists && Number(transactionSnap.data().amount || 0) !== amount) {
      conflicts.push({ uid: userDoc.id, historyId: historyDoc.id, transactionId, historyAmount: amount, ledgerAmount: Number(transactionSnap.data().amount || 0) });
      continue;
    }
    if (!transactionSnap.exists) {
      missingLedger.push({ uid: userDoc.id, historyId: historyDoc.id, transactionId, amount, unitId, score });
    }
    if (row.crystalTransactionId !== transactionId) {
      historyLinks.push({ uid: userDoc.id, historyId: historyDoc.id, transactionId });
    }
  }
}

if (conflicts.length > 0) {
  console.error(JSON.stringify({ ok: false, reason: 'amount_conflict', conflicts }, null, 2));
  await db.terminate();
  process.exit(1);
}

if (apply) {
  const batch = db.batch();
  for (const item of missingLedger) {
    const historyRef = db.doc(`users/${item.uid}/history/${item.historyId}`);
    const historySnap = await historyRef.get();
    const history = historySnap.data() || {};
    batch.create(db.doc(`users/${item.uid}/crystal_transactions/${item.transactionId}`), {
      amount: item.amount,
      type: 'workbook_reward',
      description: `${history.unitTitle || item.unitId} (${item.score}점)`,
      metadata: {
        unitId: item.unitId,
        unitTitle: history.unitTitle || '',
        activityType: 'workbook',
        source: 'workbook_history_ledger_backfill',
        score: item.score,
        correctCount: Number(history.correctCount || 0),
        totalCount: Number(history.totalCount || 0),
        attemptCount: Number(history.attemptCount || 1),
        backfilled: true,
        historyId: item.historyId,
      },
      timestamp: history.timestamp || admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  for (const item of historyLinks) {
    batch.update(db.doc(`users/${item.uid}/history/${item.historyId}`), {
      crystalTransactionId: item.transactionId,
    });
  }
  await batch.commit();
}

console.log(JSON.stringify({
  ok: true,
  mode: apply ? 'apply' : 'dry-run',
  scannedUsers: users.size,
  missingLedgerCount: missingLedger.length,
  historyLinkCount: historyLinks.length,
  missingLedger,
}, null, 2));

await db.terminate();
