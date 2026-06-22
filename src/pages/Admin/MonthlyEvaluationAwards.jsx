import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { Award, CheckCircle2, Filter, RefreshCcw, Search } from 'lucide-react'
import { db } from '../../firebase'
import CertificatePreview from '../../components/CertificatePreview'
import ScholarshipAwards from './ScholarshipAwards'
import {
  MONTHLY_EVALUATION_COURSES,
  STUDENT_GRADE_OPTIONS,
  buildMonthlyAwardId,
  formatKoreanDateFromString,
  getConfiguredUnitIdsForMonth,
  getCourseLabel,
  getEvaluationUnitIdForGrade,
  getEvaluationUnitEntriesForMonth,
  getGradeLabel,
  getGradeOption,
  getKstDateString,
  normalizeGradeValue,
} from '../../utils/monthlyEvaluationAwards'
import './Admin.css'

const DEFAULT_YEAR = 2026
const DEFAULT_MONTH = 5

function getStudentName(user = {}) {
  return user.studentName || user.publicDisplayName || user.name || user.displayName || user.email || '이름 없음'
}

function toMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function isStudentUser(user = {}) {
  return user.role !== 'admin' && user.role !== 'parent' && !user.isDeleted && user.accountStatus !== 'deleted'
}

function hasActiveCourse(user = {}, courseClusterId) {
  const access = user.clusterAccess || {}
  if (access[courseClusterId] === 'active') return true
  return courseClusterId === 'cluster_elementary' && !user.clusterAccess
}

function getBestHistory(records = []) {
  return records.reduce((best, record) => {
    const score = Number(record.score)
    if (!Number.isFinite(score)) return best
    if (!best) return { ...record, score }
    if (score > best.score) return { ...record, score }
    if (score === best.score && toMillis(record.timestamp) > toMillis(best.timestamp)) return { ...record, score }
    return best
  }, null)
}

