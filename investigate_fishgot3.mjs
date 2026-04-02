import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const UID = 'QcTWXBe0lDct3Wz5sElZpq82s083';

(async () => {
  try {
    // 1. Sum all crystal_transactions
    const txSnap = await db.collection('users').doc(UID).collection('crystal_transactions').get();
    let txSum = 0;
    const txByType = {};
    txSnap.forEach(doc => {
      const d = doc.data();
      txSum += (d.amount || 0);
      const t = d.type || 'unknown';
      txByType[t] = (txByType[t] || 0) + (d.amount || 0);
    });
    console.log("=== CRYSTAL_TRANSACTIONS ANALYSIS ===");
    console.log("Total docs:", txSnap.size);
    console.log("Sum of all amounts:", txSum);
    console.log("Breakdown by type:", JSON.stringify(txByType, null, 2));

    // 2. Recalculate totalQuizzes/totalScore from history
    const histSnap = await db.collection('users').doc(UID).collection('history').get();
    let totalQuizzes = 0, totalScore = 0, perfectCount = 0;
    histSnap.forEach(doc => {
      const d = doc.data();
      totalQuizzes++;
      totalScore += (d.score || 0);
      if (d.score === 100) perfectCount++;
    });
    const avgScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;

    console.log("\n=== RECALCULATED STATS ===");
    console.log("totalQuizzes:", totalQuizzes);
    console.log("totalScore:", totalScore);
    console.log("averageScore:", Math.round(avgScore * 10) / 10);
    console.log("perfectCount:", perfectCount);

    // 3. Check recent history entries for today (to see activity AFTER the reset)
    console.log("\n=== RECENT HISTORY (last 10) ===");
    const recentHist = await db.collection('users').doc(UID).collection('history')
      .orderBy('timestamp', 'desc').limit(10).get();
    recentHist.forEach(doc => {
      const d = doc.data();
      console.log(`  score=${d.score} crystals=${d.crystalsEarned} unit="${d.unitTitle}" type=${d.type} time=${d.timestamp?.toDate?.()}`);
    });

    // 4. Look at last 5 crystal_transactions entries
    console.log("\n=== RECENT TRANSACTIONS (last 10) ===");
    const recentTx = await db.collection('users').doc(UID).collection('crystal_transactions')
      .orderBy('createdAt', 'desc').limit(10).get();
    recentTx.forEach(doc => {
      const d = doc.data();
      console.log(`  amt=${d.amount} type=${d.type} desc="${d.description}" time=${d.createdAt?.toDate?.()}`);
    });

    // 5. Current user doc state
    const userDoc = await db.collection('users').doc(UID).get();
    const data = userDoc.data();
    console.log("\n=== CURRENT vs EXPECTED ===");
    console.log("crystals:      CURRENT=" + data.crystals + " EXPECTED(from_tx)=" + txSum);
    console.log("totalQuizzes:  CURRENT=" + data.totalQuizzes + " EXPECTED=" + totalQuizzes);
    console.log("totalScore:    CURRENT=" + data.totalScore + " EXPECTED=" + totalScore);
    console.log("averageScore:  CURRENT=" + data.averageScore + " EXPECTED=" + Math.round(avgScore * 10) / 10);

  } catch (e) {
    console.error("ERROR:", e.message, e.stack);
  }
  process.exit(0);
})();
