import { useState, useEffect, Suspense, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, db } from '../../firebase'
import { signInWithPopup } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { useRegions, useChapters, useUnits, useQuizzes } from '../../hooks/useContent'
import { useAuth } from '../../hooks/useAuth'
import { regions as localRegions } from '../../data/regions'
import { motion, AnimatePresence } from 'framer-motion' // Added Framer Motion

// Space Components
import StarField from './StarField'
import Planet3D from './Planet3D' // Keep for Login Screen
import SpaceScene from './SpaceScene' // New 3D Scene
import SpaceQuizView from './SpaceQuizView'
import SpaceDashboard from './SpaceDashboard'
import SpaceCollection from './SpaceCollection'
import SpaceStore from './SpaceStore'
import SpaceRanking from './SpaceRanking'

import { useParticles, createParticleBurst } from './ParticleEffects'

import soundManager from '../../utils/SoundManager'
import SpaceNavbar from './SpaceNavbar'
import PerformanceToggle from '../PerformanceToggle'

// Styles
import '../../styles/space-theme.css'

function SpaceHome() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userData, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentView, setCurrentView] = useState('planet') // 'planet', 'dashboard', 'collection'
  
  // Selection State
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [selectedChapterDocId, setSelectedChapterDocId] = useState(null)
  const [selectedUnitDocId, setSelectedUnitDocId] = useState(null)
  const [quickQuizUnitId, setQuickQuizUnitId] = useState(null) // New: Dashboard quick quiz
  const [pendingUnit, setPendingUnit] = useState(null) // New: For RewardPotentialModal

  // Sync view from location state (e.g. when coming from Agora)
  useEffect(() => {
    if (location.state?.view) {
      setCurrentView(location.state.view)
      setSelectedRegionId(null)
      setSelectedChapterDocId(null)
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Data Hooks
  const { data: regions, isLoading: loadingRegions, isError: errorRegions } = useRegions()
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  const { 
    data: unitQuizzes, 
    isLoading: loadingQuizzes, 
    isError: errorQuizzes, 
    refetch: refetchQuizzes 
  } = useQuizzes(selectedUnitDocId || quickQuizUnitId)

  // Active selections
  const activeRegion = regions?.find(r => r.id === selectedRegionId)
  const activeChapter = chapters?.find(c => c.docId === selectedChapterDocId)
  const activeUnit = units?.find(u => u.docId === selectedUnitDocId)

  // Auto-skip single chapter
  useEffect(() => {
    if (chapters && chapters.length === 1 && !selectedChapterDocId) {
      setSelectedChapterDocId(chapters[0].docId)
    }
  }, [chapters, selectedChapterDocId])


  // Interaction & UI State
  const [isBoosting, setIsBoosting] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Equipment Logic
  const equipment = {
    radar: (userData?.crystals || 0) >= 100,
    engine: (userData?.crystals || 0) >= 500,
    shield: (userData?.crystals || 0) >= 1000
  }

  // BGM Auto-start on user interaction
  useEffect(() => {
    if (user && !authLoading) {
      const startAudio = () => {
        soundManager.startBGM()
        window.removeEventListener('click', startAudio)
        window.removeEventListener('touchstart', startAudio)
      }
      
      const handleKeyDown = (e) => {
        if (e.code === 'Space' && equipment.engine) {
          e.preventDefault()
          setIsBoosting(true)
          if (!isBoosting) soundManager.play('whoosh')
        }
      }

      const handleKeyUp = (e) => {
        if (e.code === 'Space') {
          setIsBoosting(false)
        }
      }

      window.addEventListener('click', startAudio)
      window.addEventListener('touchstart', startAudio)
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      
      // Cleanup
      return () => {
        window.removeEventListener('click', startAudio)
        window.removeEventListener('touchstart', startAudio)
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        soundManager.stopBGM()
      }
    }
  }, [user, authLoading, equipment.engine, isBoosting])

  const handleLogin = async () => {
    try {
      soundManager.playClick()
      // Use popup for all platforms to avoid state loss in redirects
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Login failed:", error)
      const errorMsg = error.code === 'auth/popup-blocked' 
        ? "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요." 
        : "로그인에 실패했습니다. msense.me가 Firebase 인증 도메인에 등록되어 있는지 확인해주세요.";
      alert(errorMsg)
    }
  }

  const [completionResult, setCompletionResult] = useState(null)

  // Fetch history for status calculation
  useEffect(() => {
    if (!user) return
    const historyRef = collection(db, 'users', user.uid, 'history')
    const q = query(historyRef, orderBy('timestamp', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setHistory(historyData)
      setLoadingHistory(false)
    })
    return () => unsubscribe()
  }, [user])

  // Calculate Exploration Status and Recent Region
  const { explorationStatus, recentRegionId, bestScores } = useMemo(() => {
    const statusMap = {}
    const scores = {}
    let lastRegionId = null

    if (!regions) {
      return { explorationStatus: {}, recentRegionId: null, bestScores: {} }
    }

    history.forEach(h => {
      if (!scores[h.unitId] || h.score > scores[h.unitId]) {
        scores[h.unitId] = h.score
      }
    })

    if (history.length === 0) {
      regions?.forEach(r => statusMap[r.id] = 'not_started')
      return { explorationStatus: statusMap, recentRegionId: null, bestScores: {} }
    }
    
    const solvedUnitIds = new Set(history.map(h => h.unitId))
    
    regions.forEach(region => {
      const isAnySolved = history.some(h => {
        return h.unitId?.startsWith(region.id) || h.regionId === region.id
      })

      if (isAnySolved) {
        if (!lastRegionId) {
          const latest = history[0]
          if (latest.unitId?.startsWith(region.id) || latest.regionId === region.id) {
            lastRegionId = region.id
          }
        }
        statusMap[region.id] = 'in_progress'
      } else {
        statusMap[region.id] = 'not_started'
      }
    })

    return { explorationStatus: statusMap, recentRegionId: lastRegionId, bestScores: scores }
  }, [regions, history])

  // Calculate chapter progress
  const chapterProgress = useMemo(() => {
    const progress = {}
    if (!chapters || !bestScores) return progress

    chapters.forEach(chapter => {
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
        
        progress[chapter.docDocId || chapter.docId] = {
          completed: completedUnits,
          total: totalUnits,
          isFinished: totalUnits > 0 && completedUnits === totalUnits
        }
      }
    })
    return progress
  }, [chapters, bestScores, selectedRegionId])


  const handleComplete = async (result) => {
    if (!user) return
    
    try {
      const { score, total, correctCount, totalCount, crystalsEarned, isPerfect, shieldUsed } = result
      if (totalCount === 0) return

      // Anti-grinding logic
      const currentUnitId = selectedUnitDocId || quickQuizUnitId
      const previousBest = bestScores[currentUnitId] || 0
      let actualCrystalsEarned = 0
      let rewardMessage = ""

      if (score > previousBest) {
        // Incremental reward: sessionCrystals * (newScore - prevBest) / newScore
        // Why? Because sessionCrystals includes combo bonuses earned during this specific session.
        // We reward the 'newly conquered' part of the score.
        const improvementRatio = (score - previousBest) / score
        actualCrystalsEarned = Math.round((crystalsEarned || 0) * improvementRatio)
        
        // Perfect bonus (10 crystals) only for first-time 100%
        if (isPerfect && previousBest < 100) {
          // If the score improved and it is now perfect, handle bonus
          // The 'crystalsEarned' from SpaceQuizView already includes 10 if isPerfect is true.
          // But our ratio formula might have scaled it down if prevBest was, say, 80.
          // Let's refine: Base reward scaled + Full bonus if first perfect.
          const baseCrystals = (crystalsEarned || 0) - 10 
          actualCrystalsEarned = Math.round(baseCrystals * improvementRatio) + 10
        } else if (isPerfect && previousBest === 100) {
          // Already got perfect bonus before
          const baseCrystals = (crystalsEarned || 0) - 10
          actualCrystalsEarned = Math.round(baseCrystals * improvementRatio) // ratio will be 0 anyway
        }
        
        if (actualCrystalsEarned > 0) {
          rewardMessage = `${score}점으로 최고 기록을 경신했습니다! (+${actualCrystalsEarned} 광석)`
        }
      } else {
        actualCrystalsEarned = 0
        rewardMessage = score === 100 
          ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)"
          : `최고 점수(${previousBest}점)를 넘지 못해 추가 광석을 획득할 수 없습니다.`
      }

      soundManager.playCrystal()
      
      const prevCrystals = userData.crystals || 0
      const prevTotalQuizzes = userData.totalQuizzes || 0
      const prevTotalScore = userData.totalScore || 0
      const prevPerfectCount = userData.perfectCount || 0
      const prevConsecutiveGood = score >= 90 ? (userData.consecutiveGood || 0) + 1 : 0
      const prevShieldDefended = (userData.shieldDefended || 0) + (shieldUsed ? 2 : 0)

      // Daily Task Reset Logic
      const today = new Date().toISOString().split('T')[0]
      const lastQuizDate = userData.lastQuizDate || ""
      const dailyQuizCount = (lastQuizDate === today) ? (userData.dailyQuizCount || 0) + 1 : 1

      const newCrystals = prevCrystals + actualCrystalsEarned
      const newTotalQuizzes = prevTotalQuizzes + 1
      const newTotalScore = prevTotalScore + score

      // --- Direct Growth Counter (replaces old baseline system) ---
      const kstNow = new Date(Date.now() + 9 * 3600000)
      const todayKST = kstNow.toISOString().split('T')[0]
      const mondayOffset = (kstNow.getUTCDay() + 6) % 7
      const mondayKST = new Date(kstNow.getTime() - mondayOffset * 86400000)
        .toISOString().split('T')[0]

      const growthUpdates = {}
      if (actualCrystalsEarned > 0) {
        // Daily growth: reset if new day, increment if same day
        if (userData.dailyGrowthDate === todayKST) {
          growthUpdates.dailyGrowth = (userData.dailyGrowth || 0) + actualCrystalsEarned
        } else {
          growthUpdates.dailyGrowth = actualCrystalsEarned
          growthUpdates.dailyGrowthDate = todayKST
        }
        // Weekly growth: reset if new week, increment if same week
        if (userData.weeklyGrowthMonday === mondayKST) {
          growthUpdates.weeklyGrowth = (userData.weeklyGrowth || 0) + actualCrystalsEarned
        } else {
          growthUpdates.weeklyGrowth = actualCrystalsEarned
          growthUpdates.weeklyGrowthMonday = mondayKST
        }
      }
      // --- End Growth Counter ---

      await setDoc(doc(db, 'users', user.uid), {
        crystals: newCrystals,
        totalQuizzes: newTotalQuizzes,
        totalScore: newTotalScore,
        averageScore: newTotalScore / newTotalQuizzes,
        perfectCount: (isPerfect && previousBest < 100) ? prevPerfectCount + 1 : prevPerfectCount,
        consecutiveGood: prevConsecutiveGood,
        shieldDefended: prevShieldDefended,
        dailyQuizCount: dailyQuizCount,
        lastQuizDate: today,
        lastActive: serverTimestamp(),
        ...growthUpdates
      }, { merge: true })

      await addDoc(collection(db, 'users', user.uid, 'history'), {
        unitId: currentUnitId,
        unitTitle: activeUnit?.title || "탐사 퀴즈",
        regionId: selectedRegionId || history.find(h => h.unitId === currentUnitId)?.regionId,
        regionTitle: activeRegion?.title || "Unknown Galaxy",
        chapterId: selectedChapterDocId,
        score: score,
        crystalsEarned: actualCrystalsEarned,
        timestamp: serverTimestamp()
      })

      if (isPerfect && previousBest < 100) {
        soundManager.playLevelUp()
      }

      setCompletionResult({
        crystalsEarned: actualCrystalsEarned,
        isPerfect: isPerfect && previousBest < 100, // Only show perfect effect for first time
        rewardMessage
      })
      setSelectedUnitDocId(null)
      // setSelectedChapterDocId(null)
      // setSelectedRegionId(null)
      // setCurrentView('dashboard') // No regular navigation, the modal will handle it
    } catch (error) {
      console.error("Error saving quiz result:", error)
    }
  }

  const hasStartedRef = useRef(false)

  // No sound engine sync needed for typing anymore

  // Animation Variants
  const titleContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.5
      }
    }
  }

  const letterVariants = {
    hidden: { opacity: 0, scale: 0, y: 0, filter: "blur(20px)" },
    visible: (i) => ({ 
      opacity: 1, 
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      textShadow: "0 0 20px #00f3ff, 0 0 40px rgba(0, 243, 255, 0.4)",
      transition: { 
        delay: 0.1 + i * 0.04,
        type: "spring", 
        stiffness: 100, 
        damping: 15
      }
    })
  }

  // Loading State with Timeout & Error handling
  const isLoading = (authLoading || loadingRegions) && !errorRegions

  if (isLoading) {
    return (
      <div className="space-bg">
        <StarField count={150} />
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--crystal-cyan)',
          fontSize: '1.5rem',
          fontWeight: 700
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          >
            🚀 워프 엔진 가동 중...
          </motion.div>
        </div>
      </div>
    )
  }

  // Login Screen
  if (!user) {
    const titleText = "MATH SENSE UNIVERSE"
    
    return (
      <div className="space-bg">
        <StarField count={200} />
        <div className="nebula-bg" />
        
        <div className="space-container login-layout" style={{ 
          height: '100dvh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', // 화면 중앙 정렬
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          padding: isMobile ? '2rem 1.5rem' : '2rem'
        }}>
          {/* 왼쪽 행성 장식 */}
          <div style={{ 
            position: 'absolute',
            top: '30%',
            left: isMobile ? '15px' : '40px',
            transform: 'translateY(-50%)',
            width: isMobile ? '120px' : '180px',
            height: isMobile ? '120px' : '180px',
            pointerEvents: 'none',
            zIndex: 5
          }}>
            <Suspense fallback={null}>
              <Planet3D 
                color="#4a90e2" 
                size={isMobile ? 0.5 : 0.7} 
                height={isMobile ? '100px' : '160px'}
                showSpaceship={false} 
                interactive={false} 
                showFormulas={false}
                equipment={equipment} 
                isBoosting={false}
              />
            </Suspense>
            {/* Fail-safe circle */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '60px' : '100px',
              height: isMobile ? '60px' : '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #1e3a5f 0%, #0a0a1a 70%)',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)',
              zIndex: -1
            }} />
          </div>

          {/* 중앙 컨텐츠 */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: isMobile ? '1.5rem' : '2rem',
            maxWidth: '800px',
            width: '100%'
          }}>
            {/* 타이틀 섹션 */}
            <div className="login-header" style={{ width: '100%', pointerEvents: 'none' }}>
              <motion.div 
                initial="hidden"
                animate="visible"
                className="font-title"
                style={{ 
                  marginBottom: '0.8rem',
                  display: 'flex',
                  gap: isMobile ? '0.3rem' : '0.6rem',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 100
                }}
              >
                {titleText.split(" ").map((word, i) => (
                  <div key={i} style={{ display: 'flex' }}>
                     {word.split("").map((char, j) => {
                       const index = i * 10 + j
                       return (
                         <motion.span
                           key={j}
                           custom={index}
                           variants={letterVariants}
                           id={`letter-${i}-${j}`}
                           style={{ 
                             fontSize: isMobile ? '2.2rem' : '4rem', 
                             color: '#ffffff',
                             textShadow: '0 0 20px #00f3ff, 0 0 40px #00f3ff',
                             display: 'inline-block',
                             fontWeight: 900
                           }}
                         >
                           {char}
                         </motion.span>
                       )
                     })}
                     <span style={{ width: isMobile ? '0.6rem' : '1.2rem' }}></span>
                  </div>
                ))}
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="font-tech"
                style={{ 
                  color: 'var(--crystal-cyan)', 
                  fontSize: isMobile ? '0.95rem' : '1.2rem',
                  letterSpacing: '3px',
                  textShadow: '0 0 10px var(--crystal-glow)',
                  margin: 0
                }}
              >
                SYSTEM ONLINE. WAITING FOR PILOT.
              </motion.p>
            </div>
            
            {/* 컨트롤 섹션: 버튼 + 토글 가로 배치 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="login-controls"
              style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center', 
                justifyContent: 'center',
                gap: isMobile ? '1rem' : '1.5rem',
                marginTop: '1rem'
              }}
            >
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px var(--neon-blue)" }}
                whileTap={{ scale: 0.95 }}
                className="glass-card font-title"
                onClick={handleLogin}
                style={{
                  padding: isMobile ? '1.2rem 3rem' : '1.2rem 3.5rem',
                  fontSize: isMobile ? '1.2rem' : '1.3rem',
                  color: 'var(--text-bright)',
                  cursor: 'pointer',
                  border: '2px solid var(--crystal-cyan)',
                  background: 'rgba(0, 212, 255, 0.15)',
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                시스템 접속 (LOGIN)
              </motion.button>

              <PerformanceToggle />
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Mode
  if (selectedUnitDocId || quickQuizUnitId) {
    if (loadingQuizzes) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--crystal-cyan)',
            gap: '1rem'
          }}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: '3rem' }}
            >
              🛰️
            </motion.div>
            <div className="font-tech">데이터 수신 중 (LOADING QUIZ)...</div>
          </div>
        </div>
      )
    }

    if (errorQuizzes) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#ff4d4d',
            gap: '2rem'
          }}>
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <div className="font-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>통신 오류</div>
              <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                퀴즈 데이터를 불러오지 못했습니다.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => refetchQuizzes()}
                  className="hud-btn primary glass"
                  style={{
                    padding: '0.8rem 1.5rem',
                    background: 'rgba(0, 243, 255, 0.2)',
                    border: '1px solid var(--neon-blue)',
                    color: 'white',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  다시 시도
                </button>
                <button 
                  onClick={() => { setSelectedUnitDocId(null); setQuickQuizUnitId(null); }}
                  className="hud-btn secondary glass"
                  style={{
                    padding: '0.8rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (unitQuizzes && (selectedUnitDocId || quickQuizUnitId)) {
      // Find region for quick quiz if not already active
      const displayRegion = activeRegion || regions?.find(r => 
        r.id === history.find(h => h.unitId === (selectedUnitDocId || quickQuizUnitId))?.regionId
      )

      return (
        <SpaceQuizView
          key={selectedUnitDocId || quickQuizUnitId}
          region={displayRegion}
          quizData={{ 
            unitId: selectedUnitDocId || quickQuizUnitId,
            chapterId: selectedChapterDocId || history.find(h => h.unitId === quickQuizUnitId)?.chapterId,
            title: activeUnit?.title || "탐사 퀴즈", 
            questions: unitQuizzes 
          }}
          onExit={() => { setSelectedUnitDocId(null); setQuickQuizUnitId(null); }}
          onComplete={handleComplete}
          hasShield={equipment.shield}
        />
      )
    }
  }

  // Main App
  return (
    <div className="space-bg">
      {/* 3D Background Scene - Always Visible but controlled by state */}
      <AnimatePresence>
        {currentView === 'planet' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
          >
            <SpaceScene 
              regions={regions} 
              selectedRegionId={selectedRegionId}
              recentRegionId={recentRegionId}
              explorationStatus={explorationStatus}
              onSelectRegion={(id) => {
                setSelectedRegionId(id)
                soundManager.playWarp()
              }}
              equipment={equipment}
              isBoosting={isBoosting}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan line removed */}
      
      {/* Navigation */}
      <SpaceNavbar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view)
          setSelectedRegionId(null)
          setSelectedChapterDocId(null)
        }} 
      />

      {/* Main Content Overlay */}
      <main className="space-container" style={{ pointerEvents: 'none' }}>
        {currentView === 'planet' && (
          <>
            {!selectedRegionId ? (
              // Region Selection (Overlay only)
              <div style={{ 
                position: 'absolute', 
                top: '100px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                textAlign: 'center',
                width: '100%',
                pointerEvents: 'none'
              }}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  {equipment.engine && (
                    <motion.p 
                      className="font-tech" 
                      style={{ 
                        color: 'var(--star-gold)', 
                        fontSize: '0.9rem', 
                        marginTop: '0.5rem',
                        textShadow: '0 0 10px var(--neon-blue)'
                      }}
                    >
                      (BOOST: SPACE BAR)
                    </motion.p>
                  )}
                </motion.div>
              </div>
            ) : !selectedChapterDocId ? (
              // Chapter Selection (Overlay)
              <div className="fade-in" style={{ pointerEvents: 'auto', marginTop: '5vh' }}>
                <button 
                  className="space-nav-link font-tech"
                  onClick={() => { setSelectedRegionId(null); soundManager.playClick() }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← RETURN TO GALAXY
                </button>
                <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5, 5, 16, 0.8)', backdropFilter: 'blur(20px)', position: 'relative' }}>
                  {/* Close Button */}
                  <button 
                    onClick={() => { setSelectedRegionId(null); soundManager.playClick() }}
                    style={{
                      position: 'absolute',
                      top: '1.5rem',
                      right: '1.5rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--text-bright)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    ✕
                  </button>
                  <h2 className="font-title" style={{ 
                    color: 'var(--text-bright)', 
                    fontSize: '2rem', 
                    marginBottom: '2rem',
                    borderBottom: '1px solid var(--neon-blue)',
                    paddingBottom: '1rem' 
                  }}>
                    SECTOR: {activeRegion?.title}
                  </h2>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {loadingChapters ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)' }}>SCANNING...</div>
                    ) : chapters?.map(chapter => (
                      <motion.div
                        key={chapter.docId}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 243, 255, 0.1)' }}
                        className="glass-card hud-border"
                        onClick={() => { setSelectedChapterDocId(chapter.docId); soundManager.playWarp() }}
                        style={{ padding: '2rem', cursor: 'pointer' }}
                      >
                        <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.5rem' }}>
                          {chapter.title}
                        </h3>
                        {chapterProgress[chapter.docId] ? (
                          chapterProgress[chapter.docId].isFinished ? (
                            <p className="font-tech" style={{ color: '#50c878', fontSize: '0.9rem', fontWeight: 800 }}>완료 🏆</p>
                          ) : chapterProgress[chapter.docId].completed > 0 ? (
                            <p className="font-tech" style={{ color: 'var(--neon-blue)', fontSize: '0.9rem', fontWeight: 700 }}>
                              진행 중 ({chapterProgress[chapter.docId].completed}/{chapterProgress[chapter.docId].total})
                            </p>
                          ) : (
                            <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>탐험 전</p>
                          )
                        ) : (
                          <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>스캔 중...</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Unit Selection (Overlay)
              <div className="fade-in" style={{ pointerEvents: 'auto', marginTop: '5vh' }}>
                <button 
                  className="space-nav-link font-tech"
                  onClick={() => {
                    soundManager.playClick()
                    if (chapters?.length === 1) {
                      setSelectedChapterDocId(null)
                      setSelectedRegionId(null)
                    } else {
                      setSelectedChapterDocId(null)
                    }
                  }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← RETURN TO SECTOR
                </button>
                <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5, 5, 16, 0.8)', backdropFilter: 'blur(20px)', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
                  {/* Close Button */}
                  <button 
                    onClick={() => {
                      soundManager.playClick()
                      if (chapters?.length === 1) {
                        setSelectedChapterDocId(null)
                        setSelectedRegionId(null)
                      } else {
                        setSelectedChapterDocId(null)
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '1.5rem',
                      right: '1.5rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--text-bright)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    ✕
                  </button>
                  <h2 className="font-title" style={{ 
                    color: 'var(--text-bright)', 
                    fontSize: '1.8rem', 
                    marginBottom: '2rem', 
                    textAlign: 'center',
                    borderBottom: '1px solid var(--neon-blue)',
                    paddingBottom: '1rem'
                  }}>
                    MISSION SELECT: {chapters?.length === 1 ? activeRegion?.title : activeChapter?.title}
                  </h2>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {loadingUnits ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)' }}>LOADING MISSION DATA...</div>
                    ) : units?.map((unit, idx) => {
                      const bestScore = bestScores[unit.docId]
                      const isCompleted = bestScore !== undefined
                      return (
                        <motion.button
                          key={unit.docId}
                          whileHover={{ scale: 1.02, x: 10, backgroundColor: 'rgba(0, 243, 255, 0.15)' }}
                          className={`glass-card hud-border ${isCompleted ? 'completed' : ''}`}
                          onClick={() => { 
                            setPendingUnit({
                              docId: unit.docId,
                              title: unit.title,
                              bestScore,
                              source: 'planet'
                            })
                            soundManager.playClick() 
                          }}
                          style={{
                            padding: '1.2rem 1.5rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text-bright)',
                            fontSize: '1.1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: isCompleted ? '4px solid var(--secondary)' : '1px solid var(--neon-blue)'
                          }}
                        >
                          <span className="font-title">
                            <span style={{ color: 'var(--neon-blue)', marginRight: '1rem' }}>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                            {isCompleted && <span style={{ marginRight: '0.5rem' }}>✅</span>}
                            {unit.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {isCompleted && (
                              <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.9rem' }}>
                                BEST: {bestScore}
                              </span>
                            )}
                            <span style={{ color: 'var(--crystal-cyan)' }}>{isCompleted ? 'REPLAY' : '🚀 START'}</span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ pointerEvents: 'auto' }}>
          {currentView === 'dashboard' && (
            <SpaceDashboard 
              user={user} 
              userData={userData} 
              onQuizSelect={(p) => {
                if (p.unitId) {
                  setPendingUnit({
                    docId: p.unitId,
                    title: p.unitTitle,
                    bestScore: bestScores[p.unitId],
                    source: 'dashboard'
                  })
                  soundManager.playClick()
                }
              }} 
              regions={regions}
            />
          )}
          {currentView === 'collection' && <SpaceCollection userData={userData} />}
          {currentView === 'store' && (
            <SpaceStore user={user} userData={userData} />
          )}
          
          {currentView === 'ranking' && <SpaceRanking user={user} userData={userData} regions={regions} />}

          {/* Quick Quiz Modal now handled by main return branch for consistency */}
        </div>
      </main>

      {/* 우주 테마 학습 완료 모달 */}
      <AnimatePresence>
        {completionResult && (
          <motion.div 
            className="modal-overlay space-hud"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 3000,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.div 
              className="glass-card hud-border completion-modal-space"
              initial={{ scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: '500px',
                background: 'rgba(0, 15, 30, 0.95)',
                boxShadow: completionResult.isPerfect ? 'var(--glow-gold)' : 'var(--glow-cyan)'
              }}
            >
              <div className="hud-line mb-4"></div>
              <h2 className="font-title gradient-text-space" style={{ 
                fontSize: '2.5rem', 
                marginBottom: '1.5rem',
                background: 'linear-gradient(to right, #00f3ff, #00ff88)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {completionResult.isPerfect ? '🌟 MISSION PERFECT' : '🚀 MISSION COMPLETE'}
              </h2>
              
              <div style={{ margin: '2rem 0' }}>
                <div className="crystal-icon large" style={{ width: '60px', height: '60px', margin: '0 auto 1.5rem' }}></div>
                <p className="font-tech" style={{ fontSize: '1.2rem', color: 'var(--text-bright)' }}>
                  획득한 수학 광석: <span style={{ color: 'var(--crystal-cyan)', fontWeight: 900 }}>{completionResult.crystalsEarned}개</span>
                </p>
                {completionResult.rewardMessage && (
                  <p className="font-tech" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
                    {completionResult.rewardMessage}
                  </p>
                )}
              </div>

              <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                행성 탐사가 성공적으로 종료되었습니다.<br/>다음 경로를 선택하십시오.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                  className="hud-btn primary glass"
                  style={{
                    padding: '1rem',
                    background: 'rgba(0, 243, 255, 0.2)',
                    border: '1px solid var(--neon-blue)',
                    color: 'var(--text-bright)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  onClick={() => {
                    setCompletionResult(null)
                    setSelectedUnitDocId(null)
                    setSelectedChapterDocId(null)
                    setSelectedRegionId(null)
                    setCurrentView('dashboard')
                    soundManager.playClick()
                  }}
                >
                  📊 성장 기록 분석 (DASHBOARD)
                </button>
                <button 
                  className="hud-btn secondary glass"
                  style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'var(--text-muted)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  onClick={() => {
                    setCompletionResult(null)
                    setSelectedUnitDocId(null)
                    soundManager.playClick()
                  }}
                >
                  🛰️ 연속 탐사 진행 (CONTINUE)
                </button>
              </div>
              <div className="hud-line mt-4"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 퀴즈 진입 전 보상 가능성 안내 모달 */}
      <AnimatePresence>
        {pendingUnit && (
          <RewardPotentialModal 
            unit={pendingUnit}
            onCancel={() => setPendingUnit(null)}
            onConfirm={() => {
              if (pendingUnit.source === 'planet') {
                setSelectedUnitDocId(pendingUnit.docId)
              } else {
                setQuickQuizUnitId(pendingUnit.docId)
              }
              setPendingUnit(null)
              soundManager.playWarp()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RewardPotentialModal({ unit, onCancel, onConfirm }) {
  const isPerfect = unit.bestScore === 100

  return (
    <motion.div 
      className="modal-overlay space-hud"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 4000,
        background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}
    >
      <motion.div 
        className="glass-card hud-border"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{ padding: '2.5rem', maxWidth: '450px', width: '100%', textAlign: 'center', background: 'rgba(5, 10, 25, 0.9)' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isPerfect ? '🛰️' : '💎'}</div>
        <h2 className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.5rem', marginBottom: '1rem' }}>
          {unit.title}
        </h2>
        
        <div className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
          <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>현재 최고 기록</p>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)' }}>
            {unit.bestScore !== undefined ? `${unit.bestScore}점` : '기록 없음'}
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem', textAlign: 'left', padding: '0 0.5rem' }}>
          {isPerfect ? (
            <div style={{ padding: '1rem', borderLeft: '3px solid #ff4d4d', background: 'rgba(255, 77, 77, 0.1)' }}>
              <p style={{ color: '#ffb3b3', fontSize: '0.9rem', lineHeight: '1.5' }}>
                ⚠️ **이미 100점을 획득한 단원입니다.**<br/>
                학습을 위한 반복 탐사는 가능하지만, 추가적인 수학 광석 보상은 지급되지 않습니다.
              </p>
            </div>
          ) : unit.bestScore > 0 ? (
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--star-gold)', background: 'rgba(255, 215, 0, 0.1)' }}>
              <p style={{ color: '#ffeaa7', fontSize: '0.9rem', lineHeight: '1.5' }}>
                💡 **성적 경신 보상 시스템 가동 중**<br/>
                현재 최고 점수인 **{unit.bestScore}점**을 초과하여 기록을 경신할 경우, 그 차이만큼의 수학 광석을 비례하여 획득할 수 있습니다.
              </p>
            </div>
          ) : (
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--planet-green)', background: 'rgba(0, 255, 136, 0.1)' }}>
              <p style={{ color: '#b2fcca', fontSize: '0.9rem', lineHeight: '1.5' }}>
                ✨ **첫 탐사 보상 대기 중**<br/>
                이 단원의 첫 번째 탐사입니다. 획득한 모든 수학 광석과 만점 보너스(10개)를 온전히 획득할 수 있습니다!
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="hud-btn secondary glass"
            style={{ flex: 1, padding: '1rem', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
            onClick={onCancel}
          >
            취소 (BACK)
          </button>
          <button 
            className="hud-btn primary glass"
            style={{ flex: 1.5, padding: '1rem', borderRadius: '10px', cursor: 'pointer', background: 'rgba(0, 243, 255, 0.2)', border: '1px solid var(--neon-blue)', color: 'white', fontWeight: 700 }}
            onClick={onConfirm}
          >
            탐사 시작 (START)
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SpaceHome
