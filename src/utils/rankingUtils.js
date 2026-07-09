import { getTodayKST, getKSTComponents } from './streakUtils';

export const FOCUS_MAX_SCORE = 600;
export const FOCUS_WILSON_Z = 1.0;

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

export function calculateWilsonLowerBound(successes, total, z = FOCUS_WILSON_Z) {
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

export function calculateFocusData(user = {}) {
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

// 배틀 축(Battle) SEI 점수. 최대 600점.
// battleRating(1000~1900+)을 핵심으로 쓰고, 승률 신뢰도·참여량·연승을 보조 가산한다.
// 패배해도 정답률과 참여가 battleRating에 반영되므로 단순 승패만으로 평가하지 않는다.
export const BATTLE_MAX_SCORE = 600;
const BATTLE_SEI_RATING_MAX = 420;
const BATTLE_SEI_WINRATE_MAX = 80;
const BATTLE_SEI_VOLUME_MAX = 50;
const BATTLE_SEI_STREAK_MAX = 50;
// battleRating의 의미있는 분포 구간. 이 구간을 벗어나면 clamp.
const BATTLE_RATING_FLOOR = 1000;
const BATTLE_RATING_CEIL = 1900;

export function calculateBattleData(user = {}) {
  const totalMatches = readCounter(user.totalBattleMatches);
  const wins = readCounter(user.totalBattleWins);
  const bestStreak = readCounter(user.battleBestStreak);
  const explicitBattleRating = readCounter(user.battleRating);
  const hasExplicitBattleRating = explicitBattleRating > 0;
  const fallbackRating = totalMatches > 0
    ? BATTLE_RATING_FLOOR
      + Math.round(calculateWilsonLowerBound(wins, totalMatches) * 350)
      + Math.round(Math.min(1, totalMatches / 20) * 150)
    : 0;
  const battleRating = hasExplicitBattleRating ? explicitBattleRating : fallbackRating;

  // 1. Rating 정규화 (최대 420). 1000=0점, 1900=420점 선형.
  const ratingNorm = BATTLE_RATING_CEIL > BATTLE_RATING_FLOOR
    ? Math.min(1, Math.max(0, (battleRating - BATTLE_RATING_FLOOR) / (BATTLE_RATING_CEIL - BATTLE_RATING_FLOOR)))
    : 0;
  const ratingScore = Math.floor(ratingNorm * BATTLE_SEI_RATING_MAX);

  // 2. 승률 신뢰도 (최대 80). Wilson lower bound로 표본 수까지 반영.
  const winRateScore = Math.floor(calculateWilsonLowerBound(wins, totalMatches) * BATTLE_SEI_WINRATE_MAX);

  // 3. 참여량 (최대 50). 20전부터 만점.
  const volumeScore = Math.floor(Math.min(1, totalMatches / 20) * BATTLE_SEI_VOLUME_MAX);

  // 4. 연승 보정 (최대 50). 5연승부터 만점.
  const streakScore = Math.floor(Math.min(1, bestStreak / 5) * BATTLE_SEI_STREAK_MAX);

  const score = Math.min(BATTLE_MAX_SCORE, ratingScore + winRateScore + volumeScore + streakScore);

  return {
    score,
    battleRating,
    explicitBattleRating,
    hasExplicitBattleRating,
    totalMatches,
    wins,
    bestStreak,
    ratingScore,
    winRateScore,
    volumeScore,
    streakScore,
  };
}

export function calculateSEI(user, weeklyGain = 0, streak = 0) {
  const crystals = user.crystals || 0;
  const avgScore = user.averageScore || 0;

  // 1. 기초 체급 (Wealth): 보유 광석 / 2 -> 누적 핵심 지표로 가중치 대폭 강화 (기존 / 10)
  const wealthScore = Math.floor(crystals / 2);

  // 2. 전문성 (Skill): (평균 점수 * 5) + (백점 횟수 * 10) -> 실력과 마스터리 동시 반영
  const perfectCount = user.perfectCount || 0;
  const skillScore = Math.floor(avgScore * 5) + (perfectCount * 10);

  // 3. 성실도 (Diligence): 연속 학습일 * 10 -> 선형 누적으로 꾸준함 강력 보상 (기존 log2)
  const diligenceScore = Math.floor(streak * 10);

  // 4. 추진력 (Growth): 주간 성장 / 2 -> 주간 초기화 타격 완화 (기존 * 2)
  const growthScore = Math.floor(Math.max(0, weeklyGain) / 2);

  // 5. 아고라 지수 (Agora): 질문 및 답변 활동 기반 -> 가중치 10%
  const helpCount = user.helpCount || 0;
  const questionCount = user.questionCount || 0;
  const agoraScoreRaw = (questionCount * 5) + (helpCount * 20); // 질문 5점, 답변 채택 20점
  const agoraScore = agoraScoreRaw;

  // 6. 집중도 (Focus): 동영상 광석 획득 성공률을 Wilson lower bound로 보정하여 표본 수까지 반영
  const focusData = calculateFocusData(user);
  const focusScore = focusData.score;

  // 7. 배틀 (Battle): 퀴즈 배틀 전적 기반. rating 정규화 + 승률 신뢰도 + 참여량 + 연승.
  const battleData = calculateBattleData(user);
  const battleScore = battleData.score;

  const totalSEI = wealthScore + skillScore + diligenceScore + growthScore + agoraScore + focusScore + battleScore;

  return {
    total: totalSEI,
    wealth: wealthScore,
    skill: skillScore,
    diligence: diligenceScore,
    growth: growthScore,
    agora: agoraScore,
    focus: focusScore,
    focusData,
    battle: battleScore,
    battleData,
    tier: getTierFromSEI(totalSEI)
  };
}

export function getTierFromSEI(sei) {
  // 기존 임계값(600/1200/2000)을 유지한다.
  // battle 축(최대 600)이 추가되어 총점은 상향되지만, 임계값을 올리면
  // 배틀 미참여자의 등급이 강등되는 부작용이 생긴다. 대신 battle 점수는
  // 기존 사용자의 tier를 올리는 방향으로만 작용한다.
  if (sei >= 2000) return { name: '플래티넘 은하 수호자', label: 'Platinum', color: '#e5e4e2', icon: '🌌' };
  if (sei >= 1200) return { name: '골드 제독', label: 'Gold', color: '#ffd700', icon: '👑' };
  if (sei >= 600)  return { name: '실버 캡틴', label: 'Silver', color: '#c0c0c0', icon: '⚔️' };
  return { name: '브론즈 파일럿', label: 'Bronze', color: '#cd7f32', icon: '🚀' };
}

export function calculateGrowthUpdates(userData, earnedAmount) {
  if (!earnedAmount || earnedAmount <= 0) return {};
  if (!userData) return {};

  const kstPart = getKSTComponents();
  const todayKST = getTodayKST();
  const mondayOffset = (kstPart.dayOfWeek + 6) % 7;
  const mondayDate = new Date();
  mondayDate.setDate(mondayDate.getDate() - mondayOffset);
  const mondayKST = getTodayKST(mondayDate);

  const growthUpdates = {};
  
  // Daily growth
  if (userData.dailyGrowthDate === todayKST) {
    growthUpdates.dailyGrowth = (userData.dailyGrowth || 0) + earnedAmount;
  } else {
    growthUpdates.dailyGrowth = earnedAmount;
    growthUpdates.dailyGrowthDate = todayKST;
  }

  // Weekly growth
  if (userData.weeklyGrowthMonday === mondayKST) {
    growthUpdates.weeklyGrowth = (userData.weeklyGrowth || 0) + earnedAmount;
  } else {
    growthUpdates.weeklyGrowth = earnedAmount;
    growthUpdates.weeklyGrowthMonday = mondayKST;
  }

  return growthUpdates;
}
