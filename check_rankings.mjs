import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const FOCUS_MAX_SCORE = 600;
const FOCUS_WILSON_Z = 1.0;

function readCounter(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      return Math.max(0, Math.floor(numberValue));
    }
  }
  return 0;
}

function calculateWilsonLowerBound(successes, total, z = FOCUS_WILSON_Z) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  if (n <= 0) return 0;

  const s = Math.min(n, Math.max(0, Math.floor(Number(successes) || 0)));
  const phat = s / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);

  return Math.max(0, Math.min(1, (center - margin) / denominator));
}

function calculateFocusScore(user) {
  const hits = readCounter(user.videoAttentionHits, user.attentionHits, user.focusHits);
  const misses = readCounter(user.videoAttentionMisses, user.attentionMisses, user.focusMisses);
  const explicitOpportunities = readCounter(
    user.videoAttentionOpportunities,
    user.attentionOpportunities,
    user.focusOpportunities
  );
  const opportunities = Math.max(explicitOpportunities, hits + misses);
  return Math.floor(calculateWilsonLowerBound(hits, opportunities) * FOCUS_MAX_SCORE);
}

function calculateSEI(user, weeklyGain = 0, streak = 0) {
  const crystals = user.crystals || 0;
  const avgScore = user.averageScore || 0;
  const wealthScore = Math.floor(crystals / 2);
  const perfectCount = user.perfectCount || 0;
  const skillScore = Math.floor(avgScore * 5) + (perfectCount * 10);
  const diligenceScore = Math.floor(streak * 10);
  const growthScore = Math.floor(Math.max(0, weeklyGain) / 2);
  const helpCount = user.helpCount || 0;
  const questionCount = user.questionCount || 0;
  const agoraScoreRaw = (questionCount * 5) + (helpCount * 20);
  const focusScore = calculateFocusScore(user);
  return wealthScore + skillScore + diligenceScore + growthScore + agoraScoreRaw + focusScore;
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
