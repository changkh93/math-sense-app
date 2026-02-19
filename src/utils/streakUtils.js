/**
 * ☄️ 연속 학습(Streak) 유틸리티
 * 
 * 모든 날짜 비교는 KST(한국 표준시) 기준입니다.
 * 순수 함수로 분리하여 테스트 용이성을 확보합니다.
 */

/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayKST() {
  const kstNow = new Date(Date.now() + 9 * 3600000)
  return kstNow.toISOString().split('T')[0]
}

/**
 * KST 기준 어제 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getYesterdayKST() {
  const kstNow = new Date(Date.now() + 9 * 3600000)
  const yesterday = new Date(kstNow.getTime() - 86400000)
  return yesterday.toISOString().split('T')[0]
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
      label: '은하핵', 
      color: '#E0C3FC', 
      icon: '🌌', 
      glowColor: 'rgba(224, 195, 252, 0.6)',
      gradient: 'linear-gradient(135deg, #E0C3FC, #8EC5FC, #F5576C, #FFD700)'
    }
  }
  if (streak >= 30) {
    return { 
      tier: 'supernova', 
      label: '초신성', 
      color: '#F59E0B', 
      icon: '🟡', 
      glowColor: 'rgba(245, 158, 11, 0.6)',
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)'
    }
  }
  if (streak >= 14) {
    return { 
      tier: 'stellarwind', 
      label: '항성풍', 
      color: '#A855F7', 
      icon: '🟣', 
      glowColor: 'rgba(168, 85, 247, 0.6)',
      gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)'
    }
  }
  if (streak >= 7) {
    return { 
      tier: 'acceleration', 
      label: '가속', 
      color: '#54A0FF', 
      icon: '🔵', 
      glowColor: 'rgba(84, 160, 255, 0.6)',
      gradient: 'linear-gradient(135deg, #54A0FF, #2E86DE)'
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
    color: '#6B7280', 
    icon: '⚫', 
    glowColor: 'rgba(107, 114, 128, 0.3)',
    gradient: 'linear-gradient(135deg, #6B7280, #4B5563)'
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
    
    if (diffDays === 2 && freezeCount > 0) {
      // 정확히 하루만 빠졌고, 크라이오 코어 보유 → 자동 사용
      newStreak = currentStreak + 1
      newFreezeCount = freezeCount - 1
      freezeUsed = true
    } else {
      // 스트릭 초기화
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
