import agoraHelperBadge from '../assets/badge/agora_helper.png';
import kindSolverBadge from '../assets/badge/kind_solver.png';
import questionPioneerBadge from '../assets/badge/question_pioneer.png';
import cosmosInitiateBadge from '../assets/badge/cosmos_initiate.png';
import crystalCollectorBadge from '../assets/badge/crystal_collector.png';
import galaxyScholarBadge from '../assets/badge/galaxy_scholar.png';
import astronautBadge from '../assets/badge/astronaut.png';
import pioneerBadge from '../assets/badge/pioneer.png';
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

import masterRegAdditionBadge from '../assets/badge/master_reg_addition.png';
import masterRegMultiplicationBadge from '../assets/badge/master_reg_multiplication.png';
import masterRegDivisionBadge from '../assets/badge/master_reg_division.png';
import masterRegFractionsBadge from '../assets/badge/master_reg_fractions.png';
import masterRegDecimalsBadge from '../assets/badge/master_reg_decimals.png';
import masterRegRatiosBadge from '../assets/badge/master_reg_ratios.png';
import masterRegElemMonthlyBadge from '../assets/badge/master_reg_elem_monthly.png';

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

  // --- 코스 및 성역(Region) 마스터 각성 이미지 슬롯 ---
  master_cluster_elementary: null,
  master_cluster_middle: null,
  master_cluster_python: null,
  master_cluster_classic: null,

  master_reg_addition: masterRegAdditionBadge,
  master_reg_multiplication: masterRegMultiplicationBadge,
  master_reg_division: masterRegDivisionBadge,
  master_reg_fractions: masterRegFractionsBadge,
  master_reg_decimals: masterRegDecimalsBadge,
  master_reg_ratios: masterRegRatiosBadge,
  master_reg_elem_monthly: masterRegElemMonthlyBadge,

  master_reg_mid_basic: null,
  master_reg_mid_eval: null,
  master_reg_mid_num_exp: null,
  master_reg_mid_func_stat: null,
  master_reg_mid_geometry: null,
  master_reg_mid_exam: null,

  master_reg_py_basic: null,
  master_reg_py_game: null,
  master_reg_py_advanced: null,
  master_reg_py_math: null,

  master_reg_classic_neverland: null,
  master_reg_classic_western: null,
  master_reg_classic_nobel: null,
};

// 업그레이드 가능한 배지 id 목록
export const UPGRADABLE_BADGE_IDS = Object.keys(BADGE_PREMIUM_IMAGES);

// unitId/chapterId로부터 regionId를 유추하는 헬퍼
function inferRegionId(unitId = '', chapterId = '', regionId = '') {
  if (regionId) return regionId;
  const uid = String(unitId || '').toLowerCase();
  const cid = String(chapterId || '').toLowerCase();
  if (uid.startsWith('add') || uid.includes('addition') || cid.includes('add')) return 'addition';
  if (uid.startsWith('mul') || uid.includes('multiplication') || cid.includes('mul')) return 'multiplication';
  if (uid.startsWith('div') || uid.includes('division') || cid.includes('div')) return 'division';
  if (uid.startsWith('frac') || uid.includes('fraction') || cid.includes('frac')) return 'fractions';
  if (uid.startsWith('dec') || uid.includes('decimal') || cid.includes('dec')) return 'decimals';
  if (uid.startsWith('rat') || uid.includes('ratio') || cid.includes('rat')) return 'ratios';
  return '';
}

