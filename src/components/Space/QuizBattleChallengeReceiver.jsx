import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
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
  const recoveringBattleRef = useRef('')

  const enterAcceptedBattle = useCallback(async (accepted) => {
    const battleId = String(accepted?.battleId || '').trim()
    if (!battleId) return false
    if (recoveringBattleRef.current?.battleId === battleId) {
      return recoveringBattleRef.current.promise
    }

    let recoveryEntry
    const promise = (async () => {
      try {
        // 과거 accepted 문서 때문에 끝난 배틀로 다시 이동하지 않도록 현재 상태를 확인한다.
        const stateSnap = await getDoc(doc(db, 'quizBattleStates', battleId))
        const battleSnap = stateSnap.exists()
          ? stateSnap
          : await getDoc(doc(db, 'quizBattles', battleId))
        const status = battleSnap.exists() ? battleSnap.data()?.status : ''
        if (!['starting', 'active'].includes(status)) return false

        soundManager.playWarp()
        setChallenge(null)
        navigate('/?view=battle', {
          state: {
            view: 'battle',
            acceptedQuizBattle: {
              battleId,
              clusterId: accepted.clusterId || '',
              regionId: accepted.regionId || '',
              entryUnitId: accepted.entryUnitId || '',
              entryUnitTitle: accepted.entryUnitTitle || '',
              battleScope: accepted.battleScope || 'cumulative',
              rangeLabel: accepted.rangeLabel || accepted.entryUnitTitle || '퀴즈 배틀',
            },
            returnPath: `${location.pathname}${location.search}`,
          },
        })
        return true
      } catch (err) {
        console.warn('[QuizBattleChallengeReceiver] accepted battle recovery failed:', err)
        if (recoveringBattleRef.current === recoveryEntry) recoveringBattleRef.current = null
        return false
      }
    })()
    recoveryEntry = { battleId, promise }
    recoveringBattleRef.current = recoveryEntry
    return promise
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!user?.uid) {
      setChallenge(null)
      return undefined
    }
    return onSnapshot(doc(db, 'quizBattleChallenges', user.uid), (snap) => {
      const next = snap.exists() ? { id: snap.id, ...snap.data() } : null
      if (next?.status === 'pending' && Number(next.expiresAtMs || 0) > Date.now()) {
        setChallenge(next)
        if (lastAnnouncedRequestRef.current !== next.requestId) {
          lastAnnouncedRequestRef.current = next.requestId
          soundManager.playCrystal()
        }
      } else if (next?.status === 'accepting' && Number(next.acceptingLeaseExpiresAtMs || 0) > Date.now()) {
        // 함수 응답을 기다리는 동안 문서를 유지해 새로고침 후에도 연결 상태를 보여준다.
        setChallenge(next)
      } else {
        setChallenge(null)
        if (next?.status === 'accepted' && next.battleId) void enterAcceptedBattle(next)
      }
    }, (err) => {
      console.warn('[QuizBattleChallengeReceiver] subscribe failed:', err)
      setChallenge(null)
    })
  }, [enterAcceptedBattle, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    // 신청자도 페이지 새로고침·라우팅 실패 뒤 accepted lock을 통해 같은 배틀을 복구한다.
    return onSnapshot(doc(db, 'quizBattleChallengeLocks', user.uid), (snap) => {
      const lock = snap.exists() ? snap.data() : null
      if (lock?.status === 'accepted' && lock.battleId) void enterAcceptedBattle(lock)
    }, (err) => {
      console.warn('[QuizBattleChallengeReceiver] outgoing challenge recovery failed:', err)
    })
  }, [enterAcceptedBattle, user?.uid])

  useEffect(() => {
    if (!challenge) return undefined
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [challenge])

  const secondsLeft = useMemo(
    () => formatCountdown(
      challenge?.status === 'accepting' ? challenge?.acceptingLeaseExpiresAtMs : challenge?.expiresAtMs,
      nowMs
    ),
    [challenge?.acceptingLeaseExpiresAtMs, challenge?.expiresAtMs, challenge?.status, nowMs]
  )

  useEffect(() => {
    if (challenge?.status === 'pending' && secondsLeft <= 0) setChallenge(null)
    if (challenge?.status === 'accepting' && secondsLeft <= 0) {
      setChallenge((current) => current?.requestId === challenge.requestId
        ? { ...current, status: 'accept_retry' }
        : current)
      setError('연결 응답이 지연되고 있습니다. 다시 연결해 주세요.')
    }
  }, [challenge, secondsLeft])

  const respond = async (response) => {
    if (!challenge?.requestId || action) return
    setAction(response)
    setError('')
    try {
      const respondToChallenge = httpsCallable(functions, 'respondQuizBattleChallenge')
      const result = await respondToChallenge({ requestId: challenge.requestId, response })
      if (response === 'accept' && result.data?.battleId) {
        await enterAcceptedBattle({
          battleId: result.data.battleId,
          ...(result.data.challenge || {}),
        })
      }
      if (response === 'decline') setChallenge(null)
    } catch (err) {
      setError(getResponseError(err))
    } finally {
      setAction('')
    }
  }

  const isAccepting = challenge?.status === 'accepting' || action === 'accept'
  const isAcceptRetry = challenge?.status === 'accept_retry'

  if (!challenge || (challenge.status === 'pending' && secondsLeft <= 0) || typeof document === 'undefined') return null

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
          <div className="battle-challenge-timer" aria-label={isAccepting ? '배틀 연결 중' : `응답까지 ${secondsLeft}초`}>
            {isAccepting ? <span>LINK</span> : <><span>{secondsLeft}</span> SEC</>}
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
          <button type="button" className="battle-challenge-decline" disabled={Boolean(action) || isAccepting || isAcceptRetry} onClick={() => respond('decline')}>
            {action === 'decline' ? '전송 중…' : '이번에는 거절'}
          </button>
          <button type="button" className="battle-challenge-accept" disabled={Boolean(action) || isAccepting} onClick={() => respond('accept')}>
            {isAccepting ? '배틀 좌표 연결 중…' : isAcceptRetry ? '다시 연결' : '도전 수락'} <span>→</span>
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
