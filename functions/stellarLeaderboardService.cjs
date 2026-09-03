/**
 * 🌌 Stellar Leaderboard Pre-aggregation Service
 * 
 * Aggregates top pilots, study crews, and hall of fame
 * into a single compact document: `stellarLeaderboard/latest`
 */

const FOCUS_MAX_SCORE = 600;
const FOCUS_WILSON_Z = 1.0;
const BATTLE_MAX_SCORE = 600;
const AI_BATTLE_TRAINING_MAX_SCORE = 60;
const BATTLE_SEI_RATING_MAX = 420;
const BATTLE_SEI_WINRATE_MAX = 80;
const BATTLE_SEI_VOLUME_MAX = 50;
const BATTLE_SEI_STREAK_MAX = 50;
const AI_BATTLE_ACCURACY_MAX = 40;
const AI_BATTLE_COMPLETION_MAX = 20;
const BATTLE_RATING_FLOOR = 1000;
const BATTLE_RATING_CEIL = 1900;
const HALL_OF_FAME_LOOKBACK_DAYS = 7;

const SEI_TIERS = [
  { minSEI: 80000, level: 9, name: '인피니티 스텔라 초월자', label: 'Infinity', color: '#e0aaff', icon: '🌠' },
  { minSEI: 40000, level: 8, name: '챌린저 초신성 정복자', label: 'Challenger', color: '#ff8800', icon: '🌟' },
  { minSEI: 20000, level: 7, name: '그랜드마스터 차원 항해자', label: 'Grandmaster', color: '#f43f5e', icon: '⚡' },
  { minSEI: 10000, level: 6, name: '마스터 코스믹 사령관', label: 'Master', color: '#a855f7', icon: '🔮' },
  { minSEI: 5000,  level: 5, name: '다이아몬드 성단 개척자', label: 'Diamond', color: '#00f0ff', icon: '💎' },
  { minSEI: 2000,  level: 4, name: '플래티넘 은하 수호자', label: 'Platinum', color: '#e5e4e2', icon: '🌌' },
  { minSEI: 1200,  level: 3, name: '골드 제독', label: 'Gold', color: '#ffd700', icon: '👑' },
  { minSEI: 600,   level: 2, name: '실버 캡틴', label: 'Silver', color: '#c0c0c0', icon: '⚔️' },
  { minSEI: 0,     level: 1, name: '브론즈 파일럿', label: 'Bronze', color: '#cd7f32', icon: '🚀' },
];

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

function calculateFocusData(user = {}) {
  const hits = readCounter(user.videoAttentionHits, user.attentionHits, user.focusHits);
  const misses = readCounter(user.videoAttentionMisses, user.attentionMisses, user.focusMisses);
  const explicitOpportunities = readCounter(
    user.videoAttentionOpportunities,
    user.attentionOpportunities,
    user.focusOpportunities
  );
  const opportunities = Math.max(explicitOpportunities, hits + misses);
  const rawRate = opportunities > 0 ? hits / opportunities : 0;
  const confidenceRate = calculateWilsonLowerBound(hits, opportunities);
  const score = Math.floor(confidenceRate * FOCUS_MAX_SCORE);

  return {
    score,
    hits,
    misses: Math.max(0, opportunities - hits),
    opportunities,
    rawRate,
    confidenceRate,
  };
}

function calculateBattleData(user = {}) {
  const totalMatches = readCounter(user.totalBattleMatches);
  const wins = readCounter(user.totalBattleWins);
  const bestStreak = readCounter(user.battleBestStreak);
  const aiMatches = readCounter(user.aiBattleMatches);
  const aiCompletedMatches = readCounter(user.aiBattleCompletedMatches);
  const aiCorrect = readCounter(user.aiBattleCorrect);
  const aiAnswered = Math.max(aiCorrect, readCounter(user.aiBattleAnswered));
  const explicitBattleRating = readCounter(user.battleRating);
  const hasExplicitBattleRating = explicitBattleRating > 0;
  const battleRating = hasExplicitBattleRating ? explicitBattleRating : 0;

  const ratingNorm = BATTLE_RATING_CEIL > BATTLE_RATING_FLOOR
    ? Math.min(1, Math.max(0, (battleRating - BATTLE_RATING_FLOOR) / (BATTLE_RATING_CEIL - BATTLE_RATING_FLOOR)))
    : 0;
  const ratingScore = Math.floor(ratingNorm * BATTLE_SEI_RATING_MAX);
  const winRateScore = Math.floor(calculateWilsonLowerBound(wins, totalMatches) * BATTLE_SEI_WINRATE_MAX);
  const volumeScore = Math.floor(Math.min(1, totalMatches / 20) * BATTLE_SEI_VOLUME_MAX);
  const streakScore = Math.floor(Math.min(1, bestStreak / 5) * BATTLE_SEI_STREAK_MAX);

  const competitiveScore = hasExplicitBattleRating
    ? Math.min(BATTLE_MAX_SCORE, ratingScore + winRateScore + volumeScore + streakScore)
    : 0;
  const aiAccuracyScore = Math.floor(
    calculateWilsonLowerBound(aiCorrect, aiAnswered) * AI_BATTLE_ACCURACY_MAX
  );
  const aiCompletionScore = Math.floor(
    Math.min(1, aiCompletedMatches / 10) * AI_BATTLE_COMPLETION_MAX
  );
  const aiTrainingScore = Math.min(
    AI_BATTLE_TRAINING_MAX_SCORE,
    aiAccuracyScore + aiCompletionScore
  );
  const score = Math.min(BATTLE_MAX_SCORE, competitiveScore + aiTrainingScore);

  return {
    score,
    competitiveScore,
    aiTrainingScore,
    battleRating,
    hasExplicitBattleRating,
    totalMatches,
    wins,
    bestStreak,
  };
}

