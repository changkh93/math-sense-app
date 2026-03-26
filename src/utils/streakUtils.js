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
export function getYesterdayKST() {
  const date = new Date();
  date.setDate(date.getDate() - 1); // Subtract 24 hours approximately
  return getTodayKST(date);
}

/**
 * 전 세계 어디서든 KST 기준의 시간 정보를 객체로 반환
 * @param {Date|number|string} [date] - 기준 날짜
 */
export function getKSTComponents(date = new Date()) {
  const d = new Date(date);
  
  // Use Intl.DateTimeFormat for guaranteed KST
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
    weekday: 'short'
  }).formatToParts(d);

  const p = {};
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }

  const weekdays = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

  return {
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    hours: parseInt(p.hour, 10), // 0-23
    minutes: parseInt(p.minute, 10),
    seconds: parseInt(p.second, 10),
    dayOfWeek: weekdays[p.weekday]
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
        justReachedMilestone: null,
        isNewRecord: false,
        alreadyDoneToday: true,
        newStreak: currentStreak,
      }
    }
  }
  
  // 어제 날짜
  const yesterdayKST = todayOverride 
    ? new Date(new Date(todayOverride + 'T00:00:00+09:00').getTime() - 86400000).toISOString().split('T')[0]
    : getYesterdayKST()
  
  let newStreak = currentStreak
  let newFreezeCount = freezeCount
  let freezeUsed = false
  
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
      newStreak = currentStreak + 1
      newFreezeCount = freezeCount - missedDays
      freezeUsed = true
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
      justReachedMilestone,
      isNewRecord: newStreak > longestStreak,
      alreadyDoneToday: false,
      newStreak,
    }
  }
}
/**
 * 현재 시점에서 유효한(표시될) 연속 학습 일수 반환
 * 
 * DB 확정값만 기반으로 판단합니다 (예측/희망 고문 제거):
 * - 오늘 이미 학습 완료 → currentStreak 표시
 * - 어제 학습 완료 → currentStreak 표시 (오늘 할 기회가 아직 있으므로)
 * - 그 외 → 0 (코어 보유량에 관계없이; 코어 처리는 학습 완료 시에만)
 *
 * @param {Object} userData - 사용자 데이터
 * @returns {number}
 */
export function getEffectiveStreak(userData) {
  if (!userData?.lastStreakDate || !userData?.currentStreak) return 0
  
  const todayKST = getTodayKST()
  const lastDate = userData.lastStreakDate
  
  // 오늘 이미 완료했거나 어제 완료한 경우 → 확실히 활성 상태
  if (lastDate === todayKST || lastDate === getYesterdayKST()) {
    return userData.currentStreak
  }
  
  // 그 외: 코어 보유와 무관하게 0 반환
  // 코어 방어는 학습 완료(handleComplete/handleNonQuizActivityComplete) 시에만 실행되므로,
  // UI에서 "방어된 것처럼" 미리 보여주면 DB 확정값과 불일치하는 희망 고문이 됨.
  return 0
}
