import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import StarField from './StarField'
import { createParticleBurst, shakeScreen } from './ParticleEffects'
import soundManager from '../../utils/SoundManager'
import '../../styles/space-theme.css'

export default function SpaceQuizView({ region, quizData, onExit, onComplete }) {
  const [currentQuestions, setCurrentQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [isResultMode, setIsResultMode] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [reSolveMode, setReSolveMode] = useState(false)
  const [showFeedback, setShowFeedback] = useState(null) // 'correct' | 'wrong' | null
  const isMobile = window.innerWidth <= 768

  // 초기 문제 설정
  useEffect(() => {
    if (quizData?.questions) {
      const allQ = [...quizData.questions]
      const shuffled = allQ.sort(() => Math.random() - 0.5)
      setCurrentQuestions(shuffled.slice(0, 20))
    }
  }, [quizData])

  // 옵션 셔플
  useEffect(() => {
    const currentQuestion = currentQuestions[currentIdx]
    if (currentQuestion?.options) {
      const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5)
      setShuffledOptions(shuffled)
    }
  }, [currentIdx, currentQuestions])

  const formatText = (text) => {
    if (!text) return ""
    const parts = text.split('$')
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
    const isCorrect = option.isCorrect
    
    // 피드백 표시
    setShowFeedback(isCorrect ? 'correct' : 'wrong')
    
    // 사운드 & 파티클
    if (isCorrect) {
      soundManager.playCorrect()
      createParticleBurst(event.clientX, event.clientY, 'star')
      createParticleBurst(event.clientX, event.clientY, 'crystal')
    } else {
      soundManager.playWrong()
      createParticleBurst(event.clientX, event.clientY, 'wrong')
      shakeScreen(300)
    }
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }))

    // 다음 문제로 이동 (딜레이)
    setTimeout(() => {
      setShowFeedback(null)
      if (currentIdx < currentQuestions.length - 1) {
        setCurrentIdx(prev => prev + 1)
      } else {
        setIsResultMode(true)
      }
    }, 800)
  }

  const handleReSolveWrong = () => {
    soundManager.playClick()
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
    const correctCount = currentQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const totalCount = currentQuestions.length
    const score100 = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    
    onComplete({ 
      score: score100, 
      total: 100, 
      correctCount, 
      totalCount, 
      questions: currentQuestions 
    })
  }

  if (!currentQuestion && !isResultMode) {
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

  // 결과 화면
  if (isResultMode) {
    const correctCount = currentQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const totalCount = currentQuestions.length
    const score100 = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    const isPerfect = correctCount === totalCount
    const crystalsEarned = correctCount * 5

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
              border: `4px solid ${isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: isPerfect ? 'var(--glow-gold)' : 'var(--glow-cyan)'
            }}>
              <span style={{ 
                fontSize: '3rem', 
                fontWeight: 900,
                color: isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'
              }}>
                {score100}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>점</span>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {correctCount} / {totalCount} 정답
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
                +{crystalsEarned} 결정 획득!
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
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                  border: 'none',
                  borderRadius: '15px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isPerfect ? '🌟 만점 보상 받기' : '📤 결과 저장하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 퀴즈 화면
  const progress = ((currentIdx + 1) / currentQuestions.length) * 100

  return (
    <div className="space-bg">
      <StarField count={100} />
      
      <div className="space-quiz-container scale-in">
        <div className="glass-card space-quiz-card">
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
            {shuffledOptions.map((option, idx) => {
              let btnClass = 'space-option-btn'
              if (showFeedback && userAnswers[currentQuestion.id] === option) {
                btnClass += option.isCorrect ? ' correct' : ' wrong'
              }
              
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={(e) => !showFeedback && handleSelect(option, e)}
                  disabled={showFeedback !== null}
                  style={{ opacity: showFeedback && userAnswers[currentQuestion.id] !== option ? 0.5 : 1 }}
                >
                  {formatText(option.text)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
