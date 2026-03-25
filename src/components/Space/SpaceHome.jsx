import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, db } from '../../firebase'
import { signInWithPopup } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, where, getDocs, writeBatch, increment, limit, runTransaction, Timestamp } from 'firebase/firestore'
import { useClusters, useRegions, useChapters, useUnits, useUnit, useQuizzes } from '../../hooks/useContent'
import { useAuth } from '../../hooks/useAuth'
// import { regions as localRegions } from '../../data/regions'
import { motion as Motion, AnimatePresence } from 'framer-motion' // Added Framer Motion

// Space Components
import StarField from './StarField'
import ClusterSelector from './ClusterSelector'
import Planet3D from './Planet3D' // Keep for Login Screen
import SpaceScene from './SpaceScene' // New 3D Scene
import SpaceQuizView from './SpaceQuizView'
import MissionHub from './MissionHub' // New Integration
import SpaceDashboard from './SpaceDashboard'
import SpaceCollection from './SpaceCollection'
import SpaceStore from './SpaceStore'
import SpaceRanking from './SpaceRanking'
import SpaceJourney from './SpaceJourney'
import CrystalLedger from './CrystalLedger'
import RegionAccessModal from './RegionAccessModal' // New Integration
import AssignmentHub from './AssignmentHub' // New Integration
import SectorLeaderboard from './SectorLeaderboard' // Leaderboard Integration
import MissionLeaderboard from './MissionLeaderboard' // Leaderboard Integration

// import { useParticles, createParticleBurst } from './ParticleEffects'
import { calculateStreakUpdate, getTodayKST } from '../../utils/streakUtils'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'
import { StreakCelebrationModal, StreakToast } from './StreakCelebration'

import soundManager from '../../utils/SoundManager'
import SpaceNavbar from './SpaceNavbar'
import Footer from '../common/Footer'

// Styles
import '../../styles/space-theme.css'

