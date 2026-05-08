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

  const totalSEI = wealthScore + skillScore + diligenceScore + growthScore + agoraScore + focusScore;
  
  return {
    total: totalSEI,
    wealth: wealthScore,
    skill: skillScore,
    diligence: diligenceScore,
    growth: growthScore,
    agora: agoraScore,
    focus: focusScore,
    focusData,
    tier: getTierFromSEI(totalSEI)
  };
}

export function getTierFromSEI(sei) {
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
