import { useEffect, useMemo, useState } from 'react'
import { localFeedback, parseError } from '../../../functions/studioErrorCoachPolicy.mjs'
import { requestCoachAdvice } from './errorCoachClient'
import CoachAdvice from './CoachAdvice'
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
  const chooseIntent = value => { setIntent(value); session.tracker.intent(episodeKey, value); if (value !== 'helpful') setStep(1) }
  const [step, setStep] = useState(0)
  const stale = currentSource !== source
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
    {!stale && step === 0 && <button onClick={() => setStep(1)}>확인 방법 · 예시 보기</button>}
    <CoachAdvice uid={uid} source={source} error={error} mode={mode} stale={stale}
      consent={session.consent && session.manifest.collectionEnabled}
      samplesConsent={session.consent && session.manifest.samplesEnabled}
      onRequested={() => session.tracker.ai(episodeKey)} onReceived={() => session.tracker.ai(episodeKey, true)} requestAdvice={requestAdvice} />
  </section>
}
