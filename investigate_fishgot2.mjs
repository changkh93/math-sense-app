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
    const userDoc = await db.collection('users').doc(UID).get();
    const data = userDoc.data();
    
    console.log("=== KEY METRICS ===");
    console.log("Crystals:", data.crystals);
    console.log("TotalQuizzes:", data.totalQuizzes);
    console.log("TotalScore:", data.totalScore);
    console.log("createdAt:", data.createdAt);
    console.log("PerfectCount:", data.perfectCount);
    console.log("CurrentStreak:", data.currentStreak);

    // ALL Crystal ledger
    console.log("\n=== ALL CRYSTAL LEDGER ===");
    const ledgerSnap = await db.collection('users').doc(UID).collection('crystal_ledger').get();
    console.log("Total ledger docs:", ledgerSnap.size);
    let totalFromLedger = 0;
    let purchaseTotal = 0;
    const entries = [];
    ledgerSnap.forEach(doc => {
      const d = doc.data();
      totalFromLedger += (d.amount || 0);
      if (d.amount < 0) purchaseTotal += d.amount;
      entries.push({ id: doc.id, ...d });
    });
    // Sort by time
    entries.sort((a, b) => {
      const ta = a.createdAt?._seconds || 0;
      const tb = b.createdAt?._seconds || 0;
      return tb - ta;
    });
    // Show last 15
    console.log("--- Last 15 entries ---");
    entries.slice(0, 15).forEach(d => {
      console.log(`  amt=${d.amount} type=${d.type} desc="${d.description}" time=${d.createdAt?.toDate?.()}`);
    });
    console.log("SUM from ledger:", totalFromLedger);
    console.log("Total spent (purchases):", purchaseTotal);

    // History count & sum
    console.log("\n=== HISTORY SUMMARY ===");
    const histSnap = await db.collection('users').doc(UID).collection('history').get();
    console.log("Total history docs:", histSnap.size);
    let histCrystals = 0;
    let totalScore = 0;
    let quizCount = 0;
    histSnap.forEach(doc => {
      const d = doc.data();
      histCrystals += (d.crystalsEarned || 0);
      totalScore += (d.score || 0);
      if (!d.type || d.type === 'quiz') quizCount++;
    });
    console.log("Quiz-type history count:", quizCount);
    console.log("Crystals from history:", histCrystals);
    console.log("Total score from history:", totalScore);
    console.log("EXPECTED totalQuizzes:", histSnap.size, " ACTUAL:", data.totalQuizzes);
    console.log("EXPECTED totalScore:", totalScore, " ACTUAL:", data.totalScore);
    console.log("EXPECTED crystals from ledger:", totalFromLedger, " ACTUAL:", data.crystals);

    // crystal_transactions
    const txSnap = await db.collection('users').doc(UID).collection('crystal_transactions').get();
    console.log("\nCrystal_transactions docs:", txSnap.size);

  } catch (e) {
    console.error("ERROR:", e.message, e.stack);
  }
  process.exit(0);
})();
