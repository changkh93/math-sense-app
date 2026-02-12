import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import StarField from './StarField'
import { createParticleBurst, shakeScreen } from './ParticleEffects'
import soundManager from '../../utils/SoundManager'
import { sanitizeLaTeX } from '../../utils/latexUtils'
import '../../styles/space-theme.css'
import QuestionModal from '../QuestionModal'
import { useSmartSync } from '../../hooks/useSync'

export default function SpaceQuizView({ region, quizData, onExit, onComplete, hasShield }) {
  // Real-time synchronization watchdog
  useSmartSync(quizData?.unitId)

  const [currentQuestions, setCurrentQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [isResultMode, setIsResultMode] = useState(false)
  const [reSolveMode, setReSolveMode] = useState(false)
  const [showFeedback, setShowFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [isRebooting, setIsRebooting] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const [sessionCrystals, setSessionCrystals] = useState(0)
  const [shieldUsed, setShieldUsed] = useState(false)
  const [floatingMarkers, setFloatingMarkers] = useState([]) // { id, text, type, x, y }
  const [originalTotal, setOriginalTotal] = useState(0)
  const [allSessionQuestions, setAllSessionQuestions] = useState([]) // 최초 20문항 유지
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [isFirstPassPerfect, setIsFirstPassPerfect] = useState(false)
  const initializedUnitId = useRef(null) // Prevent accidental reshuffling
  const isMobile = window.innerWidth <= 768

  // 초기 문제 설정
  useEffect(() => {
    // Only initialize if it's a new unit or hasn't been initialized yet
    if (quizData?.questions && initializedUnitId.current !== quizData.unitId) {
      const allQ = [...quizData.questions].map(q => ({
        ...q,
        shuffledOptions: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
      }));
      const shuffled = allQ.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, 20)
      setCurrentQuestions(selected)
      setAllSessionQuestions(selected)
      setOriginalTotal(selected.length)
      initializedUnitId.current = quizData.unitId;
      setCurrentIdx(0); // Reset index on unit change
    }
  }, [quizData])


  const formatText = (text) => {
    if (!text || typeof text !== 'string') return ""
    const sanitized = sanitizeLaTeX(text)
    const parts = sanitized.split('$')
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        let math = part
        if (math.includes('/') && !math.includes('\\frac')) {
          math = math.replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}')
        }
        return <InlineMath key={i} math={math} />
      }
      return part
    })
  }

  const currentQuestion = currentQuestions[currentIdx]

  const handleSelect = (option, event) => {
    if (isRebooting || showFeedback) return
    const isCorrect = option.isCorrect
    
    // 피드백 표시
    setShowFeedback(isCorrect ? 'correct' : 'wrong')
    
    // 부유 효과 트리거 함수
    const addMarker = (text, type, bonusX = 0, bonusY = 0) => {
      const id = Date.now() + Math.random()
      setFloatingMarkers(prev => [...prev, { 
        id, 
        text, 
        type, 
        x: event.clientX + bonusX, 
        y: event.clientY + bonusY 
      }])
      setTimeout(() => {
        setFloatingMarkers(prev => prev.filter(m => m.id !== id))
      }, 2000)
    }

    // 사운드 & 파티클 & 로직
    if (isCorrect) {
      soundManager.playCorrect()
      createParticleBurst(event.clientX, event.clientY, 'star')
      createParticleBurst(event.clientX, event.clientY, 'ore')
      
      const newCombo = (comboCount || 0) + 1
      setComboCount(newCombo)
      
      let earned = 1
      
      // 재도전 모드(학습 모드)에서는 광석 획득/차감 및 보너스 없음
      if (!reSolveMode) {
        addMarker('+1', 'gain')

        if (newCombo > 0 && newCombo % 3 === 0) {
          earned += 5 // 3콤보 보너스
          setTimeout(() => addMarker('+5 COMBO!', 'gain', 40, -40), 200)
        }
        setSessionCrystals(prev => prev + earned)
      }
      
      // 다음 문제로 이동 (일반 딜레이)
      setTimeout(() => {
        // Guard against progression while Ask Teacher modal is open
        if (isQuestionModalOpen) return;

        setShowFeedback(null)
        if (currentIdx < currentQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1)
        } else {
          // 마지막 문제이고 전체 정답률 100% 인 경우 보너스 알림
          const totalCorrectSoFar = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect || q.id === currentQuestion.id).length
          if (totalCorrectSoFar === originalTotal) {
            setTimeout(() => addMarker('+10 PERFECT!', 'gain', 60, -60), 200)
          }
          setIsResultMode(true)
        }
      }, 800)

    } else {
      soundManager.playWrong()
      createParticleBurst(event.clientX, event.clientY, 'wrong')
      shakeScreen(300)
      
      setComboCount(0)
      
      // 방패 방어 로직 (광자 쉴드)
      if (hasShield && !shieldUsed) {
        setShieldUsed(true)
        addMarker('🛡️ DEFENDED!', 'gain')
      } else {
        // 재도전 모드에서는 광석 차감 없음
        if (!reSolveMode) {
          setSessionCrystals(prev => Math.max(0, prev - 2))
          addMarker('-2', 'loss')
        }
      }
      
      // 시스템 리부트 (3초 딜레이)
      setIsRebooting(true)
      setTimeout(() => {
        // Guard against progression while Ask Teacher modal is open
        if (isQuestionModalOpen) return;

        setIsRebooting(false)
        setShowFeedback(null)
        if (currentIdx < currentQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1)
        } else {
          setIsResultMode(true)
        }
      }, 3000)
    }
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }))
  }

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false)
    // 피드백 도중 모달을 열었을 경우, 닫힐 때 다음 문제로 이동
    if (showFeedback) {
      const delay = showFeedback === 'correct' ? 500 : 1500
      setTimeout(() => {
        setIsRebooting(false)
        setShowFeedback(null)
        if (currentIdx < currentQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1)
        } else {
          setIsResultMode(true)
        }
      }, delay)
    }
  }

  const handleReSolveWrong = () => {
    soundManager.playClick()
    // 현재 세션의 전체 문제 중 틀린 문제만 필터링
    const wrongQuestions = currentQuestions.filter(q => !userAnswers[q.id]?.isCorrect).map(q => ({
      ...q,
      shuffledOptions: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
    }))
    const newUserAnswers = { ...userAnswers }
    
    // 틀린 문제의 답안 기록 삭제 (다시 풀 수 있게)
    wrongQuestions.forEach(q => {
      delete newUserAnswers[q.id]
    })
    
    setUserAnswers(newUserAnswers)
    setCurrentQuestions(wrongQuestions)
    setCurrentIdx(0)
    setIsResultMode(false)
    setReSolveMode(true)
  }

  const handleFinish = () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    
    soundManager.playClick()
    // 점수 계산: 최초 전체 세션 문항(allSessionQuestions) 기준
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    
    // 점수 계산: 재도전 여부와 관계없이 최초 총 문항수 기준으로 계산
    const score100 = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0
    
    // 만점 보너스 조건: 
    // 1. 재도전 모드가 아닐 때 100% 달성 
    // 2. 또는 재도전 후 모든 문제를 맞혔더라도, 보너스는 최초 100%일 때만 강력 부여 (혹은 정책에 따라 차등)
    // 여기서는 '최초 만점' 또는 '재도전 포함 최종 만점' 중 '최초 만점'에만 보너스를 주는 것이 일관성을 높임
    const canGetPerfectBonus = (correctCount === originalTotal)
    
    const crystalsEarned = sessionCrystals + (canGetPerfectBonus ? 10 : 0)
    
    onComplete({ 
      score: score100, 
      total: 100, 
      correctCount, 
      totalCount: originalTotal, 
      questions: currentQuestions,
      crystalsEarned,
      isPerfect: canGetPerfectBonus,
      shieldUsed
    })
  }

  if (!isResultMode) {
    if (!quizData) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--crystal-cyan)'
          }}>
            🚀 문제를 불러오는 중...
          </div>
        </div>
      )
    }

    if (currentQuestions.length === 0) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '2rem'
          }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>
              ⚠️ 이 유닛에는 아직 문제가 등록되지 않았습니다.<br/>
              <span style={{ fontSize: '1rem', opacity: 0.7 }}>관리자에게 문의해 주세요.</span>
            </div>
            <button 
              onClick={onExit}
              className="glass-card"
              style={{
                padding: '1rem 2rem',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )
    }
  }

  // 결과 화면
  if (isResultMode) {
    // 점수 계산: 최초 개별 문항들의 최종 정답 여부 합산
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const score100 = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0
    const isPerfect = (correctCount === originalTotal)
    
    // 만점 보너스 가시성 (저장 로직과 동일하게 유지)
    const canGetPerfectBonus = isPerfect
    const crystalsEarnedDisplay = sessionCrystals + (canGetPerfectBonus ? 10 : 0)

    return (
      <div className="space-bg">
        <StarField count={150} />
        <div className="space-quiz-container fade-in">
          <div className="glass-card space-quiz-card" style={{ textAlign: 'center' }}>
            <button 
              onClick={() => { soundManager.playClick(); onExit() }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              ✕ 나가기
            </button>

            <h2 style={{ 
              fontSize: '2rem', 
              color: 'var(--text-bright)',
              marginBottom: '1.5rem'
            }}>
              🎉 {reSolveMode ? '재도전 완료!' : '탐사 완료!'}
            </h2>

            {/* 점수 원 */}
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: `4px solid ${canGetPerfectBonus ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: canGetPerfectBonus ? 'var(--glow-gold)' : 'var(--glow-cyan)'
            }}>
              <span style={{ 
                fontSize: '3rem', 
                fontWeight: 900,
                color: canGetPerfectBonus ? 'var(--star-gold)' : 'var(--crystal-cyan)'
              }}>
                {score100}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>점</span>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {correctCount} / {originalTotal} 정답 (전체 기준)
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              <div className="crystal-icon" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>
                +{crystalsEarnedDisplay} 광석 획득!
              </span>
            </div>

            {/* 결과 리스트 */}
            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '15px',
              padding: '1rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              {currentQuestions.map((q, idx) => {
                const isCorrect = userAnswers[q.id]?.isCorrect
                return (
                  <div 
                    key={q.id}
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      marginBottom: '0.5rem',
                      borderLeft: `4px solid ${isCorrect ? 'var(--planet-green)' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{idx + 1}.</span>
                    <span style={{ flex: 1, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
                      {formatText(q.question)}
                    </span>
                    <span>{isCorrect ? '⭕' : '❌'}</span>
                  </div>
                )
              })}
            </div>

            {/* 버튼들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!isPerfect && (
                <button
                  onClick={handleReSolveWrong}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
                    border: 'none',
                    borderRadius: '15px',
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ❌ 틀린 문제 다시 풀기
                </button>
              )}
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                style={{
                  padding: '1rem',
                  background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                  border: 'none',
                  borderRadius: '15px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? '제출 중...' : (canGetPerfectBonus ? '🌟 만점 보상 받기' : '📤 결과 저장하기')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 퀴즈 화면
  const progress = ((currentIdx + 1) / currentQuestions.length) * 100

  // [SAFETY GUARD] If currentQuestion is undefined (e.g. ghost docs or index out of bounds),
  // show a fallback to prevent white screen crash.
  if (!currentQuestion && !isResultMode) {
    return (
      <div className="space-bg">
        <div className="space-quiz-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>데이터 로딩 오류</h2>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              퀴즈 데이터를 불러오는 중 문제가 발생했습니다.<br/>
              (오래된 데이터가 남아있을 수 있습니다)
            </p>
            <button 
              className="quiz-btn primary"
              onClick={() => handleComplete({ score: 0, total: 0 })} 
              style={{ width: '100%' }}
            >
              퀴즈 종료하고 나가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-bg">
      <StarField count={100} />
      
      <div className="space-quiz-container scale-in">
        <div id="quiz-capture-area" className="glass-card space-quiz-card">
          {/* 나가기 버튼 */}
          <button 
            onClick={() => { soundManager.playClick(); onExit() }}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ✕ 나가기
          </button>

          {/* 헤더 */}
          <div style={{ marginBottom: '2rem' }}>
            <span style={{
              background: region?.color || 'var(--crystal-cyan)',
              color: 'white',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 700
            }}>
              {quizData?.title} {reSolveMode && '(재도전)'}
            </span>
            
            {/* 진행바 */}
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              marginTop: '1rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--crystal-cyan), var(--planet-green))',
                transition: 'width 0.5s ease',
                boxShadow: 'var(--glow-cyan)'
              }}></div>
            </div>
            <span style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.8rem',
              display: 'block',
              textAlign: 'right',
              marginTop: '0.5rem'
            }}>
              {currentIdx + 1} / {currentQuestions.length}
            </span>
          </div>

          {/* 문제 및 이미지 섹션 */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            {currentQuestion.imageUrl && (
              <motion.div 
                className="space-image-card-wrapper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ rotateY: 10, rotateX: -5, scale: 1.02 }}
                style={{ 
                  perspective: '1000px',
                  marginBottom: '2.5rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <div className="space-image-card glass-card">
                  {/* Neon Glow behind image */}
                  <div className="image-neon-glow"></div>
                  <motion.img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="space-question-image"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            )}
            
            <h2 className="font-title" style={{ 
              fontSize: isMobile ? '1.4rem' : '1.8rem', 
              color: 'var(--text-bright)',
              lineHeight: 1.4,
              wordBreak: 'keep-all'
            }}>
              {formatText(currentQuestion.question)}
            </h2>
          </div>

          {/* 보기 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            {(currentQuestion?.shuffledOptions || []).map((option, idx) => {
              let btnClass = 'space-option-btn'
              if (showFeedback && userAnswers[currentQuestion.id] === option) {
                btnClass += option.isCorrect ? ' correct' : ' wrong'
              }
              
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={(e) => !showFeedback && !isRebooting && handleSelect(option, e)}
                  disabled={showFeedback !== null || isRebooting}
                  style={{ opacity: (showFeedback || isRebooting) && userAnswers[currentQuestion.id] !== option ? 0.5 : 1 }}
                >
                  {formatText(option.text)}
                </button>
              )
            })}
          </div>

          {/* 시스템 리부트 오버레이 */}
          <AnimatePresence>
            {isRebooting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  borderRadius: '20px'
                }}
              >
                <div style={{
                  color: '#ff4d4d',
                  fontSize: '2rem',
                  fontWeight: 900,
                  marginBottom: '1rem',
                  textShadow: '0 0 20px #ff0000'
                }}>
                  ⚠️ SYSTEM REBOOT
                </div>
                <div style={{ color: 'white', opacity: 0.8 }}>
                  에너지 손실로 인한 시스템 복구 중... (3s)
                </div>
                {hasShield && shieldUsed && (
                  <div style={{ color: 'var(--star-gold)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    🛡️ 광자 쉴드가 에너지를 보호했습니다!
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 부유 마커 애니메이션 */}
          <AnimatePresence>
            {floatingMarkers.map(marker => (
              <motion.div
                key={marker.id}
                initial={{ 
                  opacity: 0, 
                  y: 0,
                  x: marker.x - 50,
                  top: marker.y - 40 // Starting closer to the click point
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  y: marker.type === 'gain' ? -80 : 80,
                  scale: marker.type === 'gain' ? [1, 1.4, 1.2] : [1, 0.9, 0.7]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  zIndex: 9999,
                  pointerEvents: 'none',
                  color: '#df5fff',
                  fontSize: '2rem',
                  fontWeight: 900,
                  textShadow: '0 0 10px rgba(0,0,0,0.5), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ 
                  color: marker.type === 'gain' ? '#50C878' : '#ff4d4d',
                  fontSize: '1.2em'
                }}>
                  💎
                </span> 
                <span style={{ color: marker.type === 'gain' ? '#50C878' : '#ff4d4d' }}>
                  {marker.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 선생님 호출 버튼 */}
          {!isResultMode && (
            <button 
              className="space-teacher-btn glass-card" 
              onClick={() => setIsQuestionModalOpen(true)}
              style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                padding: '0.8rem',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                boxShadow: 'var(--glow-cyan)'
              }}
            >
              🙋
            </button>
          )}

          <QuestionModal 
            isOpen={isQuestionModalOpen}
            onClose={handleCloseQuestionModal}
            quizContext={{
              quizId: currentQuestion?.id, // This is the specific 1-1-15 ID
              unitId: quizData?.unitId || quizData?.id,
              quizTitle: quizData?.title,
              questionId: currentQuestion?.id,
              chapterId: quizData?.chapterId,
              wrongAnswer: userAnswers[currentQuestion?.id]
            }}
          />
        </div>
      </div>
    </div>
  )
}
