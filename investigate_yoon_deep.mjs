import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const UID = 'rua33MeqORR8bYJTGoxQBassPSM2';

(async () => {
  try {
    // 1. Full user document
    const userDoc = await db.collection('users').doc(UID).get();
    console.log("=== FULL USER DOC ===");
    console.log(JSON.stringify(userDoc.data(), null, 2));

    // 2. Crystal ledger (last 20 transactions)
    console.log("\n=== CRYSTAL LEDGER (last 20) ===");
    const ledgerSnap = await db.collection('users').doc(UID).collection('crystal_ledger')
      .orderBy('createdAt', 'desc').limit(20).get();
    ledgerSnap.forEach(doc => {
      const d = doc.data();
      console.log(`[${doc.id}] amount=${d.amount} type=${d.type} desc=${d.description} time=${d.createdAt?.toDate?.()}`);
    });
    console.log("Ledger total docs:", ledgerSnap.size);

    // 3. History (last 20)
    console.log("\n=== HISTORY (last 20) ===");
    const histSnap = await db.collection('users').doc(UID).collection('history')
      .orderBy('timestamp', 'desc').limit(20).get();
    histSnap.forEach(doc => {
      const d = doc.data();
      console.log(`[${doc.id}] score=${d.score} crystals=${d.crystalsEarned} unit=${d.unitTitle} type=${d.type} time=${d.timestamp?.toDate?.()}`);
    });
    console.log("History total docs:", histSnap.size);

    // 4. learning_progress
    console.log("\n=== LEARNING PROGRESS ===");
    const progSnap = await db.collection('users').doc(UID).collection('learning_progress').get();
    progSnap.forEach(doc => {
      const d = doc.data();
      console.log(`[${doc.id}] bestScore=${d.bestScore} initialScore=${d.initialScore} attempts=${d.attemptCount}`);
    });
    console.log("Progress total docs:", progSnap.size);

    // 5. Check if there's another UID for the same email
    console.log("\n=== CHECKING DUPLICATE ACCOUNTS ===");
    const email = userDoc.data()?.email;
    if (email) {
      const dupSnap = await db.collection('users').where('email', '==', email).get();
      dupSnap.forEach(doc => {
        console.log(`UID=${doc.id} name=${doc.data().name} crystals=${doc.data().crystals}`);
      });
    }

    // 6. Check region student entries
    console.log("\n=== REGION STUDENT ENTRIES ===");
    const regionsSnap = await db.collection('regions').get();
    for (const regDoc of regionsSnap.docs) {
      const studentDoc = await db.collection('regions').doc(regDoc.id).collection('students').doc(UID).get();
      if (studentDoc.exists) {
        console.log(`Region ${regDoc.id} (${regDoc.data().title}): status=${studentDoc.data().status}`);
      }
    }

  } catch (e) {
    console.error("ERROR:", e.message, e.stack);
  }
  process.exit(0);
})();
