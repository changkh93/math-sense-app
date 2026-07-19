import agoraHelperBadge from '../assets/badge/agora_helper.png';
import kindSolverBadge from '../assets/badge/kind_solver.png';
import questionPioneerBadge from '../assets/badge/question_pioneer.png';
import cosmosInitiateBadge from '../assets/badge/cosmos_initiate.png';
import crystalCollectorBadge from '../assets/badge/crystal_collector.png';
import galaxyScholarBadge from '../assets/badge/galaxy_scholar.png';
import astronautBadge from '../assets/badge/astronaut.png';
import pioneerBadge from '../assets/badge/pioneer.png';
import solarMasterBadge from '../assets/badge/solar_master.png';
import flawlessOrbitBadge from '../assets/badge/flawless_orbit.png';
import supernovaBadge from '../assets/badge/supernova.png';
import deepVoyagerBadge from '../assets/badge/deep_voyager.png';
import mathGuardianBadge from '../assets/badge/math_guardian.png';
import perfectLeapBadge from '../assets/badge/perfect_leap.png';
import voyageStartBadge from '../assets/badge/voyage_start.png';
import orbitEntryBadge from '../assets/badge/orbit_entry.png';
import stellarWindSurferBadge from '../assets/badge/stellar_wind_surfer.png';
import supernovaBurstBadge from '../assets/badge/supernova_burst.png';
import eternalVoyagerBadge from '../assets/badge/eternal_voyager.png';

// 배지 외형 업그레이드 1종(프리미엄)의 광석 가격.
export const BADGE_UPGRADE_COST = 100;

// 프리미엄 배지 이미지 매핑. 새 배지 이미지가 추가되면 이 맵에만 등록하면 된다.
const BADGE_PREMIUM_IMAGES = {
  agora_helper: agoraHelperBadge,
  kind_solver: kindSolverBadge,
  question_pioneer: questionPioneerBadge,
  cosmos_initiate: cosmosInitiateBadge,
  crystal_collector: crystalCollectorBadge,
  galaxy_scholar: galaxyScholarBadge,
  astronaut: astronautBadge,
  pioneer: pioneerBadge,
  solar_master: solarMasterBadge,
  flawless_orbit: flawlessOrbitBadge,
  supernova: supernovaBadge,
  deep_voyager: deepVoyagerBadge,
  math_guardian: mathGuardianBadge,
  perfect_leap: perfectLeapBadge,
  voyage_start: voyageStartBadge,
  orbit_entry: orbitEntryBadge,
  stellar_wind_surfer: stellarWindSurferBadge,
  supernova_burst: supernovaBurstBadge,
  eternal_voyager: eternalVoyagerBadge,
};

// 업그레이드 가능한 배지 id 목록(프리미엄 이미지가 등록된 배지).
export const UPGRADABLE_BADGE_IDS = Object.keys(BADGE_PREMIUM_IMAGES);

export function calculateCollectionBadgeStats(history = [], userData = {}) {
  const summary = userData?.learningSummary;
  if (summary?.schemaVersion === 1) {
    const bestScores = (summary.units || [])
      .map((unit) => unit.bestQuizScore ?? unit.bestWorkbookScore)
      .filter((score) => Number.isFinite(Number(score)))
      .map(Number);
    const stats = summary.stats || {};
    return {
      quizAttempts: Number(stats.quizAttempts || 0),
      quizScoreSum: Number(stats.quizScoreSum || 0),
      quizAverageScore: Number(stats.quizAttempts || 0) > 0 ? Number(stats.quizScoreSum || 0) / Number(stats.quizAttempts) : 0,
      perfectAttempts: Number(stats.perfectAttempts || 0),
      uniqueQuizUnits: bestScores.length,
      averageScore: bestScores.length ? bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length : 0,
      perfectUnits: bestScores.filter((score) => score === 100).length,
    };
  }
  const scoredQuizEntries = (history || []).filter(entry => {
    const type = entry?.type || 'quiz';
    return (type === 'quiz' || type === 'workbook') && typeof entry.score === 'number';
  });

  const bestScoreByUnit = new Map();
  scoredQuizEntries.forEach(entry => {
    if (!entry.unitId) return;
    const previous = bestScoreByUnit.get(entry.unitId) ?? -Infinity;
    bestScoreByUnit.set(entry.unitId, Math.max(previous, entry.score));
  });

  const bestScores = Array.from(bestScoreByUnit.values());
  const quizScoreSum = scoredQuizEntries.reduce((sum, entry) => sum + Number(entry.score || 0), 0);

  return {
    quizAttempts: scoredQuizEntries.length,
    quizScoreSum,
    quizAverageScore: scoredQuizEntries.length ? quizScoreSum / scoredQuizEntries.length : 0,
    perfectAttempts: scoredQuizEntries.filter(entry => Number(entry.score) === 100).length,
    uniqueQuizUnits: bestScoreByUnit.size,
    averageScore: bestScores.length
      ? bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length
      : 0,
    perfectUnits: bestScores.filter(score => score === 100).length,
  };
}

export function buildSocialBadges(userData = {}) {
  const profile = userData || {};
  return [
    {
      id: 'agora_helper',
      title: '아고라 조력자',
      icon: '🤝',
      unlocked: (profile.helpCount || 0) >= 1,
      desc: '채택된 답변을 보유했습니다.'
    },
    {
      id: 'kind_solver',
      title: '친절한 해결사',
      icon: '🌟',
      unlocked: (profile.helpCount || 0) >= 5,
      desc: '도움 5회 이상을 달성했습니다.'
    },
    {
      id: 'question_pioneer',
      title: '질문 개척자',
      icon: '💬',
      unlocked: (profile.questionCount || 0) >= 10,
      desc: '질문 10개 이상을 남겼습니다.'
    },
  ];
}

