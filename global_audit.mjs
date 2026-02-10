import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8"
};

const app = initializeApp(config);
const db = getFirestore(app);

async function audit() {
  console.log("🔍 Starting Global Audit for Reward Abuse...");
  
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`Analyzing ${usersSnap.size} users...\n`);
  
  const suspiciousUsers = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const name = userData.name || "Unknown";
    const email = userData.email || "No Email";
    
    // Quick filter: only check users with high crystal counts or perfect counts
    if ((userData.crystals || 0) < 100 && (userData.perfectCount || 0) < 5) continue;

    const historyRef = collection(db, "users", uid, "history");
    const hSnap = await getDocs(query(historyRef, orderBy("timestamp", "asc")));
    
    if (hSnap.empty) continue;
    
    const history = hSnap.docs.map(d => ({
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date(0)
    }));

    const stats = {};
    let abusedCrystals = 0;
    let abuseCount = 0;
    
    for (const h of history) {
      const unitId = h.unitId;
      const ts = h.timestamp.getTime();
      const crystals = h.crystalsEarned || 0;

      if (!stats[unitId]) {
        stats[unitId] = { lastTs: ts, bestScore: h.score };
      } else {
        const timeDiff = (ts - stats[unitId].lastTs) / 1000; // in seconds
        
        // Potential abuse criteria:
        // 1. Same unit submitted within 60 seconds (usually impossible for 20 questions)
        // 2. Score didn't improve BUT reward was granted (pre-patch logic)
        if (timeDiff < 60 || h.score <= stats[unitId].bestScore) {
          if (crystals > 0) {
            abusedCrystals += crystals;
            abuseCount++;
          }
        }
        
        if (h.score > stats[unitId].bestScore) {
          stats[unitId].bestScore = h.score;
        }
        stats[unitId].lastTs = ts;
      }
    }

    if (abuseCount > 3) {
      suspiciousUsers.push({
        uid,
        name,
        email,
        currentCrystals: userData.crystals,
        abusedCrystals,
        abuseCount,
        totalQuizzes: userData.totalQuizzes
      });
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Audit Complete. Found ${suspiciousUsers.length} suspicious accounts:`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  suspiciousUsers.sort((a, b) => b.abusedCrystals - a.abusedCrystals);
  
  suspiciousUsers.forEach(u => {
    console.log(`👤 Name: ${u.name}`);
    console.log(`📧 Email: ${u.email}`);
    console.log(`🆔 UID: ${u.uid}`);
    console.log(`💎 Current: ${u.currentCrystals} | 🚩 Abused: ${u.abusedCrystals} (${u.abuseCount} times)`);
    console.log(`📊 Actual Quizzes should be ~${u.totalQuizzes - u.abuseCount}`);
    console.log("------------------------------------------------------------");
  });
}

audit().catch(console.error);
