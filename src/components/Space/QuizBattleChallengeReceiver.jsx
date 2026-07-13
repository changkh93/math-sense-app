import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useLocation, useNavigate } from 'react-router-dom'
import { db, functions } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import soundManager from '../../utils/SoundManager'
import './QuizBattleChallengeReceiver.css'

const formatCountdown = (expiresAtMs, nowMs) => Math.max(0, Math.ceil((Number(expiresAtMs || 0) - nowMs) / 1000))

const getResponseError = (error) => {
  const message = String(error?.message || '').trim()
  if (!message || message.toLowerCase() === 'internal') return '도전장 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  return message
}

export default function QuizBattleChallengeReceiver() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [challenge, setChallenge] = useState(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const [action, setAction] = useState('')
  const [error, setError] = useState('')
  const lastAnnouncedRequestRef = useRef('')

  useEffect(() => {
    if (!user?.uid) {
      setChallenge(null)
      return undefined
    }
    return onSnapshot(doc(db, 'quizBattleChallenges', user.uid), (snap) => {
      const next = snap.exists() ? { id: snap.id, ...snap.data() } : null
      if (next?.status === 'pending' && Number(next.expiresAtMs || 0) > Date.now()) {
        setChallenge(next)
        setError('')
        if (lastAnnouncedRequestRef.current !== next.requestId) {
          lastAnnouncedRequestRef.current = next.requestId
          soundManager.playCrystal()
        }
      } else {
        setChallenge(null)
      }
    }, (err) => {
      console.warn('[QuizBattleChallengeReceiver] subscribe failed:', err)
      setChallenge(null)
    })
  }, [user?.uid])

  useEffect(() => {
    if (!challenge) return undefined
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [challenge])

  const secondsLeft = useMemo(
    () => formatCountdown(challenge?.expiresAtMs, nowMs),
    [challenge?.expiresAtMs, nowMs]
  )

  useEffect(() => {
    if (challenge && secondsLeft <= 0) setChallenge(null)
  }, [challenge, secondsLeft])

  const respond = async (response) => {
    if (!challenge?.requestId || action) return
    setAction(response)
    setError('')
    try {
      const respondToChallenge = httpsCallable(functions, 'respondQuizBattleChallenge')
      const result = await respondToChallenge({ requestId: challenge.requestId, response })
      if (response === 'accept' && result.data?.battleId) {
        soundManager.playWarp()
        const acceptedQuizBattle = {
          battleId: result.data.battleId,
          ...(result.data.challenge || {}),
        }
        navigate('/?view=battle', {
          state: {
            view: 'battle',
            acceptedQuizBattle,
            returnPath: `${location.pathname}${location.search}`,
          },
        })
      }
      setChallenge(null)
    } catch (err) {
      setError(getResponseError(err))
    } finally {
      setAction('')
    }
  }

  if (!challenge || secondsLeft <= 0 || typeof document === 'undefined') return null

  return createPortal(
    <div className="battle-challenge-layer" role="dialog" aria-modal="true" aria-labelledby="battle-challenge-title">
      <div className="battle-challenge-backdrop" />
      <section className="battle-challenge-card">
        <div className="battle-challenge-scan" aria-hidden="true" />
        <header className="battle-challenge-header">
          <div>
            <span className="battle-challenge-kicker"><i /> LIVE CHALLENGE</span>
            <h2 id="battle-challenge-title">퀴즈 배틀 도착</h2>
          </div>
          <div className="battle-challenge-timer" aria-label={`응답까지 ${secondsLeft}초`}>
            <span>{secondsLeft}</span> SEC
          </div>
        </header>

        <div className="battle-challenge-opponent">
          <div className="battle-challenge-avatar">⚔</div>
          <div>
            <small>CHALLENGER</small>
            <strong>{challenge.challengerName || '탐사원'}</strong>
            <span>{challenge.challengerIsGuest ? '게스트 탐사원' : '온라인 탐사원'}</span>
          </div>
        </div>

        <dl className="battle-challenge-spec">
          <div><dt>행성</dt><dd>{challenge.regionTitle || '선택 행성'}</dd></div>
          <div><dt>퀴즈 범위</dt><dd>{challenge.rangeLabel || challenge.entryUnitTitle || '선택 범위'}</dd></div>
          <div><dt>전투 규격</dt><dd>{challenge.questionCount || 15}문제 · 제한 12분</dd></div>
        </dl>

        <div className="battle-challenge-safety">
          <span>✓</span>
          <p><b>지금 하던 학습은 안전하게 기록됩니다.</b><br />배틀이 끝난 뒤 현재 학습 위치에서 그대로 이어갈 수 있어요.</p>
        </div>

        {error && <div className="battle-challenge-error">{error}</div>}
        <div className="battle-challenge-actions">
          <button type="button" className="battle-challenge-decline" disabled={Boolean(action)} onClick={() => respond('decline')}>
            {action === 'decline' ? '전송 중…' : '이번에는 거절'}
          </button>
          <button type="button" className="battle-challenge-accept" disabled={Boolean(action)} onClick={() => respond('accept')}>
            {action === 'accept' ? '배틀 좌표 연결 중…' : '도전 수락'} <span>→</span>
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
