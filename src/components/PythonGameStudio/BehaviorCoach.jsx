import { useState } from 'react'
import { behaviorError, inspectBehavior } from '../../../functions/studioBehaviorCoach.mjs'
import CoachAdvice from './CoachAdvice'
import './ErrorCoach.css'

export default function BehaviorCoach({ uid, source = '', path, requestAdvice, allowAi = true }) {
  const [review, setReview] = useState(null)
  const [selected, setSelected] = useState(0)
  const stale = review?.source !== source
  const inspect = () => {
    setSelected(0)
    setReview({ source, findings: inspectBehavior(source), id: crypto.randomUUID() })
  }
  const finding = review?.findings[selected]
  return <section className="pgs-error-coach pgs-behavior-coach" data-reviewed={Boolean(review)} aria-label="동작 점검 도우미">
    <div className="pgs-coach-heading"><strong>실행 결과가 예상과 다른가요?</strong><span>기본 점검 · AI 호출 없음</span></div>
    <p>오류 메시지가 없어도 현재 파일에서 값이 바뀌는 곳과 사용되는 곳을 비교할 수 있어요. 코드를 자동으로 수정하지 않아요.</p>
    <button onClick={inspect}>{review ? '현재 코드로 다시 점검' : '동작이 예상과 달라요'}</button>
    {review && <>
      <p>{path} · 일부 코드 패턴만 점검해요. 항목이 없어도 코드가 올바르다는 뜻은 아니에요.</p>
      {!review.findings.length && <p role="status">자동으로 짚을 수 있는 원인을 찾지 못했어요. 기대한 결과와 실제 결과를 비교하고, 값이 바뀌는 줄 앞뒤에 print()를 넣어 확인해 보세요. 이 경우의 AI 동작 점검은 아직 지원하지 않아요.</p>}
      {!stale && finding && <>
        <div className="pgs-coach-intents" aria-label="점검 항목">{review.findings.map((item, index) => <button key={`${item.ruleId}:${item.line}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.title}</button>)}</div>
        <h4>{finding.title}</h4>
        <p>{finding.explanation}</p>
        <p><b>확인할 부분</b> {finding.action}</p>
        <p><b>직접 확인하기</b> {finding.check}</p>
      </>}
      {finding && allowAi && <CoachAdvice key={`${review.id}:${selected}`} uid={uid} source={review.source} error={behaviorError(finding)} stale={stale} requestAdvice={requestAdvice} />}
      {stale && !finding && <p role="status">코드가 바뀌었어요. 현재 코드로 다시 점검해 주세요.</p>}
    </>}
  </section>
}
