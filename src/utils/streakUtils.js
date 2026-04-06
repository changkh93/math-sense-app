/**
 * ☄️ 연속 학습(Streak) 유틸리티
 * 
 * 모든 날짜 비교는 KST(한국 표준시) 기준입니다.
 * 순수 함수로 분리하여 테스트 용이성을 확보합니다.
 */

/**
 * KST 기준 날짜를 YYYY-MM-DD 형식으로 반환
 * @param {Date|number|string} [date] - 기준 날짜
 */
export function getTodayKST(date = new Date()) {
  const kstParts = getKSTComponents(date);
  const month = String(kstParts.month).padStart(2, '0');
  const day = String(kstParts.day).padStart(2, '0');
  return `${kstParts.year}-${month}-${day}`;
}

/**
 * KST 기준 어제 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getYesterdayKST(date = new Date()) {
  const baseDate = new Date(date);
  baseDate.setDate(baseDate.getDate() - 1); // Subtract 24 hours approximately
  return getTodayKST(baseDate);
}

/**
 * KST 기준 날짜 문자열에 일수를 더하거나 뺍니다.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} dayOffset
 * @returns {string}
 */
export function shiftKSTDate(dateStr, dayOffset) {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  date.setDate(date.getDate() + dayOffset);
  return getTodayKST(date);
}

/**
 * 전 세계 어디서든 KST 기준의 시간 정보를 객체로 반환
 * @param {Date|number|string} [date] - 기준 날짜
 */
export function getKSTComponents(date = new Date()) {
  const d = new Date(date);
  
  // Calculate KST time by adding 9 hours in milliseconds to the UTC time.
  const kst = new Date(d.getTime() + (9 * 60 * 60 * 1000));
  
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    hours: kst.getUTCHours(),
    minutes: kst.getUTCMinutes(),
    seconds: kst.getUTCSeconds(),
    dayOfWeek: kst.getUTCDay()
  };
}

/**
 * 임시 하위 호환성 유지용 (가급적 getKSTComponents 사용 권장)
 * Date 객체의 메소가 UTC 오프셋이 적용된 상태가 아니므로 가짜 KST 날짜 객체를 생성합니다.
 */
export function getKSTDate(date = new Date()) {
  const d = new Date(date);
  return new Date(d.getTime() + (9 * 3600000));
}

export function getNowKST() {
  return getKSTDate();
}

/**
 * 두 날짜 문자열(YYYY-MM-DD) 사이의 일수 차이를 계산
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00+09:00')
  const d2 = new Date(dateStr2 + 'T00:00:00+09:00')
  return Math.floor((d2 - d1) / 86400000)
}

function listGapDatesExclusive(startDate, endDate) {
  const gapDates = [];
  const gapSize = daysBetween(startDate, endDate) - 1;

  if (gapSize <= 0) return gapDates;

  let cursor = shiftKSTDate(startDate, 1);
  while (cursor < endDate) {
    gapDates.push(cursor);
    cursor = shiftKSTDate(cursor, 1);
  }

  return gapDates;
}

function normalizeDateSet(dates) {
  return new Set(Array.from(dates || []).filter(Boolean));
}

function getLatestDate(dates) {
  const normalized = Array.from(normalizeDateSet(dates)).sort();
  return normalized.length > 0 ? normalized[normalized.length - 1] : '';
}

export function getCurrentGapDefendedDates(lastActiveDate, freezeCount, todayKST = getTodayKST()) {
  if (!lastActiveDate || freezeCount <= 0) return [];

  const missedDates = listGapDatesExclusive(lastActiveDate, todayKST);
  if (missedDates.length === 0 || missedDates.length > freezeCount) return [];
  return missedDates;
}

export function getCurrentStreakWindow(activeDates, defendedDates, todayKST = getTodayKST()) {
  const activeSet = normalizeDateSet(activeDates);
  const defendedSet = normalizeDateSet(defendedDates);
  const participatedSet = new Set([...activeSet, ...defendedSet]);
  const yesterdayKST = shiftKSTDate(todayKST, -1);

  let anchorDate = null;
  if (participatedSet.has(todayKST)) {
    anchorDate = todayKST;
  } else if (participatedSet.has(yesterdayKST)) {
    anchorDate = yesterdayKST;
  } else {
    return {
      activeCount: 0,
      participatedCount: 0,
      chainDates: [],
      defendedDatesInWindow: [],
      lastParticipatedDate: getLatestDate(participatedSet),
      lastActiveDate: getLatestDate(activeSet),
    };
  }

  const chainDates = [];
  const defendedDatesInWindow = [];
  let activeCount = 0;
  let cursor = anchorDate;

  while (participatedSet.has(cursor)) {
    chainDates.push(cursor);
    if (activeSet.has(cursor)) {
      activeCount += 1;
    } else if (defendedSet.has(cursor)) {
      defendedDatesInWindow.push(cursor);
    }
    cursor = shiftKSTDate(cursor, -1);
  }

  return {
    activeCount,
    participatedCount: chainDates.length,
    chainDates,
    defendedDatesInWindow,
    lastParticipatedDate: chainDates[0] || getLatestDate(participatedSet),
    lastActiveDate: getLatestDate(activeSet),
  };
}

/**
 * 혜성 등급 정보를 반환
 * @param {number} streak - 현재 연속 학습 일수
 * @returns {{ tier: string, label: string, color: string, icon: string, glowColor: string }}
 */
