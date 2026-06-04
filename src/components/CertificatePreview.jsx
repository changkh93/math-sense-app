import React from 'react'
import {
  formatKoreanDate,
  formatKoreanDateFromString,
  getGradeLabel,
} from '../utils/monthlyEvaluationAwards'
import prizeBadgeImage from '../assets/prize_badge.png'
import sealImage from '../assets/seal.png'
import './CertificatePreview.css'

function getAwardedDateLabel(award = {}) {
  return formatKoreanDateFromString(award.awardedDate) || formatKoreanDate(award.awardedAt) || ''
}

export default function CertificatePreview({ award = {}, compact = false }) {
  const studentName = award.studentName || award.name || '학생'
  const rawGradeLabel = award.gradeLabel || getGradeLabel(award.grade, '')
  const gradeLabel = rawGradeLabel ? rawGradeLabel.replace(/\s*\(기록\s*기준\)/, '') : ''
  const year = Number(award.year) || new Date().getFullYear()
  const month = Number(award.month) || 5
  const awardedDateLabel = getAwardedDateLabel(award)

  return (
    <article className={`certificate-preview ${compact ? 'compact' : ''}`}>
      <div className="certificate-corner corner-tl" />
      <div className="certificate-corner corner-tr" />
      <div className="certificate-corner corner-bl" />
      <div className="certificate-corner corner-br" />
      <div className="certificate-inner">
        <h2 className="certificate-title">상 장</h2>

        <section className="certificate-meta">
          <div className="certificate-award-title">최우수상</div>
          <div className="certificate-recipient">
            <span>{gradeLabel}</span>
            <strong>{studentName}</strong>
          </div>
        </section>

        <p className="certificate-body">
          위 학생은 탁월한 노력과 끈기로 평소 수학을 성실하게 학습하였고,
          그 결과 {year}년 {month}월 월간평가에서 100점의 우수한 성적을
          거두었기에 이 상장을 수여합니다.
        </p>

        <div className="certificate-date">{awardedDateLabel}</div>

        <footer className="certificate-footer">
          <img className="certificate-medal" src={prizeBadgeImage} alt="최우수 배지" />
          <div className="certificate-publisher">
            <strong>도서출판 둘시네</strong>
          </div>
          <img className="certificate-seal" src={sealImage} alt="도서출판 둘시네 직인" />
        </footer>
      </div>
    </article>
  )
}
