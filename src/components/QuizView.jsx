import { useState, useEffect } from 'react'
import './QuizView.css'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

export default function QuizView({ region, quizData, onExit, onComplete }) {
  const [currentQuestions, setCurrentQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { questionId: selectedOption }
  const [isResultMode, setIsResultMode] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [reSolveMode, setReSolveMode] = useState(false)

  // 초기 문제 데이터 설정 (20문항 랜덤 샘플링 적용)
  useEffect(() => {
    if (quizData?.questions) {
      const allQ = [...quizData.questions];
      // Shuffle all available questions
      const shuffled = allQ.sort(() => Math.random() - 0.5);
      // Pick top 20 (or all if less than 20)
      setCurrentQuestions(shuffled.slice(0, 20));
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

  const handleSelect = (option) => {
    // option is now an object: { text, isCorrect }
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }))

    if (currentIdx < currentQuestions.length - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      setIsResultMode(true)
    }
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
    const allQuestions = currentQuestions;
    const correctCount = allQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const totalCount = allQuestions.length
    const score100 = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    onComplete({ 
      score: score100, 
      total: 100, 
      correctCount, 
      totalCount, 
      questions: allQuestions 
    })
  }

  if (!currentQuestion && !isResultMode) return <div className="loading-screen">문제를 불러오는 중...</div>

  // 결과 화면
  if (isResultMode) {
    const correctCount = currentQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const totalCount = currentQuestions.length
    const score100 = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const isPerfect = correctCount === totalCount

    return (
      <div className="quiz-view-container glass result-view fadeIn">
        <button className="exit-btn" onClick={onExit}>X 나가기</button>
        <div className="result-header">
          <h2>🎉 {reSolveMode ? '재도전 결과' : '학습 완료!'}</h2>
          <div className="score-circle">
            <span className="score-num">{score100}</span>
            <span className="total-num">점</span>
          </div>
          <p className="score-detail">({correctCount} / {totalCount} 유닛 정답)</p>
          <p className="result-msg">{isPerfect ? '완벽해요! 모든 문제를 맞혔습니다.' : '틀린 문제를 다시 확인해볼까요?'}</p>
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
            {isPerfect ? '🌟 만점 보상 받기' : '📤 결과 제출하고 종료'}
          </button>
          <button className="exit-link-btn" onClick={onExit}>선택 화면으로 이동</button>
        </div>
      </div>
    )
  }

  // 퀴즈 화면
  return (
    <div className="quiz-view-container glass">
      <button className="exit-btn" onClick={onExit}>X 나가기</button>
      
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
        <h2 className="question-text">{formatText(currentQuestion.question)}</h2>
        
        <div className="options-grid">
          {shuffledOptions.map((option, idx) => (
            <button 
              key={idx}
              className={`option-btn ${userAnswers[currentQuestion.id] === option ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {formatText(option.text)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