export function getCometTier(streak) {
  if (streak >= 100) {
    return { 
      tier: 'galactic', 
      label: '초은하핵', 
      color: '#FFD700', 
      icon: '☀️', 
      glowColor: 'rgba(255, 215, 0, 0.6)',
      gradient: 'linear-gradient(135deg, #FFD700, #FFF5E1, #FF9F43)'
    }
  }
  if (streak >= 30) {
    return { 
      tier: 'supernova', 
      label: '초신성', 
      color: '#FF4757', 
      icon: '💥', 
      glowColor: 'rgba(255, 71, 87, 0.6)',
      gradient: 'linear-gradient(135deg, #FF4757, #FF6B81)'
    }
  }
  if (streak >= 14) {
    return { 
      tier: 'stellarwind', 
      label: '대화염', 
      color: '#FF6B6B', 
      icon: '☄️', 
      glowColor: 'rgba(255, 107, 107, 0.6)',
      gradient: 'linear-gradient(135deg, #FF6B6B, #EE5A24)'
    }
  }
  if (streak >= 7) {
    return { 
      tier: 'acceleration', 
      label: '연소', 
      color: '#FF7F50', 
      icon: '🔥', 
      glowColor: 'rgba(255, 127, 80, 0.6)',
      gradient: 'linear-gradient(135deg, #FF7F50, #FF6348)'
    }
  }
  if (streak >= 1) {
    return { 
      tier: 'ignition', 
      label: '점화', 
      color: '#FF9F43', 
      icon: '🔥', 
      glowColor: 'rgba(255, 159, 67, 0.6)',
      gradient: 'linear-gradient(135deg, #FF9F43, #EE5A24)'
    }
  }
  return { 
    tier: 'inactive', 
    label: '대기', 
    color: '#94a3b8', 
    icon: '⚫', 
    glowColor: 'rgba(148, 163, 184, 0.3)',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)'
  }
}

/**
 * 마일스톤 임계값 목록
 */
export const MILESTONE_THRESHOLDS = [3, 7, 14, 30, 50, 100, 200, 365]

/**
 * 마일스톤 정보 반환
 */
export function getMilestoneInfo(threshold) {
  const info = {
    3:   { title: '3일 연속!', message: '항해의 불씨가 타오르기 시작합니다!', icon: '🕯️' },
    7:   { title: '7일 연속!', message: '안정 궤도에 진입했습니다!', icon: '🔵' },
    14:  { title: '14일 연속!', message: '항성풍을 타고 순항 중입니다!', icon: '🟣' },
    30:  { title: '30일 연속!', message: '초신성급 에너지를 방출합니다!', icon: '💫' },
    50:  { title: '50일 연속!', message: '은하 항해의 절반을 넘었습니다!', icon: '⭐' },
    100: { title: '100일 연속!', message: '전설의 항해사가 되었습니다!', icon: '🌌' },
    200: { title: '200일 연속!', message: '은하를 정복한 불멸의 탐험가!', icon: '👑' },
    365: { title: '365일 연속!', message: '1년! 우주의 역사에 당신의 이름이 새겨집니다!', icon: '🏆' },
  }
  return info[threshold] || { title: `${threshold}일 연속!`, message: '대단합니다!', icon: '☄️' }
}

/**
 * 연속 학습(Streak) 갱신 로직 — 순수 함수
 * 
 * @param {Object} userData - 현재 사용자 데이터
 * @param {string} [todayOverride] - 테스트용 오늘 날짜 오버라이드 (YYYY-MM-DD)
 * @returns {{ streakUpdate: Object, meta: Object }}
 */
