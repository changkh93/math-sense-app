export const SCHOLARSHIP_COURSES = [
  { id: 'cluster_elementary', label: '초등수학', shortLabel: '초등' },
  { id: 'middle-math', label: '중등수학', shortLabel: '중등' },
  { id: 'python', label: '파이썬', shortLabel: 'Python' },
]

export const SCHOLARSHIP_DISCOUNT_RATE = 0.2

export const SCHOLARSHIP_SORT_OPTIONS = [
  { value: 'scholarshipIndex', label: '장학 지수 높은 순' },
  { value: 'bonusAverage', label: '보너스 평균 높은 순' },
  { value: 'bonusTotal', label: '보너스 총합 높은 순' },
  { value: 'submissionRate', label: '제출률 높은 순' },
  { value: 'learningConnectionRate', label: '학습 연결 높은 순' },
  { value: 'growthScore', label: '성장도 높은 순' },
  { value: 'recentUnawarded', label: '최근 미수상자 우선' },
  { value: 'warningCount', label: '경고 적은 순' },
]

export function normalizeScholarshipCourseId(courseId = '') {
  const raw = String(courseId || '').trim()
  if (raw === '초등수학' || raw === 'cluster_elementary' || raw === 'ratios') return 'cluster_elementary'
  if (raw === '중등수학' || raw === 'middle-math' || raw === 'cluster_middle') return 'middle-math'
  if (raw === '파이썬' || raw === 'python') return 'python'
  return raw
}

export function getScholarshipCourse(courseId = '') {
  const normalized = normalizeScholarshipCourseId(courseId)
  return SCHOLARSHIP_COURSES.find(course => course.id === normalized) || null
}

export function getScholarshipCourseLabel(courseId = '') {
  return getScholarshipCourse(courseId)?.label || courseId || '과목'
}

export function buildScholarshipAwardId({ studentId, year, month, courseClusterId }) {
  return `${studentId}_${Number(year)}_${String(Number(month)).padStart(2, '0')}_${normalizeScholarshipCourseId(courseClusterId)}`
}

export function getEvaluationPeriodKey(year, month) {
  return `${Number(year)}-${String(Number(month)).padStart(2, '0')}`
}

export function getEvaluationPeriodLabel(year, month) {
  return `${Number(year)}년 ${Number(month)}월`
}

export function getScholarshipAwardLabel({ year, month, courseClusterId, courseName }) {
  return `${getEvaluationPeriodLabel(year, month)} ${courseName || getScholarshipCourseLabel(courseClusterId)} 장학생`
}

export function getKstMonthRange(year, month) {
  const y = Number(year)
  const m = Number(month)
  return {
    start: new Date(Date.UTC(y, m - 1, 0, 15, 0, 0, 0)),
    end: new Date(Date.UTC(y, m, 0, 14, 59, 59, 999)),
  }
}

export function getKstDateKey(dateLike) {
  if (!dateLike) return ''
  const date = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export function getKstMonthKey(dateLike) {
  const key = getKstDateKey(dateLike)
  return key ? key.slice(0, 7) : ''
}

export function timestampToMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export function getStudentDisplayName(user = {}) {
  return user.studentName || user.publicDisplayName || user.name || user.displayName || user.email || '이름 없음'
}

export function hasActiveCourseAccess(user = {}, courseClusterId) {
  const normalized = normalizeScholarshipCourseId(courseClusterId)
  const access = user.clusterAccess || {}
  if (access[normalized] === 'active') return true

  const participation = user.participation || {}
  const participationValue = participation[normalized] || participation[courseClusterId]
  if (Array.isArray(participationValue) && participationValue.length > 0) return true
  if (
    participationValue &&
    typeof participationValue === 'object' &&
    Object.keys(participationValue).length > 0
  ) return true

  const hasAccessRecords = Boolean(user.clusterAccess && Object.keys(access).length > 0)
  return normalized === 'cluster_elementary' && !hasAccessRecords
}

export function isActiveScholarshipStudent(user = {}, courseClusterId) {
  if (!user || user.role === 'admin' || user.role === 'parent' || user.isDeleted || user.accountStatus === 'deleted') return false
  return hasActiveCourseAccess(user, courseClusterId)
}

export function average(values = []) {
  const nums = values.map(Number).filter(Number.isFinite)
  if (!nums.length) return 0
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function normalizeMetric(value, maxValue) {
  const number = Number(value)
  const max = Number(maxValue)
  if (!Number.isFinite(number) || !Number.isFinite(max) || max <= 0) return 0
  return clamp((number / max) * 100)
}

export function calculateGrowthScore(reviewedAssignments = []) {
  const sorted = reviewedAssignments
    .map(item => ({
      ...item,
      bonus: Number(item.bonusCrystals || 0),
      ms: timestampToMillis(item.submittedAt) || timestampToMillis(item.reviewedAt) || timestampToMillis(item.updatedAt),
    }))
    .filter(item => Number.isFinite(item.bonus))
    .sort((a, b) => a.ms - b.ms)

  if (sorted.length < 2) return null
  const midpoint = Math.ceil(sorted.length / 2)
  const firstAverage = average(sorted.slice(0, midpoint).map(item => item.bonus))
  const secondAverage = average(sorted.slice(midpoint).map(item => item.bonus))
  if (!secondAverage && sorted.length === 2) return null
  return Math.round((secondAverage - firstAverage) * 10) / 10
}

export function getGrowthLabel(growthScore) {
  if (growthScore == null) return '데이터 부족'
  if (growthScore >= 5) return '상승'
  if (growthScore <= -5) return '하락'
  return '유지'
}

export function calculateScholarshipIndex(row, maxima = {}) {
  const bonusAverageScore = normalizeMetric(row.bonusAverage, maxima.bonusAverage)
  const bonusTotalScore = normalizeMetric(row.bonusTotal, maxima.bonusTotal)
  const submissionScore = clamp(row.submissionRate || 0)
  const learningScore = clamp(row.learningConnectionRate || 0)
  const growthScore = row.growthScore == null ? 50 : clamp(50 + Number(row.growthScore || 0))
  const warningPenalty = Math.min(25, (row.warningCount || 0) * 4 + (row.needsRevisionCount || 0) * 3 + (row.missingSubmissionCount || 0) * 2)

  return Math.round(clamp(
    (bonusAverageScore * 0.45) +
    (bonusTotalScore * 0.2) +
    (submissionScore * 0.15) +
    (learningScore * 0.1) +
    (growthScore * 0.1) -
    warningPenalty
  ))
}

export function getLastScholarshipAward(awards = []) {
  return awards
    .filter(award => award.status !== 'revoked')
    .sort((a, b) => {
      if ((Number(b.year) || 0) !== (Number(a.year) || 0)) return (Number(b.year) || 0) - (Number(a.year) || 0)
      if ((Number(b.month) || 0) !== (Number(a.month) || 0)) return (Number(b.month) || 0) - (Number(a.month) || 0)
      return timestampToMillis(b.awardedAt || b.createdAt) - timestampToMillis(a.awardedAt || a.createdAt)
    })[0] || null
}
