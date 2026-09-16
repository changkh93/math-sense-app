import { useEffect, useMemo, useRef, useState } from 'react'
import { localFeedback, makeCoachPayload, parseError } from '../../../functions/studioErrorCoachPolicy.mjs'
import { requestCoachAdvice } from './errorCoachClient'
import './ErrorCoach.css'

// Parent keys this by failed execution, not just by the selected filename.
export default function ErrorCoach({ uid, source, currentSource, text, mode = 'file', requestAdvice = requestCoachAdvice }) {
  const error = useMemo(() => parseError(text), [text])
  const { guide, example } = useMemo(() => localFeedback(error, source, mode), [error, source, mode])
  const payload = useMemo(() => makeCoachPayload(source, error, mode), [source, error, mode])
  const [step, setStep] = useState(0), [preview, setPreview] = useState(false), [reviewed, setReviewed] = useState(false)
  const [pending, setPending] = useState(false), [answer, setAnswer] = useState(null), [failure, setFailure] = useState(''), [aiStep, setAiStep] = useState(0)
  const [reported, setReported] = useState(false)
  const alive = useRef(true), lock = useRef(false)
  const stale = currentSource !== source
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const ask = async () => {
    if (lock.current || stale || !payload || !reviewed) return
    lock.current = true; setPending(true); setFailure('')
    try { const result = await requestAdvice(uid, payload); if (alive.current) setAnswer(result.advice) }
    catch (error) { if (alive.current) setFailure(error.message) }
    finally { if (alive.current) setPending(false) }
  }
  if (!error.eligible) return null
  return <section className="pgs-error-coach" aria-label="오류 해결 도우미">
    <div className="pgs-coach-heading"><strong>한 걸음씩 고쳐봐요</strong><span>기본 힌트 · AI 호출 없음</span></div>
    <p>{error.path} · {error.line}번째 줄 · {guide[0]}</p>
    <p><b>이렇게 고쳐봐요</b> {guide[1]}</p>
    {step >= 1 && <><p><b>직접 확인하기</b> {guide[2]}</p>{example && <div className="pgs-coach-example"><b>문법 예시</b><pre>{example}</pre></div>}</>}
    {stale ? <p className="pgs-coach-stale">코드를 바꿨네요. 다시 실행해서 어떤 점이 달라졌는지 확인해 보세요.</p> : <>
      {step === 0 && <button onClick={() => setStep(1)}>확인 방법 · 예시 보기</button>}
      {step >= 1 && payload && !preview && <button onClick={() => setPreview(true)}>아직 어렵다면 · AI 도움</button>}
      {step >= 1 && !payload && <p>이 코드 일부만으로는 오류 위치를 정확히 짚기 어려워요. 함수를 정의한 셀이나 파일의 해당 줄을 확인하고, 선생님과 함께 살펴보세요.</p>}
      {preview && !answer && <div className="pgs-coach-preview">
        <strong>AI에 보낼 내용 확인</strong>
        <p>오류와 주변 코드 일부만 OpenAI로 보내요. 주석·문자열 내용은 가렸지만, 변수 이름 등에 이름이나 개인정보가 남아 있는지 확인해 주세요.</p>
        <pre>{payload.error}{'\n'}{payload.snippet}</pre>
        <label><input type="checkbox" checked={reviewed} disabled={pending || lock.current} onChange={event => setReviewed(event.target.checked)} /> 개인정보가 없는지 확인했어요</label>
        <div className="pgs-coach-actions"><button disabled={!reviewed || pending || lock.current} onClick={ask}>{pending ? '힌트를 생각하고 있어요…' : '확인한 내용으로 AI 힌트 받기'}</button>{!pending && !lock.current && <button onClick={() => { setPreview(false); setReviewed(false) }}>돌아가기</button>}</div>
      </div>}
      {failure && <p role="status">{failure}</p>}
      {answer && <div className="pgs-coach-answer" aria-live="polite"><strong>AI 학습 힌트</strong><p>{answer.explanation}</p><p>{answer.hint}</p>{aiStep >= 1 && <p>{answer.question}</p>}{aiStep >= 2 && <p>{answer.check}</p>}{aiStep < 2 && <button onClick={() => setAiStep(aiStep + 1)}>{aiStep === 0 ? '생각해 볼 질문' : '확인 방법 보기'}</button>}<small>AI 설명은 틀릴 수 있어요. 한 곳씩 바꾸고 실행 결과로 확인해 보세요.</small><button onClick={() => setReported(true)}>선생님과 확인하기</button>{reported && <p role="status">이 설명을 따라 고치기 전에 선생님께 오류 줄과 AI 설명을 보여주세요.</p>}</div>}
    </>}
  </section>
}