export function buildCollectionBadges(userData = {}, history = []) {
  const quizStats = calculateCollectionBadgeStats(history, userData);

  const badges = [
    ...buildSocialBadges(userData),
    { id: 'cosmos_initiate', title: '코스모스 입문', icon: '🌌', unlocked: quizStats.uniqueQuizUnits > 0, desc: '첫 번째 수학 탐사를 성공적으로 마쳤습니다.' },
    { id: 'crystal_collector', title: '광석 수집가', icon: '💎', unlocked: (userData?.crystals || 0) >= 500, desc: '광석을 500개 이상 모았습니다. (중급 대원)' },
    { id: 'galaxy_scholar', title: '은하 학자', icon: '📜', unlocked: quizStats.averageScore >= 95, desc: '평균 정답률 95% 이상을 유지 중인 엘리트 대원입니다.' },
    { id: 'astronaut', title: '우주 비행사', icon: '👨‍🚀', unlocked: quizStats.uniqueQuizUnits >= 30, desc: '탐험을 30번 이상 완료한 숙련된 비행사입니다.' },
    { id: 'pioneer', title: '행성 개척자', icon: '🚩', unlocked: quizStats.uniqueQuizUnits >= 70, desc: '수많은 행성을 개척한 위대한 탐험가입니다.' },
    { id: 'solar_master', title: '태양계 마스터', icon: '☀️', unlocked: quizStats.uniqueQuizUnits >= 132 && quizStats.averageScore >= 99, desc: '132개 모든 세트의 탐사를 마친 전설의 마스터입니다.' },
    { id: 'flawless_orbit', title: '무결점 궤도', icon: '🛰️', unlocked: (userData?.consecutiveGood || 0) >= 10, desc: '연속 10세트 동안 정답률 90% 이상을 유지했습니다.' },
    { id: 'supernova', title: '슈퍼노바', icon: '💥', unlocked: (userData?.dailyQuizCount || 0) >= 5, desc: '하루에 5세트 이상의 탐사를 완수했습니다.' },
    { id: 'deep_voyager', title: '심우주 항해사', icon: '🌠', unlocked: quizStats.uniqueQuizUnits >= 100, desc: '누적 퀴즈 100세트를 돌파한 베테랑 항해사입니다.' },
    { id: 'math_guardian', title: '수학의 수호자', icon: '🛡️', unlocked: (userData?.shieldDefended || 0) >= 200, desc: '광자 실드로 에너지(광석) 손실을 200회 이상 방어했습니다.' },
    { id: 'perfect_leap', title: '완벽한 도약', icon: '⚡', unlocked: quizStats.perfectUnits >= 20, desc: '백점 보너스(+10)를 20회 달성한 완벽주의 대원입니다.' },
    { id: 'voyage_start', title: '항해의 시작', icon: '🕯️', unlocked: (userData?.longestStreak || 0) >= 3, desc: '3일 연속 학습을 달성했습니다.' },
    { id: 'orbit_entry', title: '궤도 진입', icon: '🔵', unlocked: (userData?.longestStreak || 0) >= 7, desc: '7일 연속 학습! 안정 궤도에 진입했습니다.' },
    { id: 'stellar_wind_surfer', title: '항성풍 서퍼', icon: '🟣', unlocked: (userData?.longestStreak || 0) >= 30, desc: '30일 연속! 항성풍을 타고 항해 중입니다.' },
    { id: 'supernova_burst', title: '초신성 폭발', icon: '💫', unlocked: (userData?.longestStreak || 0) >= 100, desc: '100일 연속! 초신성급 에너지를 방출합니다.' },
    { id: 'eternal_voyager', title: '영원한 항해사', icon: '🌌', unlocked: (userData?.longestStreak || 0) >= 365, desc: '365일 연속! 은하핵에 도달한 전설의 항해사.' },
  ];

  // 프리미엄 이미지가 등록된 배지에만 premiumImage 필드를 붙인다.
  return badges.map(badge => ({
    ...badge,
    premiumImage: BADGE_PREMIUM_IMAGES[badge.id] || null,
  }));
}

// id로 배지를 찾는다.
export function getBadgeById(badges = [], id) {
  return badges.find(badge => badge.id === id) || null;
}

// 해당 배지의 프리미엄 스킨을 보유하고 있는지 확인한다.
export function isBadgeUpgradeOwned(userData = {}, badgeId) {
  const entry = userData?.badgeUpgrades?.[badgeId];
  return Array.isArray(entry?.ownedSkins) && entry.ownedSkins.includes('premium');
}

// 해당 배지가 현재 프리미엄 스킨을 장착(선택) 중인지 확인한다.
export function isBadgeUpgradeSelected(userData = {}, badgeId) {
  return userData?.badgeUpgrades?.[badgeId]?.selectedSkin === 'premium';
}

// 배지가 표시해야 할 스킨('premium' 또는 'basic')을 반환한다.
// 프리미엄을 보유하고 선택한 경우에만 'premium'.
export function getBadgeActiveSkin(userData = {}, badgeId) {
  return isBadgeUpgradeOwned(userData, badgeId) && isBadgeUpgradeSelected(userData, badgeId)
    ? 'premium'
    : 'basic';
}
