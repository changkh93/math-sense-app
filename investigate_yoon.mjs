import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  // 1. Find 윤태민
  const usersSnap = await db.collection('users').where('name', '==', '윤태민').get();
  if (usersSnap.empty) {
    console.log("User '윤태민' not found by name, searching all users...");
    const allSnap = await db.collection('users').get();
    allSnap.forEach(doc => {
      if (doc.data().name && doc.data().name.includes('태민')) {
        console.log("FOUND:", doc.id, JSON.stringify(doc.data(), null, 2));
      }
    });
    process.exit(0);
    return;
  }
  
  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log("=== USER DOCUMENT ===");
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
    console.log("ConsecutiveGood:", data.consecutiveGood);
    console.log("DailyQuizCount:", data.dailyQuizCount);
    console.log("LastQuizDate:", data.lastQuizDate);
    console.log("RegionAccess:", JSON.stringify(data.regionAccess));
    console.log("ClusterAccess:", JSON.stringify(data.clusterAccess));
    console.log("LastActive:", data.lastActive);
    console.log("AdjustmentReason:", data.adjustmentReason);
    console.log("ShieldCharges:", data.shieldCharges);
    console.log("DailyGrowth:", data.dailyGrowth);
    console.log("WeeklyGrowth:", data.weeklyGrowth);
    console.log("DailyGrowthDate:", data.dailyGrowthDate);
    console.log("WeeklyGrowthMonday:", data.weeklyGrowthMonday);
    console.log("\nFULL DATA:", JSON.stringify(data, null, 2));
  });
  
  process.exit(0);
}
run();
