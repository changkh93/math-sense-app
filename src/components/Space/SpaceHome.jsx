import { useState, useEffect, Suspense, useMemo, useRef } from 'react'
import { auth, googleProvider, db } from '../../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { useRegions, useChapters, useUnits, useQuizzes } from '../../hooks/useContent'
import { motion, AnimatePresence } from 'framer-motion' // Added Framer Motion

// Space Components
import StarField from './StarField'
import Planet3D from './Planet3D' // Keep for Login Screen
import SpaceScene from './SpaceScene' // New 3D Scene
import SpaceQuizView from './SpaceQuizView'
import SpaceDashboard from './SpaceDashboard'
import SpaceCollection from './SpaceCollection'
import { useParticles, createParticleBurst } from './ParticleEffects'
import soundManager from '../../utils/SoundManager'
import PerformanceToggle from '../PerformanceToggle'

// Styles
import '../../styles/space-theme.css'

function SpaceHome() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentView, setCurrentView] = useState('planet') // 'planet', 'dashboard', 'collection'
  
  // Selection State
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [selectedChapterDocId, setSelectedChapterDocId] = useState(null)
  const [selectedUnitDocId, setSelectedUnitDocId] = useState(null)
  const [quickQuizUnitId, setQuickQuizUnitId] = useState(null) // New: Dashboard quick quiz

  // Data Hooks
  const { data: regions, isLoading: loadingRegions, isError: errorRegions } = useRegions()
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  const { data: unitQuizzes, isLoading: loadingQuizzes } = useQuizzes(selectedUnitDocId || quickQuizUnitId)

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

  // Auth listener & Loading Timeout
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      if (authLoading || loadingRegions) {
        console.warn("⏳ Loading timeout reached. Force-releasing screen.")
        setLoadingTimeout(true)
      }
    }, 5000)

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (user) {
        const userDocRef = doc(db, 'users', user.uid)
        // Correctly handle internal listener
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data()
            setUserData({
              crystals: 0,
              totalQuizzes: 0,
              totalScore: 0,
              spaceshipLevel: 1,
              ...data
            })
          } else {
            const initialData = { 
              crystals: 0, 
              totalQuizzes: 0, 
              totalScore: 0, 
              spaceshipLevel: 1,
              email: user.email, 
              name: user.displayName 
            }
            setDoc(userDocRef, initialData)
            setUserData(initialData)
          }
          setAuthLoading(false)
        }, (err) => {
          console.error("User doc snapshot error:", err)
          setAuthLoading(false) // Proceed anyway
        })
        
        // We need to return the cleanup for the inner listener if we want to stop it
        // But since this is inside onAuthStateChanged, we should store it or use a separate effect.
        // Actually, simplest is to just ensure it's cleaned up when auth changes.
        return () => unsubscribeDoc()
      } else {
        setUser(null)
        setUserData(null)
        setAuthLoading(false)
      }
    })

    return () => {
      clearTimeout(timeoutId)
      unsubscribeAuth()
    }
  }, [])

  // Interaction State
  const [isBoosting, setIsBoosting] = useState(false)
  
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
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Login failed:", error)
      alert("로그인에 실패했습니다.")
    }
  }

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

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
  const { explorationStatus, recentRegionId } = useMemo(() => {
    const statusMap = {}
    let lastRegionId = null

    if (!regions || history.length === 0) {
      regions?.forEach(r => statusMap[r.id] = 'not_started')
      return { explorationStatus: statusMap, recentRegionId: null }
    }

    // Identify recent region from the latest history item
    const latestHistory = history[0]
    // We need to map unitId back to regionId. 
    // This is tricky because regions are hierarchical. 
    // For now, let's assume we can find it by searching through regions.
    
    const solvedUnitIds = new Set(history.map(h => h.unitId))
    
    regions.forEach(region => {
      let totalUnits = 0
      let solvedCount = 0

      // This part is async in hooks but we might have regions data already.
      // However, chapters/units are fetched per selection.
      // TO DO: Efficiently determine status. 
      // Option: If we can't get all units at once, we might need a better data structure or fetch them.
      // For now, let's use a simpler heuristic or just check if ANY unit in that region is in the history.
      
      const isAnySolved = history.some(h => {
        // Find if this history item belongs to this region
        // We'll trust the unitTitle or just record regionId in history later.
        // For existing items, we'll try a rough match or check the first one.
        return h.unitId?.startsWith(region.id) || h.regionId === region.id
      })

      if (isAnySolved) {
        // Check if the latest one is this region
        if (!lastRegionId) {
          const latest = history[0]
          if (latest.unitId?.startsWith(region.id) || latest.regionId === region.id) {
            lastRegionId = region.id
          }
        }
        statusMap[region.id] = 'in_progress' // Default to in_progress if any solved
      } else {
        statusMap[region.id] = 'not_started'
      }
    })

    return { explorationStatus: statusMap, recentRegionId: lastRegionId }
  }, [regions, history])

  const handleLogout = () => {
    soundManager.playClick()
    signOut(auth)
  }

  const handleComplete = async (result) => {
    if (!user) return
    
    try {
      const { score, total, correctCount, totalCount } = result
      if (totalCount === 0) return

      const crystalBonus = correctCount * 5
      soundManager.playCrystal()
      
      const prevCrystals = userData.crystals || 0
      const prevTotalQuizzes = userData.totalQuizzes || 0
      const prevTotalScore = userData.totalScore || 0

      const newCrystals = prevCrystals + crystalBonus
      const newTotalQuizzes = prevTotalQuizzes + 1
      const newTotalScore = prevTotalScore + score

      await setDoc(doc(db, 'users', user.uid), {
        crystals: newCrystals,
        totalQuizzes: newTotalQuizzes,
        totalScore: newTotalScore,
        averageScore: newTotalScore / newTotalQuizzes,
        lastActive: serverTimestamp()
      }, { merge: true })

      await addDoc(collection(db, 'users', user.uid, 'history'), {
        unitId: selectedUnitDocId,
        unitTitle: activeUnit.title,
        regionId: selectedRegionId, // Add regionId for easier tracking
        score: score,
        crystalsEarned: crystalBonus,
        timestamp: serverTimestamp()
      })

      if (correctCount === totalCount) {
        soundManager.playLevelUp()
      }

      setSelectedUnitDocId(null)
      setSelectedChapterDocId(null)
      setSelectedRegionId(null)
      setCurrentView('dashboard') // Navigate to dashboard after completion
    } catch (error) {
      console.error("Error saving quiz result:", error)
    }
  }

  const [isScattering, setIsScattering] = useState(false)
  const [animationSequence, setAnimationSequence] = useState(0) // 0: idle, 1: typing, 2: reading, 3: scattering
  const hasStartedRef = useRef(false)

  // Memoized Scatter Positions to prevent recalculation during animation
  const scatterPositions = useMemo(() => {
    return Array.from({ length: 25 }).map(() => ({
      x: (Math.random() - 0.5) * 1500,
      y: (Math.random() - 0.5) * 1000,
      rotate: Math.random() * 720 - 360,
      scale: Math.random() * 0.5
    }))
  }, [])

  // Sequence Controller
  useEffect(() => {
    if (authLoading || loadingRegions) return
    
    // If logged in, ensure sequence is ready for next logout and return
    if (user) {
      hasStartedRef.current = false
      setAnimationSequence(0)
      setIsScattering(false)
      return
    }

    if (hasStartedRef.current) return
    
    // Slight delay to ensure loading screen is fully gone
    const startTimer = setTimeout(() => {
      hasStartedRef.current = true
      setIsScattering(false)
      setAnimationSequence(1)
      console.log("🚀 SpaceHome: Starting landing sequence (Typing)")

      const timer2 = setTimeout(() => {
        setAnimationSequence(2)
      }, 2500)

      const timer3 = setTimeout(() => {
        setAnimationSequence(3)
        setIsScattering(true)
        console.log("✨ SpaceHome: Scattering title")
      }, 5000)

      return () => {
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }, 500)

    return () => clearTimeout(startTimer)
  }, [authLoading, loadingRegions, user])

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
    },
    scatter: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: 1
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
      transition: { 
        delay: 0.1 + i * 0.04,
        type: "spring", 
        stiffness: 100, 
        damping: 15
      }
    }),
    scatter: (i) => ({
      x: scatterPositions[i % 25].x,
      y: scatterPositions[i % 25].y,
      opacity: 0,
      scale: 0.1,
      rotate: scatterPositions[i % 25].rotate,
      filter: "blur(40px) brightness(2)",
      transition: { 
        duration: 3, 
        ease: [0.22, 1, 0.36, 1] // cubic-bezier(0.22, 1, 0.36, 1)
      }
    })
  }

  // Loading State with Timeout & Error handling
  const isLoading = (authLoading || loadingRegions) && !loadingTimeout && !errorRegions

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
        {/* Scan line removed */}
        <div className="space-container" style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10
        }}>
          <motion.div 
            initial="hidden"
            animate={isScattering ? "scatter" : "visible"}
            className="font-title"
            style={{ 
              marginBottom: '2rem',
              display: 'flex',
              gap: '0.6rem',
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
                       onAnimationStart={(variant) => {
                         if (variant === 'scatter') {
                           const el = document.getElementById(`letter-${i}-${j}`)
                           if (el) {
                             const rect = el.getBoundingClientRect()
                             createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'crystal')
                           }
                         }
                       }}
                       style={{ 
                         fontSize: '4.5rem', 
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
                 <span style={{ width: '1.5rem' }}></span>
              </div>
            ))}
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-tech"
            style={{ 
              color: 'var(--text-muted)', 
              fontSize: '1.3rem',
              marginBottom: '3rem'
            }}
          >
            SYSTEM ONLINE. WAITING FOR PILOT.
          </motion.p>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '400px', margin: '0 auto' }}>
            <Suspense fallback={<div className="font-tech" style={{ color: 'var(--crystal-cyan)' }}>초공간 행성 렌더링 중...</div>}>
              <Planet3D 
                color="#4a90e2" 
                size={1.5} 
                showSpaceship={true} 
                interactive={false} 
                equipment={equipment} 
                isBoosting={isBoosting}
              />
            </Suspense>
            {/* Fail-safe circle behind WebGL in case context is lost */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #1e3a5f 0%, #0a0a1a 70%)',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.2)',
              zIndex: -1
            }} />
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px var(--neon-blue)" }}
            whileTap={{ scale: 0.95 }}
            className="glass-card font-title"
            onClick={handleLogin}
            style={{
              marginTop: '2rem',
              padding: '1rem 3rem',
              fontSize: '1.2rem',
              color: 'var(--text-bright)',
              cursor: 'pointer',
              border: '1px solid var(--crystal-cyan)',
              background: 'rgba(0, 212, 255, 0.1)'
            }}
          >
            시스템 접속 (LOGIN)
          </motion.button>

          <div style={{ marginTop: '2rem' }}>
            <PerformanceToggle />
          </div>
        </div>
      </div>
    )
  }

  // Quiz Mode
  if (selectedUnitDocId && unitQuizzes) {
    return (
      <SpaceQuizView
        region={activeRegion}
        quizData={{ title: activeUnit.title, questions: unitQuizzes }}
        onExit={() => setSelectedUnitDocId(null)}
        onComplete={handleComplete}
      />
    )
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
      <nav className="space-nav hud-border" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="space-nav-links font-title">
          <button 
            className={`space-nav-link ${currentView === 'planet' ? 'active' : ''}`}
            onClick={() => { setCurrentView('planet'); setSelectedRegionId(null); setSelectedChapterDocId(null); }}
          >
            🪐 NAV
          </button>
          <button 
            className={`space-nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            📊 LOGS
          </button>
          <button 
            className={`space-nav-link ${currentView === 'collection' ? 'active' : ''}`}
            onClick={() => setCurrentView('collection')}
          >
            🏆 DATABASE
          </button>
          <div style={{ marginLeft: '1rem' }}>
            <PerformanceToggle />
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="crystal-counter font-tech">
            <div className="crystal-icon"></div>
            <span>{userData?.crystals || 0}</span>
          </div>
          <button 
            className="space-nav-link font-tech"
            onClick={handleLogout}
            style={{ fontSize: '0.8rem' }}
          >
            로그아웃
          </button>
        </div>
      </nav>

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
                        <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          탐험 경로 설정
                        </p>
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
                    ) : units?.map((unit, idx) => (
                      <motion.button
                        key={unit.docId}
                        whileHover={{ scale: 1.02, x: 10, backgroundColor: 'rgba(0, 243, 255, 0.15)' }}
                        className="glass-card hud-border"
                        onClick={() => { setSelectedUnitDocId(unit.docId); soundManager.playClick() }}
                        style={{
                          padding: '1.2rem 1.5rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--text-bright)',
                          fontSize: '1.1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span className="font-title"><span style={{ color: 'var(--neon-blue)', marginRight: '1rem' }}>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>{unit.title}</span>
                        <span style={{ color: 'var(--crystal-cyan)' }}>🚀 START</span>
                      </motion.button>
                    ))}
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
                  setQuickQuizUnitId(p.unitId)
                  soundManager.playClick()
                }
              }} 
            />
          )}
          {currentView === 'collection' && <SpaceCollection userData={userData} />}
        </div>

        {/* Quick Quiz Modal Overlay */}
        <AnimatePresence>
          {quickQuizUnitId && unitQuizzes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2000,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                pointerEvents: 'auto'
              }}
            >
              <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                <SpaceQuizView
                  region={regions?.find(r => r.id === history.find(h => h.unitId === quickQuizUnitId)?.regionId)}
                  quizData={{ 
                    title: history.find(h => h.unitId === quickQuizUnitId)?.unitTitle || '탐사 퀴즈', 
                    questions: unitQuizzes 
                  }}
                  onExit={() => setQuickQuizUnitId(null)}
                  onComplete={async (result) => {
                    await handleComplete(result)
                    setQuickQuizUnitId(null)
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default SpaceHome
