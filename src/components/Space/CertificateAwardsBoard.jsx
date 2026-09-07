import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { profileQueryOptions } from '../../utils/profileQueryOptions'
import { Award, GraduationCap, Printer, Sparkles, Trophy, X } from 'lucide-react'
import { db } from '../../firebase'
import CertificatePreview from '../CertificatePreview'
import { formatKoreanDate, formatKoreanDateFromString, getCourseLabel } from '../../utils/monthlyEvaluationAwards'
import { getEvaluationPeriodLabel, getScholarshipCourseLabel } from '../../utils/scholarshipAwards'
import './CertificateAwardsBoard.css'

function getAwardSortMs(award = {}) {
  if (award.awardedAt?.toMillis) return award.awardedAt.toMillis()
  if (award.awardedAt?.toDate) return award.awardedAt.toDate().getTime()
  const date = new Date(award.awardedDate || award.createdAt || 0)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getAwardDateLabel(award = {}) {
  return formatKoreanDateFromString(award.awardedDate) || formatKoreanDate(award.awardedAt) || '수여일 확인 중'
}

function getAwardYearMonth(award = {}) {
  const labelMatch = String(award.awardLabel || award.evaluationLabel || award.evaluationPeriodLabel || '').match(/(\d{4})\D+(\d{1,2})\D*월/)
  const dateMatch = String(award.awardedDate || '').match(/^(\d{4})-(\d{1,2})-/)
  const year = Number(award.year || award.evaluationYear || labelMatch?.[1] || dateMatch?.[1])
  const month = Number(award.month || award.evaluationMonth || labelMatch?.[2] || dateMatch?.[2])
  return {
    year: Number.isFinite(year) && year > 0 ? year : null,
    month: Number.isFinite(month) && month > 0 ? month : null,
  }
}

function getAwardDisplayLabel(award = {}) {
  const storedLabel = award.awardLabel || award.evaluationLabel
  if (storedLabel && !/NaN/i.test(String(storedLabel))) return storedLabel
  const { year, month } = getAwardYearMonth(award)
  if (year && month) {
    return award.awardKind === 'scholarship'
      ? `${getEvaluationPeriodLabel(year, month)} ${getScholarshipCourseLabel(award.courseClusterId)} 장학생`
      : `${year}년 ${month}월 월간평가`
  }
  return award.awardKind === 'scholarship'
    ? `${getScholarshipCourseLabel(award.courseClusterId)} 장학생`
    : '월간평가 상장'
}

export default function CertificateAwardsBoard({ user, realtime = true, viewerId }) {
  const [liveCertificateAwards, setCertificateAwards] = useState([])
  const [liveScholarshipAwards, setScholarshipAwards] = useState([])
  const [loadedUserId, setLoadedUserId] = useState('')
  const [selectedAward, setSelectedAward] = useState(null)
  const request = useQuery({
    ...profileQueryOptions(viewerId, user?.uid, 'awards', async () => {
      const [certificates, scholarships] = await Promise.all([
        getDocs(query(collection(db, 'monthlyEvaluationAwards'), where('studentId', '==', user.uid))),
        getDocs(query(collection(db, 'scholarshipAwards'), where('studentId', '==', user.uid))),
      ])
      return {
        certificates: certificates.docs.map(item => ({ ...item.data(), id: item.id })),
        scholarships: scholarships.docs.map(item => ({ ...item.data(), id: item.id })).filter(award => award.status !== 'revoked'),
      }
    }),
    enabled: Boolean(!realtime && user?.uid && viewerId),
  })
  const certificateAwards = realtime ? liveCertificateAwards : request.data?.certificates
  const scholarshipAwards = realtime ? liveScholarshipAwards : request.data?.scholarships
  const loading = realtime ? loadedUserId !== user?.uid : request.isPending

  useEffect(() => {
    if (!selectedAward) return undefined

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedAward(null)
    }

    document.body.style.overflow = 'hidden'
    document.body.classList.add('certificate-print-active')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.classList.remove('certificate-print-active')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedAward])

  useEffect(() => {
    if (!user?.uid || !realtime) return undefined
    let certificateLoaded = false
    let scholarshipLoaded = false
    const maybeStopLoading = () => {
      if (certificateLoaded && scholarshipLoaded) setLoadedUserId(user.uid)
    }

    const certificateQuery = query(collection(db, 'monthlyEvaluationAwards'), where('studentId', '==', user.uid))
    const scholarshipQuery = query(collection(db, 'scholarshipAwards'), where('studentId', '==', user.uid))

    const unsubscribeCertificates = onSnapshot(certificateQuery, (snapshot) => {
      const nextAwards = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => getAwardSortMs(b) - getAwardSortMs(a))
      setCertificateAwards(nextAwards)
      certificateLoaded = true
      maybeStopLoading()
    }, (error) => {
      console.error('certificate awards load failed:', error)
      setCertificateAwards([])
      certificateLoaded = true
      maybeStopLoading()
    })

    const unsubscribeScholarships = onSnapshot(scholarshipQuery, (snapshot) => {
      const nextAwards = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(award => award.status !== 'revoked')
        .sort((a, b) => getAwardSortMs(b) - getAwardSortMs(a))
      setScholarshipAwards(nextAwards)
      scholarshipLoaded = true
      maybeStopLoading()
    }, (error) => {
      console.error('scholarship awards load failed:', error)
      setScholarshipAwards([])
      scholarshipLoaded = true
      maybeStopLoading()
    })

    return () => {
      unsubscribeCertificates()
      unsubscribeScholarships()
    }
  }, [user?.uid, realtime])

  const awards = useMemo(() => (
    [...(certificateAwards || []), ...(scholarshipAwards || [])]
      .sort((a, b) => getAwardSortMs(b) - getAwardSortMs(a))
  ), [certificateAwards, scholarshipAwards])

  const handlePrint = () => {
    window.requestAnimationFrame(() => window.print())
  }

  const modal = selectedAward && typeof document !== 'undefined'
    ? createPortal(
      <div className="certificate-modal-backdrop" onClick={() => setSelectedAward(null)}>
        <div className="certificate-modal" role="dialog" aria-modal="true" aria-label="상장 보기" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="certificate-modal-close" onClick={() => setSelectedAward(null)} aria-label="상장 닫기">
            <X size={20} />
          </button>
          <div className="certificate-modal-head">
            <div>
              <span>{getAwardDisplayLabel(selectedAward)}</span>
              <strong>{selectedAward.awardKind === 'scholarship' ? '장학증서 수여' : `${selectedAward.awardTitle || '최우수상'} 수여`}</strong>
            </div>
            <button type="button" className="certificate-modal-print" onClick={handlePrint}>
              <Printer size={17} />
              인쇄
            </button>
          </div>
          <CertificatePreview award={selectedAward} />
        </div>
      </div>,
      document.body
    )
    : null

  return (
    <>
      <section className="certificate-awards-board glass-card">
        <div className="certificate-awards-header">
          <div>
            <h3><Award size={20} /> 상장 수여 현황판</h3>
            <p>월간평가 상장과 장학증서가 월별로 기록됩니다.</p>
          </div>
          <strong>{loading || (!realtime && request.isError) ? '...' : `${awards.length}장`}</strong>
        </div>

        {loading ? (
          <div className="certificate-awards-empty">상장 기록을 수신 중입니다.</div>
        ) : !realtime && request.isError ? (
          <div className="certificate-awards-empty" role="status">
            상장 기록을 불러오지 못했습니다.{' '}
            <button type="button" disabled={request.isFetching} onClick={() => request.refetch()}>다시 시도</button>
          </div>
        ) : awards.length === 0 ? (
          <div className="certificate-awards-empty">아직 수여된 상장이 없습니다.</div>
        ) : (
          <div className="certificate-awards-scroll-container" aria-label="상장 및 장학증서 목록">
            {awards.map(award => {
              const isScholarship = award.awardKind === 'scholarship';
              const dateStr = getAwardDateLabel(award);
              const label = getAwardDisplayLabel(award);
              const courseLabel = isScholarship
                ? getScholarshipCourseLabel(award.courseClusterId)
                : getCourseLabel(award.courseClusterId);
              const { year, month } = getAwardYearMonth(award);
              const periodText = year && month ? `${year}.${String(month).padStart(2, '0')}` : '';

              return (
                <button
                  type="button"
                  key={award.id}
                  onClick={() => setSelectedAward(award)}
                  className={`certificate-award-card ${isScholarship ? 'is-scholarship' : ''}`}
                  title={`${label} - 클릭 시 상세 보기`}
                >
                  <div className="certificate-card-shimmer" />

                  <div className="certificate-card-header">
                    <span className={`certificate-card-ribbon ${isScholarship ? 'scholarship' : ''}`}>
                      {isScholarship ? (
                        <><GraduationCap size={13} /> 장학증서</>
                      ) : (
                        <><Trophy size={13} /> 최우수상</>
                      )}
                    </span>
                    {periodText && <span className="certificate-card-period">{periodText}</span>}
                  </div>

                  <div className="certificate-card-seal-area">
                    <div className="certificate-card-seal-glow" />
                    <div className="certificate-card-seal">
                      {isScholarship ? <Sparkles size={32} /> : <Award size={32} />}
                    </div>
                  </div>

                  <div className="certificate-card-body">
                    <strong className="certificate-card-title">{label}</strong>
                    <span className="certificate-card-course">{courseLabel}</span>
                  </div>

                  <div className="certificate-card-footer">
                    <span className="certificate-card-score">
                      {isScholarship ? '✨ 장학생' : `💯 ${award.score || 100}점`}
                    </span>
                    <span className="certificate-card-date">{dateStr}</span>
                  </div>

                  <div className="certificate-card-hover-overlay">
                    <span>크게 보기</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {modal}
    </>
  )
}
