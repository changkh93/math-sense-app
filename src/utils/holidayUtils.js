// KST 기준 휴일 관리 유틸리티

/**
 * 🇰🇷 법정 공휴일 (및 임시 공휴일, 학원 방학 등) 하드코딩 목록
 * YYYY-MM-DD 형식으로 기입합니다.
 */
const KOREAN_HOLIDAYS = new Set([
  // === 2026년 ===
  '2026-01-01', // 신정
  '2026-02-16', // 설날 연휴
  '2026-02-17', // 설날
  '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 삼일절 대체공휴일
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님오신날
  '2026-05-25', // 부처님오신날 대체공휴일
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-09-24', // 추석 연휴
  '2026-09-25', // 추석
  '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절

  // === 2027년 ===
  '2027-01-01', // 신정
  '2027-02-06', // 설날 연휴
  '2027-02-07', // 설날
  '2027-02-08', // 설날 연휴
  '2027-02-09', // 설날 대체공휴일
  '2027-03-01', // 삼일절
  '2027-05-05', // 어린이날
  '2027-05-13', // 부처님오신날
  '2027-06-06', // 현충일
  '2027-08-15', // 광복절
  '2027-08-16', // 광복절 대체공휴일
  '2027-09-14', // 추석 연휴
  '2027-09-15', // 추석
  '2027-09-16', // 추석 연휴
  '2027-10-03', // 개천절
  '2027-10-04', // 개천절 대체공휴일
  '2027-10-09', // 한글날
  '2027-10-11', // 한글날 대체공휴일
  '2027-12-25', // 성탄절
]);

const REGULAR_CLASS_WINDOWS = {
  cluster_elementary: {
    label: '초등수학',
    days: [1, 2, 3, 4, 5],
    start: '17:00',
    end: '17:50'
  },
  python: {
    label: '파이썬',
    days: [1, 2, 3, 4, 5],
    start: '19:00',
    end: '19:50'
  },
  'middle-math': {
    label: '중등수학',
    days: [1, 3, 4, 5],
    start: '20:00',
    end: '20:50'
  },
  'western-classic': {
    label: '고전 읽기',
    days: [1, 2, 3, 4, 5],
    start: '17:00',
    end: '17:50'
  }
};

const CLUSTER_ID_ALIASES = {
  '초등수학': 'cluster_elementary',
  elementary: 'cluster_elementary',
  elementary_math: 'cluster_elementary',
  cluster_elementary: 'cluster_elementary',
  '파이썬': 'python',
  python: 'python',
  '중등수학': 'middle-math',
  middle_math: 'middle-math',
  'middle-math': 'middle-math',
  '서양고전': 'western-classic',
  '고전 읽기': 'western-classic',
  western_classic: 'western-classic',
  'western-classic': 'western-classic'
};

const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function normalizeRewardClusterId(clusterId = '') {
  return CLUSTER_ID_ALIASES[String(clusterId).trim()] || String(clusterId).trim();
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function getKSTDateTimeParts(date = new Date()) {
  const parts = KST_DATE_TIME_FORMATTER.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const dayOfWeek = new Date(`${dateStr}T12:00:00+09:00`).getDay();

  return { dateStr, minutes, dayOfWeek };
}

/**
 * 특정 날짜가 휴일(주말 또는 공휴일)인지 판별합니다.
 * @param {string} dateStr - YYYY-MM-DD 형식의 날짜 문자열
 * @returns {boolean}
 */
export function isRestDay(dateStr) {
  // 1. 공휴일인지 확인
  if (KOREAN_HOLIDAYS.has(dateStr)) return true;

  // 2. 주말(토, 일)인지 확인 (Date 객체 사용)
  const d = new Date(dateStr + 'T12:00:00+09:00');
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true; // 0: 일요일(Sun), 6: 토요일(Sat)
  }

  return false;
}

/**
 * 지정한 시각이 해당 클러스터의 정규 수업시간 안인지 판별합니다. (KST 기준)
 * @param {string} clusterId
 * @param {Date} date
 * @returns {boolean}
 */
export function isWithinRegularClassTime(clusterId, date = new Date()) {
  const normalizedClusterId = normalizeRewardClusterId(clusterId);
  const classWindow = REGULAR_CLASS_WINDOWS[normalizedClusterId];

  if (!classWindow) return false;

  const { dayOfWeek, minutes } = getKSTDateTimeParts(date);
  if (!classWindow.days.includes(dayOfWeek)) return false;

  return minutes >= timeToMinutes(classWindow.start) && minutes <= timeToMinutes(classWindow.end);
}

/**
 * 광석 지급 배율을 결정합니다. 과거 기록은 건드리지 않고, 호출 시점의 신규 지급에만 사용합니다.
 * 휴일/주말 1.5배가 수업시간 외 1.2배보다 우선합니다.
 * @param {object} options
 * @param {number} options.baseAmount
 * @param {string} options.clusterId
 * @param {Date} options.date
 * @param {string} options.dateStr
 * @returns {{ multiplier: number, reason: string, label: string, normalizedClusterId: string, dateStr: string }}
 */
export function getCrystalRewardMultiplier({
  baseAmount = 0,
  clusterId = '',
  date = new Date(),
  dateStr = ''
} = {}) {
  const normalizedClusterId = normalizeRewardClusterId(clusterId);
  const kstParts = getKSTDateTimeParts(date);
  const rewardDateStr = dateStr || kstParts.dateStr;

  if (baseAmount <= 0) {
    return {
      multiplier: 1,
      reason: 'none',
      label: '기본 보상',
      normalizedClusterId,
      dateStr: rewardDateStr
    };
  }

  if (isRestDay(rewardDateStr)) {
    return {
      multiplier: 1.5,
      reason: 'rest_day',
      label: '주말/휴일 1.5배',
      normalizedClusterId,
      dateStr: rewardDateStr
    };
  }

  if (REGULAR_CLASS_WINDOWS[normalizedClusterId] && !isWithinRegularClassTime(normalizedClusterId, date)) {
    return {
      multiplier: 1.2,
      reason: 'outside_class_time',
      label: '수업시간 외 1.2배',
      normalizedClusterId,
      dateStr: rewardDateStr
    };
  }

  return {
    multiplier: 1,
    reason: 'regular_class_time',
    label: '정규 수업시간',
    normalizedClusterId,
    dateStr: rewardDateStr
  };
}

/**
 * 광석 보상 배율을 적용하고, 원금/보너스/사유 메타데이터를 함께 반환합니다.
 * @param {number} baseAmount
 * @param {object} options
 * @returns {{ amount: number, baseAmount: number, bonusAmount: number, multiplier: number, reason: string, label: string, normalizedClusterId: string, dateStr: string }}
 */
export function applyCrystalRewardMultiplier(baseAmount, options = {}) {
  const multiplierMeta = getCrystalRewardMultiplier({ ...options, baseAmount });
  const amount = multiplierMeta.multiplier > 1
    ? Math.ceil(baseAmount * multiplierMeta.multiplier)
    : baseAmount;

  return {
    ...multiplierMeta,
    amount,
    baseAmount,
    bonusAmount: amount - baseAmount
  };
}

/**
 * 휴일 학습 시 기본 보상량에 1.5배 보너스를 적용하여 반환합니다.
 * @param {number} baseAmount - 원래 지급할 광석 수량
 * @param {string} dateStr - 판단할 날짜 (기본값: 오늘)
 * @returns {number} 최종 지급량 (소수점 올림)
 */
export function applyHolidayMultiplier(baseAmount, dateStr) {
  return applyCrystalRewardMultiplier(baseAmount, { dateStr }).amount;
}
