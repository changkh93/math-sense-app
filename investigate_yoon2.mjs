import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  // Search all users for 태민
  const allSnap = await db.collection('users').get();
  let found = false;
  allSnap.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.includes('태민')) {
      found = true;
      console.log("=== FOUND USER ===");
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
      console.log("DailyGrowth:", data.dailyGrowth);
      console.log("WeeklyGrowth:", data.weeklyGrowth);
      console.log("DailyGrowthDate:", data.dailyGrowthDate);
      console.log("WeeklyGrowthMonday:", data.weeklyGrowthMonday);
      console.log("ShieldCharges:", data.shieldCharges);
      console.log("RegionAccess:", JSON.stringify(data.regionAccess));
      console.log("LastActive:", data.lastActive);
    }
  });
  if (!found) console.log("No user with '태민' in name found");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
