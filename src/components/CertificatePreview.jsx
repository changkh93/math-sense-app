import React from 'react'
import {
  formatKoreanDate,
  formatKoreanDateFromString,
  getGradeLabel,
} from '../utils/monthlyEvaluationAwards'
import { getEvaluationPeriodLabel, getScholarshipCourseLabel } from '../utils/scholarshipAwards'
import prizeBadgeImage from '../assets/prize_badge.png'
import sealImage from '../assets/seal.png'
import './CertificatePreview.css'

function getAwardedDateLabel(award = {}) {
  return formatKoreanDateFromString(award.awardedDate) || formatKoreanDate(award.awardedAt) || ''
}

export default function CertificatePreview({ award = {}, compact = false }) {
  const isScholarship = award.awardKind === 'scholarship' || Boolean(award.scholarshipTitle)
  const studentName = award.studentName || award.name || '학생'
  const rawGradeLabel = award.gradeLabel || getGradeLabel(award.grade, '')
  const gradeLabel = rawGradeLabel ? rawGradeLabel.replace(/\s*\(기록\s*기준\)/, '') : ''
  const year = Number(award.year) || new Date().getFullYear()
  const month = Number(award.month) || 5
  const awardedDateLabel = getAwardedDateLabel(award)

  if (isScholarship) {
    const periodLabel = award.evaluationPeriodLabel || getEvaluationPeriodLabel(year, month)
    const courseName = award.courseName || getScholarshipCourseLabel(award.courseClusterId)

    return (
      <article className={`certificate-preview scholarship-certificate ${compact ? 'compact' : ''}`}>
        <div className="scholarship-border scholarship-border-outer" />
        <div className="scholarship-border scholarship-border-inner" />
        <div className="scholarship-corner scholarship-corner-tl" />
        <div className="scholarship-corner scholarship-corner-tr" />
        <div className="scholarship-corner scholarship-corner-br" />
        <div className="scholarship-corner scholarship-corner-bl" />
        <div className="scholarship-content">
          <header className="scholarship-header">
            <div className="scholarship-kicker">META SENSE SCHOLARSHIP</div>
            <div className="scholarship-divider">
              <span className="scholarship-line" />
              <span className="scholarship-emblem">❦</span>
              <span className="scholarship-line" />
            </div>
          </header>

          <h2 className="scholarship-title">장학증서</h2>

          <section className="scholarship-recipient">
            <div className="scholarship-grade">{gradeLabel}</div>
            <div className="scholarship-name">{studentName}</div>
          </section>

          <div className="scholarship-divider scholarship-divider-mid">
            <span className="scholarship-line" />
            <span className="scholarship-diamond">◆</span>
            <span className="scholarship-line" />
          </div>

          <p className="scholarship-body">
            위 학생은 {periodLabel} {courseName} 과정에서
            성실한 과제 제출과 꾸준한 학습 기록을 통해
            뛰어난 자기주도 학습 태도를 보여주었기에
            {' '}{month}월 메타센스 장학생으로 선정합니다.
          </p>

          <div className="scholarship-footer">
            <div className="scholarship-footer-line">
              <span className="scholarship-line" />
              <span className="scholarship-emblem">❧</span>
              <span className="scholarship-line" />
            </div>
            <div className="scholarship-date">{awardedDateLabel}</div>
            <div className="scholarship-signature-row">
              <div className="certificate-publisher scholarship-publisher">
                <strong>도서출판 둘시네</strong>
              </div>
              <img className="certificate-seal scholarship-seal" src={sealImage} alt="도서출판 둘시네 직인" />
            </div>
          </div>
        </div>
      </article>
    )
  }

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
