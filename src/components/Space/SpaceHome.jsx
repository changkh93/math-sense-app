import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, db } from '../../firebase'
import { signInWithPopup } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, where, getDocs, writeBatch, increment, limit, runTransaction, Timestamp, documentId } from 'firebase/firestore'
import { useClusters, useRegions, useRegion, useChapters, useChapter, useUnits, useUnit, useQuizzes } from '../../hooks/useContent'
import { useAuth } from '../../hooks/useAuth'
import { usePresence } from '../../hooks/usePresence'
// import { regions as localRegions } from '../../data/regions'
import { motion as Motion, AnimatePresence } from 'framer-motion' // Added Framer Motion

// Space Components
import StarField from './StarField'
import ClusterSelector from './ClusterSelector'
import Planet3D from './Planet3D' // Keep for Login Screen
import SpaceScene, { checkWebGLSupport } from './SpaceScene' // New 3D Scene
import SpaceQuizView from './SpaceQuizView'
import MissionHub from './MissionHub' // New Integration
import SpaceDashboard from './SpaceDashboard'
import SpaceCollection from './SpaceCollection'
import SpaceStore from './SpaceStore'
import SpaceRanking from './SpaceRanking'
import SpaceJourney from './SpaceJourney'
import RegionAccessModal from './RegionAccessModal' // New Integration
import AssignmentHub from './AssignmentHub' // New Integration
import ProfileEditView from './ProfileEditView' // Profile Management
import StudyCrewView from './StudyCrewView'
import SectorLeaderboard from './SectorLeaderboard' // Leaderboard Integration
import MissionLeaderboard from './MissionLeaderboard' // Leaderboard Integration
import DarkMatterView from './DarkMatterView' // Dark Matter Integration
import DarkMatterRefineryView from './DarkMatterRefineryView'
import CrystalLedger from './CrystalLedger'

// import { useParticles, createParticleBurst } from './ParticleEffects'
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST, getKSTComponents, calculateStreakFromHistory, extractDefendedDates, extractLearningActivityDates, isRadarActive } from '../../utils/streakUtils'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import { applyHolidayMultiplier, isRestDay } from '../../utils/holidayUtils'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'
import { StreakCelebrationModal, StreakToast } from './StreakCelebration'

import soundManager from '../../utils/SoundManager'
import SpaceNavbar from './SpaceNavbar'
import Footer from '../common/Footer'

// Styles
import '../../styles/space-theme.css'

const MIDDLE_MATH_REGION_IMAGES = {
  core: '/assets/planets/middle-math-core.png',
  analytics: '/assets/planets/middle-math-analytics.png',
  geometry: '/assets/planets/middle-math-geometry.png',
  exam: '/assets/planets/middle-math-exam.png'
}

function getMiddleMathRegionImage(region) {
  const title = region?.title || ''

  if (title.includes('기본개념')) return MIDDLE_MATH_REGION_IMAGES.core
  if (title.includes('함수') || title.includes('확률') || title.includes('통계')) return MIDDLE_MATH_REGION_IMAGES.analytics
  if (title.includes('기하')) return MIDDLE_MATH_REGION_IMAGES.geometry
  if (title.includes('평가') || title.includes('모의')) return MIDDLE_MATH_REGION_IMAGES.exam

  return MIDDLE_MATH_REGION_IMAGES.core
}

const PYTHON_REGION_IMAGES = {
  foundation: '/assets/planets/python-foundation.png',
  advanced: '/assets/planets/python-advanced.png',
  data: '/assets/planets/python-data.png',
  project: '/assets/planets/python-project.png'
}

function getPythonRegionImage(region) {
  const title = region?.title || ''

  if (title.includes('수학') || title.includes('기초') || title.includes('입문')) return PYTHON_REGION_IMAGES.foundation
  if (title.includes('심화') || title.includes('반복') || title.includes('함수') || title.includes('클래스') || title.includes('알고리즘')) return PYTHON_REGION_IMAGES.advanced
  if (title.includes('데이터') || title.includes('시각화') || title.includes('분석') || title.includes('pandas') || title.includes('matplotlib')) return PYTHON_REGION_IMAGES.data
  if (title.includes('게임') || title.includes('프로젝트') || title.includes('turtle') || title.includes('창작')) return PYTHON_REGION_IMAGES.project

  return PYTHON_REGION_IMAGES.foundation
}

const REFINERY_CAUSE_IDS = ['concept_gap', 'equation_setup', 'missed_condition', 'calculation_error', 'no_checking']

function normalizeRefineryCause(causeId) {
  return ({
    concept: 'concept_gap',
    condition: 'missed_condition',
    calculation: 'calculation_error',
    guess: 'equation_setup'
  }[causeId] || causeId)
}

function buildRefineryCauseStats(records = []) {
  const latestByQuestion = new Map()
  records.forEach(record => {
    const key = record?.id || record?.questionId
    if (!key) {
      latestByQuestion.set(Symbol('cause-record'), record)
      return
    }
    latestByQuestion.set(key, record)
  })
  const counts = REFINERY_CAUSE_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
  latestByQuestion.forEach(record => {
    const causeId = normalizeRefineryCause(record?.lastRefineryCause || record?.refineryCause)
    if (counts[causeId] !== undefined) counts[causeId] += 1
  })
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const distribution = REFINERY_CAUSE_IDS.reduce((acc, id) => ({
    ...acc,
    [id]: total > 0 ? Math.round((counts[id] / total) * 100) : 0
  }), {})
  return { counts, distribution, total }
}

