export const EXPLORER_LEVELS = [
  { level: 1, threshold: 0, title: '수습 항해사' },
  { level: 2, threshold: 100, title: '별빛 수집가' },
  { level: 3, threshold: 250, title: '궤도 계산가' },
  { level: 4, threshold: 500, title: '성운 탐험가' },
  { level: 5, threshold: 1000, title: '문제 해결 파일럿' },
  { level: 6, threshold: 2000, title: '블랙홀 전략가' },
  { level: 7, threshold: 5000, title: '은하계의 뉴턴' },
  { level: 8, threshold: 9000, title: '별자리의 가우스' },
  { level: 9, threshold: 15000, title: '차원의 오일러' },
  { level: 10, threshold: 24000, title: '우주의 아인슈타인' },
  { level: 11, threshold: 38000, title: '아고라의 아르키메데스' },
  { level: 12, threshold: 60000, title: '스텔라의 전설' },
  { level: 13, threshold: 100000, title: '진리의 피타고라스' },
  { level: 14, threshold: 160000, title: '초공간의 페르마' },
  { level: 15, threshold: 250000, title: '무한연산의 튜링' },
  { level: 16, threshold: 400000, title: '초시공의 푸앵카레' },
  { level: 17, threshold: 600000, title: '다차원의 리만' },
  { level: 18, threshold: 850000, title: '신의 직관 라마누잔' },
  { level: 19, threshold: 1200000, title: '무한공간의 힐베르트' },
  { level: 20, threshold: 2000000, title: '코스모스의 초월자' },
];

function readNonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * 소비 가능한 보유 광석과 영구적인 탐사 성취를 분리한다.
 *
 * lifetimeLearningCrystalsEarned / galaxyLearningOreV2Total은 학습과 아고라에서
 * 획득한 양의 누적 원장이다. 구형 사용자의 원장 백필이 완료되기 전에도
 * 현재 등급이 급락하지 않도록 보유 잔액을 최소 보장값으로 사용한다.
 */
export function getExplorerExperience(userData = {}) {
  const source = userData && typeof userData === 'object' ? userData : {};
  return Math.floor(Math.max(
    readNonNegativeNumber(source.lifetimeLearningCrystalsEarned),
    readNonNegativeNumber(source.galaxyLearningOreV2Total),
    readNonNegativeNumber(source.crystals)
  ));
}

export function calculateExplorerLevel(experience = 0) {
  const safeExperience = readNonNegativeNumber(experience);
  let currentLevel = EXPLORER_LEVELS[0];

  for (let i = 1; i < EXPLORER_LEVELS.length; i += 1) {
    if (safeExperience >= EXPLORER_LEVELS[i].threshold) {
      currentLevel = EXPLORER_LEVELS[i];
    } else {
      break;
    }
  }

  const nextLevel = EXPLORER_LEVELS.find((item) => item.level === currentLevel.level + 1);
  const isMaxLevel = !nextLevel;
  const currentThreshold = currentLevel.threshold;
  const nextThreshold = nextLevel?.threshold ?? currentThreshold;
  const rangeSize = nextThreshold - currentThreshold;
  const experienceInRange = safeExperience - currentThreshold;
  const progress = isMaxLevel
    ? 100
    : rangeSize > 0
      ? Math.min(100, Math.round((experienceInRange / rangeSize) * 100))
      : 0;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextTitle: nextLevel?.title || null,
    progress,
    remaining: isMaxLevel ? 0 : Math.max(0, Math.ceil(nextThreshold - safeExperience)),
    currentThreshold,
    nextThreshold,
    isMaxLevel,
  };
}
