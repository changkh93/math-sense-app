import admin from 'firebase-admin';
import { readFileSync } from 'fs';
if (!process.argv.includes('--dangerously-apply-manual-restore')) {
  throw new Error('Disabled one-off production restore script. Use audited repair scripts instead.');
}
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const UID = 'QcTWXBe0lDct3Wz5sElZpq82s083';

async function restoreYoon() {
  console.log("=== RESTORING YOON TAEMIN ===");
  try {
    // 1. Calculate History Stats exactly
    const histSnap = await db.collection('users').doc(UID).collection('history').get();
    let totalQuizzes = 0, totalScore = 0, perfectCount = 0;
    histSnap.forEach(d => {
      const data = d.data();
      totalQuizzes++;
      totalScore += (data.score || 0);
      if (data.score === 100) perfectCount++;
    });
    const avgScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
    
    // 2. We sum up what he originally had approximately. 
    // He said "3000대" (3000s). We know txSum is ~1995. The difference is ~1500 crystals from unlogged history.
    // Let's set his crystals to a generous 3500 to restore his rank + compensate.
    const restoredCrystals = 3500;
    const restoredStreak = 11; // We found 'currentStreak: 11' in previous investigation.

    const updateData = {
      crystals: restoredCrystals,
      totalQuizzes: totalQuizzes,
      totalScore: totalScore,
      averageScore: Math.round(avgScore * 10) / 10,
      perfectCount: perfectCount,
      currentStreak: restoredStreak,
      longestStreak: restoredStreak, 
      spaceshipLevel: 1, // Will naturally grow as he plays, or we can set it correctly
      adjustmentReason: "Restored from unintended document deletion (April 2)",
      lastAdjustedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(UID).set(updateData, { merge: true });
    
    console.log("Successfully restored user data:");
    console.log(JSON.stringify(updateData, null, 2));

  } catch (err) {
    console.error("Failed to restore:", err);
  }
}

restoreYoon().then(() => process.exit(0));
