import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import SpaceQuizView from './SpaceQuizView'
import WorkbookPlayer from './WorkbookPlayer'
import soundManager from '../../utils/SoundManager'
import { InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import MissionMarkdownViewer from './MissionMarkdownViewer'
import { db } from '../../firebase'
import { doc, setDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import { useAuth } from '../../hooks/useAuth'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'

// Mock Data for demonstration - In production this would come from Firestore
// (Mock data removed — use only real Firestore data)

// ─── Silent Crystal Toast ───
const SilentCrystalToast = ({ amount, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.8rem 1.2rem',
          background: 'rgba(0, 243, 255, 0.15)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        <motion.div
          animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6 }}
          style={{ fontSize: '1.5rem' }}
        >
          {amount > 0 ? '💎' : '✅'}
        </motion.div>
        <span className="font-title" style={{ 
          color: 'var(--crystal-cyan)', 
          fontSize: '1.2rem',
          textShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
        }}>
          {amount > 0 ? `+${amount}` : '시청 위치 저장됨'}
        </span>
      </motion.div>
    )}
  </AnimatePresence>
)

// ─── YouTube Player Component ───
const YoutubePlayer = ({ videoId, start, end, onComplete, onTimeUpdate, isOverlay = false, autoPlay = true }) => {
  const playerRef = useRef(null)
  const wrapperRef = useRef(null)
  const [hasError, setHasError] = useState(false)
  const timeUpdateInterval = useRef(null)
  const playerTargetId = useRef(`yt-player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (!wrapperRef.current) return;
      
      // Create a target div for YouTube to replace (keeps React's DOM clean)
      const targetDiv = document.createElement('div')
      targetDiv.id = playerTargetId.current
      targetDiv.style.width = '100%'
      targetDiv.style.height = '100%'
      wrapperRef.current.innerHTML = ''
      wrapperRef.current.appendChild(targetDiv)
      
      const player = new window.YT.Player(playerTargetId.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          start: start,
          end: end,
          autoplay: autoPlay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          'onStateChange': (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              // Force one last time update before ending, crucial for capturing short remaining playbacks
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const currentTime = playerRef.current.getCurrentTime()
                const duration = playerRef.current.getDuration ? playerRef.current.getDuration() : 0
                const playbackRate = playerRef.current.getPlaybackRate ? playerRef.current.getPlaybackRate() : 1
                if (onTimeUpdate) onTimeUpdate({ currentTime, duration, playbackRate })
              }
              if (onComplete) onComplete()
            }
            // Start/stop time tracking
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
              timeUpdateInterval.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                  const currentTime = playerRef.current.getCurrentTime()
                  const duration = playerRef.current.getDuration ? playerRef.current.getDuration() : 0
                  const playbackRate = playerRef.current.getPlaybackRate ? playerRef.current.getPlaybackRate() : 1
                  if (onTimeUpdate) onTimeUpdate({ currentTime, duration, playbackRate })
                }
              }, 1000) // Every 1 second for accurate stamp tracking
            } else {
              if (timeUpdateInterval.current) {
                clearInterval(timeUpdateInterval.current)
                timeUpdateInterval.current = null
              }
            }
          },
          'onError': (event) => {
            console.error("YouTube Player Error:", event.data)
            if (event.data === 100 || event.data === 101 || event.data === 150) {
              setHasError(true)
            }
          }
        }
      })
      playerRef.current = player
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      // Use interval to wait for YT API instead of overwriting global callback
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT)
          initPlayer()
        }
      }, 100)
      return () => {
        clearInterval(checkYT)
        if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try { playerRef.current.destroy() } catch (e) {}
          playerRef.current = null
        }
        if (wrapperRef.current) wrapperRef.current.innerHTML = ''
      }
    }

    return () => {
      // Clean up interval
      if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
      // Properly destroy YouTube player before React removes DOM
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy() } catch (e) { /* ignore */ }
        playerRef.current = null
      }
      // Clear the wrapper manually to avoid React removeChild conflicts
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = ''
      }
    }
  }, [videoId, start, end])

  if (hasError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: 'var(--alert-red)', borderRadius: '15px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3 className="font-title" style={{ margin: 0, color: 'var(--alert-red)' }}>교신 장애</h3>
        <p className="font-tech" style={{ marginTop: '0.5rem', opacity: 0.8, color: 'white' }}>본부의 복구 작업 중입니다.</p>
      </div>
    )
  }

  return <div ref={wrapperRef} style={{ width: '100%', height: '100%', borderRadius: '15px', overflow: 'hidden' }} />
}

// ─── Reward Potential Modal (moved from SpaceHome) ───
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
                학습을 위한 반복 탐사는 가능하지만, 추가적인 메타 광석 보상은 지급되지 않습니다.
              </p>
            </div>
          ) : unit.bestScore > 0 ? (
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--star-gold)', background: 'rgba(255, 215, 0, 0.1)' }}>
              <p style={{ color: '#ffeaa7', fontSize: '0.9rem', lineHeight: '1.5' }}>
                💡 **성적 경신 보상 시스템 가동 중**<br/>
                현재 최고 점수인 **{unit.bestScore}점**을 초과하여 기록을 경신할 경우, 그 차이만큼의 메타 광석을 비례하여 획득할 수 있습니다.
              </p>
            </div>
          ) : (
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--planet-green)', background: 'rgba(0, 255, 136, 0.1)' }}>
              <p style={{ color: '#b2fcca', fontSize: '0.9rem', lineHeight: '1.5' }}>
                ✨ **첫 탐사 보상 대기 중**<br/>
                이 단원의 첫 번째 탐사입니다. 획득한 모든 메타 광석과 만점 보너스(10개)를 온전히 획득할 수 있습니다!
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


// ══════════════════════════════════════════════════════
// ═══ MAIN COMPONENT ═════════════════════════════════
// ══════════════════════════════════════════════════════
export default function MissionHub({ 
  unitId, 
  onComplete, 
  onBack, 
  activeUnit, // passed from SpaceHome
  userData,
  unitQuizzes, // passed from SpaceHome (may be null while loading)
  loadingQuizzes,
  errorQuizzes,
  refetchQuizzes,
  bestScores = {}, // passed from SpaceHome
  initialMode = 'briefing', // pre-computed by SpaceHome: 'briefing', 'text', 'video', 'quiz-modal'
  onNonQuizActivityComplete
}) {
  const { user } = useAuth()
  const userId = user?.uid
  const [currentMode, setCurrentMode] = useState(initialMode === 'quiz-modal' ? 'briefing' : initialMode)
  const [missionData, setMissionData] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false) 
  const [overlayContent, setOverlayContent] = useState('text')
  const [overlayReference, setOverlayReference] = useState(null)
  const [selectedTx, setSelectedTx] = useState(null)

  // ─── Field Test modal state ───
  const [showFieldTestModal, setShowFieldTestModal] = useState(initialMode === 'quiz-modal')

  // ─── Data Log reward state ───
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [logTimerActive, setLogTimerActive] = useState(false)
  const [logRewardClaimed, setLogRewardClaimed] = useState(false)
  const timerRef = useRef(null)
  const sessionStorageKey = `datalog_timer_${unitId}`

  // ─── Transmission reward state (Bitset/Checklist) ───
  const stampedSetRef = useRef(new Set()) // Set of stamped video seconds
  const newStampCountRef = useRef(0) // New stamps since last reward
  const [stampCount, setStampCount] = useState(0) // For UI display
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [videoCompletionBonusGiven, setVideoCompletionBonusGiven] = useState(false)
  const lastVideoTimeRef = useRef(0) // Current video playback position
  const totalTimeSpentRef = useRef(0) // Actual playback seconds (analytics)
  const videoDurationRef = useRef(0) // Video total duration for reward cap
  const totalRewardedCrystalsRef = useRef(0) // Total crystals given for this tx
  const [totalRewardedCrystals, setTotalRewardedCrystals] = useState(0) // For UI reactivity
  const autoSaveIntervalRef = useRef(null)
  
  // ─── Silent Toast ───
  const [toastVisible, setToastVisible] = useState(false)
  const [toastAmount, setToastAmount] = useState(0)
  const toastTimeoutRef = useRef(null)

  // ─── Learning Progress (Firestore) ───
  const [learningProgress, setLearningProgress] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(true)
  
  // Load learning progress from Firestore
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId || !unitId) {
        setLoadingProgress(false)
        return
      }
      try {
        const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
        const snap = await getDoc(progressRef)
        if (snap.exists()) {
          setLearningProgress(snap.data())
          // Restore completion states
          const data = snap.data()
          if (data.logRead) setLogRewardClaimed(true)
          if (data.videoProgress) {
            // Check if any transmission has been fully completed
            const anyCompleted = Object.values(data.videoProgress).some(v => v.completed && v.completionBonusGiven)
            if (anyCompleted) {
              setVideoCompleted(true)
              setVideoCompletionBonusGiven(true)
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load learning progress", err)
      } finally {
        setLoadingProgress(false)
      }
    }
    loadProgress()
  }, [userId, unitId])

  // Load mission data
  useEffect(() => {
    const defaultTxList = activeUnit?.transmissions?.length > 0 
      ? activeUnit.transmissions 
      : (activeUnit?.videoConfig?.videoId ? [{
          id: 'legacy_tx',
          title: 'Main Transmission',
          videoId: activeUnit.videoConfig.videoId,
          start: activeUnit.videoConfig.start,
          end: activeUnit.videoConfig.end
        }] : [])

    setMissionData({
      title: activeUnit?.title || "Unknown Mission",
      videoConfig: activeUnit?.videoConfig || null,
      transmissions: defaultTxList,
      learningContents: activeUnit?.learningContents || null
    })
    setSelectedTx(null) 
  }, [unitId, activeUnit])

  // Smart routing is now handled by SpaceHome via initialMode prop (no flash)
  // Helper: when exiting content, go back to SpaceHome if single-content unit
  const returnFromContent = useCallback(() => {
    setSelectedTx(null) // Reset transmission selection
    setShowFieldTestModal(false) // Reset quiz modal
    if (initialMode !== 'briefing') {
      // Single-content unit — go directly back to SpaceHome
      onBack()
    } else {
      setCurrentMode('briefing')
    }
  }, [initialMode, onBack])

  const logActivity = async (actionStr) => {
    if (!userId) return;
    try {
        const logId = `${Date.now()}_${Math.random().toString(36).substring(2,7)}`
        const logRef = doc(db, 'users', userId, 'activityLogs', logId)
        await setDoc(logRef, {
           action: actionStr,
           unitId: unitId || 'unknown_unit',
           timestamp: serverTimestamp()
        })
    } catch (err) {
        console.warn("Failed to log activity", err)
    }
  }

  // ─── Silent Toast helper ───
  const showSilentToast = useCallback((amount) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastAmount(amount)
    setToastVisible(true)
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false)
    }, 2500)
  }, [])

  // ─── Data Log Timer Logic ───
  useEffect(() => {
    if (currentMode !== 'text') return
    if (logRewardClaimed) return

    // Restore from sessionStorage
    const savedTimer = sessionStorage.getItem(sessionStorageKey)
    if (savedTimer) {
      const saved = JSON.parse(savedTimer)
      const elapsed = (Date.now() - saved.timestamp) / 1000
      if (elapsed < 60) { // Within 1 minute, restore
        setTimeRemaining(Math.max(0, saved.remaining))
      }
    }

    setLogTimerActive(true)
    return () => setLogTimerActive(false)
  }, [currentMode, logRewardClaimed, sessionStorageKey])

  useEffect(() => {
    if (!logTimerActive || timeRemaining <= 0) return

    const tick = () => {
      setTimeRemaining(prev => {
        const next = Math.max(0, prev - 1)
        // Save to sessionStorage every 5 seconds
        if (next % 5 === 0) {
          sessionStorage.setItem(sessionStorageKey, JSON.stringify({
            remaining: next,
            timestamp: Date.now()
          }))
        }
        return next
      })
    }

    timerRef.current = setInterval(tick, 1000)

    // Page Visibility API - pause timer when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        // Resume
        timerRef.current = setInterval(tick, 1000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [logTimerActive, timeRemaining, sessionStorageKey])

  // ─── Data Log: Claim reward ───
  const handleClaimLogReward = async () => {
    if (logRewardClaimed || timeRemaining > 0 || !userId) return

    try {
      // Save to Firestore
      const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
      await setDoc(progressRef, {
        logRead: true,
        logReadAt: serverTimestamp()
      }, { merge: true })

      // Award crystals and growth metrics
      const updates = {
        crystals: increment(30),
        totalQuizzes: increment(1),
        totalScore: increment(100)
      }
      
      const growthUpdates = calculateGrowthUpdates(userData, 30)
      Object.assign(updates, growthUpdates)

      await setDoc(doc(db, 'users', userId), updates, { merge: true })

      // Record transaction
      await recordCrystalTransaction(userId, {
        amount: 30,
        type: 'data_log_reward',
        description: `${activeUnit?.title || '단원'} 데이터 로그 학습 완료`,
        metadata: { unitId }
      })

      setLogRewardClaimed(true)
      sessionStorage.removeItem(sessionStorageKey)
      showSilentToast(30)
      logActivity('data_log_reward_claimed')
      
      // Update Streak
      if (onNonQuizActivityComplete) {
        onNonQuizActivityComplete('데이터 로그 학습', 30)
      }
    } catch (err) {
      console.error("Failed to claim log reward:", err)
    }
  }

  // ─── Transmission: Bitset stamp tracking ───
  const handleVideoTimeUpdate = useCallback(({ currentTime, duration, playbackRate }) => {
    if (!selectedTx || !userId) return

    const currentSecond = Math.floor(currentTime)
    const lastSecond = Math.floor(lastVideoTimeRef.current)
    lastVideoTimeRef.current = currentTime
    if (duration > 0) videoDurationRef.current = duration

    // Track actual playback time (always increases, for analytics)
    totalTimeSpentRef.current += 1 // Called every 1 second

    // Calculate gap between polls
    const gap = currentSecond - lastSecond
    // Max reasonable gap for speed playback (allows up to ~3x speed)
    // Skip detection: gaps > 5 seconds are treated as timeline jumps
    const MAX_NORMAL_GAP = 5

    let newStampsAdded = false

    if (gap > 0 && gap <= MAX_NORMAL_GAP) {
      // Normal playback (including speed) — stamp ALL seconds in range
      for (let s = lastSecond + 1; s <= currentSecond; s++) {
        if (!stampedSetRef.current.has(s)) {
          stampedSetRef.current.add(s)
          newStampCountRef.current++
          newStampsAdded = true
        }
      }
    } else {
      // Skip detected (gap > 5) OR backwards seek (gap <= 0) OR first poll
      // Only stamp the current second
      if (!stampedSetRef.current.has(currentSecond)) {
        stampedSetRef.current.add(currentSecond)
        newStampCountRef.current++
        newStampsAdded = true
      }
    }

    if (newStampsAdded) {
      setStampCount(stampedSetRef.current.size)
    }

    // Check completion: 90%+ of video seconds stamped
    if (duration > 0) {
      const totalSeconds = Math.floor(duration)
      const coverage = stampedSetRef.current.size / totalSeconds
      if (coverage >= 0.9) {
        setVideoCompleted(true)
      }
    }

    // Auto-reward: every 180 NEW stamps = 10 crystals (with cap)
    if (newStampCountRef.current >= 180) {
      // Reward cap: max crystals = Math.floor(duration / 180) * 10
      const maxIntervalRewards = duration > 0 ? Math.floor(duration / 180) * 10 : Infinity
      if (totalRewardedCrystalsRef.current >= maxIntervalRewards) {
        newStampCountRef.current = 0 // Reset but don't reward
        return
      }

      const reward = 10
      newStampCountRef.current -= 180
      totalRewardedCrystalsRef.current += reward
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      
      const txId = selectedTx.id || 'default'

      const awardReward = async () => {
        try {
          const updates = { crystals: increment(reward) };
          const growthUpdates = calculateGrowthUpdates(userData, reward);
          Object.assign(updates, growthUpdates);

          await setDoc(doc(db, 'users', userId), updates, { merge: true })

          await recordCrystalTransaction(userId, {
            amount: reward,
            type: 'transmission_reward',
            description: `${activeUnit?.title || '영상'} 시청 보상 (${stampedSetRef.current.size}초 학습)`,
            metadata: { unitId, transmissionId: txId }
          })

          const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
          await setDoc(progressRef, {
            videoProgress: {
              [txId]: {
                stampedSeconds: Array.from(stampedSetRef.current),
                rewardedStampCount: stampedSetRef.current.size - newStampCountRef.current,
                totalRewardedCrystals: totalRewardedCrystalsRef.current,
                totalTimeSpent: totalTimeSpentRef.current,
                updatedAt: serverTimestamp()
              }
            }
          }, { merge: true })

          showSilentToast(reward)
          
          // Update Streak on partial watch (180s)
          if (onNonQuizActivityComplete) {
            onNonQuizActivityComplete('영상 교신 수신 (180초)', 10)
          }
        } catch (err) {
          console.error("Failed to award transmission reward:", err)
        }
      }
      awardReward()
    }
  }, [selectedTx, userId, unitId])

  // ─── Transmission: Completion bonus ───
  useEffect(() => {
    if (!videoCompleted || videoCompletionBonusGiven || !userId || !selectedTx) return

    const txId = selectedTx.id || 'default'
    const savedProgress = learningProgress?.videoProgress?.[txId]
    if (savedProgress?.completionBonusGiven) {
      setVideoCompletionBonusGiven(true)
      return // Already given
    }

    const awardCompletion = async () => {
      try {
        const updates = {
          crystals: increment(20),
          totalQuizzes: increment(1),
          totalScore: increment(100)
        }
        
        const growthUpdates = calculateGrowthUpdates(userData, 20)
        Object.assign(updates, growthUpdates)

        await setDoc(doc(db, 'users', userId), updates, { merge: true })

        await recordCrystalTransaction(userId, {
          amount: 20,
          type: 'transmission_reward',
          description: `${activeUnit?.title || '영상'} 시청 완료 보너스`,
          metadata: { unitId, transmissionId: txId, type: 'completion_bonus' }
        })

        const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
        await setDoc(progressRef, {
          videoProgress: {
            [txId]: {
              completed: true,
              completionBonusGiven: true,
              updatedAt: serverTimestamp()
            }
          }
        }, { merge: true })

        setVideoCompletionBonusGiven(true)
        showSilentToast(20)
        
        // Update Streak on full view
        if (onNonQuizActivityComplete) {
          onNonQuizActivityComplete('영상 교신 완료', 20)
        }
      } catch (err) {
        console.error("Failed to award completion bonus:", err)
      }
    }
    awardCompletion()
  }, [videoCompleted, videoCompletionBonusGiven, userId, selectedTx])

  // ─── Transmission: Save position ("오늘은 여기까지") ───
  const handleSaveVideoPosition = async () => {
    if (!userId || !selectedTx) {
      setSelectedTx(null)
      returnFromContent()
      return
    }
    const txId = selectedTx.id || 'default'

    try {
      const savedPosition = Math.floor(lastVideoTimeRef.current || 0)
      const stamps = Array.from(stampedSetRef.current)
      
      const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
      await setDoc(progressRef, {
        videoProgress: {
          [txId]: {
            lastPosition: savedPosition,
            stampedSeconds: stamps,
            rewardedStampCount: stamps.length - newStampCountRef.current,
            totalRewardedCrystals: totalRewardedCrystalsRef.current,
            totalTimeSpent: totalTimeSpentRef.current,
            updatedAt: serverTimestamp()
          }
        }
      }, { merge: true })

      // Update local state
      setLearningProgress(prev => ({
        ...prev,
        videoProgress: {
          ...(prev?.videoProgress || {}),
          [txId]: {
            ...(prev?.videoProgress?.[txId] || {}),
            lastPosition: savedPosition,
            stampedSeconds: stamps,
            rewardedStampCount: stamps.length - newStampCountRef.current,
            totalRewardedCrystals: totalRewardedCrystalsRef.current,
            totalTimeSpent: totalTimeSpentRef.current
          }
        }
      }))

      showSilentToast(0)
    } catch (err) {
      console.error("Failed to save video position:", err)
    }

    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    setTimeout(() => {
      setSelectedTx(null)
      returnFromContent()
    }, 1200)
  }

  // ─── Reset video tracking when switching transmissions ───
  useEffect(() => {
    if (selectedTx) {
      const txId = selectedTx.id || 'default'
      const savedProgress = learningProgress?.videoProgress?.[txId]
      
      // Restore stamped set from Firestore
      const savedStamps = savedProgress?.stampedSeconds || []
      stampedSetRef.current = new Set(savedStamps)
      const rewardedCount = savedProgress?.rewardedStampCount || 0
      newStampCountRef.current = Math.max(0, savedStamps.length - rewardedCount)
      setStampCount(savedStamps.length)
      
      // Restore analytics and reward tracking
      totalTimeSpentRef.current = savedProgress?.totalTimeSpent || 0
      totalRewardedCrystalsRef.current = savedProgress?.totalRewardedCrystals || 0
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      videoDurationRef.current = 0 // Will be set by first onTimeUpdate
      
      setVideoCompleted(savedProgress?.completed || false)
      setIsAtEnd(false) // Reset end detection when switching/reloading tx
      setVideoCompletionBonusGiven(savedProgress?.completionBonusGiven || false)
      lastVideoTimeRef.current = savedProgress?.lastPosition || 0

      // Auto-save every 10 seconds
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
      if (userId) {
        autoSaveIntervalRef.current = setInterval(async () => {
          try {
            const pos = Math.floor(lastVideoTimeRef.current || 0)
            if (pos > 0) {
              const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
              await setDoc(progressRef, {
                videoProgress: {
                  [txId]: {
                    lastPosition: pos,
                    totalTimeSpent: totalTimeSpentRef.current,
                    updatedAt: serverTimestamp()
                  }
                }
              }, { merge: true })
            }
          } catch (err) {
            console.warn("Auto-save failed:", err)
          }
        }, 10000) // Every 10 seconds
      }
    }

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    }
  }, [selectedTx?.id, userId, unitId])

  const handleModeChange = (mode) => {
    soundManager.playClick()
    if (mode === 'quiz') {
      // Show RewardPotentialModal before entering quiz
      setShowFieldTestModal(true)
      return
    }
    setCurrentMode(mode)
    if (mode === 'text' || mode === 'video') {
       logActivity(`view_${mode}`)
    }
  }

  // ─── Computed: completion status for dashboard cards ───
  const logCompleted = logRewardClaimed || learningProgress?.logRead || false
  const txCompleted = videoCompletionBonusGiven || 
    (learningProgress?.videoProgress && Object.values(learningProgress.videoProgress).some(v => v.completionBonusGiven)) || false
  const quizCompleted = bestScores[unitId] !== undefined
  const workbookCompleted = bestScores[`${unitId}_workbook`] !== undefined

  // --- Render Functions ---

  const renderDashboard = () => {
    const hasDataLog = !!(missionData?.learningContents?.text?.trim())
    const hasTransmission = !!(missionData?.transmissions?.length > 0 && missionData.transmissions.some(tx => tx.videoId))
    const hasQuiz = !!(unitQuizzes && unitQuizzes.length > 0)
    const hasWorkbook = !!(activeUnit?.workbookPages && activeUnit.workbookPages.length > 0)
    const availableCount = [hasDataLog, hasTransmission, hasQuiz, hasWorkbook].filter(Boolean).length

    return (
    <div className="mission-dashboard fade-in">
      <h2 className="font-title" style={{ 
        textAlign: 'center', 
        fontSize: '2rem', 
        marginBottom: '2rem',
        textShadow: '0 0 10px var(--crystal-cyan)'
      }}>
        MISSION CONTROL: {activeUnit?.title || "비밀 작전 구역"}
      </h2>

      {availableCount === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <h3 className="font-title" style={{ color: 'var(--text-muted)' }}>등록된 콘텐츠가 없습니다.</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>이 단원에는 아직 학습 자료가 등록되지 않았습니다.</p>
        </div>
      ) : (
      <div className="mission-grid" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(availableCount, 4)}, minmax(240px, 1fr))`,
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* 1. Data Log Card */}
        {hasDataLog && (
        <motion.div 
          whileHover={{ scale: 1.03, y: -5 }}
          className="glass-card hud-border"
          onClick={() => handleModeChange('text')}
          style={{ 
            cursor: 'pointer', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            background: logCompleted ? 'rgba(0, 243, 255, 0.08)' : undefined,
            borderColor: logCompleted ? 'var(--crystal-cyan)' : undefined,
            position: 'relative'
          }}
        >
          {logCompleted && (
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
          )}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '1rem' }}>DATA LOG</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
            핵심 개념과 공식을<br/>확인합니다.
          </p>
          {logCompleted && (
            <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>탐사 완료</span>
          )}
        </motion.div>
        )}

        {/* 2. Transmission Feed Card */}
        {hasTransmission && (
        <motion.div 
          whileHover={{ scale: 1.03, y: -5 }}
          className="glass-card hud-border"
          onClick={() => handleModeChange('video')}
          style={{ 
            cursor: 'pointer', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            background: txCompleted ? 'rgba(0, 255, 136, 0.08)' : undefined,
            borderColor: txCompleted ? 'var(--planet-green)' : undefined,
            position: 'relative'
          }}
        >
          {txCompleted && (
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
          )}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
          <h3 className="font-title" style={{ color: 'var(--planet-green)', marginBottom: '1rem' }}>TRANSMISSION</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
            본부의 영상 브리핑을<br/>수신합니다.
          </p>
          {txCompleted && (
            <span className="font-tech" style={{ color: 'var(--planet-green)', fontSize: '0.8rem', marginTop: '0.5rem' }}>수신 완료</span>
          )}
        </motion.div>
        )}

        {/* 3. Workbook Card */}
        {hasWorkbook && (
        <motion.div 
          whileHover={{ scale: 1.03, y: -5 }}
          className="glass-card hud-border"
          onClick={() => handleModeChange('workbook')}
          style={{ 
            cursor: 'pointer', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', 
            border: workbookCompleted ? '1px solid var(--neon-blue)' : '1px solid var(--neon-blue)',
            background: workbookCompleted ? 'rgba(0, 243, 255, 0.08)' : undefined,
            position: 'relative'
          }}
        >
          {workbookCompleted && (
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
          )}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 className="font-title" style={{ color: 'var(--neon-blue)', marginBottom: '1rem' }}>WORKBOOK</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
            상호작용 캔버스로<br/>실력을 검증합니다.
          </p>
          {workbookCompleted && (
            <span className="font-tech" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              BEST: {bestScores[`${unitId}_workbook`]}점
            </span>
          )}
        </motion.div>
        )}

        {/* 4. Field Test Card */}
        {hasQuiz && (
        <motion.div 
          whileHover={{ scale: 1.03, y: -5 }}
          className="glass-card hud-border"
          onClick={() => handleModeChange('quiz')}
          style={{ 
            cursor: 'pointer', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', 
            border: quizCompleted ? '1px solid var(--star-gold)' : '1px solid var(--star-gold)',
            background: quizCompleted ? 'rgba(255, 215, 0, 0.08)' : undefined,
            position: 'relative'
          }}
        >
          {quizCompleted && (
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
          )}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h3 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '1rem' }}>FIELD TEST</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
            실전 퀴즈 탐사를<br/>시작합니다.
          </p>
          {quizCompleted && (
            <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              BEST: {bestScores[unitId]}점
            </span>
          )}
        </motion.div>
        )}
      </div>
      )}

      <button 
        onClick={onBack}
        className="hud-btn secondary glass"
        style={{ 
          marginTop: '4rem', 
          padding: '1rem 3rem',
          display: 'block',
          margin: '4rem auto 0'
        }}
      >
        ← RETURN TO ORBIT
      </button>
    </div>
  )
  }
  const renderTextView = () => (
    <div className="mission-content-view fade-in" style={{ maxWidth: '960px', width: '95%', margin: '0 auto', padding: '1rem', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      <div className="glass-card" style={{ padding: '2.5rem 3rem', background: 'rgba(5, 10, 25, 0.9)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h2 className="font-title" style={{ fontSize: '1.8rem', color: 'var(--crystal-cyan)' }}>DATA LOG: {activeUnit?.title}</h2>
          <button onClick={returnFromContent} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="markdown-body font-tech" style={{ color: 'var(--text-bright)', lineHeight: '1.8' }}>
          <MissionMarkdownViewer text={missionData?.learningContents?.text} />
        </div>

        {/* ─── Data Log Reward Button ─── */}
        <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          {logRewardClaimed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--crystal-cyan)' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <span className="font-tech" style={{ fontSize: '1.1rem' }}>데이터 분석 완료 (보상 수령됨)</span>
            </div>
          ) : timeRemaining > 0 ? (
            <button
              disabled
              className="hud-btn glass"
              style={{
                padding: '1rem 3rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text-muted)',
                borderRadius: '10px',
                cursor: 'not-allowed',
                fontSize: '1rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <span className="font-tech">데이터 분석 중... ({timeRemaining}s)</span>
              {/* Progress bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                width: `${((60 - timeRemaining) / 60) * 100}%`,
                background: 'var(--crystal-cyan)',
                transition: 'width 1s linear'
              }} />
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaimLogReward}
              className="hud-btn primary glass"
              style={{
                padding: '1rem 3rem',
                background: 'rgba(0, 243, 255, 0.2)',
                border: '2px solid var(--crystal-cyan)',
                color: 'var(--text-bright)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 700
              }}
            >
              💎 학습 완료 · 보상 받기 (+30 광석)
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )

  const renderVideoView = () => {
    const txList = missionData?.transmissions || []
    
    if (txList.length === 0) {
       return (
         <div className="mission-content-view fade-in" style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h3 className="font-title" style={{ color: 'var(--alert-red)' }}>NO TRANSMISSION FOUND</h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)' }}>등록된 영상 데이터 칩이 없습니다.</p>
                <button onClick={returnFromContent} className="hud-btn secondary glass" style={{ marginTop: '2rem' }}>RETURN TO ORBIT</button>
            </div>
         </div>
       )
    }

    if (!selectedTx && txList.length === 1) {
       // Use effect-safe approach instead of setState during render
       Promise.resolve().then(() => setSelectedTx(txList[0]))
       return null
    }

    if (selectedTx) {
      // Get saved position for resume
      const txId = selectedTx.id || 'default'
      const savedProgress = learningProgress?.videoProgress?.[txId]
      const startPosition = savedProgress?.lastPosition || selectedTx.start

      return (
        <div className="mission-content-view fade-in" style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <h3 className="font-title" style={{ margin: 0, color: 'var(--planet-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📡</span> {selectedTx.title}
             </h3>
             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
               {/* Watch progress indicator */}
               {stampCount > 0 && (
                 <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                   학습: {Math.floor(stampCount / 60)}분 {stampCount % 60}초
                 </span>
               )}
               <button 
                 onClick={returnFromContent} 
                 style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-tech)', fontSize: '0.85rem' }}
               >
                 ← BACK
               </button>
             </div>
          </div>
          <div className="glass-card" style={{ width: '90%', maxWidth: '1000px', aspectRatio: '16/9', padding: '5px', background: 'rgba(0,0,0,0.5)' }}>
             <YoutubePlayer 
                key={`${selectedTx.videoId}_${startPosition}`}
                videoId={selectedTx.videoId}
                start={startPosition}
                end={selectedTx.end}
                onTimeUpdate={handleVideoTimeUpdate}
                onComplete={() => setIsAtEnd(true)}
             />
          </div>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button 
              onClick={handleSaveVideoPosition}
              className="hud-btn secondary glass"
              style={{ 
                padding: '1rem 3rem', 
                fontSize: '1.1rem',
                borderColor: videoCompleted ? 'var(--planet-green)' : (isAtEnd ? 'var(--alert-red)' : undefined),
                background: videoCompleted ? 'rgba(0, 255, 136, 0.1)' : (isAtEnd ? 'rgba(255, 77, 77, 0.1)' : undefined),
                color: isAtEnd && !videoCompleted ? '#ffb3b3' : 'white'
              }}
            >
              {videoCompleted ? (
                <>✨ 완료하고, {totalRewardedCrystals + (videoCompletionBonusGiven ? 20 : 0)}광석 획득하기</>
              ) : isAtEnd ? (
                <>⚠️ 데이터 수신 부족 ({Math.min(100, Math.floor((stampCount / (videoDurationRef.current || Math.max(stampCount, 1))) * 100))}%)</>
              ) : (
                <>📋 오늘은 여기까지</>
              )}
            </button>
            {isAtEnd && !videoCompleted && (
              <p className="font-tech" style={{ color: 'var(--alert-red)', marginTop: '1rem', fontSize: '0.9rem' }}>
                통신 장애! 영상의 90% 이상을 탐사해야 보너스 수신이 가능합니다.
              </p>
            )}
          </div>
        </div>
      )
    }

    // Render list
    return (
      <div className="mission-content-view fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', paddingTop: '2rem' }}>
         <h2 className="font-title" style={{ textAlign: 'center', color: 'var(--planet-green)', marginBottom: '2rem', fontSize: '2rem' }}>TRANSMISSION DATA CHIPS</h2>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
             {txList.map((tx, idx) => {
                 const txId = tx.id || 'default'
                 const txProgress = learningProgress?.videoProgress?.[txId]
                 const isTxCompleted = txProgress?.completionBonusGiven
                 return (
                   <motion.div 
                      key={tx.id}
                      whileHover={{ scale: 1.02, y: -5, borderColor: 'var(--planet-green)' }}
                      onClick={() => setSelectedTx(tx)}
                      className="glass-card"
                      style={{ 
                        cursor: 'pointer', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', 
                        border: isTxCompleted ? '1px solid var(--planet-green)' : '1px solid rgba(255,255,255,0.1)', 
                        background: isTxCompleted ? 'rgba(0, 255, 136, 0.06)' : 'rgba(10, 20, 40, 0.6)',
                        position: 'relative'
                      }}
                   >
                       {isTxCompleted && (
                         <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '1rem' }}>✅</div>
                       )}
                       <div style={{ fontSize: '2.5rem' }}>📼</div>
                       <div>
                           <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-tech)', marginBottom: '0.2rem' }}>DATA CHIP #{idx + 1}</div>
                           <div style={{ color: 'var(--text-bright)', fontWeight: 'bold', fontSize: '1.1rem' }}>{tx.title || `영상 ${idx + 1}`}</div>
                           {txProgress?.lastPosition > 0 && !isTxCompleted && (
                             <div style={{ color: 'var(--crystal-cyan)', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', marginTop: '0.3rem' }}>
                               ▶ {Math.floor(txProgress.lastPosition / 60)}:{String(Math.floor(txProgress.lastPosition % 60)).padStart(2, '0')}부터 이어보기
                             </div>
                           )}
                       </div>
                   </motion.div>
                 )
             })}
         </div>
         <div style={{ textAlign: 'center', marginTop: '3rem' }}>
             <button onClick={returnFromContent} className="hud-btn secondary glass" style={{ padding: '1rem 3rem' }}>← RETURN TO ORBIT</button>
         </div>
      </div>
    )
  }

  // --- Overlay Logic ---
  const handleRequestSupport = (reference) => {
    setShowOverlay(true)
    if (reference?.transmissionId) {
      setOverlayContent('video')
      setOverlayReference(reference)
    } else {
      setOverlayContent('text')
    }
    logActivity('overlay_view_' + (reference?.transmissionId ? 'video' : 'text'))
  }

  // If in workbook mode, we render the WorkbookPlayer directly
  if (currentMode === 'workbook') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, background: '#050a19' }}>
        <WorkbookPlayer 
          pages={activeUnit?.workbookPages || []} 
          unitId={unitId}
          unitTitle={activeUnit?.title}
          onComplete={onComplete}
          onClose={returnFromContent}
        />
      </div>
    )
  }

  // If in quiz mode, we render SpaceQuizView BUT we wrap it to handle the overlay
  if (currentMode === 'quiz') {
    // Show loading state if quizzes not ready
    if (loadingQuizzes) {
      return (
        <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--crystal-cyan)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ fontSize: '3rem' }}>🛰️</motion.div>
            <div className="font-tech" style={{ marginTop: '1rem' }}>데이터 수신 중 (LOADING QUIZ)...</div>
          </div>
        </div>
      )
    }

    if (errorQuizzes) {
      return (
        <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <div className="font-title" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff4d4d' }}>통신 오류</div>
            <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>퀴즈 데이터를 불러오지 못했습니다.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => refetchQuizzes?.()} className="hud-btn primary glass" style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,243,255,0.2)', border: '1px solid var(--neon-blue)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>다시 시도</button>
              <button onClick={returnFromContent} className="hud-btn secondary glass" style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>나가기</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <SpaceQuizView
          region={null}
          quizData={{
            unitId: unitId,
            chapterId: activeUnit?.chapterId,
            title: activeUnit?.title,
            questions: unitQuizzes || [] 
          }}
          hasShield={userData?.shieldCharges || 0}
          hasRadar={userData?.hasRadar || false}
          isRadarBonus={false}
          onComplete={onComplete}
          onExit={returnFromContent}
          onRequestSupport={handleRequestSupport}
          {...activeUnit}
        />
        
        {/* Support Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: '600px',
                height: '100vh',
                background: 'rgba(5, 10, 25, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 10000,
                borderLeft: '2px solid var(--neon-blue)',
                padding: '2rem',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
              }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 className="font-title" style={{ fontSize: '1.5rem', color: 'var(--crystal-cyan)' }}>DATA LINK</h3>
                  <button onClick={() => setShowOverlay(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
               </div>

               <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button 
                    onClick={() => { setOverlayContent('text'); logActivity('overlay_view_text'); }}
                    style={{ 
                        flex: 1, padding: '0.8rem', 
                        background: overlayContent === 'text' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)',
                        color: overlayContent === 'text' ? 'black' : 'white',
                        border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    DATA LOG
                  </button>
                  <button 
                    onClick={() => { setOverlayContent('video'); logActivity('overlay_view_video'); }}
                    style={{ 
                        flex: 1, padding: '0.8rem', 
                        background: overlayContent === 'video' ? 'var(--planet-green)' : 'rgba(255,255,255,0.1)',
                        color: overlayContent === 'video' ? 'black' : 'white',
                        border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    VIDEO FEED
                  </button>
               </div>

               <div style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  {overlayContent === 'text' ? (
                      <div className="markdown-body font-tech" style={{ color: 'var(--text-bright)', lineHeight: '1.6' }}>
                          <MissionMarkdownViewer text={missionData?.learningContents?.text} />
                      </div>
                  ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ width: '100%', aspectRatio: '16/9' }}>
                              {(() => {
                                   const txList = missionData?.transmissions || [];
                                  if (txList.length === 0) {
                                      return (
                                          <div style={{ width: '100%', height: '100%', background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'gray' }}>
                                              No video available
                                          </div>
                                      );
                                  }
                                  
                                  // Case 1: Specific mapping info exists
                                  if (overlayReference?.transmissionId) {
                                      const targetTx = txList.find(t => t.id === overlayReference.transmissionId);
                                      if (targetTx) {
                                          return (
                                              <YoutubePlayer 
                                                  videoId={targetTx.videoId}
                                                  start={overlayReference.timestamp || targetTx.start}
                                                  end={targetTx.end}
                                                  isOverlay={true}
                                              />
                                          );
                                      }
                                  }

                                  // Case 2: No specific mapping - Show all videos in a list
                                  return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                          {txList.map((tx, idx) => (
                                              <div key={tx.id || idx}>
                                                  <div style={{ color: 'var(--planet-green)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                                      #{idx + 1} {tx.title || `영상 ${idx + 1}`}
                                                  </div>
                                                  <div style={{ width: '100%', aspectRatio: '16/9' }}>
                                                      <YoutubePlayer 
                                                          videoId={tx.videoId}
                                                          start={tx.start}
                                                          end={tx.end}
                                                          isOverlay={true}
                                                          autoPlay={false}
                                                      />
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  );
                              })()}
                          </div>
                      </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div className="mission-hub-container space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000 }}>
       <AnimatePresence mode='wait'>
          {currentMode === 'briefing' && (
             <motion.div key="briefing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderDashboard()}
             </motion.div>
          )}
          {currentMode === 'text' && (
             <motion.div key="text" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} style={{ paddingTop: '100px' }}>
                {renderTextView()}
             </motion.div>
          )}
          {currentMode === 'video' && (
             <motion.div key="video" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ paddingTop: '100px' }}>
                {renderVideoView()}
             </motion.div>
          )}
       </AnimatePresence>

       {/* Silent Crystal Toast */}
       <SilentCrystalToast amount={toastAmount} visible={toastVisible} />

       {/* Field Test Reward Potential Modal */}
       <AnimatePresence>
         {showFieldTestModal && (
           <RewardPotentialModal
             unit={{
               title: activeUnit?.title,
               bestScore: bestScores[unitId]
             }}
             onCancel={() => {
               const hasDataLog = !!(missionData?.learningContents?.text?.trim())
               const hasTransmission = !!(missionData?.transmissions?.length > 0 && missionData.transmissions.some(tx => tx.videoId))
               if (!hasDataLog && !hasTransmission) {
                 // Quiz-only unit — cancel goes back to SpaceHome
                 onBack()
               } else {
                 setShowFieldTestModal(false)
               }
             }}
             onConfirm={() => {
               setShowFieldTestModal(false)
               setCurrentMode('quiz')
               soundManager.playWarp()
             }}
           />
         )}
       </AnimatePresence>
    </div>
  )
}
