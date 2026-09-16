import { useEffect, useMemo, useRef, useState } from 'react'
import { localFeedback, makeCoachPayload, parseError } from '../../../functions/studioErrorCoachPolicy.mjs'
import { requestCoachAdvice } from './errorCoachClient'
import { renderStructure, restoreCoachNames } from '../../../functions/studioCoachStructure.mjs'
import { learningSession } from './coachLearningClient'
import { ruleFor, selectCard, INTENT_LABELS } from '../../../functions/studioCoachLearningPolicy.mjs'
import './ErrorCoach.css'

// Parent keys this by failed execution, not just by the selected filename.
export default function ErrorCoach({ uid, source, currentSource, text, mode = 'file', learningKey, learningScope = '', learningPath = '', requestAdvice = requestCoachAdvice }) {
  const error = useMemo(() => parseError(text), [text])
  const diagnosis = useMemo(() => localFeedback(error, source, mode), [error, source, mode])
  const { guide, example } = diagnosis
  const ruleId = ruleFor(diagnosis, error)
  const [session] = useState(() => learningSession(uid))
  const [card] = useState(() => selectCard(ruleId, mode, session.manifest.cards, session.bucket))
  const [shadowVersion] = useState(() => session.manifest.cards.find(c => c.ruleId === ruleId && ['both', mode].includes(c.mode) && c.stage === 'shadow')?.version || null)
  const [episodeKey] = useState(() => learningKey || crypto.randomUUID())
  const [intent, setIntent] = useState('')
  const [, refresh] = useState(0)
  useEffect(() => { const update = () => refresh(n => n + 1); session.listeners.add(update); return () => session.listeners.delete(update) }, [session])
  useEffect(() => {
    if (error.eligible) session.tracker.register({ key: episodeKey, scope: learningScope, source, path: learningPath, signature: `${error.type}:${error.message}`, ruleId, cardVersion: card.version, shadowVersion, mode })
  }, [session, episodeKey, learningScope, learningPath, source, error, ruleId, card.version, shadowVersion, mode])
  const chooseIntent = value => { setIntent(value); session.tracker.intent(episodeKey, value); if (value === 'example') setStep(1) }
  const { payload, aliases } = useMemo(() => {
    const aliases = Object.create(null)
    return { payload: makeCoachPayload(source, error, mode, aliases), aliases }
  }, [source, error, mode])
  const prepared = useMemo(() => payload ? renderStructure(payload) : null, [payload])
  const [step, setStep] = useState(0), [preview, setPreview] = useState(false), [reviewed, setReviewed] = useState(false)
  const [pending, setPending] = useState(false), [answer, setAnswer] = useState(null), [failure, setFailure] = useState(''), [aiStep, setAiStep] = useState(0)
  const [reported, setReported] = useState(false)
  const alive = useRef(true), lock = useRef(false)
  const stale = currentSource !== source
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const ask = async () => {
    if (lock.current || stale || !payload || !reviewed) return
    lock.current = true; session.tracker.ai(episodeKey); setPending(true); setFailure('')
    try { const result = await requestAdvice(uid, payload, session.consent && session.manifest.collectionEnabled, session.consent && session.manifest.samplesEnabled); session.tracker.ai(episodeKey, true); if (alive.current) setAnswer(Object.fromEntries(Object.entries(result.advice).map(([key, value]) => [key, restoreCoachNames(value, aliases)]))) }
    catch (error) { if (alive.current) setFailure(error.message) }
    finally { if (alive.current) setPending(false) }
  }
  if (!error.eligible) return null
  return <section className="pgs-error-coach" aria-label="오류 해결 도우미">
    <div className="pgs-coach-heading"><strong>한 걸음씩 고쳐봐요</strong><span>기본 힌트 · AI 호출 없음</span></div>
    <p>{error.path} · {error.line}번째 줄 · {guide[0]}</p>
    <p><b>이렇게 고쳐봐요</b> {guide[1]}</p>
    {step >= 1 && <><p><b>직접 확인하기</b> {guide[2]}</p>{example && <div className="pgs-coach-example"><b>문법 예시</b><pre>{example}</pre></div>}</>}
    <div className="pgs-coach-intents" aria-label="도움 질문">{Object.entries(INTENT_LABELS).map(([value,label]) => <button key={value} aria-pressed={intent === value} onClick={() => chooseIntent(value)}>{label}</button>)}</div>
    {intent && <div className="pgs-coach-question" role="status">
      {intent === 'meaning' && <p>{card.meaning || `${guide[0]} ${guide[1]}`}</p>}
      {intent === 'location' && <p>{guide[1]} 오류가 표시된 곳은 {error.line}번째 줄이에요. 위 힌트가 앞의 줄을 가리킨다면 그 줄부터 확인하세요.</p>}
      {intent === 'example' && <><p>아래는 원리를 확인하는 예시예요. 내 코드의 이름과 목적에 맞춰 비교해 보세요.</p><pre>{card.example || example || guide[2]}</pre></>}
      {intent === 'still-stuck' && <p>{card.question || guide[2]} 다시 실행한 뒤 같은 오류인지, 다른 오류로 바뀌었는지 확인해요.</p>}
      {intent === 'incorrect' && <p>이 설명대로 고치지 않아도 괜찮아요. 오류 줄과 설명을 선생님께 보여주세요. 개선 참여를 켰다면 이번 도움의 관찰이 전송될 때 함께 반영해요.</p>}
      {intent === 'helpful' && <p>이해한 내용을 내 코드에 적용하고 다시 실행해 보세요.</p>}
    </div>}
    {session.manifest.collectionEnabled && <details className="pgs-coach-participation"><summary>도움 설명 개선에 참여하기 · 선택</summary><p>오류 유형, 선택한 질문, 수정·재실행 결과를 기록해 설명을 개선해요. 코드 원문과 변수 이름은 이 기록에 보내지 않아요.{session.manifest.samplesEnabled && ' AI를 요청하면 변환된 코드와 AI 답변 일부도 검토용으로 보관할 수 있어요.'} 참여하지 않아도 도움을 받을 수 있어요. 선택은 이 탭에서만 유지돼요.</p><label><input type="checkbox" checked={session.consent} onChange={e => { session.setConsent(e.target.checked); if (e.target.checked) session.tracker.register({key:episodeKey,scope:learningScope,source,path:learningPath,signature:`${error.type}:${error.message}`,ruleId,cardVersion:card.version,shadowVersion,mode}) }} /> 설명 개선에 참여할게요</label><a href="/privacy" target="_blank" rel="noreferrer">처리 안내 보기</a></details>}
    {stale ? <p className="pgs-coach-stale">코드를 바꿨네요. 다시 실행해서 어떤 점이 달라졌는지 확인해 보세요.</p> : <>
      {step === 0 && <button onClick={() => setStep(1)}>확인 방법 · 예시 보기</button>}
      {step >= 1 && payload && !preview && <button onClick={() => setPreview(true)}>아직 어렵다면 · AI 도움</button>}
      {step >= 1 && !payload && <p>이 오류는 값이나 다른 코드까지 확인해야 해요. 내용을 가리면 잘못 설명할 수 있어 AI로 보내지 않아요. 위 기본 힌트나 선생님의 도움으로 확인해 주세요.</p>}
      {preview && !answer && <div className="pgs-coach-preview">
        <strong>AI에 보낼 내용 확인</strong>
        <p>AI는 아래처럼 바꾼 코드와 오류 설명을 받아요. 직접 지은 이름은 variable_1 같은 별명으로, 글자와 숫자는 표시용 이름으로 바꾸고 주석은 빼요. 같은 이름은 같은 별명으로 표시해요. 원래 철자와 값은 AI가 볼 수 없어요. 오류 종류·줄 번호·기본 분석의 오류 유형도 함께 보내요.</p>
        <pre>{prepared.error}{'\n'}{prepared.snippet}</pre>
        <label><input type="checkbox" checked={reviewed} disabled={pending || lock.current} onChange={event => setReviewed(event.target.checked)} /> 변환된 코드로 도움받는 것을 확인했어요</label>
        <div className="pgs-coach-actions"><button disabled={!reviewed || pending || lock.current} onClick={ask}>{pending ? '힌트를 생각하고 있어요…' : '확인한 내용으로 AI 힌트 받기'}</button>{!pending && !lock.current && <button onClick={() => { setPreview(false); setReviewed(false) }}>돌아가기</button>}</div>
      </div>}
      {failure && <p role="status">{failure}</p>}
      {answer && <div className="pgs-coach-answer" aria-live="polite"><strong>변환된 코드를 살펴본 AI 힌트</strong><p>{answer.explanation}</p><p>{answer.hint}</p>{aiStep >= 1 && <p>{answer.question}</p>}{aiStep >= 2 && <p>{answer.check}</p>}{aiStep < 2 && <button onClick={() => setAiStep(aiStep + 1)}>{aiStep === 0 ? '생각해 볼 질문' : '확인 방법 보기'}</button>}<small>전송용 별명은 이 화면에서 내 변수 이름으로 다시 표시해요. 줄 번호로 내 코드와 비교하세요. AI는 원래 값과 철자를 모르며 설명이 틀릴 수 있어요. 한 곳씩 바꾸고 실행 결과로 확인해 보세요.</small><button onClick={() => setReported(true)}>선생님과 확인하기</button>{reported && <p role="status">이 설명을 따라 고치기 전에 선생님께 오류 줄과 AI 설명을 보여주세요.</p>}</div>}
    </>}
  </section>
}
