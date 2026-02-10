import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../App.css'
import './QuizView.css'
import QuizView from './QuizView'
import Dashboard from './Dashboard'
import Ranking from './Ranking'
import { auth, googleProvider, db } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore'
import { useRegions, useChapters, useUnits, useQuizzes } from '../hooks/useContent'
import { regions as localRegions } from '../data/regions'
import RegionCard from './RegionCard'
import PerformanceToggle from './PerformanceToggle'

function GameHome() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentView, setCurrentView] = useState('map') // 'map', 'dashboard', 'ranking'
  
  // Selection State (IDs)
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [selectedChapterDocId, setSelectedChapterDocId] = useState(null)
  const [selectedUnitDocId, setSelectedUnitDocId] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [completionResult, setCompletionResult] = useState(null)

  // Fetch Data using Hooks
  const { data: regions, isLoading: loadingRegions } = useRegions()
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  
  // Get active documents for titles/colors
  const activeRegion = regions?.find(r => r.id === selectedRegionId)
  const activeChapter = chapters?.find(c => c.docId === selectedChapterDocId)
  const activeUnit = units?.find(u => u.docId === selectedUnitDocId)

  // Fetch quizzes only when unit is selected
  const { data: unitQuizzes, isLoading: loadingQuizzes } = useQuizzes(selectedUnitDocId)

  // Auto-skip chapter selection for single-chapter regions (e.g., 나눗셈)
  useEffect(() => {
    if (chapters && chapters.length === 1 && !selectedChapterDocId) {
      setSelectedChapterDocId(chapters[0].docId)
    }
  }, [chapters, selectedChapterDocId])

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (user) {
        const userDocRef = doc(db, 'users', user.uid)
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data()
            setUserData({
              crystals: 0,
              totalQuizzes: 0,
              totalScore: 0,
              averageScore: 0,
              ...data
            })
          } else {
            const initialData = { crystals: 0, totalQuizzes: 0, totalScore: 0, averageScore: 0, email: user.email, name: user.displayName }
            setDoc(userDocRef, initialData)
            setUserData(initialData)
          }
          setAuthLoading(false)
        })
        return () => unsubscribeDoc()
      } else {
        setAuthLoading(false)
      }
    })
    return () => unsubscribeAuth()
  }, [])

  // Fetch history for status calculation
  useEffect(() => {
    if (!user) {
      setHistory([])
      setLoadingHistory(false)
      return
    }
    const historyRef = collection(db, 'users', user.uid, 'history')
    const q = query(historyRef, orderBy('timestamp', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setHistory(historyData)
      setLoadingHistory(false)
    })
    return () => unsubscribe()
  }, [user])

  // Calculate best scores per unit
  const bestScores = useMemo(() => {
    const scores = {}
    history.forEach(h => {
      if (!scores[h.unitId] || h.score > scores[h.unitId]) {
        scores[h.unitId] = h.score
      }
    })
    return scores
  }, [history])

  // Calculate chapter progress
  const chapterProgress = useMemo(() => {
    const progress = {}
    if (!chapters || !bestScores) return progress

    chapters.forEach(chapter => {
      // Find chapter in local data to get total units
      const localRegion = localRegions.find(r => r.id === selectedRegionId)
      const localChapter = localRegion?.chapters?.find(c => c.id === chapter.id)
      
      if (localChapter) {
        const totalUnits = localChapter.units?.length || 0
        let completedUnits = 0
        
        localChapter.units?.forEach(unit => {
          const unitDocId = `${chapter.docId}_${unit.id}`
          if (bestScores[unitDocId] !== undefined) {
            completedUnits++
          }
        })
        
        progress[chapter.docId] = {
          completed: completedUnits,
          total: totalUnits,
          isFinished: totalUnits > 0 && completedUnits === totalUnits
        }
      }
    })
    return progress
  }, [chapters, bestScores, selectedRegionId])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Login failed:", error)
      alert("로그인에 실패했습니다.")
    }
  }

  const handleLogout = () => signOut(auth)

  const handleComplete = async (result) => {
    if (!user) return;
    
    try {
      const { score, total, correctCount, totalCount, crystalsEarned, isPerfect } = result;
      if (total === 0) return;

      const prevCrystals = userData.crystals || 0;
      const prevTotalQuizzes = userData.totalQuizzes || 0;
      const prevTotalScore = userData.totalScore || 0;
      const prevPerfectCount = userData.perfectCount || 0;

      const newCrystals = prevCrystals + (crystalsEarned || 0);
      const newTotalQuizzes = prevTotalQuizzes + 1;
      const newTotalScore = prevTotalScore + score;
      const newAverageScore = newTotalScore / newTotalQuizzes;

      // 1. 사용자 통계 업데이트
      await setDoc(doc(db, 'users', user.uid), {
        crystals: newCrystals,
        totalQuizzes: newTotalQuizzes,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
        perfectCount: isPerfect ? prevPerfectCount + 1 : prevPerfectCount,
        lastActive: serverTimestamp()
      }, { merge: true });

      // 2. 학습 이력 저장
      await addDoc(collection(db, 'users', user.uid, 'history'), {
        unitId: selectedUnitDocId,
        unitTitle: activeUnit.title,
        regionId: selectedRegionId,
        regionTitle: activeRegion?.title || "Unknown Galaxy",
        chapterId: selectedChapterDocId,
        score: Math.round((score / total) * 100),
        crystalsEarned: crystalsEarned || 0,
        timestamp: serverTimestamp()
      });

      setCompletionResult({
        crystalsEarned: crystalsEarned || 0,
        isPerfect
      });
      // setSelectedUnitDocId(null); // Don't null immediately to allow "Continue" logic
      // setCurrentView('dashboard'); // Don't navigate automatically
    } catch (error) {
      console.error("Error saving quiz result:", error);
      alert("결과 저장 중 오류가 발생했습니다: " + error.message);
    }
  }

  if (authLoading || loadingRegions) return <div className="loading-screen">수학감각 로딩 중...</div>

  if (!user) {
    return (
      <div className="login-container">
        <header>
          <h1 className="hero-title gradient-text">수학감각의 땅</h1>
          <p className="hero-subtitle">선생님이 만든 인터랙티브 수학 퀴즈!</p>
        </header>
        <div className="login-card glass">
          <p>친구들의 성취를 클라우드에 저장하려면 로그인이 필요해요.</p>
          <button className="login-btn" onClick={handleLogin}>
            Google 계정으로 시작하기
          </button>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <PerformanceToggle />
          </div>
        </div>
      </div>
    )
  }

  if (selectedUnitDocId && unitQuizzes) {
    return (
      <div className="quiz-page-wrapper">
        {/* Dynamic Background Elements */}
        <div className="cloud" style={{ top: '10%', width: '300px', height: '100px', animationDelay: '0s' }}></div>
        <div className="cloud" style={{ top: '30%', width: '400px', height: '120px', animationDelay: '-5s' }}></div>
        <div className="cloud" style={{ top: '60%', width: '250px', height: '80px', animationDelay: '-12s' }}></div>
        <QuizView 
          region={activeRegion} 
          quizData={{ title: activeUnit.title, questions: unitQuizzes }}
          onExit={() => setSelectedUnitDocId(null)}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Dynamic Background Elements */}
      <div className="cloud" style={{ top: '10%', width: '300px', height: '100px', animationDelay: '0s' }}></div>
      <div className="cloud" style={{ top: '30%', width: '400px', height: '120px', animationDelay: '-5s' }}></div>
      <div className="cloud" style={{ top: '60%', width: '250px', height: '80px', animationDelay: '-12s' }}></div>
      <div className="cloud" style={{ top: '80%', width: '500px', height: '150px', animationDelay: '-8s' }}></div>

      <div className="top-bar" style={{ position: 'relative', zIndex: 10 }}>
        <nav className="main-nav">
          <button className={`nav-item ${currentView === 'map' ? 'active' : ''}`} onClick={() => { setCurrentView('map'); setSelectedRegionId(null); setSelectedChapterDocId(null); }}>🗺️ 지도</button>
          <button className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>📈 성장 기록</button>
          <button className={`nav-item ${currentView === 'ranking' ? 'active' : ''}`} onClick={() => setCurrentView('ranking')}>🏆 명예의 전당</button>
          <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center' }}>
            <PerformanceToggle />
          </div>
        </nav>
        <div className="user-meta">
          <div className="orb-counter glass" title="보유 광석">
            <div className="crystal-icon" style={{ width: '20px', height: '20px' }}></div>
            <span>{userData?.crystals || 0}</span>
          </div>
          <button className="logout-link" onClick={handleLogout}>로그아웃</button>
        </div>
      </div>

      <main className="content-area">
        {currentView === 'map' && (
          <>
            <header>
              <h1 className="hero-title gradient-text">수학감각의 땅</h1>
              <p className="hero-subtitle">탐험하고 싶은 지역을 선택하여 수학 마스터가 되어보세요!</p>
            </header>

            {!selectedRegionId ? (
              <div className="regions-grid">
                {regions?.map((region) => (
                  <RegionCard 
                    key={region.id} 
                    region={region} 
                    onClick={() => setSelectedRegionId(region.id)}
                  />
                ))}
              </div>
            ) : !selectedChapterDocId ? (
              <div className="selection-view fadeIn">
                <button className="back-btn" onClick={() => setSelectedRegionId(null)}>← 지역 선택으로 돌아가기</button>
                <h2 className="selection-title">{activeRegion?.title} 탐험 코스</h2>
                <div className="chapters-grid">
                  {loadingChapters ? <div>Loading Chapters...</div> : 
                   chapters?.map(chapter => {
                     const prog = chapterProgress[chapter.docId]
                     return (
                       <div key={chapter.docId} className={`chapter-card glass ${prog?.isFinished ? 'finished' : ''}`} onClick={() => setSelectedChapterDocId(chapter.docId)}>
                         <h3>{chapter.title}</h3>
                         <div className="chapter-status">
                           {prog ? (
                             prog.isFinished ? (
                               <span style={{ color: '#50c878', fontWeight: 800 }}>완료 🏆</span>
                             ) : prog.completed > 0 ? (
                               <span style={{ color: 'var(--primary)', fontWeight: 700 }}>진행 중 ({prog.completed}/{prog.total})</span>
                             ) : (
                               <span style={{ color: 'var(--text-muted)' }}>탐험 전</span>
                             )
                           ) : (
                             <span style={{ color: 'var(--text-muted)' }}>준비 중...</span>
                           )}
                         </div>
                       </div>
                     )
                   })}
                </div>
              </div>
            ) : (
              <div className="selection-view fadeIn">
                <button className="back-btn" onClick={() => {
                  if (chapters?.length === 1) {
                    setSelectedChapterDocId(null)
                    setSelectedRegionId(null)
                  } else {
                    setSelectedChapterDocId(null)
                  }
                }}>← {chapters?.length === 1 ? '지역 선택으로 돌아가기' : '장 선택으로 돌아가기'}</button>
                <h2 className="selection-title">{chapters?.length === 1 ? activeRegion?.title : activeChapter?.title}</h2>
                <div className="units-list">
                  {loadingUnits ? <div>Loading Units...</div> : 
                   units?.map(unit => {
                     const bestScore = bestScores[unit.docId]
                     const isCompleted = bestScore !== undefined
                     return (
                       <button key={unit.docId} className={`unit-btn glass ${isCompleted ? 'completed' : ''}`} onClick={() => setSelectedUnitDocId(unit.docId)}>
                         <span>
                           {isCompleted && <span style={{ marginRight: '0.8rem', color: '#50c878' }}>✅</span>}
                           {unit.title}
                         </span>
                         {isCompleted && (
                           <span className="unit-score-badge" style={{ 
                             fontSize: '0.9rem', 
                             padding: '0.3rem 0.6rem', 
                             background: 'rgba(74, 144, 226, 0.1)', 
                             borderRadius: '12px',
                             color: 'var(--primary)',
                             fontWeight: 800
                           }}>
                             {bestScore}점
                           </span>
                         )}
                       </button>
                     )
                   })}
                </div>
              </div>
            )}
          </>
        )}

        {currentView === 'dashboard' && <Dashboard user={user} userData={userData} />}
        {currentView === 'ranking' && <Ranking user={user} />}
      </main>

      {/* 학습 완료 모달 */}
      <AnimatePresence>
        {completionResult && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 2000 }}
          >
            <motion.div 
              className="completion-modal glass"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
            >
              <div className="modal-header">
                <h2 className="gradient-text">{completionResult.isPerfect ? '🎊 퍼펙트! 학습 완료' : '✅ 학습 완료!'}</h2>
              </div>
              <div className="modal-body">
                <div className="crystal-reward-display">
                  <div className="crystal-icon large" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
                  <p className="reward-text"><strong>{completionResult.crystalsEarned}개</strong>의 수학 광석을 획득했습니다!</p>
                </div>
                <p className="modal-message">정말 잘하셨어요! 다음은 무엇을 할까요?</p>
              </div>
              <div className="modal-actions-grid">
                <button 
                  className="modal-btn secondary-btn glass" 
                  onClick={() => {
                    setCompletionResult(null)
                    setSelectedUnitDocId(null)
                    setCurrentView('dashboard')
                    soundManager.playClick()
                  }}
                >
                  📈 성장 기록 보기
                </button>
                <button 
                  className="modal-btn primary-btn" 
                  onClick={() => {
                    setCompletionResult(null)
                    setSelectedUnitDocId(null)
                    soundManager.playClick()
                  }}
                >
                  🚀 퀴즈 연속해서 풀기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GameHome