function SpaceHome() {
  // const navigate = useNavigate()
  const location = useLocation()
  const { user, userData, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentView, setCurrentView] = useState('planet') // 'planet', 'dashboard', 'collection', 'assignment_hub'
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [shouldScrollStore, setShouldScrollStore] = useState(false)
  
  // Selection State (Persist ID in session)
  const [selectedClusterId, setSelectedClusterId] = useState(() => {
    return sessionStorage.getItem('metasense_cluster_id') || null;
  });
  
  // --- 2D Mode Setup ---
  const [is2DMode, setIs2DMode] = useState(() => {
    return localStorage.getItem('metasense_2d_mode') === 'true';
  });

  useEffect(() => {
    if (!checkWebGLSupport()) {
      setIs2DMode(true);
      localStorage.setItem('metasense_2d_mode', 'true');
    }
  }, []);

  const toggle2DMode = useCallback(() => {
    setIs2DMode(prev => {
      const next = !prev;
      localStorage.setItem('metasense_2d_mode', next);
      if (soundManager?.playClick) soundManager.playClick();
      return next;
    });
  }, []);

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

  // Region Access State
  const [pendingRegion, setPendingRegion] = useState(null)
  const [accessError, setAccessError] = useState(null)
  const [verifyingCode, setVerifyingCode] = useState(false)
  
  // --- Dark Matter State ---
  const [isDarkMatterMode, setIsDarkMatterMode] = useState(false)
  const [darkMatterQuestions, setDarkMatterQuestions] = useState([])
  const [loadingDarkMatter, setLoadingDarkMatter] = useState(false)
  const [darkMatterCount, setDarkMatterCount] = useState(0)
  const [darkMatterStats, setDarkMatterStats] = useState({ activeCount: 0, masteredCount: 0, repeatedCount: 0, maxFail: 0 })
  const [activeDarkMatterQuizQs, setActiveDarkMatterQuizQs] = useState(null)
  const [darkMatterModeType, setDarkMatterModeType] = useState('learning')

  const stopDarkMatterMode = useCallback(() => {
    setIsDarkMatterMode(false)
    setActiveDarkMatterQuizQs(null)
    setDarkMatterQuestions([])
    setDarkMatterModeType('learning')
  }, [])

  const isRecheckDue = useCallback((mark) => {
    if (mark?.status !== 'recheck_pending') return false
    const dueMs = mark.recheckAvailableAt?.toMillis?.() || 0
    return !dueMs || dueMs <= Date.now()
  }, [])

  // Load initial dark matter count
  useEffect(() => {
    if (!user) return
    const loadCount = async () => {
      try {
        const iqSnap = await getDocs(collection(db, 'users', user.uid, 'incorrect_questions'))
        const rmSnap = await getDocs(collection(db, 'users', user.uid, 'review_marks'))
        const allIds = new Set()
        iqSnap.docs.forEach(d => allIds.add(d.id))
        rmSnap.docs.forEach(d => {
          const mark = d.data()
          if (mark?.status === 'active' || isRecheckDue(mark)) allIds.add(d.id)
        })
        const causeStats = buildRefineryCauseStats([
          ...iqSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          ...rmSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        ])
        setDarkMatterCount(allIds.size)
        setDarkMatterStats({
          activeCount: allIds.size,
          masteredCount: rmSnap.docs.filter(d => d.data()?.status === 'mastered').length,
          pendingCount: rmSnap.docs.filter(d => d.data()?.status === 'recheck_pending').length,
          repeatedCount: iqSnap.docs.filter(d => (d.data()?.failCount || 0) >= 2).length,
          maxFail: iqSnap.docs.reduce((max, d) => Math.max(max, d.data()?.failCount || 0), 0),
          causeStats
        })
      } catch (e) { /* non-critical */ }
    }
    loadCount()
  }, [user, isRecheckDue])

  // Sync view from location state (e.g. when coming from Agora)
  useEffect(() => {
    if (location.state?.view) {
      setCurrentView(location.state.view)
      updateSelectedRegionId(null)
      updateSelectedChapterDocId(null)
      updateSelectedUnitDocId(null) // Clear stuck mission ID
      setQuickQuizUnitId(null)      // Clear quick quiz
      if (isDarkMatterMode) stopDarkMatterMode() // Exit dark matter if active
      
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title)
    }
  }, [location, isDarkMatterMode, stopDarkMatterMode])

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
    if (loadingClusters) return;

    // 1. Validate if the currently selected cluster still exists in activeClusters
    if (selectedClusterId && activeClusters.length > 0) {
      const isValid = activeClusters.some(c => c.docId === selectedClusterId || c.id === selectedClusterId);
      if (!isValid) {
        // If not valid anymore (e.g. access revoked), clear it
        updateSelectedClusterId(null);
      }
    }

    // 2. Only auto-select if we have exactly one cluster AND it's not loading
    if (activeClusters.length === 1 && !selectedClusterId) {
      updateSelectedClusterId(activeClusters[0].docId || activeClusters[0].id);
    }
  }, [activeClusters, selectedClusterId, loadingClusters]);

  const { data: regions, isLoading: loadingRegions, isError: errorRegions } = useRegions(selectedClusterId)
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  
  // Singular hooks to resolve hierarchy for deep links
  const { data: singleUnit } = useUnit(selectedUnitDocId || quickQuizUnitId)
  const { data: singleChapter } = useChapter(selectedChapterDocId || singleUnit?.chapterId)
  const { data: singleRegion } = useRegion(selectedRegionId || singleChapter?.regionId)

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
  const activeChapter = chapters?.find(c => c.docId === selectedChapterDocId) || singleChapter
  const activeUnit = units?.find(u => u.docId === (selectedUnitDocId || quickQuizUnitId)) || singleUnit

  const handleBackFromMission = useCallback(() => {
    // Logic: Mission Control -> Chapter Selection (Units List -> Chapters List)
    
    // Explicitly preserve hierarchy before clearing unit for deep-linked scenarios
    const cid = activeUnit?.chapterId || selectedChapterDocId;
    const rid = activeChapter?.regionId || singleChapter?.regionId || selectedRegionId;
    const clid = singleRegion?.clusterId || activeRegion?.clusterId || selectedClusterId;

    if (cid) updateSelectedChapterDocId(cid);
    if (rid) updateSelectedRegionId(rid);
    if (clid) updateSelectedClusterId(clid);

    updateSelectedUnitDocId(null);
    setQuickQuizUnitId(null);
    setQuickQuizMode(null);
    
    // Ensure we transition into the hierarchy view (Planet view)
    // regardless of where we came from (e.g. assignment hub)
    setCurrentView('planet');
  }, [activeUnit, activeChapter, singleChapter, singleRegion, activeRegion, selectedChapterDocId, selectedRegionId, selectedClusterId]);

  // Track Presence Activity
  const currentLocationString = useMemo(() => {
    if (activeUnit) return `${activeUnit.title} ${quickQuizMode ? '(퀴즈 중)' : '(학습 중)'}`;
    if (activeChapter) return `${activeChapter.title} 진입`;
    if (activeRegion) return `${activeRegion.title} 탐색 중`;
    if (isDarkMatterMode) return '다크 매터(오답 노트) 정화 중';
    if (currentView === 'dashboard') return '대시보드 방문 중';
    if (currentView === 'collection') return '도감 방문 중';
    if (currentView === 'crew') return '스터디 크루 방문 중';
    if (currentView === 'assignment_hub') return '항행 일지(과제) 작성 중';
    return '우주 공간(메인) 대기 중';
  }, [activeUnit, activeChapter, activeRegion, isDarkMatterMode, currentView, quickQuizMode]);

  usePresence(user?.uid, selectedClusterId, currentLocationString, activeUnit?.docId);

  // Auto-skip single chapter OR Auto-resolve Parent Chapter if jumping directly to a unit
  useEffect(() => {
    // 1. Resolve Chapter from activeUnit if it's missing (for direct link jumps)
    if (activeUnit?.chapterId && !selectedChapterDocId) {
       updateSelectedChapterDocId(activeUnit.chapterId);
    }
    
    // 2. Resolve Region from activeChapter if it's missing (for direct link jumps)
    if (activeChapter?.regionId && !selectedRegionId) {
       updateSelectedRegionId(activeChapter.regionId);
    }

    // 3. Resolve Cluster from singleRegion if it's missing (for direct link jumps)
    if (singleRegion?.clusterId && !selectedClusterId) {
       updateSelectedClusterId(singleRegion.clusterId);
    }

    // 4. Auto-skip single chapter (if we just opened a region)
    if (chapters && chapters.length === 1 && !selectedChapterDocId) {
      updateSelectedChapterDocId(chapters[0].docId)
    }
  }, [chapters, activeUnit, activeChapter, singleRegion, selectedChapterDocId, selectedRegionId, selectedClusterId])

  const fetchDarkMatterQuestions = async () => {
    if (!user) return []
    try {
      // 1. Fetch metadata IDs from incorrect_questions & review_marks
      const iqSnap = await getDocs(query(collection(db, 'users', user.uid, 'incorrect_questions'), orderBy('lastFailedAt', 'desc'), limit(100)))
      const rmSnap = await getDocs(collection(db, 'users', user.uid, 'review_marks'))
      
      const iqMeta = iqSnap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'incorrect' }))
      const allReviewMeta = rmSnap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'review' }))
      const rmMeta = allReviewMeta.filter(m => m.status === 'active' || isRecheckDue(m))
      const causeStats = buildRefineryCauseStats([...iqMeta, ...allReviewMeta])
      
      const allIds = Array.from(new Set([...iqMeta.map(m => m.id), ...rmMeta.map(m => m.id)]))
      const nextStats = {
        activeCount: allIds.length,
        masteredCount: allReviewMeta.filter(m => m.status === 'mastered').length,
        pendingCount: allReviewMeta.filter(m => m.status === 'recheck_pending').length,
        repeatedCount: iqMeta.filter(m => (m.failCount || 0) >= 2).length,
        maxFail: iqMeta.reduce((max, m) => Math.max(max, m.failCount || 0), 0),
        causeStats
      }
      setDarkMatterStats(nextStats)
      if (allIds.length === 0) return []

      // 2. Fetch fresh quiz data from 'quizzes'
      const freshQuestions = []
      for (let i = 0; i < allIds.length; i += 30) {
        const chunk = allIds.slice(i, i + 30)
        // Use documentId() here too since the IDs are document names
        const qSnap = await getDocs(query(collection(db, 'quizzes'), where(documentId(), 'in', chunk)))
        qSnap.docs.forEach(doc => {
          const id = doc.id
          const qData = doc.data()
          const rmItem = rmMeta.find(m => m.id === id)
          const iqItem = iqMeta.find(m => m.id === id)
          
          // Determine the most recent activity timestamp for this particular question
          const activeAt = iqItem?.lastFailedAt || rmItem?.markedAt || rmItem?.masteredAt || null

          freshQuestions.push({
            ...qData,
            id,
            _source: iqItem ? 'incorrect' : 'review',
            _reviewMark: !!rmItem,
            _reviewStatus: rmItem?.status || null,
            _activeAt: activeAt, // Add physical timestamp for sorting
            failCount: iqItem?.failCount || 0,
            lastFailedAt: iqItem?.lastFailedAt || null,
            unitId: qData.unitId || iqItem?.unitId || rmItem?.unitId,
            unitTitle: qData.unitTitle || iqItem?.unitTitle || rmItem?.unitTitle
          })
        })
      }

      // 3. Resolve unitTitles for all unique unitIds
      const uniqueUnitIds = Array.from(new Set(freshQuestions.map(q => q.unitId).filter(Boolean)))
      if (uniqueUnitIds.length > 0) {
        const unitTitlesMap = {}
        for (let i = 0; i < uniqueUnitIds.length; i += 30) {
          const chunk = uniqueUnitIds.slice(i, i + 30)
          // Use documentId() because unit IDs are document names in the units collection
          const uSnap = await getDocs(query(collection(db, 'units'), where(documentId(), 'in', chunk)))
          uSnap.docs.forEach(doc => {
            unitTitlesMap[doc.id] = doc.data().title
          })
        }
        
        // Update questions with resolved titles
        freshQuestions.forEach(q => {
          q.unitTitle = unitTitlesMap[q.unitId] || q.unitTitle || "수학 탐사"
        })
      }

      // 4. Sort by unitTitle for logical grouping in dashboard
      return freshQuestions.sort((a, b) => (a.unitTitle || '').localeCompare(b.unitTitle || ''))
    } catch (err) {
      console.error('Error fetching dark matter questions:', err)
      return []
    }
  }

  const startDarkMatterMode = async (modeType = 'learning') => {
    if (!user) return
    setLoadingDarkMatter(true)
    soundManager.playWarp()
    try {
      const merged = await fetchDarkMatterQuestions()

      if (merged.length === 0) {
        alert('다크 매터 영역에 문항이 없습니다! 당신의 지식은 완벽하게 빛나고 있습니다. 🌟')
        setLoadingDarkMatter(false)
        return
      }

      setDarkMatterQuestions(merged)
      setDarkMatterCount(merged.length)
      setActiveDarkMatterQuizQs(null) // Reset quiz selection
      setDarkMatterModeType(modeType)
      setIsDarkMatterMode(true)
    } finally {
      setLoadingDarkMatter(false)
    }
  }

  // --- Ore Radar Daily Bonus Logic ---
  const checkIsBonusUnit = (unitId) => {
    if (!isRadarActive(userData) || !unitId) return false
    
    // Deterministic selection based on UnitID + UID + Today's Date
    const today = getTodayKST()
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
    radar: isRadarActive(userData),
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

  // Fetch Transactions for Streak Sync
  useEffect(() => {
    if (!user) return;
    const txRef = collection(db, 'users', user.uid, 'crystal_transactions');
    // Only need recent ones for streak protection calculation
    const q = query(txRef, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingTransactions(false);
    });
    return () => unsubscribe();
  }, [user]);

  /**
   * --- Streak Drift Audit ---
   * Runtime update path and history reconstruction must stay identical.
   * We only log drift here; admin repair uses the same shared engine.
   */
  useEffect(() => {
    if (!user || !userData || loadingHistory || loadingTransactions) return;
    
    // 1. Calculate the ground truth streak from history and transactions
    const activeDates = extractLearningActivityDates(history, transactions);

    // Simple daily stats for extractDefendedDates (Key: YYYY-MM-DD)
    const dailyStatsObj = {};
    activeDates.forEach(d => { dailyStatsObj[d] = true; });

    const defendedDates = extractDefendedDates(transactions, userData, dailyStatsObj);
    const calculatedStreak = calculateStreakFromHistory(activeDates, defendedDates, getTodayKST());

    // 2. Compare with userData.currentStreak
    const storedStreak = userData.currentStreak || 0;
    
    // Ensure we have a valid calculated value
    if (calculatedStreak !== storedStreak && (history.length > 0 || transactions.length > 0)) {
      console.warn(`[StreakAudit] Drift detected. Calculated: ${calculatedStreak}, Stored: ${storedStreak}.`);
    }
  }, [user, userData, history, transactions, loadingHistory, loadingTransactions]);

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
      const currentUnitId = result.unitId || selectedUnitDocId || quickQuizUnitId || 'unknown'
      const scoreKey = result.type === 'workbook' ? `${currentUnitId}_workbook` : currentUnitId
      const previousBest = bestScores[scoreKey] || 0
      let actualCrystalsEarned = 0
      let rewardMessage = ""

      if (crystalsEarned < 0) {
        // --- Negative Reward (Penalty) ---
        // Always apply penalty even if score didn't improve
        actualCrystalsEarned = crystalsEarned
        rewardMessage = `무지성 탐사로 인해 광석 ${Math.abs(crystalsEarned)}개가 소멸되었습니다.`
      } else if (isDarkMatterMode) {
        // --- Dark Matter Confidence-based Reward Policy ---
        // Reward is ONLY given for questions that are solved correctly AND the review mark is released.
        // If a user gets a question right but chooses to keep the review mark (guess or lack of confidence),
        // the question stays in Dark Matter and 0 crystals are awarded.
        const reviewMarkedIds = new Set((result.reviewMarkedQuestions || []).map(q => q.id))
        const correctIds = new Set((result.correctQuestions || []).map(q => q.id))
        
        let solvedAndReleasedCount = 0
        result.correctQuestions?.forEach(q => {
          if (!reviewMarkedIds.has(q.id)) {
            solvedAndReleasedCount++
          }
        })

        actualCrystalsEarned = Math.min(5, solvedAndReleasedCount)
        rewardMessage = actualCrystalsEarned > 0 
          ? `🌌 다크 매터 정화 성공! (+${actualCrystalsEarned} 광석)`
          : "문제를 맞혔으나 '재검토' 마크를 유지하여 보상이 지급되지 않았습니다. (학습 지속)"
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
        if (!isDarkMatterMode) {
          const isScannerBonusUnit = checkIsBonusUnit(currentUnitId)
          if (isScannerBonusUnit && isRadarActive(userData)) {
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
      // getDoc() + client merge write 패턴은 중간에 다른 쓰기(예: 코어 구매 increment)가 끼어들어
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
          
          if (!isDarkMatterMode && checkIsBonusUnit(currentUnitId) && isRadarActive(freshUserData)) {
            atomicCrystalsEarned += 5
          }

          // --- Holiday Multiplier ---
          if (atomicCrystalsEarned > 0) {
            atomicCrystalsEarned = applyHolidayMultiplier(atomicCrystalsEarned, getTodayKST());
          }
        }

        const prevConsecutiveGood = score >= 90 ? (freshUserData.consecutiveGood || 0) + 1 : 0
        const currentShieldCharges = freshUserData?.shieldCharges || 0

        // Daily Task Reset Logic
        const today = getTodayKST()
        const lastQuizDate = freshUserData.lastQuizDate || ""
        const dailyQuizCount = (lastQuizDate === today) ? (freshUserData.dailyQuizCount || 0) + 1 : 1

        // --- Direct Growth Counter ---
        const kstPart = getKSTComponents()
        const todayKST = getTodayKST()
        const mondayOffset = (kstPart.dayOfWeek + 6) % 7
        const mondayDate = new Date()
        mondayDate.setDate(mondayDate.getDate() - mondayOffset)
        const mondayKST = getTodayKST(mondayDate)

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
        const streakCalc = calculateStreakUpdate(freshUserData)
        const streakUpdates = streakCalc.streakUpdate || {}

        // --- Atomic Logging: Streak Freeze ---
        if (streakCalc.meta?.freezeUsed) {
          recordCrystalTransaction(user.uid, {
            amount: 0,
            type: 'streak_freeze',
            description: `크라이오 코어로 연속 탐사 궤도 보호`,
            metadata: { 
              unitId: currentUnitId,
              streakBefore: freshUserData?.currentStreak || 0,
              streakAfter: streakCalc.meta.newStreak,
              defendedDates: streakCalc.meta.defendedDates || [],
              consumedFreezeCount: streakCalc.meta.consumedFreezeCount || 0,
              balanceBefore: freshUserData?.streakFreezeCount || 0,
              balanceAfter: streakUpdates.streakFreezeCount ?? freshUserData?.streakFreezeCount ?? 0
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
        const existingInitialScore = freshProgressData.initialScore
        const sessionAttemptCount = result.attemptCount || 1 // 1 pass + N re-solves
        const currentAttemptCount = (freshProgressData.attemptCount || 0) + sessionAttemptCount
        
        // 진척도 문서(learning_progress)에는 최초 발생했던 점수를 영구 보존합니다.
        const initialScoreToSave = (existingInitialScore !== undefined) ? existingInitialScore : (result.initialRawScore ?? score)

        const historyRef = doc(collection(db, 'users', user.uid, 'history'))
        transaction.set(historyRef, {
          unitId: currentUnitId,
          unitTitle: activeUnit?.title || "탐사 퀴즈",
          regionId: selectedRegionId || freshUserData.lastRegionId || "",
          regionTitle: activeRegion?.title || "Unknown Galaxy",
          chapterId: selectedChapterDocId || "",
          clusterId: selectedClusterId,
          score: score,
          initialScore: result.initialRawScore ?? score, // 해당 세션만의 순수 최초 점수를 기록 (useLeaderboard가 과거 영수증을 역산하는데 사용됨)
          attemptCount: sessionAttemptCount, // 해당 세션에서 발생한 시도 횟수만 기록 (useLeaderboard가 합산하는데 사용됨)
          totalCount: result.totalCount || 0,
          correctCount: result.correctCount || 0,
          crystalsEarned: atomicCrystalsEarned,
          type: result.type === 'workbook' ? 'workbook' : 'quiz',
          timestamp: serverTimestamp()
        })

        // --- Update Progress Doc (Source of truth for bestScore, initialScore, attemptCount) ---
        transaction.set(progressDocRef, {
          bestScore: Math.max(serverPreviousBest, score),
          initialScore: initialScoreToSave,
          attemptCount: currentAttemptCount,
          updatedAt: serverTimestamp()
        }, { merge: true })

        const userUpdates = {
          crystals: (freshUserData.crystals || 0) + atomicCrystalsEarned,
          starCores: (freshUserData.starCores || 0) + (result.refineryMode ? (result.starCoresEarned || 0) : 0),
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
        }

        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: 'space_home_quiz_complete',
            writerUid: user.uid,
            prevState: freshUserData,
            nextState: {
              currentStreak: streakUpdates.currentStreak,
              lastStreakDate: streakUpdates.lastStreakDate,
              streakFreezeCount: streakUpdates.streakFreezeCount,
            },
            writtenAt: serverTimestamp(),
            note: currentUnitId,
          })
        }

        // Transaction 내에서는 increment()를 쓸 수 없으므로, 직접 계산
        transaction.update(userDocRef, userUpdates)

        return { streakCalc, freshUserData, atomicCrystalsEarned }
      })

      // Transaction 밖에서 부수효과 처리 (트랜잭션 성공 후)
      const { streakCalc: streakResultsFinal, atomicCrystalsEarned: finalCrystals } = streakResult
      const finalStreakUpdates = streakResultsFinal.streakUpdate || {}

      // --- Atomic Batch: Update incorrect_questions and review_marks ---
      const finalBatch = writeBatch(db)
      let hasBatchOps = false
      const reviewMarkedIds = new Set((result.reviewMarkedQuestions || []).map(q => q.id))

      // 1. Handle wrongly answered questions (incorrect_questions)
      if (result.wrongQuestions && result.wrongQuestions.length > 0) {
        result.wrongQuestions.forEach(q => {
          const qRef = doc(db, 'users', user.uid, 'incorrect_questions', q.id)
          finalBatch.set(qRef, {
            ...q,
            lastFailedAt: serverTimestamp(),
            failCount: increment(1)
          }, { merge: true })
          if (result.refineryMode) {
            finalBatch.set(doc(db, 'users', user.uid, 'review_marks', q.id), {
              questionId: q.id,
              unitId: q.unitId || '',
              unitTitle: q.unitTitle || '',
              conceptId: q.conceptId || '',
              status: 'active',
              markedAt: serverTimestamp(),
              lastRefineryCause: q.refineryCause || '',
              masteryStage: 'needs_refinery'
            }, { merge: true })
          }
        })
        hasBatchOps = true
      }

      // 2. Handle correctly answered questions (Delete from incorrect, conditionally mark as mastered)
      if (result.correctQuestions && result.correctQuestions.length > 0) {
        result.correctQuestions.forEach(q => {
          // Delete from incorrect_questions
          finalBatch.delete(doc(db, 'users', user.uid, 'incorrect_questions', q.id))

          if (result.refineryMode) {
            const reviewRef = doc(db, 'users', user.uid, 'review_marks', q.id)
            if (q.refineryRecheckPassed) {
              finalBatch.set(reviewRef, {
                ...q,
                status: 'mastered',
                masteredAt: serverTimestamp(),
                lastRefineryCause: q.refineryCause || '',
                masteryStage: 'mastered'
              }, { merge: true })
            } else {
              finalBatch.set(reviewRef, {
                ...q,
                status: 'recheck_pending',
                markedAt: serverTimestamp(),
                recheckAvailableAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
                lastRefineryCause: q.refineryCause || '',
                masteryStage: 'pending_recheck'
              }, { merge: true })
            }
            return
          }
          
          // Mastery ONLY if NOT marked for review (confidence)
          if (!reviewMarkedIds.has(q.id)) {
            finalBatch.set(doc(db, 'users', user.uid, 'review_marks', q.id), { 
              status: 'mastered', 
              masteredAt: serverTimestamp() 
            }, { merge: true })
          } else {
            // Keep as active if marked, even if correct
            finalBatch.set(doc(db, 'users', user.uid, 'review_marks', q.id), { 
              ...q,
              status: 'active',
              markedAt: serverTimestamp()
            }, { merge: true })
          }
        })
        hasBatchOps = true
      }

      // 3. Handle NEW/TOGGLED review marks for questions NOT in correctQuestions 
      // (Correct questions already handled in step 2)
      const correctIds = new Set((result.correctQuestions || []).map(q => q.id))
      if (result.reviewMarkedQuestions && result.reviewMarkedQuestions.length > 0) {
        result.reviewMarkedQuestions.forEach(q => {
          if (correctIds.has(q.id)) return // Already handled

          const rmRef = doc(db, 'users', user.uid, 'review_marks', q.id)
          finalBatch.set(rmRef, {
            questionId: q.id,
            unitId: q.unitId || '',
            unitTitle: q.unitTitle || '',
            regionId: q.regionId || '',
            chapterId: q.chapterId || '',
            markedAt: serverTimestamp(),
            status: 'active'
          }, { merge: true })
        })
        hasBatchOps = true
      }

      if (hasBatchOps) await finalBatch.commit()

      // --- Update dark matter count & list ---
      try {
        const updatedList = await fetchDarkMatterQuestions()
        setDarkMatterQuestions(updatedList)
        setDarkMatterCount(updatedList.length)
      } catch (e) { /* non-critical */ }

      // Mastery Compensation removed duplicate check

      if (isPerfect && previousBest < 100) {
        soundManager.playLevelUp()
      }

      // Trigger streak celebration if milestone reached
      if (streakResultsFinal?.meta?.justReachedMilestone) {
        setStreakCelebration({
          milestone: streakResultsFinal.meta.justReachedMilestone,
          currentStreak: finalStreakUpdates.currentStreak || streakResultsFinal.meta.newStreak
        })
      }

      setCompletionResult({
        crystalsEarned: finalCrystals,
        isPerfect: isPerfect && previousBest < 100, // Only show perfect effect for first time
        rewardMessage: finalCrystals > 0 
          ? (isDarkMatterMode 
              ? `🌌 다크 매터 정화 성공! (+${finalCrystals} 광석)` 
              : `${score}점으로 최고 기록을 경신했습니다! (+${finalCrystals} 광석)`) + (isRestDay(getTodayKST()) ? ' ✨ (휴일 보너스)' : '')
          : (score === 100 ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)" : `최고 점수를 넘지 못해 추가 광석을 획득할 수 없습니다.`),
        streakInfo: {
          currentStreak: finalStreakUpdates.currentStreak || streakResultsFinal?.meta?.newStreak,
          freezeUsed: streakResultsFinal?.meta?.freezeUsed,
          isNewRecord: streakResultsFinal?.meta?.isNewRecord,
          alreadyDoneToday: streakResultsFinal?.meta?.alreadyDoneToday,
          justReachedMilestone: streakResultsFinal?.meta?.justReachedMilestone
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

    const {
      transmissionId,
      transmissionTitle,
      stampedSeconds,
      activityCategory,
      attentionSource,
      attentionResult,
      attentionOpportunityId,
      attentionWindowSeconds
    } = activityMetadata
    const currentUnitId = selectedUnitDocId || quickQuizUnitId || 'unknown'
    
    const userDocRef = doc(db, 'users', user.uid)
    const progressDocRef = doc(db, 'users', user.uid, 'learning_progress', currentUnitId)

    const isVideoActivity =
      activityCategory === 'video' ||
      activityType.includes('영상') ||
      activityType.includes('타임어택') ||
      !!transmissionId ||
      !!attentionSource
    const isLogActivity = activityCategory === 'text' || activityType.includes('로그')
    const isAttentionEvent = !!attentionSource
    const isAttentionMiss = isAttentionEvent && attentionResult === 'miss'

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userDocRef)
        const freshProgressSnap = await transaction.get(progressDocRef)
        
        if (!freshUserSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshUserSnap.data()
        const freshProgressData = freshProgressSnap.exists() ? freshProgressSnap.data() : {}

        // --- Duplicate Reward Prevention ---
        let actualReward = crystalsEarned
        let rewardBlockedReason = null

        if (isVideoActivity && transmissionId) {
          const videoProg = freshProgressData.videoProgress?.[transmissionId] || {}
          const isInterval = activityType.includes('수신')
          const isCompletion = activityType.includes('완료')

          // --- Multi-Device / Concurrent Video Exploit Prevention (170s Cooldown) ---
          // Apply cooldown only to interval rewards to allow completion bonus (+20) 
          // to immediately follow an interval reward (+10) for the same video.
          if (isInterval && freshUserData.lastVideoRewardTime) {
            const lastTimeSec = freshUserData.lastVideoRewardTime.seconds 
                                || freshUserData.lastVideoRewardTime._seconds 
                                || 0;
            if (lastTimeSec > 0) {
              const nowSeconds = Math.floor(Date.now() / 1000);
              const diffSeconds = nowSeconds - lastTimeSec;
              // --- Relaxed Cooldown (Accommodates 2x playback speed) ---
              if (diffSeconds < 60) {
                actualReward = 0
                rewardBlockedReason = 'cooldown'
              }
            }
          }

          if (actualReward > 0) {
            if (isCompletion && videoProg.completionBonusGiven) {
              actualReward = 0 // Already got completion bonus
              rewardBlockedReason = 'duplicate'
            } else if (isInterval) {
              // Check based on rewardedStampCount
              const rewardedCount = videoProg.rewardedStampCount || 0
              const currentTotalStamps = stampedSeconds?.length || 0
              if (currentTotalStamps <= rewardedCount) {
                actualReward = 0 // No new stamps to reward
                rewardBlockedReason = 'duplicate'
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
        const todayKST = getTodayKST()

        // --- Holiday Multiplier ---
        if (actualReward > 0) {
          actualReward = applyHolidayMultiplier(actualReward, todayKST);
        }

        // --- Daily Video Reward Cap (Prevent infinite farming) ---
        // Apply cap to both interval and completion rewards
        if (actualReward > 0 && isVideoActivity) {
          let dailyVideoCrystals = freshUserData.dailyVideoCrystals || 0
          if (freshUserData.dailyVideoDate !== todayKST) {
            dailyVideoCrystals = 0
          }
          
          const DAILY_VIDEO_CAP = 500 // Max 500 crystals per day from video activities
          if (dailyVideoCrystals >= DAILY_VIDEO_CAP) {
            actualReward = 0
            rewardBlockedReason = 'daily_cap'
          } else if (dailyVideoCrystals + actualReward > DAILY_VIDEO_CAP) {
            actualReward = DAILY_VIDEO_CAP - dailyVideoCrystals
            if (actualReward <= 0) {
              rewardBlockedReason = 'daily_cap'
            }
          }

          if (actualReward > 0) {
            userUpdates.dailyVideoCrystals = dailyVideoCrystals + actualReward
            userUpdates.dailyVideoDate = todayKST
            // Update the global video reward timestamp whenever ANY video reward is given
            userUpdates.lastVideoRewardTime = serverTimestamp()
          }
        }

        // Safety Guard: Ensure actualReward is a valid number
        if (isNaN(actualReward) || actualReward === undefined) {
          console.warn("SpaceHome: actualReward is NaN or undefined in handleNonQuizActivityComplete, resetting to 0")
          actualReward = 0
        }

        const shouldLogFocusOnly = isVideoActivity && rewardBlockedReason === 'daily_cap'
        const isCompletionActivity = activityType.includes('완료') || isLogActivity
        const shouldLogHistory = isCompletionActivity || streakResult.streakUpdate?.lastStreakDate || actualReward > 0 || isAttentionMiss || shouldLogFocusOnly
        const effectiveAttentionOpportunityId = attentionOpportunityId || (shouldLogFocusOnly ? `video_limit_${Math.floor(Date.now() / 1000)}` : "")

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
        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: 'space_home_nonquiz_complete',
            writerUid: user.uid,
            prevState: freshUserData,
            nextState: {
              currentStreak: streakUpdates.currentStreak,
              lastStreakDate: streakUpdates.lastStreakDate,
              streakFreezeCount: streakUpdates.streakFreezeCount,
            },
            writtenAt: serverTimestamp(),
            note: `${activityType}:${currentUnitId}`,
          })
        }

        transaction.update(userDocRef, userUpdates)

        // Update Progress Doc (Idempotent update using dot notation to avoid overwriting maps)
        if (isLogActivity && !freshProgressData.logRead) {
          transaction.set(progressDocRef, {
            logRead: true,
            logReadAt: serverTimestamp(),
            unitTitle: activeUnit?.title || "",
            updatedAt: serverTimestamp()
          }, { merge: true })
        } else if (isVideoActivity && transmissionId) {
          const baseKey = `videoProgress.${transmissionId}`
          if (activityType.includes('완료')) {
             transaction.set(progressDocRef, {
               [`${baseKey}.completed`]: true,
               [`${baseKey}.completionBonusGiven`]: true,
               [`${baseKey}.updatedAt`]: serverTimestamp(),
               updatedAt: serverTimestamp()
             }, { merge: true })
          } else if (activityType.includes('수신') && stampedSeconds) {
             transaction.set(progressDocRef, {
               [`${baseKey}.rewardedStampCount`]: stampedSeconds.length,
               [`${baseKey}.stampedSeconds`]: stampedSeconds,
               [`${baseKey}.updatedAt`]: serverTimestamp(),
               updatedAt: serverTimestamp()
             }, { merge: true })
          }
        }

        // --- Atomic Logging: Streak Freeze ---
        if (streakResult.meta?.freezeUsed) {
          recordCrystalTransaction(user.uid, {
            amount: 0,
            type: 'streak_freeze',
            description: `크라이오 코어로 연속 탐사 궤도 보호 (${activityType})`,
            metadata: { 
              unitId: currentUnitId,
              streakBefore: freshUserData?.currentStreak || 0,
              streakAfter: streakResult.meta.newStreak,
              defendedDates: streakResult.meta.defendedDates || [],
              consumedFreezeCount: streakResult.meta.consumedFreezeCount || 0,
              balanceBefore: freshUserData?.streakFreezeCount || 0,
              balanceAfter: streakUpdates.streakFreezeCount ?? freshUserData?.streakFreezeCount ?? 0
            }
          }, transaction)
        }

        if (actualReward > 0) {
          let stableTxId = null;
          if (isLogActivity) {
            stableTxId = `log_${currentUnitId}`;
          } else if (isVideoActivity) {
            if (attentionSource === 'time_attack' && attentionOpportunityId) {
              stableTxId = `video_attention_${currentUnitId}_${transmissionId}_${attentionOpportunityId}`;
            } else if (activityType.includes('완료')) {
              stableTxId = `video_bonus_${currentUnitId}_${transmissionId}`;
            } else if (activityType.includes('수신')) {
              // Extract minutes for interval reward stable ID
              const minMatch = activityType.match(/\((\d+)분/);
              const minutes = minMatch ? minMatch[1] : 'unknown';
              stableTxId = `video_interval_${currentUnitId}_${transmissionId}_${minutes}min`;
            }
          }

          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: isVideoActivity ? 'transmission_reward' : 'data_log_reward',
            description: `${transmissionTitle || activeUnit?.title || '탐사'} 보상 (${activityType})`,
            metadata: { unitId: currentUnitId, ...activityMetadata }
          }, transaction, stableTxId)
        }

        // --- Atomic Logging: History ---
        if (shouldLogHistory) {
          // Use stable ID to prevent duplicates. For non-completion intervals, include the time marker.
          let stableHistoryId = isLogActivity
            ? `log_completion_${currentUnitId}`
            : `video_completion_${currentUnitId}_${transmissionId || 'default'}`;

          if ((isAttentionEvent || shouldLogFocusOnly) && effectiveAttentionOpportunityId) {
            stableHistoryId = `video_attention_${currentUnitId}_${transmissionId || 'default'}_${attentionSource || 'video_limit'}_${effectiveAttentionOpportunityId}`;
          } else if (!isCompletionActivity && isVideoActivity) {
            const minMatch = activityType.match(/\((\d+)분/);
            const minutes = minMatch ? minMatch[1] : 'int';
            stableHistoryId = `video_interval_${currentUnitId}_${transmissionId || 'default'}_${minutes}min`;
          }
          
          const historyRef = doc(db, 'users', user.uid, 'history', stableHistoryId)
          transaction.set(historyRef, {
            unitId: currentUnitId,
            unitTitle: transmissionTitle || activeUnit?.title || `탐사 기록 (${activityType})`,
            transmissionId: transmissionId || "",
            regionId: selectedRegionId || activeRegion?.id || "",
            regionTitle: activeRegion?.title || "Unknown Galaxy",
            chapterId: selectedChapterDocId || "",
            clusterId: selectedClusterId,
            score: 100,
            crystalsEarned: actualReward,
            timestamp: serverTimestamp(),
            type: isLogActivity ? 'text' : ((isAttentionMiss || shouldLogFocusOnly) ? 'attention' : 'video'),
            activityType,
            // Include video duration and stamp count in metadata for summary calculation
            videoTime: activityMetadata.videoTime || 0,
            stampedCount: stampedSeconds?.length || 0,
            attentionSource: attentionSource || (shouldLogFocusOnly ? 'video_limit' : ""),
            attentionResult: attentionResult || (shouldLogFocusOnly ? 'hit' : ""),
            attentionOpportunityId: effectiveAttentionOpportunityId,
            attentionWindowSeconds: attentionWindowSeconds || null
          }, { merge: true })
        }

        return { streakCalcResult: streakResult, streakUpdates, txUserData: freshUserData, actualReward, rewardBlockedReason }
      })

      const { streakCalcResult, streakUpdates, txUserData, actualReward, rewardBlockedReason } = txResult

      // Trigger milestone celebration
      if (streakCalcResult.meta?.justReachedMilestone) {
        setStreakCelebration({
          milestone: streakCalcResult.meta.justReachedMilestone,
          currentStreak: streakUpdates.currentStreak || streakCalcResult.meta.newStreak
        })
      }

      // Visual feedback
      // ONLY show the large completion modal for completion or data log rewards.
      // Interval rewards (영상 교신 수신) only show the Silent Toast in MissionHub.
      const isIntervalActivity = activityType.includes('수신');
      const shouldShowModal = activityType.includes('완료') || isLogActivity;

      if (actualReward > 0 || shouldShowModal) {
        soundManager.playLevelUp()
        
        if (shouldShowModal) {
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
      }

      return { actualReward, rewardBlockedReason, streakCalcResult, streakUpdates, txUserData }
    } catch (err) {
      console.error("Error in activity completion:", err)
      return { actualReward: 0, rewardBlockedReason: 'error' }
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
      : true; // Default to true if unknown to ensure Mission Control loads

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
      // Empty unit or still loading? Fallback to briefing (Mission Control)
      initialMode = 'briefing';
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

  // --- Profile View ---
  if (currentView === 'profile') {
    return (
      <div className="space-bg" style={{ overflowY: 'auto' }}>
        <SpaceNavbar 
          currentView={currentView} 
          onViewChange={(view) => {
            setCurrentView(view)
          }} 
        />
        <ProfileEditView onBack={() => { setCurrentView('planet'); soundManager.playWarp(); }} />
      </div>
    )
  }

  if (currentView === 'crew') {
    return (
      <div className="space-bg" style={{ overflowY: 'auto' }}>
        <SpaceNavbar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view)
          }}
        />
        <StudyCrewView 
          onBack={() => { setCurrentView('planet'); soundManager.playWarp(); }} 
          onNavigateStore={(scroll) => {
            setCurrentView('store');
            setShouldScrollStore(!!scroll);
            soundManager.playClick();
          }} 
        />
      </div>
    )
  }

  // --- Dark Matter View ---
  if (isDarkMatterMode && darkMatterQuestions.length > 0) {
    // Stage 1: Dashboard
    if (!activeDarkMatterQuizQs) {
      if (darkMatterModeType === 'refinery') {
        return (
          <DarkMatterRefineryView
            questions={darkMatterQuestions}
            totalHistoryCount={history.length}
            stats={darkMatterStats}
            onComplete={handleComplete}
            onExit={stopDarkMatterMode}
            onOpenLearningDarkMatter={() => {
              setActiveDarkMatterQuizQs(null)
              setDarkMatterModeType('learning')
            }}
          />
        )
      }

      return (
        <DarkMatterView 
          questions={darkMatterQuestions}
          totalHistoryCount={history.length}
          onStartQuiz={(qs) => setActiveDarkMatterQuizQs(qs)}
          onExit={stopDarkMatterMode}
        />
      )
    }

    // Stage 2: Quiz
    const isRefineryQuiz = darkMatterModeType === 'refinery'
    return (
      <SpaceQuizView
        key={isRefineryQuiz ? 'dark-matter-refinery-quiz' : 'dark-matter-quiz'}
        region={{ color: isRefineryQuiz ? '#f59e0b' : '#a855f7', title: isRefineryQuiz ? '다크매터 정제소' : '다크 매터 영역' }}
        quizData={{
          unitId: isRefineryQuiz ? 'dark_matter_refinery' : 'dark_matter_zone',
          title: isRefineryQuiz ? '⚗️ 다크매터 정화 작전' : '🌌 다크 매터 탐사',
          questions: activeDarkMatterQuizQs
        }}
        onExit={() => setActiveDarkMatterQuizQs(null)}
        onComplete={async (result) => {
          await handleComplete(result)
          // If we finished the current batch, go back to dashboard to see remaining
          setActiveDarkMatterQuizQs(null)
          // We don't exit entirely so they can see the progress in the meter
        }}
        hasShield={userData?.shieldCharges || 0}
        hasRadar={false}
      />
    )
  }

  // Main App
  return (
    <div className="space-bg" style={{ 
      overflowX: 'hidden'
    }}>
      {/* 3D Background Scene - Always Visible but controlled by state */}
      <AnimatePresence>
        {currentView === 'planet' && selectedClusterId && !is2DMode && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
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
                   } else if (accessStatus !== 'active' && accessStatus !== 'completed') {
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
              onSelectDarkMatter={() => {
                startDarkMatterMode('learning');
              }}
              onSelectDarkMatterRefinery={() => {
                startDarkMatterMode('refinery');
              }}
              darkMatterCount={darkMatterCount}
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
          updateSelectedUnitDocId(null) // Reset mission when navigating via navbar
          setQuickQuizUnitId(null)
          setShouldScrollStore(false)
          if (isDarkMatterMode) stopDarkMatterMode()
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
      <main className="space-container" style={{ 
        pointerEvents: 'none',
        overflowY: 'visible'
      }}>
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
                position: is2DMode ? 'relative' : 'absolute', 
                top: is2DMode ? '0' : '100px', 
                left: is2DMode ? '0' : '50%', 
                transform: is2DMode ? 'none' : 'translateX(-50%)', 
                textAlign: 'center',
                width: '100%',
                pointerEvents: 'none',
                minHeight: is2DMode ? '100vh' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
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

                {/* 2D/3D Mode Toggle Button */}
                <button
                  className="space-btn cosmic-btn"
                  onClick={toggle2DMode}
                  style={{ 
                    position: 'fixed', 
                    right: '25px', 
                    top: '120px', 
                    padding: '12px 24px', 
                    fontSize: '1.05rem', 
                    fontWeight: 'bold',
                    pointerEvents: 'auto',
                    background: is2DMode ? 'rgba(80, 200, 120, 0.2)' : 'rgba(0, 212, 255, 0.15)',
                    border: `1px solid ${is2DMode ? 'var(--neon-green)' : 'var(--neon-blue)'}`,
                    boxShadow: `0 0 15px ${is2DMode ? 'rgba(80, 200, 120, 0.3)' : 'rgba(0, 243, 255, 0.3)'}`,
                    zIndex: 100,
                    color: is2DMode ? '#4ade80' : 'white',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {is2DMode ? '🌌 2D 지도 뷰 (3D로 전환)' : '🚀 3D 행성 뷰 (2D로 전환)'}
                </button>

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

                {/* Region Navigator — 2D 모드 메인 UI 또는 3D Fallback */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: is2DMode ? 0.1 : 0.8, duration: 0.8 }} // 2D 모드일 때는 즉시 렌더링, 3D 에러 대비용은 비교적 짧은 대기 후 렌더링
                  style={{
                    position: is2DMode ? 'relative' : 'fixed',
                    bottom: is2DMode ? 'auto' : '100px',
                    left: is2DMode ? 'auto' : '50%',
                    transform: is2DMode ? 'none' : 'translateX(-50%)',
                    marginTop: is2DMode ? '150px' : '0',
                    pointerEvents: 'auto',
                    zIndex: 50,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: is2DMode ? '2rem' : '0.6rem',
                    justifyContent: 'center',
                    maxWidth: is2DMode ? '1200px' : '90vw',
                    padding: is2DMode ? '2rem' : '1rem 1.5rem',
                    background: is2DMode ? 'transparent' : 'rgba(5, 5, 20, 0.7)',
                    backdropFilter: is2DMode ? 'none' : 'blur(12px)',
                    borderRadius: '16px',
                    border: is2DMode ? 'none' : '1px solid rgba(0, 243, 255, 0.15)',
                    margin: is2DMode ? '180px auto 100px' : undefined // Added more bottom margin for scrolling
                  }}
                >
                  {loadingRegions ? (
                    <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                      행성 맵 스캔 중...
                    </span>
                  ) : (!regions || regions.length === 0) ? (
                    <span className="font-tech" style={{ color: '#ff6b6b', fontSize: '1.2rem' }}>
                      ⚠ 탐사가능한 행성이 없습니다
                    </span>
                  ) : (
                    <>
                    {is2DMode && (
                      <>
                        {/* Special Card: Assignment Hub */}
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                          whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setCurrentView('assignment_hub');
                            if (soundManager?.playWarp) soundManager.playWarp();
                          }}
                          style={{
                            padding: '1.5rem',
                            width: '250px',
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.4)',
                            borderRadius: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🛰️</div>
                            <span className="font-tech" style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>과제 기록소</span>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#ffd700', fontWeight: 'bold' }}>Stellar Archive</div>
                          </div>
                        </Motion.div>

                        {/* Special Card: Dark Matter */}
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.15 } }}
                          whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            startDarkMatterMode();
                            if (soundManager?.playWarp) soundManager.playWarp();
                          }}
                          style={{
                            padding: '1.5rem',
                            width: '250px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🌑</div>
                            <span className="font-tech" style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>다크 매터</span>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#a78bfa', fontWeight: 'bold' }}>Review Needed: {darkMatterCount}</div>
                          </div>
                        </Motion.div>

                        {/* Special Card: Dark Matter Refinery */}
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
                          whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            startDarkMatterMode('refinery');
                            if (soundManager?.playWarp) soundManager.playWarp();
                          }}
                          style={{
                            padding: '1.5rem',
                            width: '250px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.45)',
                            borderRadius: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.22)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>⚗️</div>
                            <span className="font-tech" style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>다크매터 정제소</span>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold' }}>Purification: {darkMatterCount}</div>
                          </div>
                        </Motion.div>
                      </>
                    )}
                    {regions.map((region, idx) => {
                    const isRegionLocked = region.isPrivate && userData?.regionAccess?.[region.id] !== 'active' && userData?.regionAccess?.[region.id] !== 'completed';
                    const isCompleted = explorationStatus[region.id] === 'completed';
                    const middleMathRegionImage = selectedClusterId === 'middle-math' ? getMiddleMathRegionImage(region) : null;
                    const pythonRegionImage = selectedClusterId === 'python' ? getPythonRegionImage(region) : null;
                    
                    return (
                    <Motion.div
                      key={region.id}
                      initial={is2DMode ? { opacity: 0, scale: 0.8 } : false}
                      animate={is2DMode ? { opacity: 1, scale: 1, transition: { delay: idx * 0.05 + 0.2 } } : false}
                      whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (region.isPrivate) {
                          const accessStatus = userData?.regionAccess?.[region.id];
                          if (accessStatus === 'suspended') {
                            alert('이 행성에 대한 접근이 일시정지되었습니다.');
                            return;
                          } else if (accessStatus !== 'active' && accessStatus !== 'completed') {
                            setPendingRegion(region);
                            if (soundManager?.playClick) soundManager.playClick();
                            return;
                          }
                        }
                        updateSelectedRegionId(region.id);
                        if (soundManager?.playWarp) soundManager.playWarp();
                      }}
                      style={{
                        padding: is2DMode ? '1.5rem' : '0.5rem 1rem',
                        width: is2DMode ? '250px' : 'auto',
                        background: is2DMode 
                          ? (isCompleted ? 'rgba(80, 200, 120, 0.15)' : 'rgba(5, 20, 40, 0.8)') 
                          : (isCompleted ? 'rgba(80, 200, 120, 0.2)' : 'rgba(0, 212, 255, 0.1)'),
                        border: is2DMode 
                          ? `1px solid ${isCompleted ? 'rgba(80, 200, 120, 0.6)' : 'rgba(0, 243, 255, 0.4)'}`
                          : `1px solid ${isCompleted ? 'rgba(80, 200, 120, 0.5)' : 'rgba(0, 212, 255, 0.3)'}`,
                        borderRadius: is2DMode ? '20px' : '10px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: is2DMode ? 'column' : 'row',
                        alignItems: 'center',
                        gap: is2DMode ? '1rem' : '0.5rem',
                        boxShadow: is2DMode ? (isCompleted ? '0 8px 32px rgba(80,200,120,0.3)' : '0 8px 32px rgba(0,0,0,0.6)') : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Subdued background effect for 2D Mode */}
                      {is2DMode && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          background: region.color ? `radial-gradient(circle at top right, ${region.color}40, transparent 70%)` : 'none',
                          zIndex: 0
                        }}/>
                      )}
                      
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        {is2DMode && (
                          middleMathRegionImage || pythonRegionImage ? (
                            <img
                              src={middleMathRegionImage || pythonRegionImage}
                              alt={region.title}
                              style={{
                                width: '112px',
                                height: '112px',
                                objectFit: 'cover',
                                marginBottom: '0.75rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(255,255,255,0.16)',
                                boxShadow: isRegionLocked
                                  ? 'none'
                                  : '0 0 24px rgba(92, 216, 255, 0.22)',
                                filter: isRegionLocked ? 'grayscale(100%) opacity(45%)' : 'none'
                              }}
                            />
                          ) : (
                            <div style={{ 
                              fontSize: '4rem', 
                              marginBottom: '0.5rem', 
                              filter: isRegionLocked ? 'grayscale(100%) opacity(50%)' : 'drop-shadow(0 0 15px rgba(255,255,255,0.4))' 
                            }}>
                              {region.icon || '🌍'}
                            </div>
                          )
                        )}
                        <span className="font-tech" style={{ 
                          fontSize: is2DMode ? '1.3rem' : '0.85rem',
                          fontWeight: is2DMode ? 'bold' : 'normal',
                          color: isRegionLocked ? '#88aabb' : 'white'
                        }}>
                          {isRegionLocked && !is2DMode ? '🔒 ' : ''}
                          {region.title}
                        </span>
                        
                        {is2DMode && (
                          <div style={{ marginTop: '0.8rem', fontSize: '0.9rem', color: isRegionLocked ? '#ff6b6b' : 'var(--crystal-cyan)', fontWeight: 'bold' }}>
                            {isRegionLocked ? '🔒 접근 제한' : (isCompleted ? '⭐ 탐사 완료' : '진입 가능')}
                          </div>
                        )}
                      </div>
                    </Motion.div>
                    )
                  })}
                  </>
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
                    updateSelectedChapterDocId(null)
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
              startDarkMatterMode={() => startDarkMatterMode('learning')}
              startDarkMatterRefineryMode={() => startDarkMatterMode('refinery')}
              loadingDarkMatter={loadingDarkMatter}
              darkMatterCount={darkMatterCount}
            />
          )}
          {currentView === 'collection' && <SpaceCollection userData={userData} history={history} />}
          {currentView === 'store' && (
            <SpaceStore user={user} userData={userData} shouldScrollToBottom={shouldScrollStore} />
          )}
          
          {currentView === 'ranking' && <SpaceRanking user={user} userData={userData} regions={regions} />}
          {currentView === 'journey' && (
            <SpaceJourney 
              userData={userData} 
              initialHistory={history} 
              initialTransactions={transactions}
              parentLoading={loadingHistory || loadingTransactions}
            />
          )}
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
            onNavigateToUnit={(unitId) => {
              setCurrentView('planet');
              if (unitId) updateSelectedUnitDocId(unitId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


// RewardPotentialModal has been moved to MissionHub.jsx


export default SpaceHome
