import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { Award, CheckCircle2, Eye, Filter, Search, Sparkles } from 'lucide-react'
import { db } from '../../firebase'
import CertificatePreview from '../../components/CertificatePreview'
import { getGradeLabel, getKstDateString } from '../../utils/monthlyEvaluationAwards'
import {
  SCHOLARSHIP_COURSES,
  SCHOLARSHIP_DISCOUNT_RATE,
  SCHOLARSHIP_SORT_OPTIONS,
  average,
  buildScholarshipAwardId,
  calculateGrowthScore,
  calculateScholarshipIndex,
  getEvaluationPeriodKey,
  getEvaluationPeriodLabel,
  getGrowthLabel,
  getKstDateKey,
  getKstMonthRange,
  getScholarshipAwardLabel,
  getScholarshipCourseLabel,
  getStudentDisplayName,
  isActiveScholarshipStudent,
  normalizeScholarshipCourseId,
  timestampToMillis,
} from '../../utils/scholarshipAwards'

const DEFAULT_YEAR = new Date().getFullYear()
const DEFAULT_MONTH = new Date().getMonth() + 1
const INITIAL_HISTORY_MONTHS = 3

function isSameMonthKey(dateKey, monthKey) {
  return String(dateKey || '').slice(0, 7) === monthKey
}

function getAssignmentDateKey(assignment = {}) {
  return assignment.date || getKstDateKey(assignment.submittedAt) || getKstDateKey(assignment.reviewedAt) || getKstDateKey(assignment.updatedAt)
}

function getAttendanceDateKey(attendance = {}) {
  return attendance.date || getKstDateKey(attendance.timestamp) || getKstDateKey(attendance.createdAt) || getKstDateKey(attendance.updatedAt)
}

function getHistoryCourseId(row = {}) {
  return normalizeScholarshipCourseId(row.clusterId || row.courseId || row.clusterName || row.regionClusterId || '')
}

function getRecentAwardCount(awards = [], year, month, lookbackMonths = 3) {
  const current = Number(year) * 12 + Number(month)
  return awards.filter(award => {
    if (award.status === 'revoked') return false
    const awardMonth = Number(award.year) * 12 + Number(award.month)
    return Number.isFinite(awardMonth) && current - awardMonth > 0 && current - awardMonth <= lookbackMonths
  }).length
}

function formatRate(value) {
  if (!Number.isFinite(Number(value))) return '0%'
  return `${Math.round(Number(value))}%`
}

function getAwardHistoryLabel(row = {}) {
  if (!row.totalScholarshipAwardCount) return '수여 이력 없음'
  const last = row.lastScholarshipAward
  return `${last?.year || ''}.${String(last?.month || '').padStart(2, '0')} 최근 / 누적 ${row.totalScholarshipAwardCount}회`
}

function getEvaluationPeriods(year, month, count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Number(year), Number(month) - 1 - index, 1)
    return { year: date.getFullYear(), month: date.getMonth() + 1 }
  })
}

