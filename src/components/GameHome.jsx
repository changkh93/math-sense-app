import { useState, useEffect } from 'react'
import '../App.css'
import './QuizView.css'
import QuizView from './QuizView'
import Dashboard from './Dashboard'
import Ranking from './Ranking'
import { auth, googleProvider, db } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore'
import { useRegions, useChapters, useUnits, useQuizzes } from '../hooks/useContent'
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
              orbs: 0,
              totalQuizzes: 0,
              totalScore: 0,
              averageScore: 0,
              ...data
            })
          } else {
            const initialData = { orbs: 0, totalQuizzes: 0, totalScore: 0, averageScore: 0, email: user.email, name: user.displayName }
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
      const { score, total } = result;
      if (total === 0) return;

      const pointPerQuestion = 1;
      const bonus = score * pointPerQuestion;
      
      const prevOrbs = userData.orbs || 0;
      const prevTotalQuizzes = userData.totalQuizzes || 0;
      const prevTotalScore = userData.totalScore || 0;

      const newOrbs = prevOrbs + bonus;
      const newTotalQuizzes = prevTotalQuizzes + 1;
      const newTotalScore = prevTotalScore + ((score / total) * 100);
      const newAverageScore = newTotalScore / newTotalQuizzes;

      // 1. 사용자 통계 업데이트
      await setDoc(doc(db, 'users', user.uid), {
        orbs: newOrbs,
        totalQuizzes: newTotalQuizzes,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
        lastActive: serverTimestamp()
      }, { merge: true });

      // 2. 학습 이력 저장
      await addDoc(collection(db, 'users', user.uid, 'history'), {
        unitId: selectedUnitDocId,
        unitTitle: activeUnit.title,
        score: Math.round((score / total) * 100),
        timestamp: serverTimestamp()
      });

      alert(`학습 완료! ${bonus}개의 감각 구슬을 획득했습니다.`);
      setSelectedUnitDocId(null);
      setCurrentView('dashboard');
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
          <div className="orb-counter glass">
            <div className="orb-icon"></div>
            <span>{userData?.orbs || 0}</span>
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
                   chapters?.map(chapter => (
                    <div key={chapter.docId} className="chapter-card glass" onClick={() => setSelectedChapterDocId(chapter.docId)}>
                      <h3>{chapter.title}</h3>
                      <p>단원을 탐험해보세요.</p>
                    </div>
                  ))}
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
                   units?.map(unit => (
                    <button key={unit.docId} className="unit-btn glass" onClick={() => setSelectedUnitDocId(unit.docId)}>
                      {unit.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {currentView === 'dashboard' && <Dashboard user={user} userData={userData} />}
        {currentView === 'ranking' && <Ranking user={user} />}
      </main>
    </div>
  )
}

export default GameHome
