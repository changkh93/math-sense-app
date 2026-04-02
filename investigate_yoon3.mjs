import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

(async () => {
  try {
    console.log("Starting search...");
    const allSnap = await db.collection('users').get();
    console.log("Total users:", allSnap.size);
    
    let found = false;
    for (const doc of allSnap.docs) {
      const data = doc.data();
      if (data.name && data.name.includes('태민')) {
        found = true;
        console.log("\n=== FOUND USER ===");
        console.log("UID:", doc.id);
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
        console.log("DailyGrowth:", data.dailyGrowth);
        console.log("WeeklyGrowth:", data.weeklyGrowth);
        console.log("RegionAccess:", JSON.stringify(data.regionAccess));
      }
    }
    if (!found) console.log("No user with 태민 found.");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
})();
