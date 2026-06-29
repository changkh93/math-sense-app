const ANONYMOUS_LABELS = [
  '용감한 사자',
  '차분한 고래',
  '반짝이는 여우',
  '끈기 있는 거북이',
  '영리한 부엉이',
  '재빠른 치타',
  '단단한 코끼리',
  '자유로운 돌고래'
];

export const AGORA_BOUNTY_OPTIONS = [0, 10, 30, 50, 100];
export const AGORA_BASE_ACCEPT_REWARD = 20;
export const AGORA_ASKER_RESOLVE_REWARD = 5;
export const AGORA_SELF_RESOLVE_REWARD = 0;
export const AGORA_PARTIAL_REFUND_RATIO = 0.5;
export const HALL_OF_FAME_LOOKBACK_DAYS = 7;
export const HALL_SHOWCASE_DURATION_DAYS = 7;
export const CREW_CREATION_COST = 1000;
export const CREW_JOIN_COST = 300;

export const PROFILE_FRAMES = [
  {
    id: 'starter',
    name: '스타터 프레임',
    accent: '#00f3ff',
    bg: 'linear-gradient(135deg, rgba(0, 243, 255, 0.16), rgba(11, 18, 42, 0.95))',
  },
  {
    id: 'nebula',
    name: '네뷸라 프레임',
    accent: '#8b5cf6',
    bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(17, 24, 39, 0.96))',
  },
  {
    id: 'solar',
    name: '솔라 프레임',
    accent: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(17, 24, 39, 0.96))',
  },
];

export const PROFILE_TITLES = [
  '개념 항해사',
  '문제 구조 해설가',
  '차분한 설명가',
  '끝까지 파고드는 탐구자',
  '성장 중인 파일럿'
];

export const BASE_THEMES = [
  {
    id: 'orbital',
    name: '기본 궤도 기지',
    icon: '🛰️',
    accent: '#00f3ff',
    pageBackground: 'var(--space-gradient)',
    surface: 'rgba(15, 23, 42, 0.72)',
    description: '메타센스 기본 우주 기지 배경입니다.',
  },
  {
    id: 'aurora_observatory',
    name: '오로라 관측소',
    icon: '🌌',
    accent: '#34d399',
    pageBackground: 'radial-gradient(circle at 18% 18%, rgba(52, 211, 153, 0.24), transparent 32%), radial-gradient(circle at 78% 12%, rgba(96, 165, 250, 0.2), transparent 34%), linear-gradient(135deg, #071a1a 0%, #0f172a 52%, #10233d 100%)',
    surface: 'rgba(8, 30, 32, 0.74)',
    description: '차분한 녹청빛 관측소 분위기의 탐험기지 배경입니다.',
  },
  {
    id: 'solar_archive',
    name: '황금 기록보관소',
    icon: '☀️',
    accent: '#f59e0b',
    pageBackground: 'radial-gradient(circle at 78% 16%, rgba(245, 158, 11, 0.24), transparent 34%), radial-gradient(circle at 16% 72%, rgba(239, 68, 68, 0.12), transparent 34%), linear-gradient(135deg, #1f1306 0%, #111827 52%, #2a1808 100%)',
    surface: 'rgba(30, 20, 10, 0.8)',
    description: '화려한 황금 천정과 기록관 벽면이 보이는 탐험기지 배경입니다.',
  },
  {
    id: 'deep_lab',
    name: '심해 연구기지',
    icon: '🔬',
    accent: '#38bdf8',
    pageBackground: 'radial-gradient(circle at 22% 18%, rgba(56, 189, 248, 0.22), transparent 32%), radial-gradient(circle at 72% 78%, rgba(20, 184, 166, 0.14), transparent 36%), linear-gradient(135deg, #061826 0%, #0f172a 54%, #082f49 100%)',
    surface: 'rgba(5, 20, 32, 0.82)',
    description: '생물발광 산호와 유리 돔 연구기지가 보이는 심해 탐험 배경입니다.',
  },
];