export function calculateStreakUpdate(userData, todayOverride) {
  const todayKST = todayOverride || getTodayKST()
  
  const lastDate = userData?.lastStreakDate || ""
  const currentStreak = userData?.currentStreak || 0
  const longestStreak = userData?.longestStreak || 0
  const freezeCount = userData?.streakFreezeCount || 0
  
  // Case 1: 오늘 이미 학습 완료 → 변경 없음
  if (lastDate === todayKST) {
    return {
      streakUpdate: {},
      meta: {
        freezeUsed: false,
        consumedFreezeCount: 0,
        defendedDates: [],
        justReachedMilestone: null,
        isNewRecord: false,
        alreadyDoneToday: true,
        newStreak: currentStreak,
      }
    }
  }
  
  const yesterdayKST = shiftKSTDate(todayKST, -1)
  
  let newStreak = currentStreak
  let newFreezeCount = freezeCount
  let freezeUsed = false
  let consumedFreezeCount = 0
  let defendedDates = []
  
  if (lastDate === "") {
    // Case 2: 첫 학습
    newStreak = 1
  } else if (lastDate === yesterdayKST) {
    // Case 3: 어제 학습함 → 연속!
    newStreak = currentStreak + 1
  } else {
    // Case 4: 하루 이상 빠짐
    const diffDays = daysBetween(lastDate, todayKST)
    const missedDays = diffDays - 1 // 어제 했으면 0, 엊그제 했으면 1...
    
    if (missedDays > 0 && freezeCount >= missedDays) {
      // 결석일 수 만큼 크라이오 코어 보유 중 → 모두 소모 방어 성공
      defendedDates = listGapDatesExclusive(lastDate, todayKST)
      consumedFreezeCount = defendedDates.length
      newStreak = currentStreak + 1
      newFreezeCount = freezeCount - consumedFreezeCount
      freezeUsed = consumedFreezeCount > 0
    } else {
      // 크라이오 코어가 부족하거나 0개임 → 스트릭 초기화
      newStreak = 1
    }
  }
  
  const newLongest = Math.max(longestStreak, newStreak)
  
  // 마일스톤 체크
  const existingMilestones = userData?.streakMilestones || []
  const newMilestones = [...existingMilestones]
  let justReachedMilestone = null
  
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (newStreak >= threshold && !newMilestones.includes(threshold)) {
      newMilestones.push(threshold)
      justReachedMilestone = threshold // 가장 높은 달성 마일스톤
    }
  }
  
  return {
    streakUpdate: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastStreakDate: todayKST,
      streakFreezeCount: newFreezeCount,
      streakMilestones: newMilestones,
    },
    meta: {
      freezeUsed,
      consumedFreezeCount,
      defendedDates,
      justReachedMilestone,
      isNewRecord: newStreak > longestStreak,
      alreadyDoneToday: false,
      newStreak,
    }
  }
}

/**
 * 이력(History) 및 방어(Freeze) 기록으로부터 연속 학습 일수를 결정론적으로 계산
 * 
 * @param {Set<string>|string[]} activeDates - 학습 활동이 있었던 날짜들의 집합 (YYYY-MM-DD)
 * @param {Set<string>|string[]} defendedDates - 크라이오 코어로 방어된 날짜들의 집합 (YYYY-MM-DD)
 * @param {string} [todayKST] - 기준 날짜 (기본값: 오늘)
 * @returns {number} 계산된 연속 학습 일수
 */
export function calculateStreakFromHistory(activeDates, defendedDates, todayKST = getTodayKST()) {
  return getCurrentStreakWindow(activeDates, defendedDates, todayKST).activeCount;
}

/**
 * 현재 시점에서 유효한(표시될) 연속 학습 일수 반환
 * 
 * @param {Object} userData - 사용자 데이터
 * @param {Object} [historyData] - { activeDates: Set, defendedDates: Set } (제공 시 이력 기반 계산 수행)
 * @returns {number}
 */
export function getEffectiveStreak(userData, historyData = null) {
  // 1. historyData가 제공되면 이력 기반으로 계산 (가장 정확)
  if (historyData && (historyData.activeDates || historyData.activeSet)) {
    const active = historyData.activeSet || historyData.activeDates;
    const defended = historyData.defendedSet || historyData.defendedDates || new Set();
    return calculateStreakFromHistory(active, defended, getTodayKST());
  }

  // 2. historyData가 없으면 DB에 저장된 캐시된 값 사용
  if (!userData?.lastStreakDate || !userData?.currentStreak) return 0
  
  const todayKST = getTodayKST()
  const lastDate = userData.lastStreakDate
  
  // 오늘 이미 완료했거나 어제 완료한 경우 → 확실히 활성 상태로 간주
  // (어제의 경우 오늘이 아직 안 끝났으므로 스트릭이 유지되는 Duo 스타일)
  if (lastDate === todayKST || lastDate === getYesterdayKST()) {
    return userData.currentStreak
  }
  
  // 그 외: 며칠 이상 공백이 있다면 0 반환 (코어 방어는 다음 학습 시점에 결산됨)
  return 0
}

