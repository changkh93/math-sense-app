export default function QuizProgressSummary({ questions, answers, total, currentQuestionId, deferredIds, reSolveMode, isDeferredRound }) {
  const answeredCount = questions.filter(question => answers[question.id]).length
  const questionNumber = questions.findIndex(question => question.id === currentQuestionId) + 1
  const deferredCount = questions.filter(question => deferredIds.has(question.id) && !answers[question.id]).length
  const progress = total > 0 ? Math.min(100, answeredCount / total * 100) : 0

  return (
    <div style={{ marginTop: '1rem', textAlign: 'left', lineHeight: 1.6, wordBreak: 'keep-all' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.25rem 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-bright, var(--text-main, inherit))' }}>
        <span>총 {total}문제 중 {answeredCount}문제 답 선택</span>
        {questionNumber > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>지금 보는 문제: {questionNumber}번</span>}
      </div>
      <div role="progressbar" aria-label="전체 문제 중 답을 선택한 문제" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount}
        aria-valuetext={`총 ${total}문제 중 ${answeredCount}문제 답 선택`}
        style={{ height: 8, marginTop: '0.5rem', borderRadius: 4, overflow: 'hidden', background: 'rgba(148,163,184,0.2)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--crystal-cyan, var(--success, #22c55e))', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
        맞힌 개수가 아니라, 답을 고른 문제 수예요.
        {reSolveMode && <span> 다시 풀 문제는 새로 답을 고르면 포함돼요.</span>}
      </div>
      {deferredCount > 0 && <div style={{ color: 'var(--star-gold, #927000)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 700 }}>
        {isDeferredRound ? `남은 ${deferredCount}문제에 답을 골라 주세요.` : `나중에 풀 문제 ${deferredCount}개 · 다른 문제를 푼 뒤 다시 나와요.`}
      </div>}
    </div>
  )
}
