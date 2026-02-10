import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8"
};

const app = initializeApp(config);
const db = getFirestore(app);

const targets = [
  { uid: "QcTWXBe0lDct3Wz5sElZpq82s083", name: "윤태민" },
  { uid: "6HJ28QzBZFW71Tl4aQUSLhbMDhD3", name: "박지유" },
  { uid: "MezUmIiYsUOGlIM3YUnqsKXv4dD2", name: "Kuromi" },
  { uid: "aC4X9y9UigTmVDNuYG9OHtQzKz83", name: "Logan Lee" },
  { uid: "7qquQs1BRrXH4RgTACVYqXzAXol1", name: "이채희" },
  { uid: "cPW3EkkiW5Me2pLQDgAbixuRDLa2", name: "정시원" },
  { uid: "TOVOn6cR5VOl9AyqEYjPMwXZacQ2", name: "hyunseo" }
];

async function applyGlobalCorrection() {
  console.log("🚀 Starting Multi-User Data Correction...\n");

  for (const target of targets) {
    console.log(`👤 Processing: ${target.name} (${target.uid})`);
    
    const userRef = doc(db, "users", target.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn(`⚠️ User ${target.name} not found.`);
      continue;
    }
    const userData = userSnap.data();

    const historyRef = collection(db, "users", target.uid, "history");
    const hSnap = await getDocs(query(historyRef, orderBy("timestamp", "asc")));
    const history = hSnap.docs.map(d => ({
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date(0)
    }));

    const stats = {};
    let abusedCrystals = 0;
    let abuseCount = 0;
    let abusedScore = 0;
    let abusedPerfects = 0;
    
    for (const h of history) {
      const unitId = h.unitId;
      const ts = h.timestamp.getTime();
      const crystals = h.crystalsEarned || 0;
      const isPerfect = h.score === 100;

      if (!stats[unitId]) {
        stats[unitId] = { lastTs: ts, bestScore: h.score };
      } else {
        const timeDiff = (ts - stats[unitId].lastTs) / 1000;
        
        // Deduction criteria
        if (timeDiff < 60 || h.score <= stats[unitId].bestScore) {
          if (crystals > 0) {
            abusedCrystals += crystals;
            abuseCount++;
            abusedScore += h.score;
            if (isPerfect) abusedPerfects++;
          }
        }
        
        if (h.score > stats[unitId].bestScore) {
          stats[unitId].bestScore = h.score;
        }
        stats[unitId].lastTs = ts;
      }
    }

    if (abuseCount > 0) {
      const correction = {
        crystals: Math.max(0, (userData.crystals || 0) - abusedCrystals),
        totalQuizzes: Math.max(0, (userData.totalQuizzes || 0) - abuseCount),
        totalScore: Math.max(0, (userData.totalScore || 0) - abusedScore),
        perfectCount: Math.max(0, (userData.perfectCount || 0) - abusedPerfects),
        dailyQuizCount: Math.max(1, (userData.dailyQuizCount || 1) - abuseCount),
        consecutiveGood: Math.max(1, (userData.consecutiveGood || 1) - abuseCount)
      };
      
      // Keep averageScore calculated
      if (correction.totalQuizzes > 0) {
        correction.averageScore = correction.totalScore / correction.totalQuizzes;
      } else {
        correction.averageScore = 0;
      }

      // Ensure baselines aren't higher than new crystal count
      if (userData.dailyBaseline > correction.crystals) correction.dailyBaseline = correction.crystals;
      if (userData.weeklyBaseline > correction.crystals) correction.weeklyBaseline = correction.crystals;

      console.log(`✅ Deducted: ${abusedCrystals} Crystals, ${abuseCount} Quizzes, ${abusedPerfects} Perfects.`);
      await updateDoc(userRef, correction);
    } else {
      console.log("ℹ️ No abuse detected for this user.");
    }
    console.log("------------------------------------------------------------");
  }

  console.log("\n🏁 All corrections applied.");
}

applyGlobalCorrection().catch(console.error);