/**
 * 트랜잭션 기록으로부터 방어된 날짜들을 추출
 * 
 * @param {Array} transactions - 사용자의 crystal_transactions 배열
 * @param {Object} userData - 사용자 데이터 (streakFreezeCount, lastStreakDate 포함)
 * @param {Map|Object} dailyStats - 일별 활동 통계 (YYYY-MM-DD 키)
 * @returns {Set<string>} 방어된 날짜들의 Set
 */
export function extractDefendedDates(transactions, userData, dailyStats) {
  const protectionSet = new Set();
  const todayKST = getTodayKST();

  // 1. future-format streak_freeze transactions with explicit defendedDates
  (transactions || []).forEach(t => {
    if (t.type === 'streak_freeze' && t.metadata?.defendedDates) {
      t.metadata.defendedDates.forEach(d => protectionSet.add(d));
    }
  });

  // 2. Full timeline reconstruction for legacy freezes
  const activeDates = dailyStats instanceof Map ? Array.from(dailyStats.keys()) : Object.keys(dailyStats || {});
  activeDates.sort();
  
  (transactions || []).forEach(t => {
    if (t.type === 'streak_freeze' && !t.metadata?.defendedDates && t.timestamp) {
      const ts = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
      const freezeDate = getTodayKST(ts);
      // Find the most recent active date BEFORE the freezeDate
      const prevActive = [...activeDates].reverse().find(d => d < freezeDate);
      
      if (prevActive) {
        const d1 = new Date(prevActive + 'T12:00:00Z');
        const d2 = new Date(freezeDate + 'T12:00:00Z');
        const gap = Math.floor((d2 - d1) / 86400000) - 1;
        
        if (gap > 0 && gap <= 10) { 
          const scanObj = new Date(d1);
          for (let j = 0; j < gap; j++) {
            scanObj.setUTCDate(scanObj.getUTCDate() + 1);
            const dStr = scanObj.toISOString().split('T')[0];
            protectionSet.add(dStr);
          }
        }
      }
    }
  });

  // 3. Current gap: core availability based active defense
  const dbStreakDate = userData?.lastStreakDate;
  const freezeCount = userData?.streakFreezeCount || 0;

  if (dbStreakDate && freezeCount > 0) {
    getCurrentGapDefendedDates(dbStreakDate, freezeCount, todayKST).forEach(d => protectionSet.add(d));
  }

  return protectionSet;
}

export function recalculateStreakState(activeDates, coreEvidenceDates = [], todayKST = getTodayKST()) {
  const sortedActive = [...new Set((activeDates || []).filter(Boolean))].sort();
  const sortedCores = [...(coreEvidenceDates || []).filter(Boolean)].sort();

  if (sortedActive.length === 0) {
    return {
      correctStreak: 0,
      correctLastDate: '',
      effectiveLastDate: '',
      coresUsed: 0,
      coresRemaining: sortedCores.length,
      defendedDates: [],
    };
  }

  const defendedDates = [];
  const inventory = [];
  let coreIndex = 0;

  const pushAvailableCores = (cutoffDate) => {
    while (coreIndex < sortedCores.length && sortedCores[coreIndex] <= cutoffDate) {
      inventory.push(sortedCores[coreIndex]);
      coreIndex += 1;
    }
  };

  for (let i = 0; i < sortedActive.length - 1; i++) {
    const currentDate = sortedActive[i];
    const nextActiveDate = sortedActive[i + 1];
    pushAvailableCores(nextActiveDate);

    const gapDates = listGapDatesExclusive(currentDate, nextActiveDate);
    if (gapDates.length > 0 && gapDates.length <= inventory.length) {
      gapDates.forEach(d => {
        defendedDates.push(d);
        inventory.shift();
      });
    }
  }

  pushAvailableCores(todayKST);

  const currentGapDates = listGapDatesExclusive(sortedActive[sortedActive.length - 1], todayKST);
  if (currentGapDates.length > 0 && currentGapDates.length <= inventory.length) {
    currentGapDates.forEach(d => {
      defendedDates.push(d);
      inventory.shift();
    });
  }

  const window = getCurrentStreakWindow(sortedActive, defendedDates, todayKST);

  return {
    correctStreak: window.activeCount,
    correctLastDate: sortedActive[sortedActive.length - 1] || '',
    effectiveLastDate: window.lastParticipatedDate || '',
    coresUsed: sortedCores.length - inventory.length,
    coresRemaining: inventory.length,
    defendedDates,
  };
}