export function calculateCollectionBadgeStats(history = [], userData = {}) {
  const summary = userData?.learningSummary;
  const unitMap = new Map(); // unitId -> { score, clusterId, regionId }

  // 1. learningSummary 단위 수집
  const summaryUnits = summary?.units || [];
  summaryUnits.forEach((u) => {
    const score = u.bestQuizScore ?? u.bestWorkbookScore;
    if (Number.isFinite(Number(score))) {
      const regId = inferRegionId(u.unitId, u.chapterId, u.regionId);
      unitMap.set(u.unitId, {
        score: Number(score),
        clusterId: u.clusterId || 'cluster_elementary',
        regionId: regId,
      });
    }
  });

  // 2. 히스토리 단위 수집 (중복 제거 및 최곳값 갱신)
  (history || []).forEach((entry) => {
    if (!entry?.unitId || typeof entry.score !== 'number') return;
    const existing = unitMap.get(entry.unitId);
    const regId = inferRegionId(entry.unitId, entry.chapterId, entry.regionId);
    const score = Number(entry.score);
    if (!existing || score > existing.score) {
      unitMap.set(entry.unitId, {
        score,
        clusterId: entry.clusterId || existing?.clusterId || 'cluster_elementary',
        regionId: regId || existing?.regionId || '',
      });
    }
  });

  // 3. 고유 완주 단원 수 및 성역별/코스별 통계 계산
  const regionUniquePassedUnits = {};
  const clusterUniquePassedUnits = {};
  const clusterScoreSumMap = {};

  unitMap.forEach((data) => {
    if (data.regionId) {
      regionUniquePassedUnits[data.regionId] = (regionUniquePassedUnits[data.regionId] || 0) + 1;
    }
    if (data.clusterId) {
      clusterUniquePassedUnits[data.clusterId] = (clusterUniquePassedUnits[data.clusterId] || 0) + 1;
      clusterScoreSumMap[data.clusterId] = (clusterScoreSumMap[data.clusterId] || 0) + data.score;
    }
  });

  // 4. 어드민에서 완료(확인) 처리된 과제 수 계산
  const regionReviewedAssignments = {};
  const clusterReviewedAssignments = {};
  const userAssignments = Array.isArray(userData?.assignments) ? userData.assignments : [];
  userAssignments.forEach((a) => {
    if (a.status === 'reviewed' || a.status === 'completed') {
      const regId = inferRegionId(a.unitId, a.chapterId, a.regionId);
      const cid = a.clusterId || 'cluster_elementary';
      if (regId) {
        regionReviewedAssignments[regId] = (regionReviewedAssignments[regId] || 0) + 1;
      }
      clusterReviewedAssignments[cid] = (clusterReviewedAssignments[cid] || 0) + 1;
    }
  });

  const bestScores = Array.from(unitMap.values()).map((u) => u.score);
  const quizScoreSum = bestScores.reduce((sum, s) => sum + s, 0);

  return {
    quizAttempts: history.length,
    quizScoreSum,
    quizAverageScore: history.length ? quizScoreSum / history.length : 0,
    perfectAttempts: bestScores.filter((s) => s === 100).length,
    uniqueQuizUnits: bestScores.length,
    averageScore: bestScores.length ? quizScoreSum / bestScores.length : 0,
    perfectUnits: bestScores.filter((s) => s === 100).length,
    regionUniquePassedUnits,
    clusterUniquePassedUnits,
    regionReviewedAssignments,
    clusterReviewedAssignments,
    clusterScoreSumMap,
  };
}

export function buildSocialBadges(userData = {}) {
  const profile = userData || {};
  return [
    {
      id: 'agora_helper',
      title: '아고라 조력자',
      icon: '🤝',
      category: 'social',
      unlocked: (profile.helpCount || 0) >= 1,
      desc: '채택된 답변을 보유했습니다.'
    },
    {
      id: 'kind_solver',
      title: '친절한 해결사',
      icon: '🌟',
      category: 'social',
      unlocked: (profile.helpCount || 0) >= 5,
      desc: '도움 5회 이상을 달성했습니다.'
    },
    {
      id: 'question_pioneer',
      title: '질문 개척자',
      icon: '💬',
      category: 'social',
      unlocked: (profile.questionCount || 0) >= 10,
      desc: '질문 10개 이상을 남겼습니다.'
    },
  ];
}

