import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Award, X } from 'lucide-react'
import { db } from '../../firebase'
import CertificatePreview from '../CertificatePreview'
import { formatKoreanDate, formatKoreanDateFromString, getCourseLabel } from '../../utils/monthlyEvaluationAwards'
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

export default function CertificateAwardsBoard({ user }) {
  const [awards, setAwards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAward, setSelectedAward] = useState(null)

  useEffect(() => {
    if (!user?.uid) return undefined
    const q = query(collection(db, 'monthlyEvaluationAwards'), where('studentId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextAwards = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => getAwardSortMs(b) - getAwardSortMs(a))
      setAwards(nextAwards)
      setLoading(false)
    }, (error) => {
      console.error('certificate awards load failed:', error)
      setAwards([])
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user?.uid])

  const groupedAwards = useMemo(() => {
    const groups = {}
    awards.forEach(award => {
      const key = `${award.year}.${String(award.month).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(award)
    })
    return Object.entries(groups)
  }, [awards])

  return (
    <section className="certificate-awards-board glass-card">
      <div className="certificate-awards-header">
        <div>
          <h3><Award size={20} /> 상장 수여 현황판</h3>
          <p>월간평가에서 받은 상장이 월별로 기록됩니다.</p>
        </div>
        <strong>{loading ? '...' : `${awards.length}장`}</strong>
      </div>

      {loading ? (
        <div className="certificate-awards-empty">상장 기록을 수신 중입니다.</div>
      ) : awards.length === 0 ? (
        <div className="certificate-awards-empty">아직 수여된 상장이 없습니다.</div>
      ) : (
        <div className="certificate-awards-list">
          {groupedAwards.map(([monthKey, monthAwards]) => (
            <div className="certificate-awards-group" key={monthKey}>
              <div className="certificate-awards-month">{monthKey}</div>
              <div className="certificate-awards-items">
                {monthAwards.map(award => (
                  <button type="button" key={award.id} onClick={() => setSelectedAward(award)} className="certificate-award-item">
                    <span className="certificate-award-ribbon">최우수상</span>
                    <span>
                      <strong>{award.evaluationLabel || `${award.year}년 ${award.month}월 월간평가`}</strong>
                      <small>{getCourseLabel(award.courseClusterId)} · {getAwardDateLabel(award)}</small>
                    </span>
                    <b>{award.score || 100}점</b>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAward && (
        <div className="certificate-modal-backdrop" onClick={() => setSelectedAward(null)}>
          <div className="certificate-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="certificate-modal-close" onClick={() => setSelectedAward(null)} aria-label="상장 닫기">
              <X size={20} />
            </button>
            <CertificatePreview award={selectedAward} />
          </div>
        </div>
      )}
    </section>
  )
}