function getTierFromSEI(sei) {
  const safeSei = Math.max(0, Number(sei) || 0);
  for (const tier of SEI_TIERS) {
    if (safeSei >= tier.minSEI) {
      return { ...tier };
    }
  }
  return { ...SEI_TIERS[SEI_TIERS.length - 1] };
}

function calculateSEI(user, weeklyGain = 0, streak = 0) {
  const crystals = user.crystals || 0;
  const lifetimeLearningCrystals = Math.max(
    Number(user.lifetimeLearningCrystalsEarned || 0),
    Number(crystals || 0)
  );
  const avgScore = user.averageScore || 0;
  const wealthScore = Math.floor(lifetimeLearningCrystals / 2);
  const perfectCount = user.perfectCount || 0;
  const skillScore = Math.floor(avgScore * 5) + (perfectCount * 10);
  const diligenceScore = Math.floor(streak * 10);
  const growthScore = Math.floor(Math.max(0, weeklyGain) / 2);
  const helpCount = user.helpCount || 0;
  const questionCount = user.questionCount || 0;
  const agoraScore = (questionCount * 5) + (helpCount * 20);
  const focusData = calculateFocusData(user);
  const battleData = calculateBattleData(user);

  const totalSEI = wealthScore + skillScore + diligenceScore + growthScore + agoraScore + focusData.score + battleData.score;

  return {
    total: totalSEI,
    wealth: wealthScore,
    skill: skillScore,
    diligence: diligenceScore,
    growth: growthScore,
    agora: agoraScore,
    focus: focusData.score,
    battle: battleData.score,
    battleCompetitive: battleData.competitiveScore,
    battleTraining: battleData.aiTrainingScore,
    battleData,
    tier: getTierFromSEI(totalSEI),
  };
}

function assignDenseRanks(list, isTieFn) {
  let currentRank = 1;
  for (let i = 0; i < list.length; i++) {
    if (i > 0) {
      const prev = list[i - 1];
      const curr = list[i];
      const isTie = isTieFn(prev, curr);
      if (!isTie) {
        currentRank = i + 1;
      }
    }
    list[i].displayRank = currentRank;
  }
}

function cleanUserSummary(u) {
  return {
    id: u.id,
    name: u.publicDisplayName || u.studentName || u.name || '무명 탐험가',
    publicDisplayName: u.publicDisplayName || null,
    studentName: u.studentName || null,
    crystals: Number(u.crystals || 0),
    streak: Number(u.streak || 0),
    dailyGain: Number(u.dailyGain || 0),
    weeklyGain: Number(u.weeklyGain || 0),
    selectedProfileFrame: u.selectedProfileFrame || null,
    selectedBaseTheme: u.selectedBaseTheme || null,
    publicSignature: u.publicSignature || null,
    publicTitle: u.publicTitle || null,
    crewId: u.crewId || null,
    crewName: u.crewName || null,
    crewColor: u.crewColor || null,
    totalBattleMatches: Number(u.totalBattleMatches || 0),
    totalBattleWins: Number(u.totalBattleWins || 0),
    totalBattleDraws: Number(u.totalBattleDraws || 0),
    hallSpotlightUntilMs: u.hallSpotlightUntilMs || null,
    seiData: {
      total: u.seiData.total,
      wealth: u.seiData.wealth,
      skill: u.seiData.skill,
      diligence: u.seiData.diligence,
      growth: u.seiData.growth,
      agora: u.seiData.agora,
      focus: u.seiData.focus,
      battle: u.seiData.battle,
      battleCompetitive: u.seiData.battleCompetitive,
      battleTraining: u.seiData.battleTraining,
      battleData: {
        battleRating: u.seiData.battleData?.battleRating || 0,
        hasExplicitBattleRating: !!u.seiData.battleData?.hasExplicitBattleRating,
      },
      tier: u.seiData.tier,
    },
    displayRank: u.displayRank || 1,
  };
}