export function buildCollectionBadges(userData = {}, history = []) {
  const quizStats = calculateCollectionBadgeStats(history, userData);

  // 성역(Region) 마스터 배지 해금 기준:
  // 오직 운영 툴 완료 처리 또는 학생 단 탐사 완주(자동 승격)로 userData.regionAccess[regionId] === 'completed' 일 때만 완료 인정
  const isRegionMastered = (regionId) => {
    return userData?.regionAccess?.[regionId] === 'completed';
  };

  // 코스(Cluster) 마스터 배지 해금 기준:
  // 코스 권한이 'completed'이거나 해당 코스의 성역들이 모두 'completed' 일 때 인정
  const isClusterMastered = (clusterId) => {
    if (userData?.clusterAccess?.[clusterId] === 'completed') return true;

    if (clusterId === 'cluster_elementary') {
      const elemRegions = ['addition', 'multiplication', 'division', 'fractions', 'decimals', 'ratios'];
      return elemRegions.every((rid) => userData?.regionAccess?.[rid] === 'completed');
    }
    if (clusterId === 'middle-math') {
      const midRegions = ['reg_1773407437227', 'reg_1774698354292', 'reg_1775113850179', 'reg_1775113861010', 'reg_1775113875836', 'reg_1781420075936'];
      return midRegions.every((rid) => userData?.regionAccess?.[rid] === 'completed');
    }
    if (clusterId === 'python') {
      const pyRegions = ['reg_python_course', 'reg_python_game_project', 'reg_python_advanced', 'reg_python_math'];
      return pyRegions.every((rid) => userData?.regionAccess?.[rid] === 'completed');
    }
    if (clusterId === 'western-classic') {
      const classicRegions = ['reg_1776154036888', 'reg_1776158746744', 'reg_1776240768916'];
      return classicRegions.every((rid) => userData?.regionAccess?.[rid] === 'completed');
    }

    return false;
  };

  const badges = [
    ...buildSocialBadges(userData),
    { id: 'cosmos_initiate', title: '코스모스 입문', icon: '🌌', category: 'general', unlocked: quizStats.uniqueQuizUnits > 0, desc: '첫 번째 수학 탐사를 성공적으로 마쳤습니다.' },
    { id: 'crystal_collector', title: '광석 수집가', icon: '💎', category: 'general', unlocked: (userData?.crystals || 0) >= 500, desc: '광석을 500개 이상 모았습니다. (중급 대원)' },
    { id: 'galaxy_scholar', title: '은하 학자', icon: '📜', category: 'general', unlocked: quizStats.averageScore >= 95, desc: '평균 정답률 95% 이상을 유지 중인 엘리트 대원입니다.' },
    { id: 'astronaut', title: '우주 비행사', icon: '👨‍🚀', category: 'general', unlocked: quizStats.uniqueQuizUnits >= 30, desc: '탐험을 30번 이상 완료한 숙련된 비행사입니다.' },
    { id: 'pioneer', title: '행성 개척자', icon: '🚩', category: 'general', unlocked: quizStats.uniqueQuizUnits >= 70, desc: '수많은 행성을 개척한 위대한 탐험가입니다.' },
    
    // --- 코스(Cluster) 마스터 배지 ---
    { id: 'master_cluster_elementary', title: '초등수학 마스터', icon: '🏫', category: 'course_master', clusterId: 'cluster_elementary', unlocked: isClusterMastered('cluster_elementary'), desc: '초등수학 성단의 탐사를 완수한 으뜸 마스터 대원입니다.' },
    { id: 'master_cluster_middle', title: '중등수학 마스터', icon: '📐', category: 'course_master', clusterId: 'middle-math', unlocked: isClusterMastered('middle-math'), desc: '중등수학 성단의 개념과 문제 탐사를 정복한 마스터입니다.' },
    { id: 'master_cluster_python', title: '파이썬 코딩 마스터', icon: '🐍', category: 'course_master', clusterId: 'python', unlocked: isClusterMastered('python'), desc: '파이썬 알고리즘과 프로젝트 탐사를 마친 코딩 마스터입니다.' },
    { id: 'master_cluster_classic', title: '서양 고전 마스터', icon: '🏛️', category: 'course_master', clusterId: 'western-classic', unlocked: isClusterMastered('western-classic'), desc: '인류의 지혜가 담긴 고전 명작을 탐독한 지식 마스터입니다.' },

    // --- 초등수학 성역(Region) 마스터 배지 ---
    { id: 'master_reg_addition', title: '아디테라 마스터', icon: '➕', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'addition', regionName: '아디테라 (Additera)', unlocked: isRegionMastered('addition'), desc: '덧셈 행성 아디테라의 탐사를 완수했습니다.' },
    { id: 'master_reg_multiplication', title: '멀티플루비아 마스터', icon: '✖️', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'multiplication', regionName: '멀티플루비아 (Multipluvia)', unlocked: isRegionMastered('multiplication'), desc: '곱셈 행성 멀티플루비아의 탐사를 완수했습니다.' },
    { id: 'master_reg_division', title: '디비디아 마스터', icon: '➗', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'division', regionName: '디비디아 (Dividia)', unlocked: isRegionMastered('division'), desc: '나눗셈 행성 디비디아의 탐사를 완수했습니다.' },
    { id: 'master_reg_fractions', title: '프락토니스 마스터', icon: '🍕', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'fractions', regionName: '프락토니스 (Fractonis)', unlocked: isRegionMastered('fractions'), desc: '분수 행성 프락토니스의 탐사를 완수했습니다.' },
    { id: 'master_reg_decimals', title: '데시멜라 마스터', icon: '🔢', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'decimals', regionName: '데시멜라 (Decimella)', unlocked: isRegionMastered('decimals'), desc: '소수 행성 데시멜라의 탐사를 완수했습니다.' },
    { id: 'master_reg_ratios', title: '라티오카스 마스터', icon: '📊', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'ratios', regionName: '라티오카스 (Ratiocast)', unlocked: isRegionMastered('ratios'), desc: '비율 행성 라티오카스의 탐사를 완수했습니다.' },
    { id: 'master_reg_elem_monthly', title: '초등 월간평가 마스터', icon: '📝', category: 'region_master', clusterId: 'cluster_elementary', regionId: 'reg_1774390167801', regionName: '초등수학 월간평가', unlocked: isRegionMastered('reg_1774390167801'), desc: '초등수학 월간 실력 평가 탐사를 완수했습니다.' },

    // --- 중등수학 성역(Region) 마스터 배지 ---
    { id: 'master_reg_mid_basic', title: '기본개념 전과정 마스터', icon: '📘', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1773407437227', regionName: '기본개념 전과정', unlocked: isRegionMastered('reg_1773407437227'), desc: '중등수학 기본 개념 전과정을 완전 마스터했습니다.' },
    { id: 'master_reg_mid_eval', title: '단원평가&모의고사 마스터', icon: '📝', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1774698354292', regionName: '단원평가&모의고사', unlocked: isRegionMastered('reg_1774698354292'), desc: '중등 단원평가 및 모의고사 탐사를 완전 마스터했습니다.' },
    { id: 'master_reg_mid_num_exp', title: '수와 연산 & 문자와 식 마스터', icon: '🧮', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1775113850179', regionName: '절대개념 - 수와 연산 & 문자와 식', unlocked: isRegionMastered('reg_1775113850179'), desc: '수와 연산 및 문자와 식 핵심 개념을 마스터했습니다.' },
    { id: 'master_reg_mid_func_stat', title: '함수 & 확률과 통계 마스터', icon: '📈', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1775113861010', regionName: '절대개념 - 함수 & 확률과 통계', unlocked: isRegionMastered('reg_1775113861010'), desc: '함수 및 확률과 통계 핵심 개념을 마스터했습니다.' },
    { id: 'master_reg_mid_geometry', title: '절대개념 기하 마스터', icon: '📐', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1775113875836', regionName: '절대개념 - 기하', unlocked: isRegionMastered('reg_1775113875836'), desc: '중등 기하/도형 핵심 개념 영역을 마스터했습니다.' },
    { id: 'master_reg_mid_exam', title: '내신기출문제 마스터', icon: '🏆', category: 'region_master', clusterId: 'middle-math', regionId: 'reg_1781420075936', regionName: '내신기출문제', unlocked: isRegionMastered('reg_1781420075936'), desc: '중학교 내신 기출 문제 탐사를 완수했습니다.' },

    // --- 파이썬 성역(Region) 마스터 배지 ---
    { id: 'master_reg_py_basic', title: '처음 파이썬 마스터', icon: '🐍', category: 'region_master', clusterId: 'python', regionId: 'reg_python_course', regionName: '처음 파이썬', unlocked: isRegionMastered('reg_python_course'), desc: '처음 파이썬 코딩 입문 탐사를 마스터했습니다.' },
    { id: 'master_reg_py_game', title: '게임 프로젝트 마스터', icon: '🎮', category: 'region_master', clusterId: 'python', regionId: 'reg_python_game_project', regionName: '게임 프로젝트', unlocked: isRegionMastered('reg_python_game_project'), desc: '파이썬 게임 제작 프로젝트 탐사를 마스터했습니다.' },
    { id: 'master_reg_py_advanced', title: '파이썬 심화 마스터', icon: '⚡', category: 'region_master', clusterId: 'python', regionId: 'reg_python_advanced', regionName: '파이썬 심화', unlocked: isRegionMastered('reg_python_advanced'), desc: '파이썬 심화 알고리즘 탐사를 마스터했습니다.' },
    { id: 'master_reg_py_math', title: '파이썬 수학 마스터', icon: '🧮', category: 'region_master', clusterId: 'python', regionId: 'reg_python_math', regionName: '파이썬 수학', unlocked: isRegionMastered('reg_python_math'), desc: '파이썬 수학 연산 모듈 탐사를 마스터했습니다.' },

    // --- 서양 고전 읽기 성역(Region) 마스터 배지 ---
    { id: 'master_reg_classic_neverland', title: '네버랜드 클래식 마스터', icon: '🧚', category: 'region_master', clusterId: 'western-classic', regionId: 'reg_1776154036888', regionName: '네버랜드 클래식', unlocked: isRegionMastered('reg_1776154036888'), desc: '네버랜드 클래식 명작 독독 탐사를 마스터했습니다.' },
    { id: 'master_reg_classic_western', title: '서양고전읽기 마스터', icon: '🏛️', category: 'region_master', clusterId: 'western-classic', regionId: 'reg_1776158746744', regionName: '서양고전읽기', unlocked: isRegionMastered('reg_1776158746744'), desc: '서양 고전 필독서 독서 탐사를 마스터했습니다.' },
    { id: 'master_reg_classic_nobel', title: '노벨문학상 수상작 마스터', icon: '🎖️', category: 'region_master', clusterId: 'western-classic', regionId: 'reg_1776240768916', regionName: '노벨문학상 수상작', unlocked: isRegionMastered('reg_1776240768916'), desc: '노벨문학상 수상작 독독 탐사를 마스터했습니다.' },

    // --- 기존 업적 배지 ---
    { id: 'flawless_orbit', title: '무결점 궤도', icon: '🛰️', category: 'general', unlocked: (userData?.consecutiveGood || 0) >= 10, desc: '연속 10세트 동안 정답률 90% 이상을 유지했습니다.' },
    { id: 'supernova', title: '슈퍼노바', icon: '💥', category: 'general', unlocked: (userData?.dailyQuizCount || 0) >= 5, desc: '하루에 5세트 이상의 탐사를 완수했습니다.' },
    { id: 'deep_voyager', title: '심우주 항해사', icon: '🌠', category: 'general', unlocked: quizStats.uniqueQuizUnits >= 100, desc: '누적 퀴즈 100세트를 돌파한 베테랑 항해사입니다.' },
    { id: 'math_guardian', title: '수학의 수호자', icon: '🛡️', category: 'general', unlocked: (userData?.shieldDefended || 0) >= 200, desc: '광자 실드로 에너지(광석) 손실을 200회 이상 방어했습니다.' },
    { id: 'perfect_leap', title: '완벽한 도약', icon: '⚡', category: 'general', unlocked: quizStats.perfectUnits >= 20, desc: '백점 보너스(+10)를 20회 달성한 완벽주의 대원입니다.' },
    { id: 'voyage_start', title: '항해의 시작', icon: '🕯️', category: 'general', unlocked: (userData?.longestStreak || 0) >= 3, desc: '3일 연속 학습을 달성했습니다.' },
    { id: 'orbit_entry', title: '궤도 진입', icon: '🔵', category: 'general', unlocked: (userData?.longestStreak || 0) >= 7, desc: '7일 연속 학습! 안정 궤도에 진입했습니다.' },
    { id: 'stellar_wind_surfer', title: '항성풍 서퍼', icon: '🟣', category: 'general', unlocked: (userData?.longestStreak || 0) >= 30, desc: '30일 연속! 항성풍을 타고 항해 중입니다.' },
    { id: 'supernova_burst', title: '초신성 폭발', icon: '💫', category: 'general', unlocked: (userData?.longestStreak || 0) >= 100, desc: '100일 연속! 초신성급 에너지를 방출합니다.' },
    { id: 'eternal_voyager', title: '영원한 항해사', icon: '🌌', category: 'general', unlocked: (userData?.longestStreak || 0) >= 365, desc: '365일 연속! 은하핵에 도달한 전설의 항해사.' },
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
