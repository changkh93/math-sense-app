import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
const shouldWrite = process.argv.includes('--write');

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function countAttentionHistory(userRef) {
  const historySnap = await userRef.collection('history').get();
  const seen = new Set();
  let hits = 0;
  let misses = 0;

  historySnap.forEach((doc) => {
    if (seen.has(doc.id)) return;
    seen.add(doc.id);

    const data = doc.data();
    if (!data.attentionSource) return;
    if (data.attentionResult === 'hit') hits += 1;
    if (data.attentionResult === 'miss') misses += 1;
  });

  return { hits, misses, opportunities: hits + misses };
}

async function backfillFocusCounters() {
  const usersSnap = await db.collection('users').get();
  const updates = [];

  for (const userDoc of usersSnap.docs) {
    const counts = await countAttentionHistory(userDoc.ref);
    if (counts.opportunities === 0) continue;

    const payload = {
      attentionHits: counts.hits,
      attentionMisses: counts.misses,
      attentionOpportunities: counts.opportunities,
      videoAttentionHits: counts.hits,
      videoAttentionMisses: counts.misses,
      videoAttentionOpportunities: counts.opportunities,
      focusCountersBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    updates.push({ id: userDoc.id, ...counts });
    if (shouldWrite) {
      await userDoc.ref.set(payload, { merge: true });
    }
  }

  console.log(`${shouldWrite ? 'Updated' : 'Dry run'} ${updates.length} users with attention history.`);
  updates
    .sort((a, b) => b.opportunities - a.opportunities)
    .slice(0, 20)
    .forEach((item) => {
      console.log(`${item.id}: ${item.hits}/${item.opportunities}`);
    });
}

backfillFocusCounters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