export const SOCIAL_STORE_ITEMS = [
  {
    id: 'signature_unlock',
    name: '시그니처 해금',
    icon: '✍️',
    cost: 30,
    type: 'profile',
    description: '답변 카드 아래에 짧은 한 줄 시그니처를 표시할 수 있습니다.',
  },
  {
    id: 'frame_nebula',
    name: '네뷸라 프레임',
    icon: '🟣',
    cost: 50,
    type: 'profile',
    description: '공개 프로필 명함에 은은한 보랏빛 프레임을 적용할 수 있습니다.',
  },
  {
    id: 'frame_solar',
    name: '솔라 프레임',
    icon: '🌞',
    cost: 150,
    type: 'profile',
    description: '랭킹과 답변 카드에서 눈에 띄는 금빛 프레임을 해금합니다.',
  },
  {
    id: 'base_aurora_observatory',
    name: '오로라 관측소',
    icon: '🌌',
    cost: 120,
    type: 'base',
    themeId: 'aurora_observatory',
    description: '나의 탐험기지 공개 페이지에 녹청빛 관측소 배경을 적용할 수 있습니다.',
  },
  {
    id: 'base_solar_archive',
    name: '황금 기록보관소',
    icon: '☀️',
    cost: 160,
    type: 'base',
    themeId: 'solar_archive',
    description: '공개 탐험기지에 화려한 황금 기록관 배경을 적용할 수 있습니다.',
  },
  {
    id: 'base_deep_lab',
    name: '심해 연구기지',
    icon: '🔬',
    cost: 140,
    type: 'base',
    themeId: 'deep_lab',
    description: '공개 탐험기지에 생물발광 산호와 심해 연구 돔 배경을 적용할 수 있습니다.',
  },
  {
    id: 'hall_showcase_credit',
    name: '명예의 전당 쇼케이스',
    icon: '🏆',
    cost: 50,
    type: 'hall',
    description: '이번 주 전당에 오른 경우, 1주일 추가 강조 노출을 사용할 수 있습니다.',
  },
  {
    id: 'crew_creation_pass',
    name: '스터디 크루 창설권',
    icon: '🛰️',
    cost: CREW_CREATION_COST,
    type: 'crew',
    description: '나만의 스터디 크루를 만들고 이름, 모토, 엠블럼 색상을 설정할 수 있습니다.',
  },
  {
    id: 'crew_join_pass',
    name: '스터디 크루 참여권',
    icon: '🎟️',
    cost: CREW_JOIN_COST,
    type: 'crew',
    description: '초대 코드를 가진 크루에 합류할 때 사용하는 참여권입니다.',
  },
];

function hashSeed(seed = '') {
  return Array.from(seed).reduce((acc, char, index) => acc + (char.charCodeAt(0) * (index + 1)), 0);
}

export function getAnonymousLabel(seed) {
  if (!seed) return ANONYMOUS_LABELS[0];
  return ANONYMOUS_LABELS[hashSeed(seed) % ANONYMOUS_LABELS.length];
}

export function getProfileFrame(frameId) {
  return PROFILE_FRAMES.find(frame => frame.id === frameId) || PROFILE_FRAMES[0];
}

export function getBaseTheme(themeId) {
  return BASE_THEMES.find(theme => theme.id === themeId) || BASE_THEMES[0];
}

export function getFrameSurfaceStyles(frameId, mode = 'panel') {
  const frame = getProfileFrame(frameId);

  if (frame.id === 'nebula') {
    return {
      borderColor: 'rgba(139, 92, 246, 0.45)',
      background: mode === 'row'
        ? 'linear-gradient(135deg, rgba(8, 15, 40, 0.95), rgba(28, 16, 52, 0.88))'
        : 'linear-gradient(135deg, rgba(10, 14, 36, 0.98), rgba(26, 17, 58, 0.92) 45%, rgba(10, 16, 36, 0.98))',
      glow: '0 0 28px rgba(139, 92, 246, 0.16)',
      accent: '#a78bfa',
      text: '#f5f3ff',
      mutedText: 'rgba(245, 243, 255, 0.72)',
    };
  }

  if (frame.id === 'solar') {
    return {
      borderColor: 'rgba(245, 158, 11, 0.42)',
      background: mode === 'row'
        ? 'linear-gradient(135deg, rgba(39, 20, 6, 0.95), rgba(52, 30, 8, 0.88))'
        : 'linear-gradient(135deg, rgba(33, 18, 6, 0.98), rgba(66, 34, 8, 0.92) 45%, rgba(30, 19, 8, 0.98))',
      glow: '0 0 28px rgba(245, 158, 11, 0.16)',
      accent: '#fbbf24',
      text: '#fff7ed',
      mutedText: 'rgba(255, 247, 237, 0.72)',
    };
  }

  return {
    borderColor: 'rgba(0, 243, 255, 0.35)',
    background: mode === 'row'
      ? 'linear-gradient(135deg, rgba(10, 20, 38, 0.94), rgba(15, 24, 50, 0.86))'
      : frame.bg,
    glow: '0 0 24px rgba(0, 243, 255, 0.12)',
    accent: frame.accent,
    text: '#e0f7ff',
    mutedText: 'rgba(224, 247, 255, 0.7)',
  };
}

