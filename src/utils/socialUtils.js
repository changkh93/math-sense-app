// 공개 질문자의 익명 닉네임은 사용자 ID로부터 결정적으로 생성한다.
// 장소/행동(36) x 성격(40) x 캐릭터(72) x 탐사선 번호(997)로
// 1억 가지가 넘는 조합을 만들 수 있어
// 같은 사용자는 계속 같은 이름을 쓰면서도 사용자 간 중복은 크게 줄어든다.
const ANONYMOUS_SCENES = [
  '새벽별을 줍는', '은하수를 건너는', '블랙홀 옆을 지나는', '달빛을 모으는',
  '혜성 꼬리를 타는', '토성 고리를 닦는', '화성에서 길 찾는', '별자리를 그리는',
  '우주선을 수리하는', '웜홀을 탐험하는', '성운에서 춤추는', '유성을 기다리는',
  '달 뒷면을 걷는', '별빛으로 계산하는', '궤도를 바꾸는', '외계 신호를 듣는',
  '태양풍을 가르는', '은하 지도를 펴는', '소행성을 피하는', '우주 먼지를 터는',
  '평행우주를 엿보는', '시간여행을 준비하는', '로켓 연료를 채우는', '미지수를 추적하는',
  '공식을 발명하는', '좌표평면을 달리는', '무한대를 꿈꾸는', '소수별을 세는',
  '분수 피자를 나누는', '함수 그래프를 타는', '정답 별을 찾는', '오답 성운을 밝히는',
  '수학 행성을 도는', '차원문을 두드리는', '별자리 퀴즈를 푸는', '우주 도서관에 사는'
];

const ANONYMOUS_TRAITS = [
  '용감한', '차분한', '반짝이는', '끈기 있는', '영리한', '재빠른', '엉뚱한', '다정한',
  '유쾌한', '호기심 많은', '상상력 넘치는', '논리적인', '느긋한', '야무진', '명랑한', '수줍은',
  '재치 있는', '집중하는', '긍정적인', '대담한', '꼼꼼한', '자유로운', '든든한', '기발한',
  '열정적인', '꿈꾸는', '똑부러진', '평화로운', '장난꾸러기', '믿음직한', '활기찬', '사려 깊은',
  '호쾌한', '신중한', '낭만적인', '당찬', '포근한', '총명한', '상냥한', '뾰족한'
];

const ANONYMOUS_CHARACTERS = [
  '쿼카', '라쿤', '수달', '카피바라', '레서판다', '사막여우', '북극여우', '아기 판다',
  '알파카', '나무늘보', '미어캣', '친칠라', '햄스터', '고슴도치', '다람쥐', '청설모',
  '토끼', '고양이', '강아지', '아기 곰', '코알라', '웜뱃', '오리너구리', '펭귄',
  '해달', '돌고래', '범고래', '흰고래', '바다표범', '문어', '해파리', '복어',
  '고래상어', '아홀로틀', '부엉이', '수리부엉이', '참새', '벌새', '홍학', '공작새',
  '알바트로스', '황제펭귄', '거북이', '카멜레온', '도마뱀', '아기 용', '유니콘', '그리핀',
  '별토끼', '달고양이', '우주고래', '화성문어', '로봇강아지', '안드로이드', '꼬마 외계인', '우주비행사',
  '별빛 요정', '혜성 정령', '달 토끼', '성운 마법사', '궤도 기사', '로켓 정비사', '행성 탐정', '별자리 화가',
  '공식 발명가', '미지수 추적자', '도형 건축가', '함수 서퍼', '분수 요리사', '소수 수집가', '무한대 여행자', '정답 탐험가'
];

export const AGORA_BOUNTY_OPTIONS = [0, 10, 30, 50, 100];
export const AGORA_BASE_ACCEPT_REWARD = 20;
export const AGORA_ASKER_RESOLVE_REWARD = 5;
export const AGORA_SELF_RESOLVE_REWARD = 0;
export const AGORA_PARTIAL_REFUND_RATIO = 0.5;
export const HALL_OF_FAME_LOOKBACK_DAYS = 7;
export const HALL_SHOWCASE_DURATION_DAYS = 7;
export const CREW_CREATION_COST = 1000;

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
];

function hashSeed(seed = '', salt = '') {
  // FNV-1a: 글자 합계를 쓰던 기존 방식보다 비슷한 UID도 고르게 분산한다.
  let hash = 2166136261;
  const value = `${salt}:${seed}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // MurmurHash3 finalizer로 연속된 ID의 하위 비트까지 충분히 섞는다.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function getAnonymousLabel(seed) {
  if (!seed) return '별빛을 따라온 익명의 탐험가';

  const scene = ANONYMOUS_SCENES[hashSeed(seed, 'scene') % ANONYMOUS_SCENES.length];
  const trait = ANONYMOUS_TRAITS[hashSeed(seed, 'trait') % ANONYMOUS_TRAITS.length];
  const character = ANONYMOUS_CHARACTERS[hashSeed(seed, 'character') % ANONYMOUS_CHARACTERS.length];
  const explorerNumber = (hashSeed(seed, 'explorer-number') % 997) + 1;
  return `${scene} ${trait} ${character} ${explorerNumber}호`;
}

export function getQuestionAnonymousLabel(question) {
  if (question?.userId) return getAnonymousLabel(question.userId);
  return question?.anonymousLabel || getAnonymousLabel(question?.id);
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
