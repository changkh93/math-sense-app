import { getTodayKST, getKSTComponents } from './streakUtils';

export function calculateSEI(user, weeklyGain = 0, streak = 0) {
  const crystals = user.crystals || 0;
  const avgScore = user.averageScore || 0;
  
  // 1. 기초 체급 (Wealth): 보유 광석 / 2 -> 누적 핵심 지표로 가중치 대폭 강화 (기존 / 10)
  const wealthScore = Math.floor(crystals / 2);
  
  // 2. 전문성 (Skill): 평균 점수 * 5 -> 가중치 유지 (100점 만점 시 500점)
  const skillScore = Math.floor(avgScore * 5);
  
  // 3. 성실도 (Diligence): 연속 학습일 * 10 -> 선형 누적으로 꾸준함 강력 보상 (기존 log2)
  const diligenceScore = Math.floor(streak * 10);
  
  // 4. 추진력 (Growth): 주간 성장 / 2 -> 주간 초기화 타격 완화 (기존 * 2)
  const growthScore = Math.floor(Math.max(0, weeklyGain) / 2);
  
  // 5. 아고라 지수 (Agora): 질문 및 답변 활동 기반 -> 가중치 10%
  const helpCount = user.helpCount || 0;
  const questionCount = user.questionCount || 0;
  const agoraScoreRaw = (questionCount * 5) + (helpCount * 20); // 질문 5점, 답변 채택 20점
  const agoraScore = Math.min(100, agoraScoreRaw);

  const totalSEI = wealthScore + skillScore + diligenceScore + growthScore + agoraScore;
  
  return {
    total: totalSEI,
    wealth: wealthScore,
    skill: skillScore,
    diligence: diligenceScore,
    growth: growthScore,
    agora: agoraScore,
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
