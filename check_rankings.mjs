import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

function calculateSEI(user, weeklyGain = 0, streak = 0) {
  const crystals = user.crystals || 0;
  const avgScore = user.averageScore || 0;
  const wealthScore = Math.floor(crystals / 2);
  const skillScore = Math.floor(avgScore * 5);
  const diligenceScore = Math.floor(streak * 10);
  const growthScore = Math.floor(Math.max(0, weeklyGain) / 2);
  const helpCount = user.helpCount || 0;
  const questionCount = user.questionCount || 0;
  const agoraScoreRaw = (questionCount * 5) + (helpCount * 20);
  const agoraScore = Math.min(100, agoraScoreRaw);
  return wealthScore + skillScore + diligenceScore + growthScore + agoraScore;
}

async function checkRankings() {
  const usersSnap = await db.collection('users').get();
  let users = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.name) {
      const sei = calculateSEI(data, data.weeklyGrowth || 0, data.currentStreak || 0);
      users.push({ name: data.name, email: data.email, sei: sei, crystals: data.crystals || 0, helpCount: data.helpCount || 0 });
    }
  });

  users.sort((a, b) => b.sei - a.sei);
  
  console.log("=== TOP 5 RANKINGS ===");
  for (let i = 0; i < 5; i++) {
    if (users[i]) {
      console.log(`${i+1}. ${users[i].name} (${users[i].email}) - SEI: ${users[i].sei} (Crystals: ${users[i].crystals}, helpCount: ${users[i].helpCount})`);
    }
  }
}

checkRankings().then(() => process.exit(0));
