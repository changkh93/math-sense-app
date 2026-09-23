import { useEffect, useMemo, useRef, useState } from 'react'
import { makeCoachPayload } from '../../../functions/studioErrorCoachPolicy.mjs'
import { renderStructure, restoreCoachNames } from '../../../functions/studioCoachStructure.mjs'
import { requestCoachAdvice } from './errorCoachClient'

const blockMessage = reason => ({
  'string-syntax': '이 코드의 복잡한 문자열 구문은 AI 전송용 변환기가 아직 지원하지 않아요.',
  'error-type': '오류 정보를 아직 AI 도움용으로 정리하지 못했어요.',
  location: '오류 위치와 분석할 코드의 범위를 확실하게 맞출 수 없어 AI 도움을 준비하지 못했어요.',
  size: '변환할 코드가 AI 도움의 처리 범위를 넘었어요.',
}[reason] || '현재 코드 구문을 AI 전송용으로 변환하지 못했어요. 코드가 틀렸다는 뜻은 아니에요.')

export default function CoachAdvice({ uid, source, error, mode = 'file', stale, consent = false, samplesConsent = false, onRequested, onReceived, requestAdvice = requestCoachAdvice }) {
  const { payload, aliases, blockedReason } = useMemo(() => {
    const aliases = Object.create(null), diagnostic = {}
    const payload = makeCoachPayload(source, error, mode, aliases, diagnostic)
    return { payload, aliases, blockedReason: diagnostic.reason }
  }, [source, error, mode])
  const prepared = useMemo(() => payload ? renderStructure(payload) : null, [payload])
  const [preview, setPreview] = useState(false), [reviewed, setReviewed] = useState(false)
  const [pending, setPending] = useState(false), [answer, setAnswer] = useState(null), [failure, setFailure] = useState(''), [aiStep, setAiStep] = useState(0)
  const alive = useRef(true), lock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const ask = async () => {
    if (lock.current || stale || !payload || !reviewed) return
    lock.current = true; onRequested?.(); setPending(true); setFailure('')
    try {
      const result = await requestAdvice(uid, payload, consent, samplesConsent)
      onReceived?.()
      if (alive.current) setAnswer(Object.fromEntries(Object.entries(result.advice).map(([key, value]) => [key, restoreCoachNames(value, aliases)])))
    } catch (error) { if (alive.current) setFailure(error.message) }
    finally { if (alive.current) setPending(false) }
  }
  if (stale) return <p className="pgs-coach-stale">코드가 바뀌어 이전 분석을 보류했어요. 오류는 다시 실행하고, 동작 점검은 다시 점검해 주세요.</p>
  if (!payload) return <p role="status">{blockMessage(blockedReason)} 위 기본 힌트로 확인하거나 선생님께 해당 줄을 보여주세요.</p>
  return <>
    {!preview && <button onClick={() => setPreview(true)}>AI에게 물어보기</button>}
    {preview && !answer && <div className="pgs-coach-preview">
      <strong>AI에 보낼 내용 확인</strong>
      <p>오류 종류와 아래 코드 일부·관련 줄을 함께 보내요. 직접 지은 이름은 별명으로, 글자와 숫자는 표시용 이름으로 바꾸고 주석은 빼요. f-string은 안에 들어 있는 식까지 전체를 가려요. AI는 원래 값이나 화면을 볼 수 없지만, 가능한 원인과 내 코드에서 확인할 방법을 안내해요.</p>
      <pre>{prepared.error}{'\n'}{prepared.snippet}{prepared.related?.map((part, i) => `\n\n관련 코드 ${i + 1}\n${part}`).join('')}</pre>
      <label><input type="checkbox" checked={reviewed} disabled={pending || lock.current} onChange={event => setReviewed(event.target.checked)} /> 변환된 코드로 도움받는 것을 확인했어요</label>
      <div className="pgs-coach-actions"><button disabled={!reviewed || pending || lock.current} onClick={ask}>{pending ? '힌트를 생각하고 있어요…' : '확인한 내용으로 AI 힌트 받기'}</button>{!pending && !lock.current && <button onClick={() => { setPreview(false); setReviewed(false) }}>돌아가기</button>}</div>
    </div>}
    {failure && <p role="status">{failure}</p>}
    {answer && <div className="pgs-coach-answer" aria-live="polite"><strong>AI 힌트</strong><p>{answer.explanation}</p><p>{answer.hint}</p>{aiStep >= 1 && <p>{answer.question}</p>}{aiStep >= 2 && <p>{answer.check}</p>}{aiStep < 2 && <button onClick={() => setAiStep(aiStep + 1)}>{aiStep === 0 ? '생각해 볼 질문' : '확인 방법 보기'}</button>}<small>AI가 코드를 실행해 확인한 결과는 아니에요. 한 곳씩 바꾸고 의도한 동작인지 직접 확인해 보세요.</small></div>}
  </>
}
