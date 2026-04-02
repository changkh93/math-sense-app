import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const EMAIL = 'fishgot11@gmail.com';

(async () => {
  try {
    // 1. Find user by email
    console.log("=== SEARCHING BY EMAIL:", EMAIL, "===");
    const snap = await db.collection('users').where('email', '==', EMAIL).get();
    
    if (snap.empty) {
      console.log("NOT FOUND by email query. Doing full scan...");
      const allSnap = await db.collection('users').get();
      allSnap.forEach(doc => {
        if (doc.data().email === EMAIL) {
          console.log("Found via full scan:", doc.id);
        }
      });
    }
    
    for (const userDoc of snap.docs) {
      const data = userDoc.data();
      const UID = userDoc.id;
      console.log("\n=== USER DOCUMENT ===");
      console.log("UID:", UID);
      console.log("Name:", data.name);
      console.log("Email:", data.email);
      console.log("Crystals:", data.crystals);
      console.log("TotalQuizzes:", data.totalQuizzes);
      console.log("TotalScore:", data.totalScore);
      console.log("AverageScore:", data.averageScore);
      console.log("PerfectCount:", data.perfectCount);
      console.log("CurrentStreak:", data.currentStreak);
      console.log("LongestStreak:", data.longestStreak);
      console.log("LastStreakDate:", data.lastStreakDate);
      console.log("StreakFreezeCount:", data.streakFreezeCount);
      console.log("ShieldCharges:", data.shieldCharges);
      console.log("ConsecutiveGood:", data.consecutiveGood);
      console.log("DailyGrowth:", data.dailyGrowth);
      console.log("WeeklyGrowth:", data.weeklyGrowth);
      console.log("DailyGrowthDate:", data.dailyGrowthDate);
      console.log("WeeklyGrowthMonday:", data.weeklyGrowthMonday);
      console.log("RegionAccess:", JSON.stringify(data.regionAccess));
      console.log("LastActive:", data.lastActive);
      console.log("AdjustmentReason:", data.adjustmentReason);
      
      // 2. Crystal ledger
      console.log("\n=== CRYSTAL LEDGER (last 30) ===");
      const ledgerSnap = await db.collection('users').doc(UID).collection('crystal_ledger')
        .orderBy('createdAt', 'desc').limit(30).get();
      console.log("Ledger count:", ledgerSnap.size);
      ledgerSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  [${doc.id}] amount=${d.amount} type=${d.type} desc="${d.description}" time=${d.createdAt?.toDate?.()}`);
      });

      // 3. Crystal transactions (alternate collection name)
      const txSnap = await db.collection('users').doc(UID).collection('crystal_transactions')
        .orderBy('createdAt', 'desc').limit(30).get();
      console.log("\n=== CRYSTAL TRANSACTIONS ===");
      console.log("TX count:", txSnap.size);
      txSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  [${doc.id}] amount=${d.amount} type=${d.type} desc="${d.description}"`);
      });

      // 4. History
      console.log("\n=== HISTORY (last 30) ===");
      const histSnap = await db.collection('users').doc(UID).collection('history')
        .orderBy('timestamp', 'desc').limit(30).get();
      console.log("History count:", histSnap.size);
      histSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  [${doc.id}] score=${d.score} crystals=${d.crystalsEarned} unit="${d.unitTitle}" type=${d.type} time=${d.timestamp?.toDate?.()}`);
      });

      // 5. Learning progress
      console.log("\n=== LEARNING PROGRESS ===");
      const progSnap = await db.collection('users').doc(UID).collection('learning_progress').get();
      console.log("Progress count:", progSnap.size);
      progSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  [${doc.id}] bestScore=${d.bestScore} initial=${d.initialScore} attempts=${d.attemptCount}`);
      });

      // 6. Full user document
      console.log("\n=== FULL USER DOC ===");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("ERROR:", e.message, e.stack);
  }
  process.exit(0);
})();