export default function ScholarshipAwards() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [month, setMonth] = useState(DEFAULT_MONTH)
  const [courseFilter, setCourseFilter] = useState('all')
  const [awardFilter, setAwardFilter] = useState('all')
  const [sortKey, setSortKey] = useState('scholarshipIndex')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendanceRows, setAttendanceRows] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [warningRows, setWarningRows] = useState([])
  const [scholarshipAwards, setScholarshipAwards] = useState({})
  const [loading, setLoading] = useState(false)
  const [awardingId, setAwardingId] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)
  const [previewAward, setPreviewAward] = useState(null)
  const [error, setError] = useState('')
  const [periodScope, setPeriodScope] = useState('selected')
  const [loadedMonthCount, setLoadedMonthCount] = useState(INITIAL_HISTORY_MONTHS)
  const periodCount = periodScope === 'all' ? loadedMonthCount : 1
  const periods = useMemo(() => getEvaluationPeriods(year, month, periodCount), [year, month, periodCount])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const oldestPeriod = periods.at(-1)
      const startRange = getKstMonthRange(oldestPeriod.year, oldestPeriod.month)
      const endRange = getKstMonthRange(year, month)
      const startDateKey = getEvaluationPeriodKey(oldestPeriod.year, oldestPeriod.month) + '-01'
      const nextMonth = new Date(Number(year), Number(month), 1)
      const endDateKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
      const [usersSnap, assignmentsSnap, attendanceSnap, warningsSnap, historySnap, ...awardSnaps] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'assignments'), where('date', '>=', startDateKey), where('date', '<', endDateKey))),
        getDocs(query(collection(db, 'attendance'), where('date', '>=', startDateKey), where('date', '<', endDateKey))),
        getDocs(query(collection(db, 'assignmentWarnings'), where('date', '>=', startDateKey), where('date', '<', endDateKey))),
        getDocs(query(
          collectionGroup(db, 'history'),
          where('clusterId', 'in', SCHOLARSHIP_COURSES.map(course => course.id)),
          where('timestamp', '>=', Timestamp.fromDate(startRange.start)),
          where('timestamp', '<=', Timestamp.fromDate(endRange.end))
        )),
        ...periods.map(period => getDocs(query(
          collection(db, 'scholarshipAwards'),
          where('year', '==', period.year),
          where('month', '==', period.month),
        ))),
      ])

      setUsers(usersSnap.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() })))
      setAssignments(assignmentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })))
      setAttendanceRows(attendanceSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })))
      setWarningRows(warningsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })))

      const nextAwards = {}
      awardSnaps.forEach(awardsSnap => awardsSnap.docs.forEach(docSnap => {
        nextAwards[docSnap.id] = { id: docSnap.id, ...docSnap.data() }
      }))
      setScholarshipAwards(nextAwards)

      setHistoryRows(historySnap.docs.map(docSnap => ({
        id: docSnap.id,
        studentId: docSnap.ref.parent.parent?.id,
        ...docSnap.data(),
      })))
    } catch (err) {
      console.error('scholarship data load failed:', err)
      setError(err?.message || '장학금 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [month, periods, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rows = useMemo(() => {
    const awardsList = Object.values(scholarshipAwards)
    const baseRows = []

    periods.forEach(period => users.forEach(user => {
      const monthKey = getEvaluationPeriodKey(period.year, period.month)
      SCHOLARSHIP_COURSES.forEach(course => {
        if (courseFilter !== 'all' && course.id !== courseFilter) return
        if (!isActiveScholarshipStudent(user, course.id)) return

        const courseAssignments = assignments.filter(item => (
          item.userId === user.uid &&
          normalizeScholarshipCourseId(item.clusterId) === course.id &&
          isSameMonthKey(getAssignmentDateKey(item), monthKey)
        ))
        const reviewedAssignments = courseAssignments.filter(item => item.status === 'reviewed')
        const submittedAssignments = courseAssignments.filter(item => ['submitted', 'reviewed', 'needs_revision'].includes(item.status))
        const submittedDateSet = new Set(submittedAssignments.map(getAssignmentDateKey).filter(Boolean))
        const bonuses = reviewedAssignments.map(item => Number(item.bonusCrystals || 0)).filter(Number.isFinite)

        const userAttendanceRows = attendanceRows.filter(item => (
          item.userId === user.uid &&
          normalizeScholarshipCourseId(item.clusterId) === course.id &&
          isSameMonthKey(getAttendanceDateKey(item), monthKey)
        ))
        const attendanceDateSet = new Set(userAttendanceRows.map(getAttendanceDateKey).filter(Boolean))
        const expectedDateCount = Math.max(attendanceDateSet.size, submittedDateSet.size)
        const missingSubmissionCount = Array.from(attendanceDateSet).filter(dateKey => !submittedDateSet.has(dateKey)).length

        const userHistoryRows = historyRows.filter(item => (
          item.studentId === user.uid &&
          getHistoryCourseId(item) === course.id
        ))
        const learningDateSet = new Set(userHistoryRows.map(item => getKstDateKey(item.timestamp)).filter(Boolean))
        const learningLinkedDateCount = Array.from(submittedDateSet).filter(dateKey => learningDateSet.has(dateKey)).length

        const userWarningRows = warningRows.filter(item => (
          item.userId === user.uid &&
          normalizeScholarshipCourseId(item.clusterId) === course.id &&
          item.status !== 'revoked' &&
          item.status !== 'resolved' &&
          isSameMonthKey(item.date || getKstDateKey(item.createdAt), monthKey)
        ))

        const awardId = buildScholarshipAwardId({
          studentId: user.uid,
          year: period.year,
          month: period.month,
          courseClusterId: course.id,
        })
        const award = scholarshipAwards[awardId] || null
        const allStudentAwards = awardsList.filter(item => item.studentId === user.uid && item.status !== 'revoked')
        const sortedStudentAwards = [...allStudentAwards].sort((a, b) => timestampToMillis(b.awardedAt || b.createdAt) - timestampToMillis(a.awardedAt || a.createdAt))
        const lastScholarshipAward = sortedStudentAwards[0] || null

        baseRows.push({
          id: `${user.uid}_${course.id}`,
          awardId,
          award,
          studentId: user.uid,
          studentName: getStudentDisplayName(user),
          email: user.email || '',
          grade: user.grade || '',
          gradeLabel: getGradeLabel(user.grade, '학년 미지정'),
          courseClusterId: course.id,
          courseName: course.label,
          evaluationPeriodKey: monthKey,
          evaluationPeriodLabel: getEvaluationPeriodLabel(period.year, period.month),
          bonusAverage: bonuses.length ? Math.round(average(bonuses) * 10) / 10 : 0,
          bonusTotal: bonuses.reduce((sum, value) => sum + value, 0),
          reviewedAssignmentCount: reviewedAssignments.length,
          submittedAssignmentCount: submittedAssignments.length,
          submittedDateCount: submittedDateSet.size,
          attendanceDateCount: attendanceDateSet.size,
          expectedDateCount,
          missingSubmissionCount,
          submissionRate: expectedDateCount ? Math.round((submittedDateSet.size / expectedDateCount) * 100) : 0,
          learningLinkedDateCount,
          learningConnectionRate: submittedDateSet.size ? Math.round((learningLinkedDateCount / submittedDateSet.size) * 100) : 0,
          growthScore: calculateGrowthScore(reviewedAssignments),
          needsRevisionCount: courseAssignments.filter(item => item.status === 'needs_revision').length,
          warningCount: userWarningRows.length,
          totalScholarshipAwardCount: allStudentAwards.length,
          recentScholarshipAwardCount: getRecentAwardCount(allStudentAwards, period.year, period.month),
          lastScholarshipAward,
          reviewedAssignments,
          submittedAssignments,
          userAttendanceRows,
          userHistoryRows,
          userWarningRows,
        })
      })
    }))

    const maximaByCourse = {}
    SCHOLARSHIP_COURSES.forEach(course => {
      periods.forEach(period => {
        const key = `${course.id}_${getEvaluationPeriodKey(period.year, period.month)}`
        const courseRows = baseRows.filter(row => row.courseClusterId === course.id && row.evaluationPeriodKey === getEvaluationPeriodKey(period.year, period.month))
        maximaByCourse[key] = {
        bonusAverage: Math.max(...courseRows.map(row => row.bonusAverage), 0),
        bonusTotal: Math.max(...courseRows.map(row => row.bonusTotal), 0),
      }
      })
    })

    const indexedRows = baseRows.map(row => ({
      ...row,
      scholarshipIndex: calculateScholarshipIndex(row, maximaByCourse[`${row.courseClusterId}_${row.evaluationPeriodKey}`] || {}),
    }))

    const rankByCourse = {}
    SCHOLARSHIP_COURSES.forEach(course => periods.forEach(period => {
      [...indexedRows]
        .filter(row => row.courseClusterId === course.id && row.evaluationPeriodKey === getEvaluationPeriodKey(period.year, period.month))
        .sort((a, b) => b.scholarshipIndex - a.scholarshipIndex || b.bonusTotal - a.bonusTotal)
        .forEach((row, index) => {
          rankByCourse[row.id] = index + 1
        })
    }))

    const term = searchTerm.trim().toLowerCase()
    return indexedRows
      .map(row => ({ ...row, courseRank: rankByCourse[row.id] || 0 }))
      .filter(row => {
        if (awardFilter === 'awarded' && row.award?.status !== 'awarded') return false
        if (awardFilter === 'not_awarded' && row.award?.status === 'awarded') return false
        if (awardFilter === 'recent_awarded' && row.recentScholarshipAwardCount < 1) return false
        if (!term) return true
        return [row.studentName, row.email, row.gradeLabel, row.courseName]
          .some(value => String(value || '').toLowerCase().includes(term))
      })
      .sort((a, b) => {
        if (sortKey === 'recentUnawarded') {
          if (a.recentScholarshipAwardCount !== b.recentScholarshipAwardCount) return a.recentScholarshipAwardCount - b.recentScholarshipAwardCount
          return b.scholarshipIndex - a.scholarshipIndex
        }
        if (sortKey === 'warningCount') {
          if (a.warningCount !== b.warningCount) return a.warningCount - b.warningCount
          return b.scholarshipIndex - a.scholarshipIndex
        }
        const diff = (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0)
        if (diff !== 0) return diff
        if (a.courseClusterId !== b.courseClusterId) return a.courseName.localeCompare(b.courseName, 'ko')
        return a.studentName.localeCompare(b.studentName, 'ko')
      })
  }, [assignments, attendanceRows, awardFilter, courseFilter, historyRows, periods, scholarshipAwards, searchTerm, sortKey, users, warningRows])

  const stats = useMemo(() => ({
    total: rows.length,
    awarded: rows.filter(row => row.award?.status === 'awarded').length,
    reviewedAssignments: rows.reduce((sum, row) => sum + row.reviewedAssignmentCount, 0),
    recentAwarded: rows.filter(row => row.recentScholarshipAwardCount > 0).length,
  }), [rows])

  const handleAward = async (row) => {
    if (!row || awardingId) return
    if (row.award?.status === 'awarded') {
      alert('이미 이 평가월/과목으로 장학금이 수여되었습니다.')
      return
    }
    const awardLabel = getScholarshipAwardLabel(row)
    const notificationAwardLabel = /NaN/i.test(String(awardLabel))
      ? `${getEvaluationPeriodLabel(year, month)} ${row.courseName || getScholarshipCourseLabel(row.courseClusterId)} 장학생`
      : awardLabel
    const ok = window.confirm(`${row.studentName} 학생을 ${awardLabel}으로 수여합니다.\n혜택: 다음 수강료 20% 감면`)
    if (!ok) return

    setAwardingId(row.awardId)
    try {
      const batch = writeBatch(db)
      const awardRef = doc(db, 'scholarshipAwards', row.awardId)
      const notificationRef = doc(db, 'notifications', `scholarship_award_${row.awardId}`)
      const awardedDate = getKstDateString(new Date())
      const awardPayload = {
        awardKind: 'scholarship',
        studentId: row.studentId,
        studentName: row.studentName,
        email: row.email,
        grade: row.grade,
        gradeLabel: row.gradeLabel,
        courseClusterId: row.courseClusterId,
        courseName: row.courseName,
        year: Number(year),
        month: Number(month),
        evaluationPeriodKey: row.evaluationPeriodKey,
        evaluationPeriodLabel: row.evaluationPeriodLabel,
        scholarshipTitle: '메타센스 장학생',
        awardLabel,
        tuitionBaseAmount: null,
        tuitionDiscountRate: SCHOLARSHIP_DISCOUNT_RATE,
        tuitionDiscountAmount: null,
        tuitionApplyMonth: '',
        scholarshipIndex: row.scholarshipIndex,
        metricsSnapshot: {
          bonusAverage: row.bonusAverage,
          bonusTotal: row.bonusTotal,
          reviewedAssignmentCount: row.reviewedAssignmentCount,
          submittedDateCount: row.submittedDateCount,
          attendanceDateCount: row.attendanceDateCount,
          submissionRate: row.submissionRate,
          learningLinkedDateCount: row.learningLinkedDateCount,
          learningConnectionRate: row.learningConnectionRate,
          growthScore: row.growthScore,
          warningCount: row.warningCount,
          needsRevisionCount: row.needsRevisionCount,
          missingSubmissionCount: row.missingSubmissionCount,
        },
        reasonMemo: '',
        status: 'awarded',
        awardedDate,
        awardedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      batch.set(awardRef, awardPayload, { merge: false })
      batch.set(notificationRef, {
        recipientId: row.studentId,
        type: 'scholarship_award',
        message: `축하합니다! ${notificationAwardLabel}으로 선정되어 다음 수강료 20% 감면 혜택이 적용됩니다.`,
        link: `/?view=dashboard&scholarship=${row.awardId}`,
        isRead: false,
        createdAt: serverTimestamp(),
        metadata: {
          awardId: row.awardId,
          year: Number(year),
          month: Number(month),
          evaluationPeriodKey: row.evaluationPeriodKey,
          courseClusterId: row.courseClusterId,
          tuitionDiscountRate: SCHOLARSHIP_DISCOUNT_RATE,
        },
      }, { merge: false })

      await batch.commit()

      const renderedAward = {
        id: row.awardId,
        ...awardPayload,
        awardedAt: new Date(),
      }
      setScholarshipAwards(prev => ({ ...prev, [row.awardId]: renderedAward }))
      setPreviewAward(renderedAward)
      setSelectedRow(prev => (prev?.id === row.id ? { ...prev, award: renderedAward } : prev))
    } catch (err) {
      console.error('scholarship award grant failed:', err)
      alert(err?.message || '장학금 수여에 실패했습니다.')
    } finally {
      setAwardingId('')
    }
  }

  const detailRow = selectedRow || rows[0] || null

  return (
    <>
      <div className="monthly-awards-summary scholarship-summary">
        <div><span>표시 학생</span><strong>{stats.total}</strong></div>
        <div><span>수여 완료</span><strong>{stats.awarded}</strong></div>
        <div><span>리뷰 과제</span><strong>{stats.reviewedAssignments}</strong></div>
        <div><span>최근 수상 이력</span><strong>{stats.recentAwarded}</strong></div>
      </div>

      <div className="monthly-awards-toolbar scholarship-toolbar">
        <label>
          연도
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || DEFAULT_YEAR)} />
        </label>
        <label>
          평가월
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map(value => (
              <option key={value} value={value}>{value}월</option>
            ))}
          </select>
        </label>
        <label>
          조회 범위
          <select value={periodScope} onChange={(e) => {
            setPeriodScope(e.target.value)
            if (e.target.value === 'all') setLoadedMonthCount(INITIAL_HISTORY_MONTHS)
          }}>
            <option value="selected">선택한 월</option>
            <option value="all">전체 (최근 3개월)</option>
          </select>
        </label>
        <label>
          과정
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">전체</option>
            {SCHOLARSHIP_COURSES.map(course => (
              <option key={course.id} value={course.id}>{course.label}</option>
            ))}
          </select>
        </label>
        <label>
          수여 상태
          <select value={awardFilter} onChange={(e) => setAwardFilter(e.target.value)}>
            <option value="all">전체</option>
            <option value="not_awarded">미수여</option>
            <option value="awarded">수여 완료</option>
            <option value="recent_awarded">최근 3개월 수상</option>
          </select>
        </label>
        <label>
          정렬
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {SCHOLARSHIP_SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="monthly-awards-search">
          검색
          <span>
            <Search size={16} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름, 이메일, 학년" />
          </span>
        </label>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      <div className="monthly-awards-layout scholarship-layout">
        <section className="monthly-awards-table-card">
          <div className="monthly-awards-table-head">
            <h3><Filter size={18} /> {getEvaluationPeriodLabel(year, month)} 장학생 지표</h3>
            <span>{loading ? '동기화 중...' : `${rows.length}행`}</span>
          </div>
          <div className="monthly-awards-table-wrap">
            <table className="monthly-awards-table scholarship-table">
              <thead>
                <tr>
                  {periodScope === 'all' && <th>평가월</th>}
                  <th>순위</th>
                  <th>과정</th>
                  <th>학생</th>
                  <th>장학지수</th>
                  <th>보너스</th>
                  <th>제출/연결</th>
                  <th>성장/경고</th>
                  <th>장학 이력</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className={selectedRow?.id === row.id ? 'selected-row' : ''}>
                    {periodScope === 'all' && <td>{row.evaluationPeriodLabel}</td>}
                    <td><strong>#{row.courseRank || '-'}</strong></td>
                    <td>{getScholarshipCourseLabel(row.courseClusterId)}</td>
                    <td>
                      <strong>{row.studentName}</strong>
                      <span>{row.gradeLabel} · {row.email}</span>
                    </td>
                    <td>
                      <strong className="scholarship-index">{row.scholarshipIndex}</strong>
                      <span>{row.evaluationPeriodLabel} 장학생</span>
                    </td>
                    <td>
                      <strong>평균 {row.bonusAverage}</strong>
                      <span>총합 {row.bonusTotal} · 리뷰 {row.reviewedAssignmentCount}건</span>
                    </td>
                    <td>
                      <strong>{formatRate(row.submissionRate)} / {formatRate(row.learningConnectionRate)}</strong>
                      <span>제출 {row.submittedDateCount}일 · 출석 {row.attendanceDateCount}일</span>
                    </td>
                    <td>
                      <strong>{getGrowthLabel(row.growthScore)}</strong>
                      <span>경고 {row.warningCount} · 보완 {row.needsRevisionCount} · 미제출 {row.missingSubmissionCount}</span>
                    </td>
                    <td>
                      <strong>{row.totalScholarshipAwardCount ? `${row.totalScholarshipAwardCount}회` : '없음'}</strong>
                      <span>{getAwardHistoryLabel(row)}</span>
                    </td>
                    <td>
                      <div className="scholarship-actions">
                        <button type="button" className="secondary-btn mini-btn" onClick={() => setSelectedRow(row)}>
                          <Eye size={15} /> 상세
                        </button>
                        {row.award?.status === 'awarded' ? (
                          <button type="button" className="award-status awarded" onClick={() => setPreviewAward(row.award)}>
                            <CheckCircle2 size={15} /> 수여완료
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-btn award-action-btn"
                            disabled={awardingId === row.awardId}
                            onClick={() => handleAward(row)}
                          >
                            <Award size={16} />
                            {awardingId === row.awardId ? '수여 중...' : '수여'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={periodScope === 'all' ? 10 : 9} className="monthly-awards-empty">조건에 맞는 학생이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {periodScope === 'all' && (
              <button type="button" className="secondary-btn" onClick={() => setLoadedMonthCount(count => count + INITIAL_HISTORY_MONTHS)} disabled={loading}>
                이전 3개월 더 보기
              </button>
            )}
          </div>
        </section>

        <aside className="monthly-awards-preview scholarship-detail">
          <h3><Sparkles size={18} /> 장학 판단 상세</h3>
          {detailRow ? (
            <>
              <div className="scholarship-detail-head">
                <strong>{detailRow.studentName}</strong>
                <span>{detailRow.evaluationPeriodLabel} {detailRow.courseName} 장학생 지표</span>
              </div>
              <div className="scholarship-metric-grid">
                <div><span>장학 지수</span><strong>{detailRow.scholarshipIndex}</strong></div>
                <div><span>보너스 평균</span><strong>{detailRow.bonusAverage}</strong></div>
                <div><span>보너스 총합</span><strong>{detailRow.bonusTotal}</strong></div>
                <div><span>리뷰 과제</span><strong>{detailRow.reviewedAssignmentCount}건</strong></div>
                <div><span>제출률</span><strong>{formatRate(detailRow.submissionRate)}</strong></div>
                <div><span>학습 연결</span><strong>{formatRate(detailRow.learningConnectionRate)}</strong></div>
                <div><span>성장</span><strong>{getGrowthLabel(detailRow.growthScore)}</strong></div>
                <div><span>최근 이력</span><strong>{detailRow.recentScholarshipAwardCount}회</strong></div>
              </div>
              <div className="scholarship-detail-section">
                <strong>최근 수여 이력</strong>
                <p>{getAwardHistoryLabel(detailRow)}</p>
              </div>
              <div className="scholarship-detail-section">
                <strong>운영 참고</strong>
                <p>
                  출석 {detailRow.attendanceDateCount}일, 제출 {detailRow.submittedDateCount}일,
                  학습기록 연결 {detailRow.learningLinkedDateCount}일입니다.
                  경고 {detailRow.warningCount}건과 보완 요청 {detailRow.needsRevisionCount}건을 함께 확인하세요.
                </p>
              </div>
              <CertificatePreview
                compact
                award={previewAward || detailRow.award || {
                  awardKind: 'scholarship',
                  studentName: detailRow.studentName,
                  gradeLabel: detailRow.gradeLabel,
                  courseName: detailRow.courseName,
                  courseClusterId: detailRow.courseClusterId,
                  year,
                  month,
                  evaluationPeriodLabel: detailRow.evaluationPeriodLabel,
                  awardLabel: getScholarshipAwardLabel(detailRow),
                  awardedDate: getKstDateString(new Date()),
                }}
              />
            </>
          ) : (
            <div className="monthly-awards-empty">학생을 선택하면 상세 지표가 표시됩니다.</div>
          )}
        </aside>
      </div>
    </>
  )
}