export default function MonthlyEvaluationAwards() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [month, setMonth] = useState(DEFAULT_MONTH)
  const [courseFilter, setCourseFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [awardFilter, setAwardFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [historyByStudentUnit, setHistoryByStudentUnit] = useState({})
  const [awards, setAwards] = useState({})
  const [loading, setLoading] = useState(false)
  const [awardingId, setAwardingId] = useState('')
  const [previewAward, setPreviewAward] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('scholarships')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const unitIds = getConfiguredUnitIdsForMonth(year, month)
      const [usersSnap, awardsSnap, historySnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'monthlyEvaluationAwards')),
        unitIds.length
          ? getDocs(query(collectionGroup(db, 'history'), where('unitId', 'in', unitIds)))
          : Promise.resolve({ docs: [] }),
      ])

      const nextUsers = usersSnap.docs
        .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter(isStudentUser)

      const nextAwards = {}
      awardsSnap.docs.forEach(docSnap => {
        nextAwards[docSnap.id] = { id: docSnap.id, ...docSnap.data() }
      })

      const groupedHistory = {}
      historySnap.docs.forEach(docSnap => {
        const data = docSnap.data()
        const studentId = docSnap.ref.parent.parent?.id
        if (!studentId || !data?.unitId) return
        const key = `${studentId}_${data.unitId}`
        if (!groupedHistory[key]) groupedHistory[key] = []
        groupedHistory[key].push({ id: docSnap.id, studentId, ...data })
      })

      setUsers(nextUsers)
      setAwards(nextAwards)
      setHistoryByStudentUnit(groupedHistory)
    } catch (err) {
      console.error('monthly evaluation load failed:', err)
      setError(err?.message || '월간평가 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const builtRows = []
    const evaluationEntries = getEvaluationUnitEntriesForMonth(year, month)

    users.forEach(user => {
      const savedGrade = normalizeGradeValue(user.grade)
      const savedGradeOption = getGradeOption(savedGrade)
      const inferredGradeEntries = savedGrade ? [] : evaluationEntries.filter(entry => (
        entry.gradeOption &&
        hasActiveCourse(user, entry.courseClusterId) &&
        (historyByStudentUnit[`${user.uid}_${entry.unitId}`] || []).length > 0
      ))
      const gradeEntries = savedGrade
        ? [{ grade: savedGrade, gradeOption: savedGradeOption, inferred: false }]
        : inferredGradeEntries.length
          ? inferredGradeEntries.map(entry => ({ ...entry, inferred: true }))
          : [{ grade: '', gradeOption: null, inferred: false }]

      gradeEntries.forEach(gradeEntry => {
        const normalizedGrade = normalizeGradeValue(gradeEntry.grade)
        const gradeOption = gradeEntry.gradeOption || getGradeOption(normalizedGrade)
        if (gradeFilter !== 'all' && normalizedGrade !== gradeFilter) return

        const activeCourses = MONTHLY_EVALUATION_COURSES.filter(course => (
          (courseFilter === 'all' || course.id === courseFilter) &&
          hasActiveCourse(user, course.id) &&
          (!gradeOption || gradeOption.clusterId === course.id)
        ))

        activeCourses.forEach(course => {
          const unitId = gradeEntry.unitId || getEvaluationUnitIdForGrade(year, month, normalizedGrade)
          const historyRecords = unitId ? historyByStudentUnit[`${user.uid}_${unitId}`] || [] : []
          const bestHistory = getBestHistory(historyRecords)
          const awardId = buildMonthlyAwardId({
            studentId: user.uid,
            year,
            month,
            courseClusterId: course.id,
          })
          const award = awards[awardId] || null
          const studentName = getStudentName(user)

          builtRows.push({
            id: `${user.uid}_${course.id}_${normalizedGrade || 'unassigned'}`,
            awardId,
            studentId: user.uid,
            studentName,
            email: user.email || '',
            grade: normalizedGrade,
            gradeLabel: getGradeLabel(normalizedGrade),
            gradeOrder: gradeOption?.order || 99,
            courseClusterId: course.id,
            courseName: course.label,
            unitId,
            unitTitle: bestHistory?.unitTitle || '월간평가',
            score: bestHistory?.score ?? null,
            attemptCount: historyRecords.length,
            lastAttemptAt: bestHistory?.timestamp || null,
            award,
            canAward: Number(bestHistory?.score) === 100 && !award && Boolean(unitId),
            missingConfig: !unitId,
            missingGrade: !savedGrade && !gradeEntry.inferred,
          })
        })
      })
    })

    return builtRows
      .filter(row => {
        if (awardFilter === 'awarded' && !row.award) return false
        if (awardFilter === 'not_awarded' && row.award) return false
        if (awardFilter === 'perfect_only' && row.score !== 100) return false
        if (!term) return true
        return [row.studentName, row.email, row.gradeLabel, row.courseName]
          .some(value => String(value || '').toLowerCase().includes(term))
      })
      .sort((a, b) => {
        if (a.courseClusterId !== b.courseClusterId) return a.courseName.localeCompare(b.courseName, 'ko')
        if (a.gradeOrder !== b.gradeOrder) return a.gradeOrder - b.gradeOrder
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        return a.studentName.localeCompare(b.studentName, 'ko')
      })
  }, [awardFilter, awards, courseFilter, gradeFilter, historyByStudentUnit, month, searchTerm, users, year])

  const stats = useMemo(() => ({
    total: rows.length,
    perfect: rows.filter(row => row.score === 100).length,
    awarded: rows.filter(row => row.award).length,
    pending: rows.filter(row => row.canAward).length,
  }), [rows])

  const handleAward = async (row) => {
    if (!row?.canAward || awardingId) return
    const ok = window.confirm(`${row.studentName} 학생에게 ${year}년 ${month}월 월간평가 최우수상을 수여합니다.`)
    if (!ok) return

    setAwardingId(row.awardId)
    try {
      const batch = writeBatch(db)
      const awardRef = doc(db, 'monthlyEvaluationAwards', row.awardId)
      const notificationRef = doc(db, 'notifications', `monthly_award_${row.awardId}`)
      const awardedDate = getKstDateString(new Date())
      const awardPayload = {
        studentId: row.studentId,
        studentName: row.studentName,
        email: row.email,
        grade: row.grade,
        gradeLabel: getGradeLabel(row.grade, '') || row.gradeLabel.replace(/\s*\(기록\s*기준\)/, ''),
        courseClusterId: row.courseClusterId,
        courseName: row.courseName,
        year: Number(year),
        month: Number(month),
        evaluationLabel: `${year}년 ${month}월 월간평가`,
        awardTitle: '최우수상',
        score: 100,
        evaluationUnitId: row.unitId,
        evaluationUnitTitle: row.unitTitle,
        awardedDate,
        awardedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      batch.set(awardRef, awardPayload, { merge: false })
      batch.set(notificationRef, {
        recipientId: row.studentId,
        type: 'certificate_award',
        message: `${year}년 ${month}월 월간평가 최우수상을 수여받았습니다.`,
        link: `/?view=dashboard&award=${row.awardId}`,
        isRead: false,
        createdAt: serverTimestamp(),
        metadata: {
          awardId: row.awardId,
          year: Number(year),
          month: Number(month),
          courseClusterId: row.courseClusterId,
        }
      }, { merge: false })

      await batch.commit()

      const renderedAward = {
        id: row.awardId,
        ...awardPayload,
        awardedAt: new Date(),
      }
      setAwards(prev => ({ ...prev, [row.awardId]: renderedAward }))
      setPreviewAward(renderedAward)
    } catch (err) {
      console.error('award grant failed:', err)
      alert(err?.message || '상장 수여에 실패했습니다.')
    } finally {
      setAwardingId('')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2>장학금, 상장</h2>
        {activeTab === 'certificates' && (
          <button type="button" className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} /> 새로고침
          </button>
        )}
      </div>

      <div className="admin-tabbar awards-tabbar">
        <button type="button" className={activeTab === 'scholarships' ? 'active' : ''} onClick={() => setActiveTab('scholarships')}>
          장학금
        </button>
        <button type="button" className={activeTab === 'certificates' ? 'active' : ''} onClick={() => setActiveTab('certificates')}>
          월간평가 상장
        </button>
      </div>

      {activeTab === 'scholarships' ? (
        <ScholarshipAwards />
      ) : (
        <>
          <div className="monthly-awards-summary">
            <div><span>대상</span><strong>{stats.total}</strong></div>
            <div><span>100점</span><strong>{stats.perfect}</strong></div>
            <div><span>수여 완료</span><strong>{stats.awarded}</strong></div>
            <div><span>수여 가능</span><strong>{stats.pending}</strong></div>
          </div>

          <div className="monthly-awards-toolbar">
            <label>
              연도
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || DEFAULT_YEAR)} />
            </label>
            <label>
              월
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map(value => (
                  <option key={value} value={value}>{value}월</option>
                ))}
              </select>
            </label>
            <label>
              과정
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                <option value="all">전체</option>
                {MONTHLY_EVALUATION_COURSES.map(course => (
                  <option key={course.id} value={course.id}>{course.label}</option>
                ))}
              </select>
            </label>
            <label>
              학년
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="all">전체</option>
                {STUDENT_GRADE_OPTIONS.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </label>
            <label>
              수여 상태
              <select value={awardFilter} onChange={(e) => setAwardFilter(e.target.value)}>
                <option value="all">전체</option>
                <option value="perfect_only">100점만</option>
                <option value="not_awarded">미수여</option>
                <option value="awarded">수여 완료</option>
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

          <div className="monthly-awards-layout">
            <section className="monthly-awards-table-card">
              <div className="monthly-awards-table-head">
                <h3><Filter size={18} /> {year}년 {month}월 월간평가 결과</h3>
                <span>{loading ? '동기화 중...' : `${rows.length}명`}</span>
              </div>
              <div className="monthly-awards-table-wrap">
                <table className="monthly-awards-table">
                  <thead>
                    <tr>
                      <th>과정</th>
                      <th>학생</th>
                      <th>학년</th>
                      <th>최고점</th>
                      <th>응시</th>
                      <th>상장</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id}>
                        <td>{getCourseLabel(row.courseClusterId)}</td>
                        <td>
                          <strong>{row.studentName}</strong>
                          <span>{row.email}</span>
                        </td>
                        <td>{row.gradeLabel}</td>
                        <td>
                          {row.missingGrade ? (
                            <span className="muted-text">학년 미지정</span>
                          ) : row.missingConfig ? (
                            <span className="muted-text">평가 미설정</span>
                          ) : row.score == null ? (
                            <span className="muted-text">기록 없음</span>
                          ) : (
                            <strong className={row.score === 100 ? 'perfect-score' : ''}>{row.score}점</strong>
                          )}
                        </td>
                        <td>{row.attemptCount}회</td>
                        <td>
                          {row.award ? (
                            <button type="button" className="award-status awarded" onClick={() => setPreviewAward(row.award)}>
                              <CheckCircle2 size={15} /> 수여 완료
                            </button>
                          ) : (
                            <span className="award-status pending">미수여</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="primary-btn award-action-btn"
                            disabled={!row.canAward || awardingId === row.awardId}
                            onClick={() => handleAward(row)}
                            title={row.missingGrade ? '먼저 학생의 학년을 입력해 주세요.' : row.missingConfig ? '이 학년의 월간평가 단원이 아직 설정되지 않았습니다.' : row.score !== 100 ? '100점 학생에게만 수여할 수 있습니다.' : row.award ? '이미 수여되었습니다.' : '상장 수여'}
                          >
                            <Award size={16} />
                            {awardingId === row.awardId ? '수여 중...' : '상장수여'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="monthly-awards-empty">조건에 맞는 학생이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="monthly-awards-preview">
              <h3>상장 미리보기</h3>
              <CertificatePreview
                compact
                award={previewAward || {
                  studentName: '이현서',
                  gradeLabel: '초등학교 5학년',
                  courseName: '초등수학',
                  year,
                  month,
                  awardedDate: getKstDateString(new Date()),
                }}
              />
              <p className="monthly-awards-preview-note">
                수여일은 운영자가 <strong>상장수여</strong> 버튼을 누른 날짜로 저장됩니다.
                예: {formatKoreanDateFromString(getKstDateString(new Date()))}
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