export function getPublicProfile(userData = {}, fallbackName = '탐험가') {
  const safeUserData = userData && typeof userData === 'object' ? userData : {};
  const publicDisplayName = (safeUserData.publicDisplayName || safeUserData.studentName || safeUserData.name || fallbackName || '탐험가').trim();
  const selectedFrame = safeUserData.selectedProfileFrame || 'starter';
  const frame = getProfileFrame(selectedFrame);

  return {
    publicDisplayName,
    publicTitle: (safeUserData.publicTitle || '').trim(),
    publicSignature: (safeUserData.publicSignature || '').trim(),
    publicProfileEnabled: safeUserData.publicProfileEnabled !== false,
    profileFrameId: frame.id,
    frameName: frame.name,
    frameAccent: frame.accent,
    frameBackground: frame.bg,
    crewId: safeUserData.crewId || '',
    crewName: safeUserData.crewName || '',
    crewRole: safeUserData.crewRole || '',
    crewColor: safeUserData.crewColor || '#00f3ff',
    helpCount: safeUserData.helpCount || 0,
    questionCount: safeUserData.questionCount || 0,
    hallSpotlightUntilMs: safeUserData.hallSpotlightUntilMs || 0,
    selectedBaseTheme: getBaseTheme(safeUserData.selectedBaseTheme).id,
  };
}

export function normalizeOwnedFrames(userData = {}) {
  const safeUserData = userData && typeof userData === 'object' ? userData : {};
  const owned = Array.isArray(safeUserData.ownedProfileFrames) ? safeUserData.ownedProfileFrames : [];
  return Array.from(new Set(['starter', ...owned]));
}

export function normalizeOwnedBaseThemes(userData = {}) {
  const safeUserData = userData && typeof userData === 'object' ? userData : {};
  const owned = Array.isArray(safeUserData.ownedBaseThemes) ? safeUserData.ownedBaseThemes : [];
  return Array.from(new Set(['orbital', ...owned]));
}

export function buildAnswerProfileSnapshot(userData = {}, fallbackName = '탐험가') {
  const profile = getPublicProfile(userData, fallbackName);
  return {
    displayName: profile.publicDisplayName,
    publicTitle: profile.publicTitle,
    publicSignature: profile.publicSignature,
    profileFrameId: profile.profileFrameId,
    frameName: profile.frameName,
    frameAccent: profile.frameAccent,
    frameBackground: profile.frameBackground,
    crewId: profile.crewId,
    crewName: profile.crewName,
    crewRole: profile.crewRole,
    crewColor: profile.crewColor,
    helpCount: profile.helpCount,
    questionCount: profile.questionCount,
    hallSpotlightUntilMs: profile.hallSpotlightUntilMs,
  };
}

export function isHallSpotlightActive(userData, nowMs = Date.now()) {
  if (!userData || typeof userData !== 'object') return false;
  return (userData.hallSpotlightUntilMs || 0) > nowMs;
}

export function getRelativeDayLabel(ms, nowMs = Date.now()) {
  if (!ms) return '';
  const remaining = ms - nowMs;
  if (remaining <= 0) return '만료';
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return `${days}일`;
}

export function getWeekKey(date = new Date()) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + diff);
  return base.toISOString().slice(0, 10);
}

export function isWithinLastDays(value, days, nowMs = Date.now()) {
  if (!value) return false;
  const ms = typeof value === 'number'
    ? value
    : value?.toDate
      ? value.toDate().getTime()
      : new Date(value).getTime();

  if (!Number.isFinite(ms)) return false;
  return nowMs - ms <= days * 24 * 60 * 60 * 1000;
}

export function createCrewInviteCode(seed = '') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = hashSeed(seed) + Date.now();
  let code = '';

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length);
  }

  return code;
}