function SpaceHome() {
  // const navigate = useNavigate()
  const location = useLocation()
  const { user, userData, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentView, setCurrentView] = useState('planet') // 'planet', 'dashboard', 'collection', 'assignment_hub'
  
  // Selection State (Persist ID in session)
  const [selectedClusterId, setSelectedClusterId] = useState(() => {
    return sessionStorage.getItem('metasense_cluster_id') || null;
  });
  
  const [selectedRegionId, internalSetSelectedRegionId] = useState(() => {
    return sessionStorage.getItem('metasense_region_id') || null;
  });

  const [selectedChapterDocId, internalSetSelectedChapterDocId] = useState(() => {
    return sessionStorage.getItem('metasense_chapter_id') || null;
  });

  const [selectedUnitDocId, internalSetSelectedUnitDocId] = useState(() => {
    return sessionStorage.getItem('metasense_unit_id') || null;
  });

  // Specialized setters to persist
  const updateSelectedClusterId = (id) => {
    setSelectedClusterId(id);
    if (id) sessionStorage.setItem('metasense_cluster_id', id);
    else sessionStorage.removeItem('metasense_cluster_id');
  };

  const updateSelectedRegionId = (id) => {
    internalSetSelectedRegionId(id);
    if (id) sessionStorage.setItem('metasense_region_id', id);
    else sessionStorage.removeItem('metasense_region_id');
  };

  const updateSelectedChapterDocId = (id) => {
    internalSetSelectedChapterDocId(id);
    if (id) sessionStorage.setItem('metasense_chapter_id', id);
    else sessionStorage.removeItem('metasense_chapter_id');
  };

  const updateSelectedUnitDocId = (id) => {
    internalSetSelectedUnitDocId(id);
    if (id) sessionStorage.setItem('metasense_unit_id', id);
    else sessionStorage.removeItem('metasense_unit_id');
  };
  const [quickQuizUnitId, setQuickQuizUnitId] = useState(null) // New: Dashboard quick quiz
  const [quickQuizMode, setQuickQuizMode] = useState(null) // New: Mode for quick quiz

  const handleBackFromMission = useCallback(() => {
    updateSelectedUnitDocId(null);
    setQuickQuizUnitId(null);
    setQuickQuizMode(null);
  }, []);
  // Region Access State
  const [pendingRegion, setPendingRegion] = useState(null)
  const [accessError, setAccessError] = useState(null)
  const [verifyingCode, setVerifyingCode] = useState(false)
  
  // --- Memory Core State ---
  const [isMemoryCoreMode, setIsMemoryCoreMode] = useState(false)
  const [memoryCoreQuestions, setMemoryCoreQuestions] = useState([])
  const [loadingMemoryCore, setLoadingMemoryCore] = useState(false)

  // Sync view from location state (e.g. when coming from Agora)
  useEffect(() => {
    if (location.state?.view) {
      setCurrentView(location.state.view)
      updateSelectedRegionId(null)
      updateSelectedChapterDocId(null)
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Data Hooks
  const { data: clusters, isLoading: loadingClusters } = useClusters()
  
  const activeClusters = useMemo(() => {
    if (loadingClusters) return [];
    
    let list = clusters || [];
    if (list.length === 0) {
      // Fallback only if really empty after loading
      list = [{ id: 'cluster_elementary', docId: 'cluster_elementary', name: '초등수학', isPrivate: false, order: 0 }];
    }
    const access = userData?.clusterAccess || { cluster_elementary: 'active' };
    
    // Admin can see all clusters
    if (userData?.role === 'admin') return list;
    
    // Logic: 
    // 1. Show all public clusters (isPrivate: false)
    // 2. Show private clusters if user has 'active' access in clusterAccess
    return list.filter(c => {
      if (!c.isPrivate) return true;
      return access[c.docId] === 'active' || access[c.id] === 'active';
    });
  }, [clusters, userData, loadingClusters]);

  useEffect(() => {
    // Only auto-select if we have exactly one cluster AND it's not loading
    if (!loadingClusters && activeClusters.length === 1 && !selectedClusterId) {
      setSelectedClusterId(activeClusters[0].docId || activeClusters[0].id);
    }
  }, [activeClusters, selectedClusterId, loadingClusters]);

  const { data: regions, isLoading: loadingRegions, isError: errorRegions } = useRegions(selectedClusterId)
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  const { data: singleUnit } = useUnit(selectedUnitDocId || quickQuizUnitId)
  const { 
    data: unitQuizzes, 
    isLoading: loadingQuizzes, 
    isError: errorQuizzes, 
    refetch: refetchQuizzes 
  } = useQuizzes(selectedUnitDocId || quickQuizUnitId)

  // Fetch all units for all chapters in the selected region to calculate progress
  // Uses the same queryKey ['units', chapterId] as useUnits() to share cache
  const chapterUnitResults = useQueries({
    queries: (chapters || []).map(chapter => ({
      queryKey: ['units', chapter.docId],
      queryFn: async () => {
        const q = query(collection(db, 'units'), where('chapterId', '==', chapter.docId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ ...d.data(), docId: d.id }));
        return data.sort((a, b) => (a.order || 0) - (b.order || 0));
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes garbage collection
      enabled: !!chapter.docId
    }))
  })

  // Active selections
  const activeRegion = regions?.find(r => r.id === selectedRegionId)
  const activeChapter = chapters?.find(c => c.docId === selectedChapterDocId)
  const activeUnit = units?.find(u => u.docId === (selectedUnitDocId || quickQuizUnitId)) || singleUnit

  // Auto-skip single chapter
  useEffect(() => {
    if (chapters && chapters.length === 1 && !selectedChapterDocId) {
      updateSelectedChapterDocId(chapters[0].docId)
    }
  }, [chapters, selectedChapterDocId])

  const startMemoryCoreMode = async () => {
    if (!user) return
    
    const currentCharges = userData?.memoryCoreCharges || 0
    if (currentCharges <= 0) {
      alert("메모리 코어 탐사권이 부족합니다. 상점에서 복구 탐사권을 구매해주세요!")
      return
    }

    setLoadingMemoryCore(true)
    soundManager.playWarp()
    try {
      // Consume one charge
      await setDoc(doc(db, 'users', user.uid), {
        memoryCoreCharges: currentCharges - 1
      }, { merge: true })

      const q = query(collection(db, 'users', user.uid, 'incorrect_questions'), orderBy('lastFailedAt', 'desc'), limit(20))
      const snap = await getDocs(q)
      const failedQs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      
      if (failedQs.length === 0) {
        alert("복구할 데이터가 없습니다! 당신의 메모리는 완벽하게 보존되어 있습니다. 🚀")
        return
      }

      setMemoryCoreQuestions(failedQs)
      setIsMemoryCoreMode(true)
    } catch (err) {
      console.error("Error fetching memory core questions:", err)
      alert("데이터를 불러오지 못했습니다.")
    } finally {
      setLoadingMemoryCore(false)
    }
  }

  // --- Ore Radar Daily Bonus Logic ---
  const checkIsBonusUnit = (unitId) => {
    if (!userData?.hasRadar || !unitId) return false
    
    // Deterministic selection based on UnitID + UID + Today's Date
    const today = new Date().toISOString().split('T')[0]
    const seedStr = `${unitId}-${user.uid}-${today}`
    let hash = 0
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i)
        hash |= 0
    }
    
    // 20% chance (hash % 5 === 0)
    return Math.abs(hash) % 5 === 0
  }


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
    radar: userData?.hasRadar || false,
    engine: userData?.hasEngine || false,
  }


  // 2. Interaction & Booster Logic
  useEffect(() => {
    if (user && !authLoading) {
      const handleKeyDown = (e) => {
        if ((e.code === 'Space' || e.key === ' ') && equipment.engine) {
          const tag = document.activeElement?.tagName?.toLowerCase();
          const isEditable = document.activeElement?.isContentEditable;
          if (tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable) return;
          

          if (document.querySelector('.modal-overlay')) return;
          
          e.preventDefault();
          setIsBoosting(true);
          
          if (!isBoosting) {
            soundManager.play('whoosh');
          }
        }
      };

      const handleKeyUp = (e) => {
        if (e.code === 'Space') {
          setIsBoosting(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [user, authLoading, equipment.engine, isBoosting]);

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
  const [streakCelebration, setStreakCelebration] = useState(null)

  useEffect(() => {
    if (!user) return
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;
    
    const historyRef = collection(db, 'users', user.uid, 'history')
    const q = query(historyRef, orderBy('timestamp', 'desc'))
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setHistory(historyData)
      setLoadingHistory(false)
    })
    
    return () => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
      if (unsubscribeSnapshot) {
        if (!auth.currentUser) {
           unsubscribeSnapshot();
        } else {
           cleanupTimeout = setTimeout(() => {
             if (unsubscribeSnapshot) unsubscribeSnapshot();
           }, 100);
        }
      }
    };
  }, [user])

  // Calculate Exploration Status and Recent Region
  // bestScores: { unitDocId: bestScore } - maps each completed unit to its best quiz score
  // unitProgressMap: { unitDocId: { quiz: true, video: true, text: true, workbook: true } }
  const { explorationStatus, recentRegionId, bestScores, unitProgressMap } = useMemo(() => {
    const statusMap = {}
    const scores = {}
    const progressMap = {}
    let lastRegionId = null

    if (!regions) {
      return { explorationStatus: {}, recentRegionId: null, bestScores: {}, unitProgressMap: {} }
    }

    // Build bestScores and unitProgressMap from history
    history.forEach(h => {
      const uid = h.unitId
      if (!uid) return

      // Map legacy history types to modalities
      let hType = 'unknown' 
      if (!h.type || h.type === 'quiz') hType = 'quiz' 
      else if (h.type === 'workbook') hType = 'workbook'
      else if (h.type === 'video') hType = 'video'
      else if (h.type === 'text') hType = 'text'

      // Tracking modality completion
      if (!progressMap[uid]) {
        progressMap[uid] = { quiz: false, video: false, text: false, workbook: false }
      }
      progressMap[uid][hType] = true

      // Tracking scores for old logic (MissionHub cards)
      // ONLY include 'quiz' and 'workbook' in bestScores to prevent video/text nominal scores (100) from leaking
      let scoreKey = null;
      if (hType === 'workbook') scoreKey = `${uid}_workbook`;
      else if (hType === 'quiz') scoreKey = uid;

      if (scoreKey && (!scores[scoreKey] || h.score > scores[scoreKey])) {
        scores[scoreKey] = h.score
      }
    })

    if (history.length === 0) {
      regions?.forEach(r => statusMap[r.id] = 'not_started')
      return { explorationStatus: statusMap, recentRegionId: null, bestScores: scores, unitProgressMap: {} }
    }
    
    regions.forEach(region => {
      const isAnySolved = history.some(h => {
        return h.unitId?.startsWith(region.id) || h.regionId === region.id
      })

      if (isAnySolved) {
        statusMap[region.id] = 'in_progress'
      } else {
        statusMap[region.id] = 'not_started'
      }
    })

    // Find the most recent region WITHIN the current cluster
    if (history.length > 0) {
      const latestMatchingEntry = history.find(h => 
        (h.clusterId && h.clusterId === selectedClusterId) || 
        regions.some(r => h.unitId?.startsWith(r.id) || h.regionId === r.id)
      )
      if (latestMatchingEntry) {
        lastRegionId = regions.find(r => 
          latestMatchingEntry.unitId?.startsWith(r.id) || latestMatchingEntry.regionId === r.id
        )?.id
      }
    }

    return { explorationStatus: statusMap, recentRegionId: lastRegionId, bestScores: scores, unitProgressMap: progressMap }
  }, [regions, history, selectedClusterId])

  // Calculate chapter progress dynamically from Firestore data
  const chapterProgress = useMemo(() => {
    const progress = {}
    
    // Guard: need both chapters array AND history to have finished loading
    if (!chapters || !chapters.length) return progress
    if (loadingHistory) return progress

    // Check if ALL chapterUnitResults have loaded
    const allLoaded = chapterUnitResults.length > 0 && 
      chapterUnitResults.every(r => !r.isPending && !r.isLoading)
    if (!allLoaded) return progress

    chapters.forEach((chapter, index) => {
      const result = chapterUnitResults[index]
      if (!result || !result.data) return

      const unitsData = result.data
      
      let counts = {
        quiz: { total: 0, completed: 0 },
        video: { total: 0, completed: 0 },
        text: { total: 0, completed: 0 },
        workbook: { total: 0, completed: 0 }
      }

      unitsData.forEach(unit => {
        // Find progress using docId or fallback id
        const uProg = unitProgressMap[unit.docId] || unitProgressMap[unit.id] || {}

        // Check availability of each modality
        const hasQuiz = (unit.contentFlags && unit.contentFlags.hasQuiz !== undefined) ? unit.contentFlags.hasQuiz : true
        const hasVideo = !!((unit.transmissions?.length > 0 && unit.transmissions.some(tx => tx.videoId)) || unit.videoConfig?.videoId)
        const hasText = !!(unit.learningContents?.text?.trim())
        const hasWorkbook = !!(unit.workbookPages && unit.workbookPages.length > 0)

        if (hasQuiz) {
          counts.quiz.total++
          if (uProg.quiz) counts.quiz.completed++
        }
        if (hasVideo) {
          counts.video.total++
          if (uProg.video) counts.video.completed++
        }
        if (hasText) {
          counts.text.total++
          if (uProg.text) counts.text.completed++
        }
        if (hasWorkbook) {
          counts.workbook.total++
          if (uProg.workbook) counts.workbook.completed++
        }
      })
      
      // Determine if the entire chapter is finished across ALL active modalities
      const hasAnyContent = counts.quiz.total > 0 || counts.video.total > 0 || counts.text.total > 0 || counts.workbook.total > 0
      const isFinished = hasAnyContent && 
        (counts.quiz.total === counts.quiz.completed) &&
        (counts.video.total === counts.video.completed) &&
        (counts.text.total === counts.text.completed) &&
        (counts.workbook.total === counts.workbook.completed)
      
      progress[chapter.docId] = {
        counts,
        isFinished
      }
    })
    return progress
  }, [chapters, unitProgressMap, chapterUnitResults, loadingHistory])


  const isProcessingSave = useRef(false)

  const handleComplete = async (result) => {
    if (!user || isProcessingSave.current) return
    isProcessingSave.current = true
    
    try {
      const { score, totalCount, crystalsEarned, isPerfect, shieldsUsed } = result
      if (totalCount === 0) return

      // Anti-grinding logic
      const currentUnitId = selectedUnitDocId || quickQuizUnitId
      const scoreKey = result.type === 'workbook' ? `${currentUnitId}_workbook` : currentUnitId
      const previousBest = bestScores[scoreKey] || 0
      let actualCrystalsEarned = 0
      let rewardMessage = ""

      if (crystalsEarned < 0) {
        // --- Negative Reward (Penalty) ---
        // Always apply penalty even if score didn't improve
        actualCrystalsEarned = crystalsEarned
        rewardMessage = `무지성 탐사로 인해 광석 ${Math.abs(crystalsEarned)}개가 소멸되었습니다.`
      } else if (score > previousBest) {
        // Incremental reward: sessionCrystals * (newScore - prevBest) / newScore
        const improvementRatio = (score - previousBest) / score
        actualCrystalsEarned = Math.round((crystalsEarned || 0) * improvementRatio)
        
        // Perfect bonus (10 crystals) only for first-time 100%
        if (isPerfect && previousBest < 100) {
          const baseCrystals = (crystalsEarned || 0) - 10 
          actualCrystalsEarned = Math.max(0, Math.round(baseCrystals * improvementRatio)) + 10
        } else if (isPerfect && previousBest === 100) {
          const baseCrystals = (crystalsEarned || 0) - 10
          actualCrystalsEarned = Math.max(0, Math.round(baseCrystals * improvementRatio))
        }

        // --- Scanner Daily Bonus (+5) ---
        if (!isMemoryCoreMode) {
          const isScannerBonusUnit = checkIsBonusUnit(currentUnitId)
          if (isScannerBonusUnit && userData?.hasRadar) {
            actualCrystalsEarned += 5
            rewardMessage += " 📡 스캐너 보너스 탐사 성공! (+5 광석)"
          }
        }
        
        if (actualCrystalsEarned > 0) {
          rewardMessage = `${score}점으로 최고 기록을 경신했습니다! (+${actualCrystalsEarned} 광석)` + rewardMessage
        } else {
          actualCrystalsEarned = 0
        }
      } else {
        actualCrystalsEarned = 0
        rewardMessage = score === 100 
          ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)"
          : `최고 점수(${previousBest}점)를 넘지 못해 추가 광석을 획득할 수 없습니다.`
      }

      // Safety Guard: Ensure actualCrystalsEarned is a valid number
      if (isNaN(actualCrystalsEarned) || actualCrystalsEarned === undefined) {
        console.warn("SpaceHome: actualCrystalsEarned is NaN or undefined, resetting to 0", actualCrystalsEarned)
        actualCrystalsEarned = 0
      }

      soundManager.playCrystal()

      // --- Atomic Transaction: 모든 사용자 데이터 읽기+계산+쓰기를 하나의 트랜잭션으로 처리 ---
      // getDoc() + setDoc() 패턴은 중간에 다른 쓰기(예: 코어 구매 increment)가 끼어들어
      // streakFreezeCount를 옛날 값으로 덮어쓰는 race condition을 유발합니다.
      // runTransaction은 충돌 시 자동 재시도하여 이를 방지합니다.
      const userDocRef = doc(db, 'users', user.uid)
      const streakResult = await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userDocRef)
        const progressDocRef = doc(db, 'users', user.uid, 'learning_progress', currentUnitId)
        const freshProgressSnap = await transaction.get(progressDocRef)
        
        if (!freshSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshSnap.data()
        const freshProgressData = freshProgressSnap.exists() ? freshProgressSnap.data() : {}

        // --- Server-side Reward Calculation (Prevent duplicate payout) ---
        const serverPreviousBest = freshProgressData.bestScore || 0
        let atomicCrystalsEarned = 0

        if (crystalsEarned < 0) {
          atomicCrystalsEarned = crystalsEarned
        } else if (score > serverPreviousBest) {
          const improvementRatio = (score - serverPreviousBest) / score
          atomicCrystalsEarned = Math.round((crystalsEarned || 0) * improvementRatio)
          
          if (isPerfect && serverPreviousBest < 100) {
            const baseCrystals = (crystalsEarned || 0) - 10 
            atomicCrystalsEarned = Math.max(0, Math.round(baseCrystals * improvementRatio)) + 10
          } else if (isPerfect && serverPreviousBest === 100) {
            const baseCrystals = (crystalsEarned || 0) - 10
            atomicCrystalsEarned = Math.max(0, Math.round(baseCrystals * improvementRatio))
          }
          
          if (!isMemoryCoreMode && checkIsBonusUnit(currentUnitId) && freshUserData?.hasRadar) {
            atomicCrystalsEarned += 5
          }
        }

        const prevConsecutiveGood = score >= 90 ? (freshUserData.consecutiveGood || 0) + 1 : 0
        const currentShieldCharges = freshUserData?.shieldCharges || 0

        // Daily Task Reset Logic
        const today = new Date().toISOString().split('T')[0]
        const lastQuizDate = freshUserData.lastQuizDate || ""
        const dailyQuizCount = (lastQuizDate === today) ? (freshUserData.dailyQuizCount || 0) + 1 : 1

        // --- Direct Growth Counter ---
        const kstNow = new Date(Date.now() + 9 * 3600000)
        const todayKST = kstNow.toISOString().split('T')[0]
        const mondayOffset = (kstNow.getUTCDay() + 6) % 7
        const mondayKST = new Date(kstNow.getTime() - mondayOffset * 86400000)
          .toISOString().split('T')[0]

        const growthUpdates = {}
        if (atomicCrystalsEarned > 0) {
          if (freshUserData.dailyGrowthDate === todayKST) {
            growthUpdates.dailyGrowth = (freshUserData.dailyGrowth || 0) + atomicCrystalsEarned
          } else {
            growthUpdates.dailyGrowth = atomicCrystalsEarned
            growthUpdates.dailyGrowthDate = todayKST
          }
          if (freshUserData.weeklyGrowthMonday === mondayKST) {
            growthUpdates.weeklyGrowth = (freshUserData.weeklyGrowth || 0) + atomicCrystalsEarned
          } else {
            growthUpdates.weeklyGrowth = atomicCrystalsEarned
            growthUpdates.weeklyGrowthMonday = mondayKST
          }
        }

        // --- Streak System (transaction 내에서 최신 freeze count 사용) ---
        const result = calculateStreakUpdate(freshUserData)
        const streakUpdates = result.streakUpdate || {}

        // --- Atomic Logging: Streak Freeze ---
        if (result.meta?.freezeUsed) {
          const defendedDates = []
          const lastDate = freshUserData?.lastStreakDate
          if (lastDate) {
            const scanObj = new Date(lastDate + 'T12:00:00Z')
            const todayDateKST = getTodayKST()
            const todayDate = new Date(todayDateKST + 'T12:00:00Z')
            scanObj.setUTCDate(scanObj.getUTCDate() + 1)
            while (scanObj < todayDate) {
              defendedDates.push(scanObj.toISOString().split('T')[0])
              scanObj.setUTCDate(scanObj.getUTCDate() + 1)
            }
          }
          recordCrystalTransaction(user.uid, {
            amount: 0,
            type: 'streak_freeze',
            description: `크라이오 코어로 연속 탐사 궤도 보호`,
            metadata: { 
              unitId: currentUnitId,
              streakBefore: freshUserData?.currentStreak || 0,
              streakAfter: result.meta.newStreak,
              defendedDates: defendedDates
            }
          }, transaction)
        }

        // --- Atomic Logging: Quiz Reward / Penalty ---
        if (atomicCrystalsEarned !== 0) {
          const stableQuizTxId = `quiz_${currentUnitId}_s${score}_${Date.now()}`; // Add timestamp for penalties to allow multiple
          
          recordCrystalTransaction(user.uid, {
            amount: atomicCrystalsEarned,
            type: atomicCrystalsEarned > 0 ? 'quiz_reward' : 'quiz_penalty',
            description: `${activeUnit?.title || '탐사 퀴즈'} ${atomicCrystalsEarned > 0 ? `(${score}점)` : '(시스템 손상)'}`,
            metadata: { unitId: currentUnitId, score, penalty: atomicCrystalsEarned < 0 }
          }, transaction, atomicCrystalsEarned > 0 ? `quiz_${currentUnitId}_s${score}` : `${stableQuizTxId}`)
        }

        // --- Atomic Logging: History ---
        const historyRef = doc(collection(db, 'users', user.uid, 'history'))
        transaction.set(historyRef, {
          unitId: currentUnitId,
          unitTitle: activeUnit?.title || "탐사 퀴즈",
          regionId: selectedRegionId || freshUserData.lastRegionId || "",
          regionTitle: activeRegion?.title || "Unknown Galaxy",
          chapterId: selectedChapterDocId || "",
          clusterId: selectedClusterId,
          score: score,
          crystalsEarned: atomicCrystalsEarned,
          type: result.type === 'workbook' ? 'workbook' : 'quiz',
          timestamp: serverTimestamp()
        })

        // --- Update Progress Doc (Source of truth for bestScore) ---
        transaction.set(progressDocRef, {
          bestScore: Math.max(serverPreviousBest, score),
          updatedAt: serverTimestamp()
        }, { merge: true })

        // Transaction 내에서는 increment()를 쓸 수 없으므로, 직접 계산
        transaction.update(userDocRef, {
          crystals: Math.max(0, (freshUserData.crystals || 0) + atomicCrystalsEarned),
          totalQuizzes: (freshUserData.totalQuizzes || 0) + 1,
          totalScore: (freshUserData.totalScore || 0) + score,
          averageScore: ((freshUserData.totalScore || 0) + score) / ((freshUserData.totalQuizzes || 0) + 1),
          perfectCount: (isPerfect && serverPreviousBest < 100) ? (freshUserData.perfectCount || 0) + 1 : (freshUserData.perfectCount || 0),
          consecutiveGood: prevConsecutiveGood,
          shieldDefended: (freshUserData.shieldDefended || 0) + (shieldsUsed || 0),
          dailyQuizCount: dailyQuizCount,
          lastQuizDate: today,
          lastActive: serverTimestamp(),
          shieldCharges: Math.max(0, currentShieldCharges - (shieldsUsed || 0)),
          ...growthUpdates,
          ...streakUpdates
        })

        return { result, freshUserData, atomicCrystalsEarned }
      })

      // Transaction 밖에서 부수효과 처리 (트랜잭션 성공 후)
      const { result: streakCalcResult, atomicCrystalsEarned: finalCrystals } = streakResult
      const streakUpdates = streakCalcResult.streakUpdate || {}

      // Save wrong questions / Delete recovered questions for Recovery Planet
      const batchStore = writeBatch(db)
      let hasBatchOps = false

      if (result.wrongQuestions && result.wrongQuestions.length > 0) {
        result.wrongQuestions.forEach(q => {
          const qRef = doc(collection(db, 'users', user.uid, 'incorrect_questions'), q.id)
          batchStore.set(qRef, {
            ...q,
            lastFailedAt: serverTimestamp(),
            failCount: increment(1)
          }, { merge: true })
        })
        hasBatchOps = true
      }

      if (result.correctQuestions && result.correctQuestions.length > 0) {
        result.correctQuestions.forEach(q => {
          batchStore.delete(doc(collection(db, 'users', user.uid, 'incorrect_questions'), q.id))
        })
        hasBatchOps = true
      }

      if (hasBatchOps) await batchStore.commit()

      // --- Mastery Compensation (Memory Core) ---
      if (isMemoryCoreMode && result.correctQuestions && result.correctQuestions.length > 0) {
        const uniqueUnitIds = [...new Set(result.correctQuestions.map(q => q.unitId))]
        
        for (const uid of uniqueUnitIds) {
          if (!uid || uid === 'recovery_zone') continue
          
          // Count remaining mistakes for this specific unit
          const qRem = query(collection(db, 'users', user.uid, 'incorrect_questions'), where('unitId', '==', uid))
          const snapRem = await getDocs(qRem)
          const remainingCount = snapRem.size
          
          // Assume 20 questions per unit for scoring
          const compensatedScore = Math.floor(((20 - remainingCount) / 20) * 100)
          const currentBest = bestScores[uid] || 0
          
          if (compensatedScore > currentBest) {
            // Find first historical record of this unit to get metadata
            const firstHistory = history.find(h => h.unitId === uid)
            
            // Check if this is the first time reaching 100%
            const isFirstPerfect = (compensatedScore === 100 && currentBest < 100)
            const masteryBonus = isFirstPerfect ? 10 : 0
            
            await addDoc(collection(db, 'users', user.uid, 'history'), {
              unitId: uid,
              unitTitle: firstHistory?.unitTitle || "복구 보상",
              regionId: firstHistory?.regionId || "",
              regionTitle: firstHistory?.regionTitle || "복구 구역",
              chapterId: firstHistory?.chapterId || "",
              score: compensatedScore,
              crystalsEarned: masteryBonus,
              timestamp: serverTimestamp(),
              type: 'recovery_mastery'
            })
            
            if (masteryBonus > 0) {
              recordCrystalTransaction(user.uid, {
                amount: masteryBonus,
                type: 'mastery_bonus',
                description: `${firstHistory?.unitTitle || '단원'} 완벽 복구 보너스`,
                metadata: { unitId: uid, score: 100 }
              })
              // Update crystals in user doc too
              await setDoc(doc(db, 'users', user.uid), {
                crystals: increment(masteryBonus),
                perfectCount: increment(1)
              }, { merge: true })
            }
          }
        }
      }

      // Mastery Compensation removed duplicate check

      if (isPerfect && previousBest < 100) {
        soundManager.playLevelUp()
      }

      // Trigger streak celebration if milestone reached
      if (streakCalcResult?.meta?.justReachedMilestone) {
        setStreakCelebration({
          milestone: streakCalcResult.meta.justReachedMilestone,
          currentStreak: streakUpdates.currentStreak || streakCalcResult.meta.newStreak
        })
      }

      setCompletionResult({
        crystalsEarned: finalCrystals,
        isPerfect: isPerfect && previousBest < 100, // Only show perfect effect for first time
        rewardMessage: finalCrystals > 0 
          ? `${score}점으로 최고 기록을 경신했습니다! (+${finalCrystals} 광석)`
          : (score === 100 ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)" : `최고 점수를 넘지 못해 추가 광석을 획득할 수 없습니다.`),
        streakInfo: {
          currentStreak: streakUpdates.currentStreak || streakCalcResult?.meta?.newStreak,
          freezeUsed: streakCalcResult?.meta?.freezeUsed,
          isNewRecord: streakCalcResult?.meta?.isNewRecord,
          alreadyDoneToday: streakCalcResult?.meta?.alreadyDoneToday,
          justReachedMilestone: streakCalcResult?.meta?.justReachedMilestone
        }
      })
      updateSelectedUnitDocId(null)
    } catch (error) {
      console.error("Error saving quiz result:", error)
    } finally {
      isProcessingSave.current = false
    }
  }

  const isProcessingNonQuiz = useRef(false)

  // Handle streak updates and rewards for non-quiz activities (Data Log, Transmission)
  const handleNonQuizActivityComplete = async (activityType, crystalsEarned = 0, activityMetadata = {}) => {
    if (!user || isProcessingNonQuiz.current) return
    isProcessingNonQuiz.current = true

    const { transmissionId, stampedSeconds } = activityMetadata
    const currentUnitId = selectedUnitDocId || quickQuizUnitId || 'unknown'
    
    const userDocRef = doc(db, 'users', user.uid)
    const progressDocRef = doc(db, 'users', user.uid, 'learning_progress', currentUnitId)

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userDocRef)
        const freshProgressSnap = await transaction.get(progressDocRef)
        
        if (!freshUserSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshUserSnap.data()
        const freshProgressData = freshProgressSnap.exists() ? freshProgressSnap.data() : {}

        // --- Duplicate Reward Prevention ---
        let actualReward = crystalsEarned
        const isVideoActivity = activityType.includes('영상')
        const isLogActivity = activityType.includes('로그')

        if (isVideoActivity && transmissionId) {
          const videoProg = freshProgressData.videoProgress?.[transmissionId] || {}
          
          if (activityType.includes('완료') && videoProg.completionBonusGiven) {
            actualReward = 0 // Already got completion bonus
          } else if (activityType.includes('수신')) {
            // Check based on rewardedStampCount
            const rewardedCount = videoProg.rewardedStampCount || 0
            const currentTotalStamps = stampedSeconds?.length || 0
            if (currentTotalStamps <= rewardedCount) {
              actualReward = 0 // No new stamps to reward
            } else {
              // --- Multi-Device / Concurrent Video Exploit Prevention ---
              const now = Timestamp.now()
              if (freshUserData.lastVideoRewardTime) {
                // Support both Timestamp objects and serialized ones
                const lastTimeSec = freshUserData.lastVideoRewardTime.seconds 
                                    || freshUserData.lastVideoRewardTime._seconds 
                                    || 0;
                if (lastTimeSec > 0) {
                  const diffSeconds = now.seconds - lastTimeSec
                  // 170 seconds cooldown required between consecutive 180s watch rewards
                  if (diffSeconds < 170) {
                    actualReward = 0
                  }
                }
              }
            }
          }
        } else if (isLogActivity) {
          if (freshProgressData.logRead) {
            actualReward = 0 // Already awarded
          }
        }

        const streakResult = calculateStreakUpdate(freshUserData)
        const streakUpdates = streakResult.streakUpdate || {}

        // Update User Doc
        const userUpdates = {
          lastActive: serverTimestamp(),
          ...streakUpdates
        }
        
        // Calculate KST Date
        const kstNow = new Date(Date.now() + 9 * 3600000)
        const todayKST = kstNow.toISOString().split('T')[0]

        // --- Daily Video Reward Cap (Prevent infinite farming) ---
        if (actualReward > 0 && isVideoActivity && activityType.includes('수신')) {
          let dailyVideoCrystals = freshUserData.dailyVideoCrystals || 0
          if (freshUserData.dailyVideoDate !== todayKST) {
            dailyVideoCrystals = 0
          }
          
          const DAILY_VIDEO_CAP = 300 // Max 300 crystals per day from video watch time (~90 mins)
          if (dailyVideoCrystals >= DAILY_VIDEO_CAP) {
            actualReward = 0
          } else if (dailyVideoCrystals + actualReward > DAILY_VIDEO_CAP) {
            actualReward = DAILY_VIDEO_CAP - dailyVideoCrystals
          }

          if (actualReward > 0) {
            userUpdates.dailyVideoCrystals = dailyVideoCrystals + actualReward
            userUpdates.dailyVideoDate = todayKST
            // Also update the global cooldown
            userUpdates.lastVideoRewardTime = Timestamp.now()
          }
        }

        // Safety Guard: Ensure actualReward is a valid number
        if (isNaN(actualReward) || actualReward === undefined) {
          console.warn("SpaceHome: actualReward is NaN or undefined in handleNonQuizActivityComplete, resetting to 0")
          actualReward = 0
        }

        if (actualReward > 0) {
          userUpdates.crystals = (freshUserData.crystals || 0) + actualReward
          // Also track growth
          const growthUpdates = calculateGrowthUpdates(freshUserData, actualReward)
          Object.assign(userUpdates, growthUpdates)
          
          if (activityType.includes('완료') || isLogActivity) {
             userUpdates.totalQuizzes = (freshUserData.totalQuizzes || 0) + 1
             userUpdates.totalScore = (freshUserData.totalScore || 0) + 100
          }
        } else {
          actualReward = 0 // Ensure non-negative
        }
        transaction.update(userDocRef, userUpdates)

        // Update Progress Doc (Idempotent update)
        const progressUpdates = {}
        if (isLogActivity && !freshProgressData.logRead) {
          progressUpdates.logRead = true
          progressUpdates.logReadAt = serverTimestamp()
        } else if (isVideoActivity && transmissionId) {
          if (!progressUpdates.videoProgress) progressUpdates.videoProgress = {}
          if (activityType.includes('완료')) {
            progressUpdates.videoProgress[transmissionId] = {
              ...(freshProgressData.videoProgress?.[transmissionId] || {}),
              completed: true,
              completionBonusGiven: true,
              updatedAt: serverTimestamp()
            }
          } else if (activityType.includes('수신') && stampedSeconds) {
             progressUpdates.videoProgress[transmissionId] = {
              ...(freshProgressData.videoProgress?.[transmissionId] || {}),
              rewardedStampCount: stampedSeconds.length,
              stampedSeconds: stampedSeconds,
              updatedAt: serverTimestamp()
            }
          }
        }
        
        if (Object.keys(progressUpdates).length > 0) {
          transaction.set(progressDocRef, progressUpdates, { merge: true })
        }

        // --- Atomic Logging: Streak Freeze ---
        if (streakResult.meta?.freezeUsed) {
          const defendedDates = []
          const lastDate = freshUserData?.lastStreakDate
          if (lastDate) {
            const scanObj = new Date(lastDate + 'T12:00:00Z')
            const todayDateKST = getTodayKST()
            const todayDate = new Date(todayDateKST + 'T12:00:00Z')
            scanObj.setUTCDate(scanObj.getUTCDate() + 1)
            while (scanObj < todayDate) {
              defendedDates.push(scanObj.toISOString().split('T')[0])
              scanObj.setUTCDate(scanObj.getUTCDate() + 1)
            }
          }
          recordCrystalTransaction(user.uid, {
            amount: 0,
            type: 'streak_freeze',
            description: `크라이오 코어로 연속 탐사 궤도 보호 (${activityType})`,
            metadata: { 
              unitId: currentUnitId,
              streakBefore: freshUserData?.currentStreak || 0,
              streakAfter: streakResult.meta.newStreak,
              defendedDates: defendedDates
            }
          }, transaction)
        }

        if (actualReward > 0) {
          const stableTxId = isLogActivity 
            ? `log_${currentUnitId}` 
            : (activityType.includes('완료') ? `video_bonus_${currentUnitId}_${transmissionId}` : null);

          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: isVideoActivity ? 'transmission_reward' : 'data_log_reward',
            description: `${activeUnit?.title || '탐사'} 보상 (${activityType})`,
            metadata: { unitId: currentUnitId, ...activityMetadata }
          }, transaction, stableTxId)
        }

        // --- Atomic Logging: History ---
        const isCompletionActivity = activityType.includes('완료') || isLogActivity
        const shouldLogHistory = isCompletionActivity

        if (shouldLogHistory) {
          const historyRef = doc(collection(db, 'users', user.uid, 'history'))
          transaction.set(historyRef, {
            unitId: currentUnitId,
            unitTitle: activeUnit?.title || `탐사 기록 (${activityType})`,
            regionId: selectedRegionId || activeRegion?.id || "",
            regionTitle: activeRegion?.title || "Unknown Galaxy",
            chapterId: selectedChapterDocId || "",
            clusterId: selectedClusterId,
            score: 100,
            crystalsEarned: actualReward,
            timestamp: serverTimestamp(),
            type: isLogActivity ? 'text' : 'video' 
          })
        }

        return { streakCalcResult: streakResult, streakUpdates, txUserData: freshUserData, actualReward }
      })

      const { streakCalcResult, streakUpdates, txUserData, actualReward } = txResult

      // Trigger milestone celebration
      if (streakCalcResult.meta?.justReachedMilestone) {
        setStreakCelebration({
          milestone: streakCalcResult.meta.justReachedMilestone,
          currentStreak: streakUpdates.currentStreak || streakCalcResult.meta.newStreak
        })
      }

      // Visual feedback
      if (actualReward > 0 || activityType.includes('완료')) {
        soundManager.playLevelUp()
        setCompletionResult({
          crystalsEarned: actualReward,
          isPerfect: true,
          rewardMessage: actualReward > 0 ? `${activityType} 달성! (+${actualReward} 광석)` : `이미 보상을 획득한 활동입니다.`,
          streakInfo: {
            currentStreak: streakUpdates.currentStreak || streakCalcResult.meta?.newStreak || txUserData?.currentStreak || 0,
            freezeUsed: streakCalcResult.meta?.freezeUsed || false,
            isNewRecord: streakCalcResult.meta?.isNewRecord || false,
            alreadyDoneToday: streakCalcResult.meta?.alreadyDoneToday || false,
            justReachedMilestone: streakCalcResult.meta?.justReachedMilestone || false
          }
        })
      }
    } catch (err) {
      console.error("Error in activity completion:", err)
    } finally {
      isProcessingNonQuiz.current = false
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
  const isLoading = (authLoading || loadingClusters || loadingRegions) && !errorRegions

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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          >
            🚀 워프 엔진 가동 중...
          </Motion.div>
        </div>
      </div>
    )
  }

  // Login Screen
  if (!user) {
    const titleText = "META SENSE"
    
    return (
      <div className="space-bg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <StarField count={200} />
        <div className="nebula-bg" />
        
        <div className="space-container login-layout" style={{ 
          flex: 1, // Take available vertical space
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', // 화면 중앙 정렬
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          padding: isMobile ? '4rem 1.5rem' : '4rem 2rem' // Added vertical padding
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
              <Motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '1rem' : '2rem' }}
              >
                <img src="/m-logo.svg" alt="Meta Sense Logo" style={{ width: isMobile ? '80px' : '120px', filter: 'drop-shadow(0 0 20px rgba(0, 243, 255, 0.5))' }} />
              </Motion.div>
              <Motion.div 
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
                         <Motion.span
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
                         </Motion.span>
                       )
                     })}
                     <span style={{ width: isMobile ? '0.6rem' : '1.2rem' }}></span>
                  </div>
                ))}
              </Motion.div>
              
              <Motion.p 
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
              </Motion.p>
            </div>
            
            {/* 컨트롤 섹션: 버튼 + 토글 가로 배치 */}
            <Motion.div 
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
              <Motion.button 
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
              </Motion.button>
            </Motion.div>
          </div>
        </div>
        <div style={{ width: '100%', zIndex: 100, marginTop: 'auto' }}>
          <Footer />
        </div>
      </div>
    )
  }

  // Mission Hub Mode (Data Log, Transmission, Field Test)
  if (selectedUnitDocId || quickQuizUnitId) {
    // Pre-compute initial mode based on content availability
    // We now use contentFlags if available to know exactly what exists,
    // including if a quiz exists before the quiz data actually loads.
    const unit = activeUnit || {}
    
    // Fallback detection if contentFlags is missing
    const hasDataLog = !!(unit.learningContents?.text?.trim() || unit.learningContents?.pdfUrl?.trim())
    const hasTransmission = !!(
      (unit.transmissions?.length > 0 && unit.transmissions.some(tx => tx.videoId)) ||
      (unit.videoConfig?.videoId)
    )
    const hasWorkbook = !!(unit.workbookPages && unit.workbookPages.length > 0)
    
    // We can definitively know if text, video, or workbook exist from the unit doc itself.
    // We ONLY need flags for hasQuiz, because quizzes are fetched async later.
    const hasQuiz = (unit.contentFlags && unit.contentFlags.hasQuiz !== undefined) 
      ? unit.contentFlags.hasQuiz 
      : true;

    let initialMode = 'briefing' // default: show Mission Control
    
    const availableContentsCount = [
      hasQuiz, 
      hasTransmission, 
      hasDataLog, 
      hasWorkbook
    ].filter(Boolean).length;

    if (quickQuizMode) {
      initialMode = quickQuizMode;
    } else if (availableContentsCount > 1) {
      initialMode = 'briefing'; // Multiple items, show Mission Control
    } else if (availableContentsCount === 0) {
      // Empty unit? Fallback to quiz modal safely
      initialMode = 'quiz-modal';
    } else if (hasQuiz && !hasTransmission && !hasDataLog && !hasWorkbook) {
      // ONLY Quiz
      initialMode = 'quiz-modal';
    } else if (!hasQuiz && hasDataLog && !hasTransmission && !hasWorkbook) {
      // ONLY Data log
      initialMode = 'text';
    } else if (!hasQuiz && hasTransmission && !hasDataLog && !hasWorkbook) {
      // ONLY Transmission
      initialMode = 'video';
    } else if (!hasQuiz && hasWorkbook && !hasTransmission && !hasDataLog) {
      // ONLY Workbook
      initialMode = 'workbook';
    }
    // If it reaches here somehow, initialMode remains 'briefing'

    return (
      <MissionHub
        key={selectedUnitDocId || quickQuizUnitId}
        unitId={selectedUnitDocId || quickQuizUnitId}
        clusterId={selectedClusterId}
        activeUnit={activeUnit || { title: "탐사 미션" }} 
        unitQuizzes={unitQuizzes}
        loadingQuizzes={loadingQuizzes}
        errorQuizzes={errorQuizzes}
        refetchQuizzes={refetchQuizzes}
        userData={userData}
        bestScores={bestScores}
        initialMode={initialMode}
        onBack={handleBackFromMission}
        onComplete={handleComplete}
        onNonQuizActivityComplete={handleNonQuizActivityComplete}
      />
    )
  }

  // --- Memory Core View ---
  if (isMemoryCoreMode && memoryCoreQuestions.length > 0) {
    return (
      <SpaceQuizView
        key="memory-core"
        region={{ color: 'var(--crystal-cyan)', title: '메모리 코어 센터' }}
        quizData={{
          unitId: 'recovery_zone',
          title: '데이터 복구 탐사',
          questions: memoryCoreQuestions
        }}
        onExit={() => setIsMemoryCoreMode(false)}
        onComplete={async (result) => {
          await handleComplete(result)
          setIsMemoryCoreMode(false)
        }}
        hasShield={userData?.shieldCharges || 0}
        hasRadar={false} // Memory Core doesn't use the scanner HUD
      />
    )
  }

  // Main App
  return (
    <div className="space-bg">
      {/* 3D Background Scene - Always Visible but controlled by state */}
      <AnimatePresence>
        {currentView === 'planet' && selectedClusterId && (
          <Motion.div
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
                const region = regions?.find(r => r.id === id);
                if (region?.isPrivate) {
                   const accessStatus = userData?.regionAccess?.[id];
                   if (accessStatus === 'suspended') {
                      alert('이 행성에 대한 접근이 일시정지되었습니다. 선생님께 문의하세요.');
                      return;
                   } else if (accessStatus !== 'active') {
                      setPendingRegion(region);
                      soundManager.playClick();
                      return;
                   }
                }
                updateSelectedRegionId(id)
                soundManager.playWarp()
              }}
              onSelectArchive={() => {
                setCurrentView('assignment_hub');
                soundManager.playWarp();
              }}
              equipment={equipment}
              isBoosting={isBoosting}
            />
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Scan line removed */}
      
      {/* Navigation */}
      <SpaceNavbar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view)
          updateSelectedRegionId(null)
          updateSelectedChapterDocId(null)
        }} 
      />

      <RegionAccessModal
        isOpen={!!pendingRegion}
        onClose={() => {
          setPendingRegion(null);
          setAccessError(null);
        }}
        region={pendingRegion}
        loading={verifyingCode}
        error={accessError}
        onSubmitCode={async (region, code) => {
          setVerifyingCode(true);
          setAccessError(null);
          try {
            if (region.accessCode === code) {
              const batch = writeBatch(db);
              batch.set(doc(db, 'users', user.uid), {
                regionAccess: { [region.id]: 'active' }
              }, { merge: true });
              batch.set(doc(db, 'regions', region.id, 'students', user.uid), {
                email: user.email,
                status: 'active',
                joinedAt: serverTimestamp()
              });
              await batch.commit();
              setPendingRegion(null);
              updateSelectedRegionId(region.id);
              soundManager.playWarp();
            } else {
              setAccessError('접근 코드가 올바르지 않습니다.');
            }
          } catch (err) {
            console.error('[Region Access Error]', err);
            setAccessError('오류가 발생했습니다. 다시 시도해주세요.');
          } finally {
            setVerifyingCode(false);
          }
        }}
      />

      {/* Main Content Overlay */}
      <main className="space-container" style={{ pointerEvents: 'none' }}>
        {currentView === 'planet' && !selectedClusterId && (
          <div style={{ pointerEvents: 'auto', width: '100%' }}>
            <ClusterSelector 
              clusters={activeClusters}
              onSelect={(id) => {
                updateSelectedClusterId(id);
                soundManager.playWarp();
              }}
            />
          </div>
        )}
        {currentView === 'planet' && selectedClusterId && (
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
                {activeClusters.length > 1 && (
                  <button 
                    className="space-btn cosmic-btn" 
                    onClick={() => { updateSelectedClusterId(null); soundManager.playClick(); }}
                    style={{ 
                      position: 'fixed', 
                      left: '20px', 
                      top: '120px', 
                      padding: '12px 24px', 
                      fontSize: '1rem', 
                      pointerEvents: 'auto',
                      background: 'rgba(0, 243, 255, 0.15)',
                      border: '1px solid var(--neon-blue)',
                      boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
                      zIndex: 100
                    }}
                  >
                    🚀 행성 군집 목록 (Multi-Verse)
                  </button>
                )}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  {equipment.engine && (
                    <Motion.p 
                      className="font-tech" 
                      style={{ 
                        color: 'var(--star-gold)', 
                        fontSize: '0.9rem', 
                        marginTop: '0.5rem',
                        textShadow: '0 0 10px var(--neon-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem'
                      }}
                    >
                      (BOOST: SPACE BAR)
                    </Motion.p>
                  )}
                </Motion.div>
              </div>
            ) : !selectedChapterDocId ? (
              // Chapter Selection (Overlay)
              <div className="fade-in" style={{ pointerEvents: 'auto', marginTop: '5vh' }}>
                <button 
                  className="space-nav-link font-tech"
                  onClick={() => { updateSelectedRegionId(null); soundManager.playClick() }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← RETURN TO GALAXY
                </button>
                <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5, 5, 16, 0.8)', backdropFilter: 'blur(20px)', position: 'relative' }}>
                  {/* Close Button */}
                  <button 
                    onClick={() => { updateSelectedRegionId(null); soundManager.playClick() }}
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
                  <SectorLeaderboard user={user} regionId={selectedRegionId} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {loadingChapters ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)' }}>SCANNING...</div>
                    ) : chapters?.map(chapter => (
                      <Motion.div
                        key={chapter.docId}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 243, 255, 0.1)' }}
                        className="glass-card hud-border"
                        onClick={() => { updateSelectedChapterDocId(chapter.docId); soundManager.playWarp() }}
                        style={{ padding: '2rem', cursor: 'pointer' }}
                      >
                        <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.5rem' }}>
                          {chapter.title}
                        </h3>
                        {chapterProgress[chapter.docId] ? (
                          chapterProgress[chapter.docId].isFinished ? (
                            <p className="font-tech" style={{ color: '#50c878', fontSize: '0.9rem', fontWeight: 800 }}>완료 🏆</p>
                          ) : (() => {
                            const p = chapterProgress[chapter.docId].counts;
                            const hasAny = p.quiz.total > 0 || p.video.total > 0 || p.text.total > 0 || p.workbook.total > 0;
                            
                            if (!hasAny) {
                              return <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>탐험 전</p>;
                            }

                            return (
                              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {p.text.total > 0 && (
                                  <span className="font-tech" style={{ color: p.text.completed === p.text.total ? '#50c878' : 'var(--text-bright)', fontSize: '0.85rem' }}>
                                    📝 {p.text.completed}/{p.text.total}
                                  </span>
                                )}
                                {p.video.total > 0 && (
                                  <span className="font-tech" style={{ color: p.video.completed === p.video.total ? '#50c878' : 'var(--planet-green)', fontSize: '0.85rem' }}>
                                    🎬 {p.video.completed}/{p.video.total}
                                  </span>
                                )}
                                {p.workbook.total > 0 && (
                                  <span className="font-tech" style={{ color: p.workbook.completed === p.workbook.total ? '#50c878' : 'var(--star-gold)', fontSize: '0.85rem' }}>
                                    🧮 {p.workbook.completed}/{p.workbook.total}
                                  </span>
                                )}
                                {p.quiz.total > 0 && (
                                  <span className="font-tech" style={{ color: p.quiz.completed === p.quiz.total ? '#50c878' : 'var(--neon-blue)', fontSize: '0.85rem' }}>
                                    🚀 {p.quiz.completed}/{p.quiz.total}
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>스캔 중...</p>
                        )}
                      </Motion.div>
                    ))}
                  </div>

                  {/* Unified Bottom Back Button */}
                  <button 
                    className="hud-btn secondary glass"
                    onClick={() => { updateSelectedRegionId(null); soundManager.playClick() }}
                    style={{ 
                      display: 'block', 
                      margin: '3rem auto 0',
                      padding: '0.8rem 2.5rem'
                    }}
                  >
                    ← RETURN TO GALAXY
                  </button>
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
                      updateSelectedChapterDocId(null)
                      updateSelectedRegionId(null)
                    } else {
                      updateSelectedChapterDocId(null)
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
                        updateSelectedChapterDocId(null)
                        updateSelectedRegionId(null)
                      } else {
                        updateSelectedChapterDocId(null)
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
                  <MissionLeaderboard user={user} chapterId={selectedChapterDocId} chapterTitle={chapters?.length === 1 ? activeRegion?.title : activeChapter?.title} />
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {loadingUnits ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)' }}>LOADING MISSION DATA...</div>
                    ) : units?.map((unit, idx) => {
                      const uProg = unitProgressMap[unit.docId] || unitProgressMap[unit.id] || {}
                      
                      const hasQuiz = (unit.contentFlags && unit.contentFlags.hasQuiz !== undefined) ? unit.contentFlags.hasQuiz : true
                      const hasVideo = !!((unit.transmissions?.length > 0 && unit.transmissions.some(tx => tx.videoId)) || unit.videoConfig?.videoId)
                      const hasText = !!(unit.learningContents?.text?.trim())
                      const hasWorkbook = !!(unit.workbookPages && unit.workbookPages.length > 0)

                      const isOverallCompleted = 
                        (!hasQuiz || uProg.quiz) &&
                        (!hasVideo || uProg.video) &&
                        (!hasText || uProg.text) &&
                        (!hasWorkbook || uProg.workbook)

                      const bestScore = bestScores[unit.docId]

                      return (
                        <Motion.button
                          key={unit.docId}
                          whileHover={{ scale: 1.02, x: 10, backgroundColor: 'rgba(0, 243, 255, 0.15)' }}
                          className={`glass-card hud-border ${isOverallCompleted ? 'completed' : ''}`}
                          onClick={() => { 
                            updateSelectedUnitDocId(unit.docId)
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
                            borderLeft: isOverallCompleted ? '4px solid var(--secondary)' : '1px solid var(--neon-blue)',
                            position: 'relative',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}
                        >
                          {checkIsBonusUnit(unit.docId || unit.id) && (
                            <div style={{
                              position: 'absolute',
                              top: '5px',
                              left: '5px',
                              fontSize: '0.8rem',
                              zIndex: 1
                            }}>💎</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="font-title">
                              <span style={{ color: 'var(--neon-blue)', marginRight: '1rem' }}>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                              {isOverallCompleted && <span style={{ marginRight: '0.5rem' }}>✅</span>}
                              {unit.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Modality Badges */}
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                              {hasText && (
                                <span className="font-tech" style={{ 
                                  color: uProg.text ? '#50c878' : 'rgba(255,255,255,0.3)', 
                                  fontSize: '1rem',
                                  textShadow: uProg.text ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title="Data Log">📝</span>
                              )}
                              {hasVideo && (
                                <span className="font-tech" style={{ 
                                  color: uProg.video ? '#50c878' : 'rgba(255,255,255,0.3)', 
                                  fontSize: '1rem',
                                  textShadow: uProg.video ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title="Transmission">🎬</span>
                              )}
                              {hasWorkbook && (
                                <span className="font-tech" style={{ 
                                  color: uProg.workbook ? '#50c878' : 'rgba(255,255,255,0.3)', 
                                  fontSize: '1rem',
                                  textShadow: uProg.workbook ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title="Workbook">🧮</span>
                              )}
                              {hasQuiz && (
                                <span className="font-tech" style={{ 
                                  color: uProg.quiz ? '#50c878' : 'rgba(255,255,255,0.3)', 
                                  fontSize: '1rem',
                                  textShadow: uProg.quiz ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title="Field Test">🚀</span>
                              )}
                            </div>

                            {/* Best Score for Quiz (Legacy behavior preservation) */}
                            {hasQuiz && bestScore !== undefined && (
                              <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.9rem' }}>
                                BEST: {bestScore}
                              </span>
                            )}
                            
                            <span style={{ color: 'var(--crystal-cyan)', minWidth: '80px', textAlign: 'right' }}>
                              {isOverallCompleted ? 'REPLAY' : '🚀 START'}
                            </span>
                          </div>
                        </Motion.button>
                      )
                    })}
                  </div>

                  {/* Unified Bottom Back Button */}
                  <button 
                    className="hud-btn secondary glass"
                    onClick={() => {
                      soundManager.playClick()
                      if (chapters?.length === 1) {
                        updateSelectedChapterDocId(null)
                        updateSelectedRegionId(null)
                      } else {
                        updateSelectedChapterDocId(null)
                      }
                    }}
                    style={{ 
                      display: 'block', 
                      margin: '3rem auto 0',
                      padding: '0.8rem 2.5rem'
                    }}
                  >
                    ← RETURN TO SECTOR
                  </button>
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
                  if (p.type === 'video') setQuickQuizMode('video')
                  else if (p.type === 'text') setQuickQuizMode('text')
                  else if (p.type === 'workbook') setQuickQuizMode('workbook')
                  else setQuickQuizMode('quiz-modal')
                  soundManager.playClick()
                }
              }} 
              regions={regions}
            startMemoryCoreMode={startMemoryCoreMode}
            loadingMemoryCore={loadingMemoryCore}
          />
          )}
          {currentView === 'collection' && <SpaceCollection userData={userData} history={history} />}
          {currentView === 'store' && (
            <SpaceStore user={user} userData={userData} />
          )}
          
          {currentView === 'ranking' && <SpaceRanking user={user} userData={userData} regions={regions} />}
          {currentView === 'journey' && <SpaceJourney userData={userData} />}
          {currentView === 'ledger' && <CrystalLedger userData={userData} />}
          {/* AssignmentHub moved to root level */}

          {/* Quick Quiz Modal now handled by main return branch for consistency */}
        </div>
      </main>

      {/* 우주 테마 학습 완료 모달 */}
      <AnimatePresence>
        {completionResult && (
          <Motion.div 
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
            <Motion.div 
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
                  획득한 메타 광석: <span style={{ color: 'var(--crystal-cyan)', fontWeight: 900 }}>{completionResult.crystalsEarned}개</span>
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
                    updateSelectedUnitDocId(null)
                    updateSelectedChapterDocId(null)
                    updateSelectedRegionId(null)
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
                    updateSelectedUnitDocId(null)
                    soundManager.playClick()
                  }}
                >
                  🛰️ 연속 탐사 진행 (CONTINUE)
                </button>
              </div>
              <div className="hud-line mt-4"></div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* RewardPotentialModal moved to MissionHub - shown only before Field Test */}

      {/* ☄️ 연속 학습 축하 모달 */}
      <AnimatePresence>
        {streakCelebration && (
          <StreakCelebrationModal 
            celebration={streakCelebration}
            onClose={() => setStreakCelebration(null)}
          />
        )}
      </AnimatePresence>

      {/* ☄️ 연속 학습 토스트 */}
      <AnimatePresence>
        {completionResult?.streakInfo && !streakCelebration && (
          <StreakToast 
            streakInfo={completionResult.streakInfo}
            onDismiss={() => setCompletionResult(prev => prev ? { ...prev, streakInfo: null } : null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {currentView === 'assignment_hub' && (
          <AssignmentHub 
            clusterId={selectedClusterId} 
            onClose={() => setCurrentView('planet')} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}


// RewardPotentialModal has been moved to MissionHub.jsx


export default SpaceHome
