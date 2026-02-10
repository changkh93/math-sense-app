import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './QuizView.css'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import { createParticleBurst, shakeScreen } from './Space/ParticleEffects'
import soundManager from '../utils/SoundManager'

export default function QuizView({ region, quizData, onExit, onComplete }) {
  const [currentQuestions, setCurrentQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { questionId: selectedOption }
  const [isResultMode, setIsResultMode] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [reSolveMode, setReSolveMode] = useState(false)
  const [showFeedback, setShowFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [isRebooting, setIsRebooting] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const [sessionCrystals, setSessionCrystals] = useState(0)
  const [floatingMarkers, setFloatingMarkers] = useState([]) // { id, text, type, x, y }
  const [originalTotal, setOriginalTotal] = useState(0)
  const [allSessionQuestions, setAllSessionQuestions] = useState([]) // 최초 20문항 저장

  // 초기 문제 데이터 설정 (20문항 랜덤 샘플링 적용)
  useEffect(() => {
    if (quizData?.questions) {
      const allQ = [...quizData.questions];
      const shuffled = allQ.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 20);
      setCurrentQuestions(selected);
      setAllSessionQuestions(selected);
      setOriginalTotal(selected.length);
    }
  }, [quizData])

  // 문제 바뀔 때마다 옵션 셔플
  useEffect(() => {
    const currentQuestion = currentQuestions[currentIdx]
    if (currentQuestion?.options) {
      const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5)
      setShuffledOptions(shuffled)
    }
  }, [currentIdx, currentQuestions])

  const formatText = (text) => {
    if (!text) return "";
    const parts = text.split('$');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        let math = part;
        // Auto-convert n/d to \frac{n}{d} if not already using \frac
        if (math.includes('/') && !math.includes('\\frac')) {
          math = math.replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
        }
        return <InlineMath key={i} math={math} />;
      }
      return part;
    });
  };

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

    if (isCorrect) {
      soundManager.playCorrect()
      createParticleBurst(event.clientX, event.clientY, 'star')
      createParticleBurst(event.clientX, event.clientY, 'ore')
      
      const newCombo = (comboCount || 0) + 1
      setComboCount(newCombo)
      
      let earned = 1
      if (!reSolveMode) {
        addMarker('+1', 'gain')
        if (newCombo > 0 && newCombo % 3 === 0) {
          earned += 5 // 3콤보 보너스
          setTimeout(() => addMarker('+5 COMBO!', 'gain', 40, -40), 200)
        }
        setSessionCrystals(prev => prev + earned)
      }

      setTimeout(() => {
        setShowFeedback(null)
        if (currentIdx < currentQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1)
        } else {
          setIsResultMode(true)
        }
      }, 800)

    } else {
      soundManager.playWrong()
      createParticleBurst(event.clientX, event.clientY, 'wrong')
      shakeScreen(300)
      
      setComboCount(0)
      
      if (!reSolveMode) {
        setSessionCrystals(prev => Math.max(0, prev - 2))
        addMarker('-2', 'loss')
      }

      setIsRebooting(true)
      setTimeout(() => {
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

  const handleReSolveWrong = () => {
    const wrongQuestions = currentQuestions.filter(q => !userAnswers[q.id]?.isCorrect)
    const newUserAnswers = { ...userAnswers }
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
    soundManager.playClick()
    // 점수 계산: 최초 세션 전체 문항(allSessionQuestions) 기준
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const score100 = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0;
    
    // 만점 보너스 조건
    const canGetPerfectBonus = !reSolveMode && (correctCount === originalTotal);
    const crystalsEarned = sessionCrystals + (canGetPerfectBonus ? 10 : 0);
    
    onComplete({ 
      score: score100, 
      total: 100, 
      correctCount, 
      totalCount: originalTotal, 
      questions: currentQuestions,
      crystalsEarned,
      isPerfect: canGetPerfectBonus
    })
  }

  if (!currentQuestion && !isResultMode) return <div className="loading-screen">문제를 불러오는 중...</div>

  // 결과 화면
  if (isResultMode) {
    // 점수 계산: 최초 세션 전체 문항(allSessionQuestions) 기준
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const score100 = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0;
    const isPerfect = correctCount === originalTotal;
    const canGetPerfectBonus = !reSolveMode && isPerfect;
    const crystalsEarnedDisplay = sessionCrystals + (canGetPerfectBonus ? 10 : 0);

    return (
      <div className="quiz-view-container glass result-view fadeIn">
        <button className="exit-btn" onClick={() => { soundManager.playClick(); onExit(); }}>X 나가기</button>
        <div className="result-header">
          <h2>🎉 {reSolveMode ? '재도전 결과' : '학습 완료!'}</h2>
          <div className="score-circle" style={{
            border: `4px solid ${canGetPerfectBonus ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
            boxShadow: canGetPerfectBonus ? '0 0 20px rgba(255,215,0,0.5)' : 'none'
          }}>
            <span className="score-num" style={{ color: canGetPerfectBonus ? 'var(--star-gold)' : 'inherit' }}>{score100}</span>
            <span className="total-num">점</span>
          </div>
          <p className="score-detail">({correctCount} / {originalTotal} 문항 정답)</p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '1rem 0'
          }}>
            <div className="crystal-icon" style={{ width: '20px', height: '20px' }}></div>
            <span style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>
              +{crystalsEarnedDisplay} 광석 획득!
            </span>
          </div>

          <p className="result-msg">{canGetPerfectBonus ? '완벽해요! 모든 문제를 맞혔습니다.' : '틀린 문제를 다시 확인해볼까요?'}</p>
        </div>

        <div className="result-list">
          {currentQuestions.map((q, idx) => {
            const isCorrect = userAnswers[q.id]?.isCorrect
            return (
              <div key={q.id} className={`result-item ${isCorrect ? 'correct' : 'wrong'}`}>
                <span className="q-idx">{idx + 1}.</span>
                <span className="q-text">{formatText(q.question)}</span>
                <span className="q-status">{isCorrect ? '⭕' : '❌'}</span>
                {!isCorrect && <div className="hint-info">힌트: {formatText(q.hint)}</div>}
              </div>
            )
          })}
        </div>

        <div className="result-actions">
          {!isPerfect && (
            <button className="re-solve-btn" onClick={handleReSolveWrong}>❌ 틀린 문제만 다시 풀기</button>
          )}
          <button className="finish-btn" onClick={handleFinish}>
            {canGetPerfectBonus ? '🌟 만점 보상 받기' : '📤 결과 제출하고 종료'}
          </button>
          <button className="exit-link-btn" onClick={() => { soundManager.playClick(); onExit(); }}>선택 화면으로 이동</button>
        </div>
      </div>
    )
  }

  // 퀴즈 화면
  return (
    <div className="quiz-view-container glass" style={{ position: 'relative' }}>
      <button className="exit-btn" onClick={() => { soundManager.playClick(); onExit(); }}>X 나가기</button>
      
      <div className="quiz-header">
        <span className="region-badge" style={{ backgroundColor: region?.color || '#eee' }}>
          {quizData?.title} {reSolveMode && ' (오답 재도전)'}
        </span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentIdx + 1) / currentQuestions.length) * 100}%` }}
          ></div>
        </div>
        <span className="progress-text">{currentIdx + 1} / {currentQuestions.length}</span>
      </div>

      <div className="question-card">
        {currentQuestion.imageUrl && (
          <div className="question-image-container">
            <img src={currentQuestion.imageUrl} alt="Question" className="question-image" />
          </div>
        )}
        <h2 className="question-text center-aligned">{formatText(currentQuestion.question)}</h2>
        
        <div className="options-grid">
          {shuffledOptions.map((option, idx) => {
            let btnClass = 'option-btn'
            if (showFeedback && userAnswers[currentQuestion.id] === option) {
              btnClass += option.isCorrect ? ' correct' : ' wrong'
            }
            return (
              <button 
                key={idx}
                className={btnClass}
                onClick={(e) => !showFeedback && !isRebooting && handleSelect(option, e)}
                disabled={showFeedback || isRebooting}
                style={{ opacity: (showFeedback || isRebooting) && userAnswers[currentQuestion.id] !== option ? 0.5 : 1 }}
              >
                {formatText(option.text)}
              </button>
            )
          })}
        </div>
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
              backdropFilter: 'blur(8px)',
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
    </div>
  )
}