function getKSTDateString(date = new Date()) {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().slice(0, 10);
}

function getKSTWeekMondayString(date = new Date()) {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const day = kstTime.getUTCDay();
  const diff = (day + 6) % 7;
  const mondayTime = new Date(kstTime.getTime() - diff * 24 * 60 * 60 * 1000);
  return mondayTime.toISOString().slice(0, 10);
}

async function generateStellarLeaderboardData(db, helpers = {}) {
  const todayKey = helpers.getKSTDateString ? helpers.getKSTDateString() : getKSTDateString();
  const mondayKey = helpers.getKSTWeekMondayString ? helpers.getKSTWeekMondayString() : getKSTWeekMondayString();

  const [usersSnap, crewsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('crews').where('status', '==', 'approved').get(),
  ]);

  const rankingCrewsById = {};
  crewsSnap.docs.forEach((doc) => {
    rankingCrewsById[doc.id] = { id: doc.id, ...doc.data() };
  });

  const parsedUsers = usersSnap.docs
    .map((userDoc) => {
      const d = userDoc.data() || {};
      const streak = Number(d.currentStreak || 0);
      const weeklyGain = d.weeklyGrowthMonday === mondayKey ? Number(d.weeklyGrowth || 0) : 0;
      const dailyGain = d.dailyGrowthDate === todayKey ? Number(d.dailyGrowth || 0) : 0;
      const seiData = calculateSEI(d, weeklyGain, streak);

      return {
        id: userDoc.id,
        ...d,
        streak,
        dailyGain,
        weeklyGain,
        seiData,
      };
    })
    .filter((u) => u.role !== 'admin' && u.role !== 'developer' && u.role !== 'teacher');

  // 1. SEI Rank
  const seiRanked = [...parsedUsers]
    .sort((a, b) => b.seiData.total - a.seiData.total)
    .map((u) => ({ ...u }));
  assignDenseRanks(seiRanked, (p, c) => p.seiData.total === c.seiData.total);

  // 2. Growth Rank
  const growthRanked = [...parsedUsers]
    .sort((a, b) => {
      if (b.weeklyGain !== a.weeklyGain) return b.weeklyGain - a.weeklyGain;
      if (b.seiData.total !== a.seiData.total) return b.seiData.total - a.seiData.total;
      return (b.crystals || 0) - (a.crystals || 0);
    })
    .map((u) => ({ ...u }));
  assignDenseRanks(growthRanked, (p, c) => (
    p.weeklyGain === c.weeklyGain &&
    p.seiData.total === c.seiData.total &&
    (p.crystals || 0) === (c.crystals || 0)
  ));

  // 3. Streak Rank
  const streakRanked = [...parsedUsers]
    .sort((a, b) => b.streak - a.streak)
    .map((u) => ({ ...u }));
  assignDenseRanks(streakRanked, (p, c) => p.streak === c.streak);

  // 4. Battle Rank
  const battleRanked = [...parsedUsers]
    .sort((a, b) => {
      const aMatches = a.totalBattleMatches || 0;
      const bMatches = b.totalBattleMatches || 0;
      const aHasBattle = aMatches > 0;
      const bHasBattle = bMatches > 0;
      if (aHasBattle !== bHasBattle) return bHasBattle ? 1 : -1;
      if ((b.seiData?.battleCompetitive || 0) !== (a.seiData?.battleCompetitive || 0)) {
        return (b.seiData?.battleCompetitive || 0) - (a.seiData?.battleCompetitive || 0);
      }
      const aRating = a.seiData?.battleData?.battleRating || 0;
      const bRating = b.seiData?.battleData?.battleRating || 0;
      if (bRating !== aRating) return bRating - aRating;
      const aWinRate = aMatches > 0 ? (a.totalBattleWins || 0) / aMatches : 0;
      const bWinRate = bMatches > 0 ? (b.totalBattleWins || 0) / bMatches : 0;
      if (bWinRate !== aWinRate) return bWinRate - aWinRate;
      if (bMatches !== aMatches) return bMatches - aMatches;
      return (b.seiData?.total || 0) - (a.seiData?.total || 0);
    })
    .map((u) => ({ ...u }));
  assignDenseRanks(battleRanked, (p, c) => {
    const prevMatches = p.totalBattleMatches || 0;
    const currMatches = c.totalBattleMatches || 0;
    if (prevMatches === 0 && currMatches === 0) return true;
    const prevWinRate = prevMatches > 0 ? (p.totalBattleWins || 0) / prevMatches : 0;
    const currWinRate = currMatches > 0 ? (c.totalBattleWins || 0) / currMatches : 0;
    return (
      (p.seiData?.battleCompetitive || 0) === (c.seiData?.battleCompetitive || 0) &&
      (p.seiData?.battleData?.battleRating || 0) === (c.seiData?.battleData?.battleRating || 0) &&
      prevWinRate === currWinRate &&
      prevMatches === currMatches
    );
  });
  // 5. Crew Leaderboard
  const crewMap = new Map();
  parsedUsers.forEach((u) => {
    if (!u.crewId) return;
    const rankingCrew = rankingCrewsById[u.crewId];
    const mothershipXP = Math.max(0, Number(rankingCrew?.mothershipXP || rankingCrew?.mothershipStats?.xp || 0));
    const existing = crewMap.get(u.crewId) || {
      crewId: u.crewId,
      crewName: u.crewName || rankingCrew?.name || '이름 없는 크루',
      crewColor: u.crewColor || rankingCrew?.color || '#00f3ff',
      totalSEI: 0,
      totalWeeklyGain: 0,
      memberCount: 0,
      mothershipXP,
    };
    existing.totalSEI += u.seiData?.total || 0;
    existing.totalWeeklyGain += u.weeklyGain || 0;
    existing.memberCount += 1;
    crewMap.set(u.crewId, existing);
  });

  const crewLeaders = Array.from(crewMap.values())
    .sort((a, b) => {
      const scoreA = a.totalWeeklyGain + (a.mothershipXP * 10);
      const scoreB = b.totalWeeklyGain + (b.mothershipXP * 10);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.totalSEI - a.totalSEI;
    })
    .slice(0, 3);

  // 6. Hall of Fame (optimized fetch: 20 questions, 30 answers)
  let hallOfFame = {
    bestQuestion: null,
    bestAnswer: null,
    growthStar: growthRanked[0] ? cleanUserSummary(growthRanked[0]) : null,
  };

  try {
    const lookbackThresholdMs = Date.now() - (HALL_OF_FAME_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [questionSnap, answerSnap] = await Promise.all([
      db.collection('questions').orderBy('createdAt', 'desc').limit(20).get(),
      db.collection('answers').orderBy('createdAt', 'desc').limit(30).get(),
    ]);

    const questions = questionSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((q) => {
        const ms = q.createdAt?.toMillis ? q.createdAt.toMillis() : (q.createdAt?.seconds ? q.createdAt.seconds * 1000 : 0);
        return ms >= lookbackThresholdMs;
      });

    const answers = answerSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((a) => {
        const ms = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        return ms >= lookbackThresholdMs && a.isTeacher !== true && a.userId !== 'admin';
      });

    const bestQuestion = questions.sort((a, b) => {
      const aScore = (a.upvotes || 0) * 3 + (a.answerCount || 0) * 2 + Math.floor((a.bountyAmount || 0) / 10);
      const bScore = (b.upvotes || 0) * 3 + (b.answerCount || 0) * 2 + Math.floor((b.bountyAmount || 0) / 10);
      return bScore - aScore;
    })[0] || null;

    const bestAnswer = answers.sort((a, b) => {
      const aScore = (a.isAccepted ? 18 : 0) + (a.isVerified ? 10 : 0) + Math.min((a.content || '').length, 400) / 20;
      const bScore = (b.isAccepted ? 18 : 0) + (b.isVerified ? 10 : 0) + Math.min((b.content || '').length, 400) / 20;
      return bScore - aScore;
    })[0] || null;

    hallOfFame.bestQuestion = bestQuestion ? {
      id: bestQuestion.id,
      content: (bestQuestion.content || '').slice(0, 100),
      userName: bestQuestion.userName || null,
      isAnonymous: !!bestQuestion.isAnonymous,
    } : null;

    hallOfFame.bestAnswer = bestAnswer ? {
      id: bestAnswer.id,
      content: (bestAnswer.content || '').slice(0, 100),
      userName: bestAnswer.userName || null,
      userId: bestAnswer.userId || null,
      publicProfileSnapshot: bestAnswer.publicProfileSnapshot || null,
    } : null;
  } catch (err) {
    console.warn('Failed to aggregate hall of fame in service:', err);
  }

  const payload = {
    generatedAtMs: Date.now(),
    todayKey,
    mondayKey,
    topSei: seiRanked.slice(0, 100).map(cleanUserSummary),
    topGrowth: growthRanked.slice(0, 100).map(cleanUserSummary),
    topStreak: streakRanked.slice(0, 100).map(cleanUserSummary),
    topBattle: battleRanked.slice(0, 100).map(cleanUserSummary),
    crewLeaderboard: crewLeaders,
    hallOfFame,
    totalPilots: parsedUsers.length,
  };

  return payload;
}

module.exports = {
  FOCUS_MAX_SCORE,
  BATTLE_MAX_SCORE,
  SEI_TIERS,
  calculateSEI,
  calculateFocusData,
  calculateBattleData,
  getTierFromSEI,
  generateStellarLeaderboardData,
};
