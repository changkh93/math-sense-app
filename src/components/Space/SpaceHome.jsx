import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, db, functions } from '../../firebase'
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, where, getDocs, getDoc, writeBatch, increment, limit, runTransaction, Timestamp, documentId, updateDoc } from 'firebase/firestore'
import { useClusters, useRegions, useRegion, useChapters, useChapter, useUnits, useUnit, useQuizzes } from '../../hooks/useContent'
import { useAuth } from '../../hooks/useAuth'
import { usePresence } from '../../hooks/usePresence'
// import { regions as localRegions } from '../../data/regions'
import { motion as Motion, AnimatePresence } from 'framer-motion' // Added Framer Motion
import { httpsCallable } from 'firebase/functions'

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
import MistakeNotebookPlanet from './MistakeNotebookPlanet'
import WarpGateDocking from './WarpGateDocking'
import ProfileEditView from './ProfileEditView' // Profile Management
import StudyCrewView from './StudyCrewView'
import QuizBattleHub from './QuizBattleHub'
import MetaGalaxy from '../GalaxySocial/MetaGalaxy'
import {
  GalaxyEntryDialog,
  GalaxyIdlePrompt,
  GalaxyPlayHud,
  GalaxyPlayTimeStyles,
  GalaxyReconnectNotice,
  GalaxyReturnScreen,
  GalaxyTimeWarning,
} from '../GalaxySocial/GalaxyPlayTimeUI'
import { useGalaxyPlaySession } from '../../hooks/useGalaxyPlaySession'
import SectorLeaderboard from './SectorLeaderboard' // Leaderboard Integration
import MissionLeaderboard from './MissionLeaderboard' // Leaderboard Integration
import DarkMatterView from './DarkMatterView' // Dark Matter Integration
import DarkMatterRefineryView from './DarkMatterRefineryView'
import StudyStreamRoomView from './StudyStreamRoomView'
import CrewMothershipFlyby from './CrewMothershipFlyby'
import { useGlobalActiveRoomId } from '../../utils/roomState'
import CrystalLedger from './CrystalLedger'
import { useRecordAttendance, useStudentAttendance } from '../../hooks/useAssignments'

// import { useParticles, createParticleBurst } from './ParticleEffects'
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST, getKSTComponents, calculateStreakFromHistory, extractDefendedDates, extractLearningActivityDates, isRadarActive } from '../../utils/streakUtils'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import { applyCrystalRewardMultiplier } from '../../utils/holidayUtils'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'
import { StreakCelebrationModal, StreakToast } from './StreakCelebration'
import { getAttendanceDockingStatus } from '../../utils/attendanceUtils'
import { mergeSummaryWithRecentHistory } from '../../utils/learningSummaryUtils'

import soundManager from '../../utils/SoundManager'
import SpaceNavbar from './SpaceNavbar'
import Footer from '../common/Footer'
import { BellRing, Mail, Sparkles, X } from 'lucide-react'

// Styles
import '../../styles/space-theme.css'

function getRewardMultiplierSuffix(multiplierMeta) {
  if (!multiplierMeta || multiplierMeta.multiplier <= 1 || multiplierMeta.bonusAmount <= 0) return ''
  return ` ✨ (${multiplierMeta.label})`
}

function buildRewardMultiplierMetadata(multiplierMeta) {
  if (!multiplierMeta || multiplierMeta.multiplier <= 1) return {}
  return {
    rewardBaseAmount: multiplierMeta.baseAmount,
    rewardMultiplier: multiplierMeta.multiplier,
    rewardMultiplierReason: multiplierMeta.reason,
    rewardMultiplierLabel: multiplierMeta.label,
    rewardBonusAmount: multiplierMeta.bonusAmount,
    rewardMultiplierDate: multiplierMeta.dateStr,
    ...(multiplierMeta.rewardAmountBeforeCap ? { rewardAmountBeforeCap: multiplierMeta.rewardAmountBeforeCap } : {})
  }
}

const MIDDLE_MATH_REGION_IMAGES = {
  core: '/assets/planets/middle-math-core.png',
  analytics: '/assets/planets/middle-math-analytics.png',
  geometry: '/assets/planets/middle-math-geometry.png',
  exam: '/assets/planets/middle-math-exam.png'
}

const chunkArray = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function getRealtimeAlertTime(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function getMemoPreview(memo = {}) {
  const sender = memo.senderName || '탐사원'
  const body = String(memo.bodyPreview || memo.body || '').replace(/\s+/g, ' ').trim()
  if (/스터디|크루|오픈 스터디|공부 제안/.test(body)) {
    return `${sender}님이 공부 제안을 보냈어요.`
  }
  return `${sender}님에게 새 편지가 왔어요.`
}

function getNotificationPreview(notification = {}) {
  return String(notification.message || notification.title || '새 알림이 도착했어요.').replace(/\s+/g, ' ').trim()
}

function RealtimeTopAlerts({ userId }) {
  const [latestMemo, setLatestMemo] = useState(null)
  const [latestNotification, setLatestNotification] = useState(null)
  const [dismissedIds, setDismissedIds] = useState({})
  const [activeAlert, setActiveAlert] = useState(null)
  const [alertAction, setAlertAction] = useState('')

  useEffect(() => {
    if (!userId) {
      setLatestMemo(null)
      return undefined
    }

    const memoQuery = query(
      collection(db, 'directMemos'),
      where('recipientId', '==', userId),
      where('status', '==', 'delivered'),
      orderBy('sentAt', 'desc'),
      limit(6)
    )

    const unsub = onSnapshot(memoQuery, (snap) => {
      const memo = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .find((item) => !item.isRead && !item.recipientDeletedAt)
      setLatestMemo(memo || null)
    }, (err) => {
      console.warn('[RealtimeTopAlerts] memo subscribe failed:', err)
      setLatestMemo(null)
    })

    return () => unsub()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLatestNotification(null)
      return undefined
    }

    const notificationQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(6)
    )

    const unsub = onSnapshot(notificationQuery, (snap) => {
      const notification = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .find((item) => !item.isRead && item.type !== 'memo')
      setLatestNotification(notification || null)
    }, (err) => {
      console.warn('[RealtimeTopAlerts] notification subscribe failed:', err)
      setLatestNotification(null)
    })

    return () => unsub()
  }, [userId])

  const handleDismiss = (event, id) => {
    event.stopPropagation()
    setDismissedIds((prev) => ({ ...prev, [id]: true }))
    if (activeAlert?.id === id) setActiveAlert(null)
  }

  const handleOpenAlert = async (alert) => {
    setActiveAlert(alert)
    setAlertAction(alert.id)
    try {
      if (alert.kind === 'memo') {
        const markRead = httpsCallable(functions, 'markDirectMemoRead')
        await markRead({ memoId: alert.source.id })
      } else if (alert.kind === 'notification' && !alert.source.isRead) {
        await updateDoc(doc(db, 'notifications', alert.source.id), {
          isRead: true
        })
      }
    } catch (err) {
      console.warn('[RealtimeTopAlerts] mark read failed:', err)
    } finally {
      setAlertAction('')
    }
  }

  const alerts = [
    latestMemo ? {
      id: `memo:${latestMemo.id}`,
      kind: 'memo',
      label: '새 편지',
      text: getMemoPreview(latestMemo),
      detailTitle: `${latestMemo.senderName || '탐사원'}님의 편지`,
      detailBody: latestMemo.body || latestMemo.bodyPreview || '',
      time: getRealtimeAlertTime(latestMemo.sentAt || latestMemo.createdAt),
      Icon: Mail,
      color: '#00f3ff',
      source: latestMemo
    } : null,
    latestNotification ? {
      id: `notification:${latestNotification.id}`,
      kind: 'notification',
      label: '새 알림',
      text: getNotificationPreview(latestNotification),
      detailTitle: latestNotification.title || '알림 내용',
      detailBody: getNotificationPreview(latestNotification),
      time: getRealtimeAlertTime(latestNotification.createdAt),
      Icon: BellRing,
      color: '#fbbf24',
      source: latestNotification
    } : null
  ].filter((alert) => alert && !dismissedIds[alert.id])

  if (alerts.length === 0 && !activeAlert) return null

  return (
    <>
      <style>{`
        @keyframes realtimeAlertGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(0, 243, 255, 0.22), 0 12px 35px rgba(0,0,0,0.34); transform: translateY(0); }
          50% { box-shadow: 0 0 28px rgba(0, 243, 255, 0.46), 0 18px 48px rgba(0,0,0,0.42); transform: translateY(-1px); }
        }
        @keyframes realtimeSpark {
          0%, 100% { opacity: 0.55; transform: scale(0.92) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.08) rotate(12deg); }
        }
      `}</style>
      {alerts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'max(0.8rem, env(safe-area-inset-top, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4200,
            display: 'grid',
            gap: '0.45rem',
            width: 'min(560px, calc(100vw - 1.5rem))',
            pointerEvents: 'auto'
          }}
        >
          {alerts.map((alert) => {
            const { id, label, text, time, Icon, color } = alert
            const isBusy = alertAction === id
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                className="font-tech"
                onClick={() => handleOpenAlert(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleOpenAlert(alert)
                  }
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'grid',
                  gridTemplateColumns: '34px minmax(0, 1fr) auto 30px',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.62rem 0.52rem 0.62rem 0.78rem',
                  borderRadius: 12,
                  border: `1px solid ${color}66`,
                  background: 'linear-gradient(135deg, rgba(7,13,30,0.94), rgba(10,18,38,0.9))',
                  color: 'var(--text-bright)',
                  backdropFilter: 'blur(12px)',
                  animation: 'realtimeAlertGlow 1.45s ease-in-out infinite',
                  cursor: 'pointer'
                }}
              >
                <span style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: `${color}1f`,
                  color
                }}>
                  <Icon size={18} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color, fontWeight: 900, fontSize: '0.72rem', marginBottom: '0.12rem' }}>
                    <Sparkles size={13} style={{ animation: 'realtimeSpark 1.1s ease-in-out infinite' }} />
                    {label}
                  </span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.84rem', fontWeight: 800 }}>
                    {isBusy ? '확인 중...' : text}
                  </span>
                </span>
                {time && (
                  <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    {time}
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="알림 닫기"
                  onClick={(event) => handleDismiss(event, id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') handleDismiss(event, id)
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'rgba(255,255,255,0.68)',
                    background: 'rgba(255,255,255,0.06)'
                  }}
                >
                  <X size={15} />
                </span>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {activeAlert && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 4300,
              display: 'grid',
              placeItems: 'start center',
              padding: 'max(5.2rem, env(safe-area-inset-top, 0px)) 1rem 1rem',
              background: 'rgba(2,4,12,0.45)',
              backdropFilter: 'blur(5px)'
            }}
            onMouseDown={() => setActiveAlert(null)}
          >
            <Motion.div
              initial={{ y: -12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0, scale: 0.98 }}
              onMouseDown={(event) => event.stopPropagation()}
              className="font-tech"
              style={{
                width: 'min(560px, 100%)',
                borderRadius: 14,
                border: `1px solid ${activeAlert.color}66`,
                background: 'rgba(7,13,30,0.98)',
                color: 'var(--text-bright)',
                boxShadow: '0 24px 70px rgba(0,0,0,0.5)',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: activeAlert.color, fontWeight: 900, fontSize: '0.76rem', marginBottom: '0.18rem' }}>
                    {activeAlert.label}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeAlert.detailTitle}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setActiveAlert(null)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.78)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'rgba(255,255,255,0.86)', maxHeight: '48vh', overflowY: 'auto' }}>
                {activeAlert.detailBody || activeAlert.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', padding: '0 1rem 1rem' }}>
                {activeAlert.kind === 'notification' && activeAlert.source.link && (
                  <button
                    type="button"
                    className="space-btn font-tech"
                    onClick={() => {
                      window.open(activeAlert.source.link, '_blank', 'noopener,noreferrer')
                    }}
                    style={{ borderRadius: 9, minHeight: 36, padding: '0 0.8rem', color: activeAlert.color }}
                  >
                    새 탭에서 열기
                  </button>
                )}
                <button
                  type="button"
                  className="space-nav-link font-tech"
                  onClick={() => setActiveAlert(null)}
                  style={{ borderRadius: 9, minHeight: 36, padding: '0 0.8rem' }}
                >
                  닫기
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function getUnitContentAvailability(unit, quizAvailabilityMap = {}) {
  const unitId = unit?.docId || unit?.id
  const flags = unit?.contentFlags || {}
  const hasFlag = (key) => typeof flags[key] === 'boolean'

  return {
    hasQuiz: hasFlag('hasQuiz') ? flags.hasQuiz : !!quizAvailabilityMap[unitId],
    hasVideo: hasFlag('hasTransmission')
      ? flags.hasTransmission
      : !!((unit?.transmissions?.length > 0 && unit.transmissions.some(tx => tx.videoId)) || unit?.videoConfig?.videoId),
    hasText: hasFlag('hasDataLog')
      ? flags.hasDataLog
      : !!(unit?.learningContents?.text?.trim() || unit?.learningContents?.pdfUrl?.trim()),
    hasWorkbook: hasFlag('hasWorkbook')
      ? flags.hasWorkbook
      : !!(unit?.workbookPages && unit.workbookPages.length > 0),
    hasCodeTrace: hasFlag('hasCodeTrace') ? flags.hasCodeTrace : false
  }
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

const WESTERN_CLASSIC_REGION_IMAGES = {
  neverland: '/assets/planets/western-classic-neverland.webp',
  nobel: '/assets/planets/western-classic-nobel.webp',
  heritage: '/assets/planets/western-classic-heritage.webp'
}

function getWesternClassicRegionImage(region) {
  const title = region?.title || ''

  if (title.includes('네버랜드')) return WESTERN_CLASSIC_REGION_IMAGES.neverland
  if (title.includes('노벨문학상')) return WESTERN_CLASSIC_REGION_IMAGES.nobel
  return WESTERN_CLASSIC_REGION_IMAGES.heritage
}

function RegionPlanetVisual({ imageSrc, title, icon, isMobile, isLocked }) {
  const [imageFailed, setImageFailed] = useState(false)
  const visualSize = isMobile ? 72 : 112

  if (imageSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        onError={() => setImageFailed(true)}
        style={{
          width: visualSize,
          height: visualSize,
          objectFit: 'cover',
          marginBottom: isMobile ? '0.45rem' : '0.75rem',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: isLocked ? 'none' : '0 0 24px rgba(92, 216, 255, 0.22)',
          filter: isLocked ? 'grayscale(100%) opacity(45%)' : 'none',
          display: 'block'
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      title={title}
      style={{
        width: visualSize,
        height: visualSize,
        margin: `0 auto ${isMobile ? '0.45rem' : '0.75rem'}`,
        borderRadius: '999px',
        display: 'grid',
        placeItems: 'center',
        fontSize: isMobile ? '2.2rem' : '4rem',
        background: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.28), rgba(0,212,255,0.1) 38%, rgba(9,15,34,0.84) 72%)',
        border: '1px solid rgba(0, 243, 255, 0.26)',
        boxShadow: isLocked ? 'none' : '0 0 24px rgba(92, 216, 255, 0.18)',
        filter: isLocked ? 'grayscale(100%) opacity(50%)' : 'none'
      }}
    >
      {icon || '🌍'}
    </div>
  )
}

const REFINERY_CAUSE_IDS = ['concept_gap', 'equation_setup', 'missed_condition', 'calculation_error', 'no_checking']
const LOGIN_NOTICE_KEY = 'metasenseLoginNotice'
const ROOT_VIEWS = new Set(['planet', 'galaxy', 'battle', 'dashboard', 'ranking', 'store', 'crew', 'journey', 'ledger', 'profile', 'assignment_hub', 'mistake_notebook'])

function getRequestedRootView(location) {
  const requestedView = location.state?.view || new URLSearchParams(location.search).get('view')
  return ROOT_VIEWS.has(requestedView) ? requestedView : ''
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userData, loading: authLoading } = useAuth()
  const [learningSummary, setLearningSummary] = useState(null)
  const [recentCompletionHistory, setRecentCompletionHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentView, setCurrentView] = useState(() => {
    const requestedView = getRequestedRootView(location)
    const savedView = sessionStorage.getItem('metasense_current_view')
    return requestedView || (ROOT_VIEWS.has(savedView) ? savedView : 'planet')
  }) // 'planet', 'dashboard', 'collection', 'assignment_hub'
  const [galaxyEntryOpen, setGalaxyEntryOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [shouldScrollStore, setShouldScrollStore] = useState(false)
  const [attendancePromptOpen, setAttendancePromptOpen] = useState(false)
  const [attendancePromptStatus, setAttendancePromptStatus] = useState(null)
  const [todayKSTForAttendance, setTodayKSTForAttendance] = useState(() => getTodayKST())
  const [activeRoomId, setActiveRoomId] = useGlobalActiveRoomId()
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [guestInvitePanelOpen, setGuestInvitePanelOpen] = useState(false)
  const [guestInviteLink, setGuestInviteLink] = useState('')
  const [guestInviteError, setGuestInviteError] = useState('')
  const [signupPrompt, setSignupPrompt] = useState(null)
  const [acceptedQuizBattle, setAcceptedQuizBattle] = useState(null)
  const [quizBattleReturnView, setQuizBattleReturnView] = useState('planet')
  const galaxyPlay = useGalaxyPlaySession({ uid: user?.uid, active: currentView === 'galaxy' })

  const handleGuestInviteLogin = useCallback(() => {
    const rawLink = guestInviteLink.trim()
    if (!rawLink) {
      setGuestInviteError('전달받은 게스트 초대 링크를 붙여 넣어 주세요.')
      return
    }

    let pathname = rawLink
    try {
      pathname = new URL(rawLink, window.location.origin).pathname
    } catch {
      // The pathname matcher below also handles a pasted relative invite link.
    }

    const match = pathname.match(/\/crew-invite\/([^/?#]+)/)
    if (!match?.[1]) {
      setGuestInviteError('올바른 스터디 크루 게스트 초대 링크인지 확인해 주세요.')
      return
    }

    let crewId = match[1]
    try {
      crewId = decodeURIComponent(crewId)
    } catch {
      setGuestInviteError('초대 링크 형식이 올바르지 않습니다.')
      return
    }

    setGuestInviteError('')
    navigate(`/crew-invite/${encodeURIComponent(crewId)}`)
  }, [guestInviteLink, navigate])

  const persistSignupPrompt = useCallback((notice = {}) => {
    const payload = {
      type: 'signupRequired',
      reason: notice.reason || 'missing-membership',
      email: notice.email || '',
      ts: Date.now()
    }
    window.sessionStorage.setItem(LOGIN_NOTICE_KEY, JSON.stringify(payload))
    setSignupPrompt(payload)
  }, [])

  useEffect(() => {
    if (!user) {
      setLoginPanelOpen(false)
      setLoginId('')
      setLoginPassword('')
      setLoginError('')
      setLoginLoading(false)
      const rawNotice = window.sessionStorage.getItem(LOGIN_NOTICE_KEY)
      if (rawNotice) {
        try {
          const notice = JSON.parse(rawNotice)
          if (notice?.type === 'signupRequired') {
            setSignupPrompt(notice)
          }
        } catch {
          setSignupPrompt({ type: 'signupRequired', reason: 'missing-membership' })
        } finally {
          window.sessionStorage.removeItem(LOGIN_NOTICE_KEY)
        }
      }
    }
  }, [user?.uid])

  useEffect(() => {
    if (!authLoading && user && userData?.role === 'parent') {
      navigate('/parent/dashboard', { replace: true })
    }
  }, [authLoading, navigate, user, userData?.role])
  
  // Selection State (Persist ID in session)
  const [selectedClusterId, setSelectedClusterId] = useState(() => {
    return sessionStorage.getItem('metasense_cluster_id') || null;
  });
  const [assignmentHubInitialDate, setAssignmentHubInitialDate] = useState(null);
  
  // --- 2D Mode Setup ---
  const [is2DMode, setIs2DMode] = useState(() => {
    return window.innerWidth < 768 || localStorage.getItem('metasense_2d_mode') === 'true';
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
  const updateSelectedClusterId = useCallback((id) => {
    setSelectedClusterId(id);
    if (id) sessionStorage.setItem('metasense_cluster_id', id);
    else sessionStorage.removeItem('metasense_cluster_id');
  }, []);

  const updateSelectedRegionId = useCallback((id) => {
    internalSetSelectedRegionId(id);
    if (id) sessionStorage.setItem('metasense_region_id', id);
    else sessionStorage.removeItem('metasense_region_id');
  }, []);

  const updateSelectedChapterDocId = useCallback((id) => {
    internalSetSelectedChapterDocId(id);
    if (id) sessionStorage.setItem('metasense_chapter_id', id);
    else sessionStorage.removeItem('metasense_chapter_id');
  }, []);

  const updateSelectedUnitDocId = useCallback((id) => {
    internalSetSelectedUnitDocId(id);
    if (id) sessionStorage.setItem('metasense_unit_id', id);
    else sessionStorage.removeItem('metasense_unit_id');
  }, []);
  const [quickQuizUnitId, setQuickQuizUnitId] = useState(null) // New: Dashboard quick quiz
  const [quickQuizMode, setQuickQuizMode] = useState(null) // New: Mode for quick quiz

  const clearMissionSelection = useCallback(() => {
    updateSelectedUnitDocId(null);
    setQuickQuizUnitId(null);
    setQuickQuizMode(null);
  }, [updateSelectedUnitDocId]);

  const selectCluster = useCallback((id) => {
    updateSelectedClusterId(id);
    updateSelectedRegionId(null);
    updateSelectedChapterDocId(null);
    clearMissionSelection();
    setCurrentView('planet');
  }, [clearMissionSelection, updateSelectedChapterDocId, updateSelectedClusterId, updateSelectedRegionId]);

  const selectRegion = useCallback((id) => {
    updateSelectedRegionId(id);
    updateSelectedChapterDocId(null);
    clearMissionSelection();
  }, [clearMissionSelection, updateSelectedChapterDocId, updateSelectedRegionId]);

  const selectChapter = useCallback((id) => {
    updateSelectedChapterDocId(id);
    clearMissionSelection();
  }, [clearMissionSelection, updateSelectedChapterDocId]);

  const selectUnit = useCallback((id) => {
    updateSelectedUnitDocId(id);
    setQuickQuizUnitId(null);
    setQuickQuizMode(null);
  }, [updateSelectedUnitDocId]);

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

  const resetViewportForRootView = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    requestAnimationFrame(() => {
      document.querySelectorAll('.space-bg, .journey-scroll-area').forEach((node) => {
        if ('scrollTop' in node) node.scrollTop = 0
        if ('scrollLeft' in node) node.scrollLeft = 0
      })
    })
  }, [])

  const switchRootView = useCallback((view) => {
    setCompletionResult(null);
    setStreakCelebration(null);
    setAttendancePromptOpen(false);
    setPendingRegion(null);
    setAccessError(null);
    setIsBoosting(false);
    // Crew guests can explore NAV, STUDY CREW and the public QUIZ BATTLE arena.
    const guest = userData?.isGuest === true;
    const guestAvailableViews = new Set(['planet', 'crew', 'battle', 'galaxy']);
    const allowedView = guest && !guestAvailableViews.has(view) ? 'planet' : view;
    // Persist synchronously so a route remount cannot briefly restore NAV.
    sessionStorage.setItem('metasense_current_view', allowedView);
    setCurrentView(allowedView);
    updateSelectedRegionId(null);
    updateSelectedChapterDocId(null);
    clearMissionSelection();
    setShouldScrollStore(false);
    if (isDarkMatterMode) stopDarkMatterMode();
    resetViewportForRootView();
  }, [clearMissionSelection, isDarkMatterMode, resetViewportForRootView, stopDarkMatterMode, updateSelectedChapterDocId, updateSelectedRegionId, userData?.isGuest]);

  const requestGalaxyEntry = useCallback(async () => {
    if (!user?.uid) return
    if (galaxyPlay.session) {
      switchRootView('galaxy')
      return
    }
    setGalaxyEntryOpen(true)
    await galaxyPlay.loadAccess()
  }, [galaxyPlay, switchRootView, user?.uid])

  const startGalaxyEntry = useCallback(async () => {
    const playSession = await galaxyPlay.startSession()
    if (!playSession) return
    setGalaxyEntryOpen(false)
    switchRootView('galaxy')
    soundManager.playWarp()
  }, [galaxyPlay, switchRootView])

  const closeGalaxyEntry = useCallback(() => {
    if (galaxyPlay.busy) return
    setGalaxyEntryOpen(false)
    if (currentView === 'galaxy' && !galaxyPlay.session) switchRootView('planet')
  }, [currentView, galaxyPlay.busy, galaxyPlay.session, switchRootView])

  const finishGalaxyReturn = useCallback(() => {
    galaxyPlay.clearEndedSummary()
    setGalaxyEntryOpen(false)
    switchRootView('planet')
    soundManager.playWarp()
  }, [galaxyPlay, switchRootView])

  useEffect(() => {
    if (currentView !== 'galaxy' || galaxyPlay.session || galaxyPlay.endedSummary || galaxyEntryOpen) return
    setGalaxyEntryOpen(true)
    galaxyPlay.loadAccess()
  }, [currentView, galaxyEntryOpen, galaxyPlay])

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

  // Sync view from route state or query params (e.g. legacy extension/deep links)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedView = location.state?.view || params.get('view')
    const requestedClusterId = location.state?.clusterId || params.get('clusterId')
    const requestedDate = location.state?.date || params.get('date') || params.get('assignmentDate')
    const incomingQuizBattle = location.state?.acceptedQuizBattle
    if (requestedView && ROOT_VIEWS.has(requestedView)) {
      if (requestedView === 'battle' && incomingQuizBattle?.battleId) {
        setAcceptedQuizBattle(incomingQuizBattle)
        const storedReturnView = sessionStorage.getItem('metasense_current_view') || 'planet'
        setQuizBattleReturnView(storedReturnView === 'battle' ? 'planet' : storedReturnView)
        // A direct challenge must not clear the interrupted region and unit.
        // Keeping those coordinates lets the student resume after the battle.
        setCurrentView('battle')
        navigate(location.pathname, { replace: true, state: {} })
        return
      }
      if (requestedView === 'assignment_hub') {
        if (requestedClusterId) updateSelectedClusterId(requestedClusterId)
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ''))) {
          setAssignmentHubInitialDate(requestedDate)
        }
      }
      switchRootView(requestedView)
      
      // Clear state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.search, location.state, navigate, switchRootView, updateSelectedClusterId])

  // Persist currentView to session so returning from external routes (e.g. /profile/:uid) restores it
  useEffect(() => {
    if (currentView) sessionStorage.setItem('metasense_current_view', currentView);
  }, [currentView])

  // Data Hooks
  const { data: clusters, isLoading: loadingClusters } = useClusters()
  
  const activeClusters = useMemo(() => {
    if (loadingClusters) return [];
    if (user && (!userData || userData.dataLoadError || userData.recoveryRequired)) return [];
    
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
  }, [clusters, loadingClusters, user, userData]);

  const activeClusterData = useMemo(() => {
    if (!selectedClusterId) return null;
    return clusters?.find(c => c.docId === selectedClusterId || c.id === selectedClusterId) || null;
  }, [clusters, selectedClusterId]);

  const activeClusterName = useMemo(() => {
    return activeClusterData?.name || activeClusterData?.title || activeClusterData?.label || '';
  }, [activeClusterData]);

  const presencePublicProfile = useMemo(() => ({
    publicDisplayName: userData?.publicDisplayName || '',
    studentName: userData?.studentName || '',
    name: userData?.name || user?.displayName || '',
    displayName: user?.displayName || '',
    gradeLabel: userData?.gradeLabel || '',
    grade: userData?.grade || '',
    schoolGrade: userData?.schoolGrade || '',
    studentGrade: userData?.studentGrade || '',
    selectedCourse: userData?.selectedCourse || '',
    courseName: userData?.courseName || '',
    currentCourse: userData?.currentCourse || '',
    crewId: userData?.crewId || '',
    crewName: userData?.crewName || '',
    crewColor: userData?.crewColor || '',
    crewSnapshot: userData?.crewSnapshot || null,
    role: userData?.role || '',
    studyInvitePreference: userData?.studyInvitePreference || 'open',
  }), [
    user?.displayName,
    userData?.courseName,
    userData?.crewColor,
    userData?.crewId,
    userData?.crewName,
    userData?.crewSnapshot,
    userData?.currentCourse,
    userData?.grade,
    userData?.gradeLabel,
    userData?.name,
    userData?.publicDisplayName,
    userData?.role,
    userData?.schoolGrade,
    userData?.selectedCourse,
    userData?.studentGrade,
    userData?.studentName,
    userData?.studyInvitePreference
  ]);

  const { data: clusterAttendanceRecords, isLoading: loadingClusterAttendance } = useStudentAttendance(user?.uid, selectedClusterId);
  const attendanceMutation = useRecordAttendance();

  const todayAttendance = useMemo(() => {
    return clusterAttendanceRecords?.find(a => a.date === todayKSTForAttendance) || null;
  }, [clusterAttendanceRecords, todayKSTForAttendance]);

  useEffect(() => {
    const syncToday = () => setTodayKSTForAttendance(getTodayKST());
    syncToday();
    const timer = setInterval(syncToday, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const attendancePromptKey = useMemo(() => {
    if (!user?.uid || !selectedClusterId || !todayKSTForAttendance) return null;
    return `metasense_attendance_prompt_closed:${user.uid}:${selectedClusterId}:${todayKSTForAttendance}`;
  }, [user?.uid, selectedClusterId, todayKSTForAttendance]);

  const dismissAttendancePrompt = useCallback(() => {
    if (attendancePromptKey) sessionStorage.setItem(attendancePromptKey, 'true');
    setAttendancePromptOpen(false);
  }, [attendancePromptKey]);

  useEffect(() => {
    if (!selectedClusterId || !activeClusterData || loadingClusterAttendance || !attendancePromptKey) {
      setAttendancePromptOpen(false);
      setAttendancePromptStatus(null);
      return;
    }

    const syncAttendancePrompt = () => {
      const nextStatus = getAttendanceDockingStatus({
        clusterData: activeClusterData,
        todayAttendance
      });
      const dismissed = sessionStorage.getItem(attendancePromptKey) === 'true';
      const shouldOpen = (
        currentView === 'planet' &&
        !selectedRegionId &&
        !selectedChapterDocId &&
        !selectedUnitDocId &&
        !quickQuizUnitId &&
        ['open', 'closing', 'late'].includes(nextStatus.state) &&
        !dismissed
      );

      setAttendancePromptStatus(nextStatus);
      setAttendancePromptOpen(shouldOpen);
    };

    syncAttendancePrompt();
    const timer = setInterval(syncAttendancePrompt, 1000);
    return () => clearInterval(timer);
  }, [
    activeClusterData,
    attendancePromptKey,
    currentView,
    loadingClusterAttendance,
    quickQuizUnitId,
    selectedChapterDocId,
    selectedClusterId,
    selectedRegionId,
    selectedUnitDocId,
    todayAttendance
  ]);

  useEffect(() => {
    if (loadingClusters) return;

    // 1. Validate if the currently selected cluster still exists in activeClusters
    if (selectedClusterId && activeClusters.length > 0) {
      const isValid = activeClusters.some(c => c.docId === selectedClusterId || c.id === selectedClusterId);
      if (!isValid) {
        // If not valid anymore (e.g. access revoked), clear it
        selectCluster(null);
      }
    }

    // 2. Only auto-select if we have exactly one cluster AND it's not loading
    if (activeClusters.length === 1 && !selectedClusterId) {
      updateSelectedClusterId(activeClusters[0].docId || activeClusters[0].id);
    }
  }, [activeClusters, selectedClusterId, loadingClusters, selectCluster, updateSelectedClusterId]);

  const canLoadLearningMap = Boolean(userData && !userData.dataLoadError && !userData.recoveryRequired && selectedClusterId)
  const { data: regions, isLoading: loadingRegions, isError: errorRegions } = useRegions(selectedClusterId, {
    enabled: canLoadLearningMap
  })
  const { data: chapters, isLoading: loadingChapters } = useChapters(selectedRegionId)
  const { data: units, isLoading: loadingUnits } = useUnits(selectedChapterDocId)
  
  // Singular hooks to resolve hierarchy for deep links
  const missionUnitId = selectedUnitDocId || quickQuizUnitId
  const { data: singleUnit, isLoading: loadingSingleUnit, isFetched: singleUnitFetched } = useUnit(missionUnitId)
  const { data: singleChapter } = useChapter(selectedChapterDocId || singleUnit?.chapterId)
  const { data: singleRegion } = useRegion(selectedRegionId || singleChapter?.regionId)

  const { 
    data: unitQuizzes, 
    isLoading: loadingQuizzes, 
    isError: errorQuizzes, 
    refetch: refetchQuizzes 
  } = useQuizzes(missionUnitId)

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

  const quizAvailabilityUnitIds = useMemo(() => {
    const ids = new Set()
    ;(units || []).forEach(unit => {
      const unitId = unit.docId || unit.id
      if (unitId) ids.add(unitId)
    })
    chapterUnitResults.forEach(result => {
      ;(result.data || []).forEach(unit => {
        const unitId = unit.docId || unit.id
        if (unitId) ids.add(unitId)
      })
    })
    return Array.from(ids).sort()
  }, [units, chapterUnitResults])

  const quizAvailabilityChunks = useMemo(
    () => chunkArray(quizAvailabilityUnitIds, 10),
    [quizAvailabilityUnitIds]
  )

  const quizAvailabilityResults = useQueries({
    queries: quizAvailabilityChunks.map(unitIds => ({
      queryKey: ['quizAvailability', unitIds],
      queryFn: async () => {
        if (!unitIds.length) return []
        const q = query(collection(db, 'quizzes'), where('unitId', 'in', unitIds))
        const snap = await getDocs(q)
        return Array.from(new Set(snap.docs.map(docSnap => docSnap.data()?.unitId).filter(Boolean)))
      },
      enabled: unitIds.length > 0,
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60
    }))
  })

  const loadingQuizAvailability = quizAvailabilityResults.some(result => result.isPending || result.isLoading)
  const quizAvailabilityMap = useMemo(() => {
    const map = {}
    quizAvailabilityResults.forEach(result => {
      ;(result.data || []).forEach(unitId => {
        map[unitId] = true
      })
    })
    return map
  }, [quizAvailabilityResults])

  // Active selections
  const activeRegion = regions?.find(r => r.id === selectedRegionId)
  const activeChapter = chapters?.find(c => c.docId === selectedChapterDocId) || singleChapter
  const activeUnit = units?.find(u => u.docId === missionUnitId) || singleUnit

  useEffect(() => {
    if (!selectedRegionId || loadingRegions || errorRegions || !regions) return;
    const isValidRegion = regions.some(r => r.id === selectedRegionId || r.docId === selectedRegionId);
    if (!isValidRegion) {
      console.warn('[NavigationGuard] Clearing stale region selection:', selectedRegionId);
      selectRegion(null);
    }
  }, [errorRegions, loadingRegions, regions, selectRegion, selectedRegionId]);

  useEffect(() => {
    if (!selectedChapterDocId || loadingChapters || !chapters) return;
    const isValidChapter = chapters.some(c => c.docId === selectedChapterDocId || c.id === selectedChapterDocId);
    if (!isValidChapter) {
      console.warn('[NavigationGuard] Clearing stale chapter selection:', selectedChapterDocId);
      updateSelectedChapterDocId(null);
      clearMissionSelection();
    }
  }, [chapters, clearMissionSelection, loadingChapters, selectedChapterDocId, updateSelectedChapterDocId]);

  useEffect(() => {
    if (!selectedUnitDocId || loadingUnits || !selectedChapterDocId || !units) return;
    const isValidUnit = units.some(u => u.docId === selectedUnitDocId || u.id === selectedUnitDocId);
    if (!isValidUnit) {
      console.warn('[NavigationGuard] Clearing stale unit selection:', selectedUnitDocId);
      clearMissionSelection();
    }
  }, [clearMissionSelection, loadingUnits, selectedChapterDocId, selectedUnitDocId, units]);

  useEffect(() => {
    if (!missionUnitId || activeUnit || loadingSingleUnit || !singleUnitFetched) return;
    console.warn('[NavigationGuard] Mission unit not found. Returning to planet map:', missionUnitId);
    clearMissionSelection();
    setCurrentView('planet');
  }, [activeUnit, clearMissionSelection, loadingSingleUnit, missionUnitId, singleUnitFetched]);

  const handleBackFromMission = useCallback(() => {
    // Logic: Mission Control -> Chapter Selection (Units List -> Chapters List)
    
    // Explicitly preserve hierarchy before clearing unit for deep-linked scenarios
    const cid = activeUnit?.chapterId || selectedChapterDocId;
    const rid = activeChapter?.regionId || singleChapter?.regionId || selectedRegionId;
    const clid = singleRegion?.clusterId || activeRegion?.clusterId || selectedClusterId;

    if (cid) updateSelectedChapterDocId(cid);
    if (rid) updateSelectedRegionId(rid);
    if (clid) updateSelectedClusterId(clid);

    clearMissionSelection();
    
    // Ensure we transition into the hierarchy view (Planet view)
    // regardless of where we came from (e.g. assignment hub)
    setCurrentView('planet');
  }, [activeUnit, activeChapter, singleChapter, singleRegion, activeRegion, selectedChapterDocId, selectedRegionId, selectedClusterId, clearMissionSelection, updateSelectedChapterDocId, updateSelectedClusterId, updateSelectedRegionId]);

  // Track Presence Activity
  const currentLocationString = useMemo(() => {
    if (activeUnit) return `${activeUnit.title} ${quickQuizMode ? '(퀴즈 중)' : '(학습 중)'}`;
    if (activeChapter) return `${activeChapter.title} 진입`;
    if (activeRegion) return `${activeRegion.title} 탐색 중`;
    if (isDarkMatterMode) return '다크 매터(오답 노트) 정화 중';
    if (currentView === 'dashboard') return '대시보드 방문 중';
    if (currentView === 'collection') return '도감 방문 중';
    if (currentView === 'crew') return '스터디 크루 방문 중';
    if (currentView === 'battle') return '퀴즈 배틀 아레나 도전 중';
    if (currentView === 'galaxy') return '아스트라 프론티어 이용 중';
    if (currentView === 'assignment_hub') return '항행 일지(과제) 작성 중';
    if (currentView === 'mistake_notebook') return '오답노트 행성 복습 중';
    return '우주 공간(메인) 대기 중';
  }, [activeUnit, activeChapter, activeRegion, isDarkMatterMode, currentView, quickQuizMode]);

  usePresence(user?.uid, selectedClusterId, currentLocationString, activeUnit?.docId, activeRoomId, activeClusterName, presencePublicProfile);

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
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768
      setIsMobile(nextIsMobile)
      if (nextIsMobile) {
        setIs2DMode(true)
        localStorage.setItem('metasense_2d_mode', 'true')
      }
    }
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
    soundManager.playClick()
    setLoginError('')
    setLoginPanelOpen(prev => !prev)
  }

  const isActiveMemberDoc = (snap) => {
    if (!snap.exists()) return false
    const data = snap.data()
    return data?.isDeleted !== true && data?.accountStatus !== 'deleted' && !data?.deletedAt
  }

  const routeAfterAuth = async (uid) => {
    const parentSnap = await getDoc(doc(db, 'parents', uid))
    if (isActiveMemberDoc(parentSnap)) {
      navigate('/parent/dashboard')
      return true
    }
    const userSnap = await getDoc(doc(db, 'users', uid))
    if (isActiveMemberDoc(userSnap)) return true

    persistSignupPrompt({ reason: 'missing-membership', email: auth.currentUser?.email || '' })
    await signOut(auth)
    return false
  }

  const handleGoogleLogin = async () => {
    setLoginError('')
    setLoginLoading(true)
    try {
      soundManager.playClick()
      const cred = await signInWithPopup(auth, googleProvider)
      const allowed = await routeAfterAuth(cred.user.uid)
      if (!allowed) return
    } catch (error) {
      console.error("Google login failed:", error)
      const errorMsg = error.code === 'auth/popup-blocked'
        ? '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.'
        : 'Google 로그인에 실패했습니다. 다시 시도해 주세요.'
      setLoginError(errorMsg)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCredentialLogin = async (e) => {
    e.preventDefault()
    const rawId = loginId.trim()
    const digits = rawId.replace(/[^0-9]/g, '')
    if (!rawId || loginPassword.length < 6) {
      setLoginError('아이디와 비밀번호를 확인해 주세요.')
      return
    }
    setLoginError('')
    setLoginLoading(true)
    try {
      soundManager.playClick()
      const normalizedId = rawId.toLowerCase()
      const email = normalizedId.includes('@')
        ? normalizedId
        : digits.length >= 10 && digits.length === rawId.replace(/\D/g, '').length
          ? `${digits}@parent.mathsense.app`
          : `${normalizedId}@student.mathsense.app`
      const cred = await signInWithEmailAndPassword(auth, email, loginPassword)
      const allowed = await routeAfterAuth(cred.user.uid)
      if (!allowed) return
    } catch (error) {
      console.error('Credential login failed:', error)
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoginLoading(false)
    }
  }

  const [completionResult, setCompletionResult] = useState(null)
  const [streakCelebration, setStreakCelebration] = useState(null)

  useEffect(() => {
    if (!user?.uid) return undefined
    let requestedValidation = false
    const summaryRef = doc(db, 'learningSummaries', user.uid)
    return onSnapshot(summaryRef, (snapshot) => {
      if (snapshot.exists()) {
        setLearningSummary(snapshot.data())
        setLoadingHistory(false)
      }
      if (requestedValidation) return
      requestedValidation = true
      httpsCallable(functions, 'getOrRebuildLearningSummary')({ validateFreshness: true }).catch((error) => {
        console.warn('Learning summary validation failed:', error)
        setLoadingHistory(false)
      })
    }, (error) => {
      console.warn('Learning summary subscription failed:', error)
      setLoadingHistory(false)
    })
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !todayKSTForAttendance) {
      setRecentCompletionHistory([])
      return undefined
    }
    const startTime = Timestamp.fromDate(new Date(`${todayKSTForAttendance}T00:00:00+09:00`))
    const recentHistoryQuery = query(
      collection(db, 'users', user.uid, 'history'),
      where('timestamp', '>=', startTime)
    )
    return onSnapshot(recentHistoryQuery, (snapshot) => {
      setRecentCompletionHistory(snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })))
    }, (error) => {
      console.warn('Recent completion history subscription failed:', error)
      setRecentCompletionHistory([])
    })
  }, [todayKSTForAttendance, user?.uid])

  const history = useMemo(
    () => mergeSummaryWithRecentHistory(learningSummary, recentCompletionHistory),
    [learningSummary, recentCompletionHistory]
  )
  const effectiveHistory = history
  const historyTotalCount = Number(learningSummary?.totalHistoryCount ?? 0)
  const userDataWithLearningSummary = useMemo(() => ({
    ...(userData || {}),
    learningSummary,
  }), [learningSummary, userData])

  // Fetch Transactions for Streak Sync
  useEffect(() => {
    if (!user) return;
    const txRef = collection(db, 'users', user.uid, 'crystal_transactions');
    // Only need recent ones for streak protection calculation
    const q = query(txRef, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingTransactions(false);
    }, (err) => {
      console.error('[SpaceHome] Failed to subscribe crystal transactions:', err)
      setTransactions([])
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
    const activeDates = learningSummary?.daily?.length
      ? new Set(learningSummary.daily.filter((row) => (
          Number(row.quizzes || 0) + Number(row.videos || 0) + Number(row.texts || 0) + Number(row.workbooks || 0) + Number(row.codeTraces || 0) > 0
        )).map((row) => row.date))
      : extractLearningActivityDates(history, transactions);

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
  }, [user, userData, history, learningSummary, transactions, loadingHistory, loadingTransactions]);

  // Calculate Exploration Status and Recent Region
  // bestScores: { unitDocId: bestScore } - maps each completed unit to its best quiz score
  // unitProgressMap: { unitDocId: { quiz: true, video: true, text: true, workbook: true, codeTrace: true } }
  const { explorationStatus, recentRegionId, bestScores, unitProgressMap } = useMemo(() => {
    const statusMap = {}
    const scores = {}
    const progressMap = {}
    let lastRegionId = null

    if (!regions) {
      return { explorationStatus: {}, recentRegionId: null, bestScores: {}, unitProgressMap: {} }
    }

    // Build bestScores and unitProgressMap from history
    effectiveHistory.forEach(h => {
      const uid = h.unitId
      if (!uid) return

      // Map legacy history types to modalities
      let hType = 'unknown' 
      if (!h.type || h.type === 'quiz') hType = 'quiz' 
      else if (h.type === 'workbook') hType = 'workbook'
      else if (h.type === 'video') hType = 'video'
      else if (h.type === 'text') hType = 'text'
      else if (h.type === 'code_trace') hType = 'codeTrace'

      // Tracking modality completion
      if (!progressMap[uid]) {
        progressMap[uid] = { quiz: false, video: false, text: false, workbook: false, codeTrace: false }
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

    if (effectiveHistory.length === 0) {
      regions?.forEach(r => statusMap[r.id] = 'not_started')
      return { explorationStatus: statusMap, recentRegionId: null, bestScores: scores, unitProgressMap: {} }
    }
    
    regions.forEach(region => {
      const isAnySolved = effectiveHistory.some(h => {
        return h.unitId?.startsWith(region.id) || h.regionId === region.id
      })

      if (isAnySolved) {
        statusMap[region.id] = 'in_progress'
      } else {
        statusMap[region.id] = 'not_started'
      }
    })

    // Find the most recent region WITHIN the current cluster
    if (effectiveHistory.length > 0) {
      const latestMatchingEntry = effectiveHistory.find(h =>
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
  }, [effectiveHistory, regions, selectedClusterId])

  // Calculate chapter progress dynamically from Firestore data
  const chapterProgress = useMemo(() => {
    const progress = {}
    
    // Guard: need both chapters array AND history to have finished loading
    if (!chapters || !chapters.length) return progress
    if (loadingHistory || loadingQuizAvailability) return progress

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
        workbook: { total: 0, completed: 0 },
        codeTrace: { total: 0, completed: 0 }
      }

      unitsData.forEach(unit => {
        // Find progress using docId or fallback id
        const uProg = unitProgressMap[unit.docId] || unitProgressMap[unit.id] || {}

        const { hasQuiz, hasVideo, hasText, hasWorkbook, hasCodeTrace } = getUnitContentAvailability(unit, quizAvailabilityMap)

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
        if (hasCodeTrace) {
          counts.codeTrace.total++
          if (uProg.codeTrace) counts.codeTrace.completed++
        }
      })
      
      // Determine if the entire chapter is finished across ALL active modalities
      const hasAnyContent = counts.quiz.total > 0 || counts.video.total > 0 || counts.text.total > 0 || counts.workbook.total > 0 || counts.codeTrace.total > 0
      const isFinished = hasAnyContent && 
        (counts.quiz.total === counts.quiz.completed) &&
        (counts.video.total === counts.video.completed) &&
        (counts.text.total === counts.text.completed) &&
        (counts.workbook.total === counts.workbook.completed) &&
        (counts.codeTrace.total === counts.codeTrace.completed)
      
      progress[chapter.docId] = {
        counts,
        isFinished
      }
    })
    return progress
  }, [chapters, unitProgressMap, chapterUnitResults, loadingHistory, loadingQuizAvailability, quizAvailabilityMap])


  const isProcessingSave = useRef(false)

  const handleComplete = async (result) => {
    if (!user || isProcessingSave.current) return
    isProcessingSave.current = true
    
    try {
      const { score, totalCount, crystalsEarned, isPerfect, shieldsUsed } = result
      if (totalCount === 0) return

      // Anti-grinding logic
      const currentUnitId = result.unitId || selectedUnitDocId || quickQuizUnitId || 'unknown'
      const currentUnitTitle = result.unitTitle || activeUnit?.title || '탐사 퀴즈'
      const currentRegionId = result.regionId || selectedRegionId || ''
      const currentRegionTitle = result.regionTitle || activeRegion?.title || 'Unknown Galaxy'
      const currentChapterId = result.chapterId || selectedChapterDocId || ''
      const isDarkMatterQuizResult = currentUnitId === 'dark_matter_zone'
      const scoreKey = result.type === 'workbook' ? `${currentUnitId}_workbook` : currentUnitId
      const previousBest = bestScores[scoreKey] || 0
      let actualCrystalsEarned = 0
      let rewardMessage = ""

      if (crystalsEarned < 0) {
        // --- Negative Reward (Penalty) ---
        // Always apply penalty even if score didn't improve
        actualCrystalsEarned = crystalsEarned
        rewardMessage = `무지성 탐사로 인해 광석 ${Math.abs(crystalsEarned)}개가 소멸되었습니다.`
      } else if (isDarkMatterMode || isDarkMatterQuizResult) {
        // --- Dark Matter Confidence-based Reward Policy ---
        // Reward is ONLY given for questions that are solved correctly AND the review mark is released.
        // If a user gets a question right but chooses to keep the review mark (guess or lack of confidence),
        // the question stays in Dark Matter and 0 crystals are awarded.
        const reviewMarkedIds = new Set((result.reviewMarkedQuestions || []).map(q => q.id))
        
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
      const rewardEvaluationDate = new Date()
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
        let rewardMultiplierMeta = null

        if (crystalsEarned < 0) {
          atomicCrystalsEarned = crystalsEarned
        } else if (result.refineryMode) {
          // 정제소 모드는 서버 측 재계산 대신 전달받은 crystalsEarned를 신뢰 (이미 50 보너스가 포함됨)
          atomicCrystalsEarned = crystalsEarned
        } else if (isDarkMatterQuizResult) {
          const reviewMarkedIds = new Set((result.reviewMarkedQuestions || []).map(q => q.id))
          const solvedAndReleasedCount = (result.correctQuestions || [])
            .filter(q => !reviewMarkedIds.has(q.id))
            .length
          atomicCrystalsEarned = Math.min(5, solvedAndReleasedCount)
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

          // 신규 지급분에만 휴일/수업시간 외 배율을 적용합니다. 과거 기록은 재계산하지 않습니다.
          if (atomicCrystalsEarned > 0) {
            rewardMultiplierMeta = applyCrystalRewardMultiplier(atomicCrystalsEarned, {
              clusterId: selectedClusterId,
              date: rewardEvaluationDate,
              dateStr: getTodayKST(rewardEvaluationDate)
            })
            atomicCrystalsEarned = rewardMultiplierMeta.amount
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
            description: `${currentUnitTitle} ${atomicCrystalsEarned > 0 ? `(${score}점)` : '(시스템 손상)'}`,
            metadata: {
              unitId: currentUnitId,
              score,
              penalty: atomicCrystalsEarned < 0,
              ...buildRewardMultiplierMetadata(rewardMultiplierMeta)
            }
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
          unitTitle: currentUnitTitle,
          regionId: currentRegionId || freshUserData.lastRegionId || "",
          regionTitle: currentRegionTitle,
          chapterId: currentChapterId,
          clusterId: selectedClusterId,
          score: score,
          initialScore: result.initialRawScore ?? score, // 해당 세션만의 순수 최초 점수를 기록 (useLeaderboard가 과거 영수증을 역산하는데 사용됨)
          attemptCount: sessionAttemptCount, // 해당 세션에서 발생한 시도 횟수만 기록 (useLeaderboard가 합산하는데 사용됨)
          totalCount: result.totalCount || 0,
          correctCount: result.correctCount || 0,
          crystalsEarned: atomicCrystalsEarned,
          rewardMultiplier: rewardMultiplierMeta?.multiplier || 1,
          rewardMultiplierReason: rewardMultiplierMeta?.reason || 'none',
          rewardBaseAmount: rewardMultiplierMeta?.baseAmount ?? atomicCrystalsEarned,
          rewardBonusAmount: rewardMultiplierMeta?.bonusAmount || 0,
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

        return { streakCalc, freshUserData, atomicCrystalsEarned, rewardMultiplierMeta }
      })

      // Transaction 밖에서 부수효과 처리 (트랜잭션 성공 후)
      const { streakCalc: streakResultsFinal, atomicCrystalsEarned: finalCrystals, rewardMultiplierMeta } = streakResult
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
          ? ((isDarkMatterMode || isDarkMatterQuizResult) 
              ? `🌌 다크 매터 정화 성공! (+${finalCrystals} 광석)` 
              : `${score}점으로 최고 기록을 경신했습니다! (+${finalCrystals} 광석)`) + getRewardMultiplierSuffix(rewardMultiplierMeta)
          : ((isDarkMatterMode || isDarkMatterQuizResult)
              ? "문제를 맞혔으나 '재검토' 마크를 유지하여 보상이 지급되지 않았습니다. (학습 지속)"
              : (score === 100 ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)" : `최고 점수를 넘지 못해 추가 광석을 획득할 수 없습니다.`)),
        streakInfo: {
          currentStreak: finalStreakUpdates.currentStreak || streakResultsFinal?.meta?.newStreak,
          freezeUsed: streakResultsFinal?.meta?.freezeUsed,
          isNewRecord: streakResultsFinal?.meta?.isNewRecord,
          alreadyDoneToday: streakResultsFinal?.meta?.alreadyDoneToday,
          justReachedMilestone: streakResultsFinal?.meta?.justReachedMilestone
        }
      })
      clearMissionSelection()
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
      attentionWindowSeconds,
      sessionWatchSeconds = 0,
      totalTimeSpent = 0,
      todayTimeSpent = 0,
      todayTimeSpentDate = "",
      coverageSeconds = stampedSeconds?.length || 0,
      currentPosition = activityMetadata.videoTime || 0
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
    const isAttentionEvent = !!attentionSource && (attentionResult === 'hit' || attentionResult === 'miss')
    const isAttentionMiss = isAttentionEvent && attentionResult === 'miss'
    const rewardEvaluationDate = new Date()

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
        let rewardMultiplierMeta = null
        const videoSessionSeconds = isVideoActivity && !isAttentionEvent
          ? Math.max(0, Math.floor(Number(sessionWatchSeconds) || 0))
          : 0
        const completionVideoSessionSeconds = isVideoActivity && attentionSource === 'completion_bonus'
          ? Math.max(0, Math.floor(Number(sessionWatchSeconds) || 0))
          : 0
        const shouldLogVideoView = isVideoActivity && !isAttentionEvent && videoSessionSeconds > 0
        const shouldAccumulateVideoTime = shouldLogVideoView || completionVideoSessionSeconds > 0

        // 신규 지급분에만 휴일/수업시간 외 배율을 적용합니다. 과거 기록은 재계산하지 않습니다.
        if (actualReward > 0) {
          rewardMultiplierMeta = applyCrystalRewardMultiplier(actualReward, {
            clusterId: selectedClusterId,
            date: rewardEvaluationDate,
            dateStr: todayKST
          })
          actualReward = rewardMultiplierMeta.amount
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

          if (rewardMultiplierMeta) {
            rewardMultiplierMeta = {
              ...rewardMultiplierMeta,
              amount: Math.max(0, actualReward),
              bonusAmount: Math.max(0, Math.max(0, actualReward) - rewardMultiplierMeta.baseAmount),
              rewardAmountBeforeCap: rewardMultiplierMeta.amount
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
        const shouldLogHistory = isCompletionActivity || shouldLogVideoView || streakResult.streakUpdate?.lastStreakDate || actualReward > 0 || isAttentionMiss || shouldLogFocusOnly
        const effectiveAttentionOpportunityId = attentionOpportunityId || (shouldLogFocusOnly ? `video_limit_${Math.floor(Date.now() / 1000)}` : "")
        let stableHistoryId = null

        if (shouldLogHistory) {
          stableHistoryId = isLogActivity
            ? `log_completion_${currentUnitId}`
            : `video_daily_${todayKST}_${currentUnitId}_${transmissionId || 'default'}`

          if (((isAttentionEvent && attentionSource !== 'completion_bonus') || shouldLogFocusOnly) && effectiveAttentionOpportunityId) {
            stableHistoryId = `video_attention_${currentUnitId}_${transmissionId || 'default'}_${attentionSource || 'video_limit'}_${effectiveAttentionOpportunityId}`
          }
        }

        const historyRef = stableHistoryId ? doc(db, 'users', user.uid, 'history', stableHistoryId) : null
        const existingAttentionHistorySnap = historyRef && isAttentionEvent
          ? await transaction.get(historyRef)
          : null
        const existingVideoHistorySnap = historyRef && shouldAccumulateVideoTime
          ? await transaction.get(historyRef)
          : null
        const shouldCountAttention = isAttentionEvent && !existingAttentionHistorySnap?.exists()

        if (actualReward > 0) {
          userUpdates.crystals = (freshUserData.crystals || 0) + actualReward
          // Also track growth
          const growthUpdates = calculateGrowthUpdates(freshUserData, actualReward)
          Object.assign(userUpdates, growthUpdates)
          
        } else {
          actualReward = 0 // Ensure non-negative
        }

        if (shouldCountAttention) {
          userUpdates.attentionOpportunities = increment(1)
          userUpdates.videoAttentionOpportunities = increment(1)
          if (attentionResult === 'hit') {
            userUpdates.attentionHits = increment(1)
            userUpdates.videoAttentionHits = increment(1)
          } else {
            userUpdates.attentionMisses = increment(1)
            userUpdates.videoAttentionMisses = increment(1)
          }
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
               [`${baseKey}.totalTimeSpent`]: totalTimeSpent,
               [`${baseKey}.todayTimeSpent`]: todayTimeSpent,
               [`${baseKey}.todayTimeSpentDate`]: todayTimeSpentDate || todayKST,
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
            metadata: {
              unitId: currentUnitId,
              ...activityMetadata,
              ...buildRewardMultiplierMetadata(rewardMultiplierMeta)
            }
          }, transaction, stableTxId)
        }

        // --- Atomic Logging: History ---
        if (shouldLogHistory && historyRef) {
          const previousVideoTime = existingVideoHistorySnap?.exists()
            ? Math.max(0, Math.floor(existingVideoHistorySnap.data()?.videoTime || 0))
            : 0
          const videoSecondsToAdd = shouldLogVideoView ? videoSessionSeconds : completionVideoSessionSeconds
          const nextVideoTime = shouldAccumulateVideoTime
            ? previousVideoTime + videoSecondsToAdd
            : Math.floor(activityMetadata.videoTime || 0)
          const previousStampedCount = existingVideoHistorySnap?.exists()
            ? Math.max(0, Math.floor(existingVideoHistorySnap.data()?.stampedCount || 0))
            : 0

          transaction.set(historyRef, {
            unitId: currentUnitId,
            unitTitle: transmissionTitle || activeUnit?.title || `탐사 기록 (${activityType})`,
            transmissionId: transmissionId || "",
            regionId: selectedRegionId || activeRegion?.id || "",
            regionTitle: activeRegion?.title || "Unknown Galaxy",
            chapterId: selectedChapterDocId || "",
            clusterId: selectedClusterId,
            crystalsEarned: actualReward,
            rewardMultiplier: rewardMultiplierMeta?.multiplier || 1,
            rewardMultiplierReason: rewardMultiplierMeta?.reason || 'none',
            rewardBaseAmount: rewardMultiplierMeta?.baseAmount ?? actualReward,
            rewardBonusAmount: rewardMultiplierMeta?.bonusAmount || 0,
            timestamp: serverTimestamp(),
            type: isLogActivity ? 'text' : ((isAttentionMiss || shouldLogFocusOnly) ? 'attention' : 'video'),
            activityType,
            // Include video duration and stamp count in metadata for summary calculation
            videoTime: nextVideoTime,
            sessionWatchSeconds: videoSecondsToAdd,
            totalTimeSpent: Math.floor(Number(totalTimeSpent) || 0),
            todayTimeSpent: Math.floor(Number(todayTimeSpent) || 0),
            todayTimeSpentDate: todayTimeSpentDate || todayKST,
            stampedCount: Math.max(previousStampedCount, coverageSeconds || stampedSeconds?.length || 0),
            currentPosition,
            attentionSource: attentionSource || (shouldLogFocusOnly ? 'video_limit' : ""),
            attentionResult: attentionResult || (shouldLogFocusOnly ? 'hit' : ""),
            attentionOpportunityId: effectiveAttentionOpportunityId,
            attentionWindowSeconds: attentionWindowSeconds || null
          }, { merge: true })
        }

        return { streakCalcResult: streakResult, streakUpdates, txUserData: freshUserData, actualReward, rewardBlockedReason, rewardMultiplierMeta }
      })

      const { streakCalcResult, streakUpdates, txUserData, actualReward, rewardBlockedReason, rewardMultiplierMeta } = txResult

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
            rewardMessage: actualReward > 0
              ? `${activityType} 달성! (+${actualReward} 광석)${getRewardMultiplierSuffix(rewardMultiplierMeta)}`
              : `이미 보상을 획득한 활동입니다.`,
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
  const isLoading = (authLoading || loadingClusters || (canLoadLearningMap && loadingRegions)) && !errorRegions

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
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 140,
            width: 'min(1120px, calc(100% - 28px))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            pointerEvents: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-title"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--crystal-cyan)',
              fontWeight: 900,
              cursor: 'pointer',
              textShadow: '0 0 12px rgba(0,212,255,0.6)'
            }}
          >
            META SENSE
          </button>
          <div className="login-public-actions">
            {[
              ['무료체험', '/trial', '1주일 무료'],
              ['전화상담', '/consultation'],
              ['회원가입', '/signup']
            ].map(([label, path, badge]) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`font-tech login-public-action${path === '/trial' ? ' login-public-action--trial' : ''}`}
                aria-label={path === '/trial' ? '1주일 무료체험 신청' : label}
              >
                <span className="login-public-action__label">{label}</span>
                {badge && <span className="login-public-action__badge">{badge}</span>}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {signupPrompt && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? 18 : 24,
                background: 'rgba(2, 6, 18, 0.68)',
                backdropFilter: 'blur(8px)'
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="signup-required-title"
            >
              <Motion.div
                initial={{ opacity: 0, y: 22, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="hud-border"
                style={{
                  width: 'min(100%, 460px)',
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(17, 25, 48, 0.96), rgba(8, 12, 30, 0.96))',
                  boxShadow: '0 0 40px rgba(0, 212, 255, 0.18)',
                  padding: isMobile ? '1.25rem' : '1.5rem',
                  color: 'white'
                }}
              >
                <div className="font-title" id="signup-required-title" style={{
                  color: 'var(--crystal-cyan)',
                  fontSize: isMobile ? '1.25rem' : '1.45rem',
                  marginBottom: '0.85rem',
                  textShadow: '0 0 14px rgba(0, 212, 255, 0.55)'
                }}>
                  회원가입이 필요합니다
                </div>
                <p style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.78)',
                  lineHeight: 1.7,
                  fontSize: isMobile ? '0.98rem' : '1.05rem'
                }}>
                  이 계정은 아직 메타센스 회원으로 등록되어 있지 않습니다. 학부모 회원가입을 먼저 완료한 뒤 같은 화면에서 로그인해 주세요.
                </p>
                {signupPrompt.email && (
                  <div className="font-tech" style={{
                    marginTop: '1rem',
                    border: '1px solid rgba(0, 212, 255, 0.18)',
                    background: 'rgba(0, 212, 255, 0.08)',
                    borderRadius: 12,
                    padding: '0.8rem 0.9rem',
                    color: 'rgba(255,255,255,0.82)',
                    wordBreak: 'break-all'
                  }}>
                    시도한 계정: {signupPrompt.email}
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 10,
                  marginTop: '1.35rem'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupPrompt(null)
                      navigate('/signup')
                    }}
                    className="font-tech"
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--crystal-cyan), #7c3aed)',
                      color: '#04111f',
                      padding: '0.9rem 1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    회원가입하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupPrompt(null)}
                    className="font-tech"
                    style={{
                      flex: 1,
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      padding: '0.9rem 1rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    닫기
                  </button>
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>
        
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
            zIndex: 5,
            display: loginPanelOpen ? 'none' : 'block'
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
            gap: loginPanelOpen ? (isMobile ? '0.8rem' : '1rem') : (isMobile ? '1.5rem' : '2rem'),
            maxWidth: '800px',
            width: '100%'
          }}>
            {/* 타이틀 섹션 */}
            <div
              className="login-header"
              style={{
                width: '100%',
                pointerEvents: 'none',
                display: loginPanelOpen ? 'none' : 'block'
              }}
            >
              <Motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ display: 'flex', justifyContent: 'center', marginBottom: loginPanelOpen ? '0.45rem' : (isMobile ? '1rem' : '2rem') }}
              >
                <img
                  src="/m-logo.svg"
                  alt="Meta Sense Logo"
                  style={{
                    width: loginPanelOpen ? (isMobile ? '52px' : '72px') : (isMobile ? '80px' : '120px'),
                    filter: 'drop-shadow(0 0 20px rgba(0, 243, 255, 0.5))',
                    transition: 'width 0.25s ease'
                  }}
                />
              </Motion.div>
              <Motion.div 
                initial="hidden"
                animate="visible"
                className="font-title"
                style={{ 
                  marginBottom: '0.8rem',
                  display: loginPanelOpen ? 'none' : 'flex',
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
                             fontSize: loginPanelOpen ? (isMobile ? '1.8rem' : '2.75rem') : (isMobile ? '2.2rem' : '4rem'), 
                             color: '#ffffff',
                             textShadow: '0 0 20px #00f3ff, 0 0 40px #00f3ff',
                             display: 'inline-block',
                             fontWeight: 900,
                             transition: 'font-size 0.25s ease'
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
                  fontSize: loginPanelOpen ? (isMobile ? '0.78rem' : '0.92rem') : (isMobile ? '0.95rem' : '1.2rem'),
                  letterSpacing: loginPanelOpen ? '2px' : '3px',
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
                marginTop: loginPanelOpen ? '0' : '1rem'
              }}
            >
              <Motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px var(--neon-blue)" }}
                whileTap={{ scale: 0.95 }}
                className="glass-card font-title"
                onClick={handleLogin}
                style={{
                  padding: loginPanelOpen ? (isMobile ? '0.9rem 2rem' : '0.95rem 2.6rem') : (isMobile ? '1.2rem 3rem' : '1.2rem 3.5rem'),
                  fontSize: loginPanelOpen ? (isMobile ? '1rem' : '1.08rem') : (isMobile ? '1.2rem' : '1.3rem'),
                  color: 'var(--text-bright)',
                  cursor: 'pointer',
                  border: '2px solid var(--crystal-cyan)',
                  background: 'rgba(0, 212, 255, 0.15)',
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                  transition: 'all 0.25s ease'
                }}
              >
                시스템 접속 (LOGIN)
              </Motion.button>
            </Motion.div>

            <AnimatePresence>
              {loginPanelOpen && (
                <Motion.form
                  onSubmit={handleCredentialLogin}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.22 }}
                  className="hud-border"
                  style={{
                    width: 'min(100%, 420px)',
                    position: 'relative',
                    zIndex: 120,
                    display: 'grid',
                    gap: 12,
                    padding: isMobile ? '0.9rem' : '1rem',
                    borderRadius: 16,
                    background: 'rgba(5, 10, 25, 0.82)',
                    backdropFilter: 'blur(14px)',
                    boxShadow: '0 0 26px rgba(0, 212, 255, 0.16)'
                  }}
                >
                  <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1rem', textAlign: 'left' }}>
                    ACCESS CREDENTIALS
                  </div>
                  <input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디 또는 전화번호"
                    autoComplete="username"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid rgba(0, 212, 255, 0.28)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      padding: '0.78rem 0.9rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid rgba(0, 212, 255, 0.28)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      padding: '0.78rem 0.9rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                  {loginError && (
                    <div className="font-tech" style={{
                      color: '#ff8a84',
                      border: '1px solid rgba(255, 138, 132, 0.25)',
                      background: 'rgba(255, 88, 82, 0.08)',
                      borderRadius: 10,
                      padding: '0.72rem 0.85rem',
                      textAlign: 'left'
                    }}>
                      {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="font-tech"
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      background: loginLoading ? 'rgba(0,212,255,0.35)' : 'var(--crystal-cyan)',
                      color: '#04111f',
                      padding: '0.82rem 1rem',
                      fontWeight: 900,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    {loginLoading ? '접속 중...' : '로그인'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                    <span className="font-tech">OR</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <button
                    type="button"
                    disabled={loginLoading}
                    onClick={handleGoogleLogin}
                    className="font-tech"
                    style={{
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      padding: '0.8rem 1rem',
                      fontWeight: 800,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.98rem'
                    }}
                  >
                    Google 계정 로그인
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                    <span className="font-tech">GUEST</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <button
                    type="button"
                    disabled={loginLoading}
                    onClick={() => {
                      setGuestInvitePanelOpen((open) => !open)
                      setGuestInviteError('')
                    }}
                    className="font-tech"
                    style={{
                      border: '1px solid rgba(134,239,172,0.42)',
                      borderRadius: 10,
                      background: guestInvitePanelOpen ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.08)',
                      color: '#bbf7d0',
                      padding: '0.8rem 1rem',
                      fontWeight: 900,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.98rem'
                    }}
                  >
                    🔗 초대 링크로 로그인하기
                  </button>
                  <AnimatePresence initial={false}>
                    {guestInvitePanelOpen && (
                      <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'grid', gap: 9, paddingTop: 2 }}>
                          <input
                            value={guestInviteLink}
                            onChange={(event) => {
                              setGuestInviteLink(event.target.value)
                              setGuestInviteError('')
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleGuestInviteLogin()
                              }
                            }}
                            placeholder="게스트 초대 링크를 붙여 넣어 주세요"
                            inputMode="url"
                            autoComplete="off"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              border: '1px solid rgba(134,239,172,0.32)',
                              borderRadius: 10,
                              background: 'rgba(255,255,255,0.08)',
                              color: 'white',
                              padding: '0.78rem 0.9rem',
                              fontSize: '0.92rem',
                              outline: 'none'
                            }}
                          />
                          {guestInviteError && (
                            <div className="font-tech" style={{ color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.5, textAlign: 'left' }}>
                              {guestInviteError}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleGuestInviteLogin}
                            className="font-tech"
                            style={{
                              border: 'none',
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, #86efac, #22d3ee)',
                              color: '#04111f',
                              padding: '0.78rem 1rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              fontSize: '0.92rem'
                            }}
                          >
                            게스트 입장 화면으로 이동
                          </button>
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </Motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div style={{ width: '100%', zIndex: 100, marginTop: 'auto' }}>
          <Footer />
        </div>
      </div>
    )
  }

  const hasAccountDataIssue = userData?.dataLoadError || userData?.recoveryRequired

  if (!userData || hasAccountDataIssue) {
    const issueTitle = userData?.recoveryRequired
      ? '계정 데이터 복구가 필요합니다'
      : '계정 데이터를 불러오지 못했습니다'
    const issueDescription = userData?.recoveryRequired
      ? '학습 기록이나 광석 기록은 남아 있지만 회원 문서가 없어 관리자 복구가 필요합니다.'
      : '인증은 완료되었지만 광석, 연속일, 군집 권한을 아직 확인하지 못했습니다. 새로고침 후에도 반복되면 계정 연결을 점검해야 합니다.'

    return (
      <div className="space-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <StarField count={150} />
        <SpaceNavbar currentView={currentView} onViewChange={switchRootView} />
        <main
          className="space-container"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'calc(var(--space-nav-height) + 2rem) 1rem 7rem',
            pointerEvents: 'auto'
          }}
        >
          <section
            className="hud-border"
            style={{
              width: 'min(560px, 100%)',
              padding: '1.5rem',
              borderRadius: 18,
              background: 'rgba(5, 10, 25, 0.88)',
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.35)'
            }}
          >
            <div className="font-title" style={{ color: '#ff7676', fontSize: '1.45rem', marginBottom: '0.9rem' }}>
              ⚠ {issueTitle}
            </div>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 1.25rem' }}>
              {issueDescription}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="space-btn font-tech"
                onClick={() => window.location.reload()}
                style={{ padding: '0.8rem 1.1rem', color: 'var(--crystal-cyan)' }}
              >
                다시 동기화
              </button>
              <button
                type="button"
                className="space-btn font-tech"
                onClick={async () => {
                  await signOut(auth)
                  navigate('/', { replace: true })
                }}
                style={{ padding: '0.8rem 1.1rem', color: '#ffb86b' }}
              >
                로그아웃
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // Mission Hub Mode (Data Log, Transmission, Field Test)
  // --- Persistent Study Room Helper ---
  const persistentStudyRoom = activeRoomId ? (
    <div 
      className="space-bg fade-in" 
      style={{ 
        display: currentView === 'crew' ? 'block' : 'none',
        position: 'fixed',
        top: '64px', // Start below the navbar
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50, // Below navbar (1000)
        overflowY: 'auto'
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%', padding: '2rem 1rem 6rem' }}>
        <StudyStreamRoomView
          roomId={activeRoomId}
          user={user}
          userData={userData}
          crew={userData?.crewSnapshot}
          onLeave={() => setActiveRoomId('')}
        />
      </div>
    </div>
  ) : null;

  const renderMainContent = () => {
    if (missionUnitId) {
    if (!activeUnit) {
      return (
        <div className="space-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="glass-card hud-border" style={{ padding: '2rem', textAlign: 'center', maxWidth: '420px' }}>
            <div className="journey-loader" style={{ margin: '0 auto 1.5rem' }} />
            <h2 className="font-title" style={{ color: 'var(--crystal-cyan)', margin: '0 0 0.8rem' }}>
              미션 좌표 복구 중
            </h2>
            <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              이전 세션의 탐사 좌표를 확인하고 있습니다. 잘못된 좌표는 자동으로 행성 지도에서 다시 시작됩니다.
            </p>
          </div>
        </div>
      )
    }

    let initialMode = 'briefing' // default: show Mission Control unconditionally
    
    if (quickQuizMode) {
      initialMode = quickQuizMode;
    }

    return (
      <MissionHub
        key={missionUnitId}
        unitId={missionUnitId}
        clusterId={selectedClusterId}
        regionId={selectedRegionId || singleRegion?.id || singleRegion?.docId || activeChapter?.regionId || ''}
        activeUnit={activeUnit} 
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

  if (currentView === 'journey') {
    return (
      <div className="space-bg space-hud" style={{ minHeight: '100dvh', overflowY: 'auto', background: '#03050c' }}>
        <SpaceNavbar
          currentView={currentView}
          onViewChange={switchRootView}
        />
        <main style={{ position: 'relative', zIndex: 1 }}>
          <SpaceJourney
            userData={userData}
            initialHistory={history}
            initialDailyStats={learningSummary?.daily || null}
            initialTransactions={transactions}
            parentLoading={loadingHistory || loadingTransactions}
          />
        </main>
      </div>
    )
  }

  if (currentView === 'galaxy') {
    if (galaxyPlay.endedSummary) {
      return (
        <>
          <GalaxyPlayTimeStyles />
          <GalaxyReturnScreen summary={galaxyPlay.endedSummary} onConfirm={finishGalaxyReturn} />
        </>
      )
    }
    return (
      <div style={{ minHeight: '100dvh', overflow: 'hidden', background: '#03050c' }}>
        <GalaxyPlayTimeStyles />
        {galaxyPlay.session ? (
          <>
            <MetaGalaxy
              user={user}
              userData={userData}
              playSession={galaxyPlay.session}
              playRemainingSeconds={galaxyPlay.remainingSeconds}
              onBack={() => galaxyPlay.endSession('manual_exit')}
            />
            <GalaxyPlayHud
              remainingSeconds={galaxyPlay.remainingSeconds}
              dailyUsedSeconds={galaxyPlay.dailyUsedSeconds}
              dailyLimitSeconds={galaxyPlay.session.dailyLimitSeconds}
              warningStage={galaxyPlay.warningStage}
              onExit={() => galaxyPlay.endSession('manual_exit')}
            />
            <GalaxyTimeWarning stage={galaxyPlay.warningStage} />
            {galaxyPlay.connectionState === 'reconnecting' && <GalaxyReconnectNotice />}
            {galaxyPlay.idleWarning && (
              <GalaxyIdlePrompt
                onContinue={galaxyPlay.acknowledgeIdle}
                onExit={() => galaxyPlay.endSession('idle_timeout')}
              />
            )}
          </>
        ) : (
          <GalaxyEntryDialog
            access={galaxyPlay.access}
            busy={galaxyPlay.busy}
            error={galaxyPlay.error}
            onStart={startGalaxyEntry}
            onRetry={galaxyPlay.loadAccess}
            onClose={closeGalaxyEntry}
          />
        )}
      </div>
    )
  }

  // --- Profile View ---
  if (currentView === 'profile') {
    return (
      <div className="space-bg" style={{ overflowY: 'auto' }}>
        <SpaceNavbar 
          currentView={currentView} 
          onViewChange={switchRootView} 
        />
        <ProfileEditView onBack={() => { switchRootView('planet'); soundManager.playWarp(); }} />
      </div>
    )
  }

  if (currentView === 'crew') {
    return (
      <div className="space-bg" style={{ overflowY: 'auto' }}>
        <SpaceNavbar
          currentView={currentView}
          onViewChange={switchRootView}
        />
        <StudyCrewView 
          onBack={() => { switchRootView('planet'); soundManager.playWarp(); }} 
          onNavigateStore={(scroll) => {
            switchRootView('store');
            setShouldScrollStore(!!scroll);
            soundManager.playClick();
          }} 
        />
      </div>
    )
  }

  if (currentView === 'battle') {
    return (
      <div className="space-bg" style={{ minHeight: '100dvh', overflowY: 'auto' }}>
        <SpaceNavbar currentView={currentView} onViewChange={switchRootView} />
        <QuizBattleHub
          acceptedBattle={acceptedQuizBattle}
          onDirectBattleExit={() => {
            setAcceptedQuizBattle(null)
            setCurrentView(quizBattleReturnView || 'planet')
          }}
          onBack={() => { switchRootView('planet'); soundManager.playWarp(); }}
          onSoloQuiz={({ clusterId, regionId, unitId }) => {
            updateSelectedClusterId(clusterId)
            updateSelectedRegionId(regionId)
            updateSelectedChapterDocId(null)
            updateSelectedUnitDocId(null)
            setQuickQuizUnitId(unitId)
            setQuickQuizMode('quiz')
            setCurrentView('planet')
            soundManager.playWarp()
          }}
        />
      </div>
    )
  }

  if (currentView === 'mistake_notebook') {
    return (
      <div className="space-focus-route">
        <MistakeNotebookPlanet
          onNavigateView={switchRootView}
          onBack={() => {
            switchRootView('planet');
            soundManager.playWarp();
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
            totalHistoryCount={historyTotalCount}
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
          totalHistoryCount={historyTotalCount}
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
    <div className={`space-bg ${isMobile ? 'mobile-space-home' : ''}`} style={{ 
      overflowX: 'hidden'
    }}>
      <GalaxyPlayTimeStyles />
      {galaxyEntryOpen && (
        <GalaxyEntryDialog
          access={galaxyPlay.access}
          busy={galaxyPlay.busy}
          error={galaxyPlay.error}
          onStart={startGalaxyEntry}
          onRetry={galaxyPlay.loadAccess}
          onClose={closeGalaxyEntry}
        />
      )}
      {/* 3D Background Scene - Always Visible but controlled by state */}
      <AnimatePresence>
        {currentView === 'planet' && selectedClusterId && !is2DMode && !isMobile && (
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
                selectRegion(id)
                soundManager.playWarp()
              }}
              onSelectArchive={() => {
                setAssignmentHubInitialDate(null);
                switchRootView('assignment_hub');
                soundManager.playWarp();
              }}
              onSelectDarkMatter={() => {
                startDarkMatterMode('learning');
              }}
              onSelectDarkMatterRefinery={() => {
                startDarkMatterMode('refinery');
              }}
              onSelectMistakeNotebook={() => {
                switchRootView('mistake_notebook');
                soundManager.playWarp();
              }}
              darkMatterCount={darkMatterCount}
              equipment={equipment}
              shipData={userData}
              shipCustomization={userData?.shipCustomization || {}}
              isBoosting={isBoosting}
            />
          </Motion.div>
        )}
      </AnimatePresence>

      {currentView === 'planet' && selectedClusterId && !selectedRegionId && !is2DMode && !isMobile && userData?.crewId && !userData?.isGuest && (
        <CrewMothershipFlyby crewId={userData.crewId} />
      )}

      {/* Scan line removed */}
      
      {/* Navigation */}
      <SpaceNavbar 
        currentView={currentView} 
        onViewChange={switchRootView} 
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
              selectRegion(region.id);
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

      <AnimatePresence>
        {attendancePromptOpen && activeClusterData && (
          <Motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10005,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) dismissAttendancePrompt();
            }}
          >
            <Motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="glass-card hud-border"
              style={{
                width: 'min(92vw, 520px)',
                padding: '1.7rem',
                background: 'rgba(5, 10, 25, 0.94)',
                borderColor: attendancePromptStatus?.state === 'late' ? '#ff4500' : 'var(--crystal-cyan)',
                boxShadow: attendancePromptStatus?.state === 'late'
                  ? '0 0 32px rgba(255, 69, 0, 0.26)'
                  : '0 0 32px rgba(0, 212, 255, 0.24)',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="space-btn font-tech"
                  onClick={dismissAttendancePrompt}
                  aria-label="출석 안내 닫기"
                  style={{
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    borderRadius: '50%',
                    borderColor: 'rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.06)'
                  }}
                >
                  X
                </button>
              </div>

              <div className="font-title" style={{ fontSize: '1.55rem', color: 'var(--text-bright)', marginBottom: '0.6rem' }}>
                출석 체크 가능
              </div>
              <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 1.3rem' }}>
                {activeClusterData.name || '현재 군집'} 수업 시간이어서 여기서 바로 출석할 수 있습니다.
              </p>

              <WarpGateDocking
                clusterData={activeClusterData}
                user={user}
                userData={userData}
                attendanceMutation={attendanceMutation}
                todayAttendance={todayAttendance}
                todayKST={todayKSTForAttendance}
                onDockingSuccess={dismissAttendancePrompt}
              />

              <button
                type="button"
                className="space-btn font-tech"
                onClick={dismissAttendancePrompt}
                style={{
                  marginTop: '1.25rem',
                  padding: '0.65rem 1.1rem',
                  color: 'var(--text-muted)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)'
                }}
              >
                나중에 과제 기록소에서 하기
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Overlay */}
      <main className="space-container" style={{ 
        pointerEvents: 'none',
        overflowY: 'visible'
      }}>
        {currentView === 'planet' && !selectedClusterId && (
          <div style={{ pointerEvents: 'auto', width: '100%' }}>
            <ClusterSelector 
              clusters={activeClusters}
              onEnterFrontier={requestGalaxyEntry}
              onSelect={(id) => {
                selectCluster(id);
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
                            onClick={() => { selectCluster(null); soundManager.playClick(); }}
                    style={{ 
                      position: isMobile ? 'relative' : 'fixed', 
                      left: isMobile ? 'auto' : '20px', 
                      top: isMobile ? 'auto' : '120px', 
                      margin: isMobile ? '0.75rem 0 0' : 0,
                      padding: isMobile ? '0.75rem 1rem' : '12px 24px', 
                      fontSize: isMobile ? '0.9rem' : '1rem', 
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
                    display: isMobile ? 'none' : 'block',
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
                    marginTop: is2DMode ? (isMobile ? '0.75rem' : '150px') : '0',
                    pointerEvents: 'auto',
                    zIndex: 50,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: is2DMode ? (isMobile ? '0.75rem' : '2rem') : '0.6rem',
                    justifyContent: 'center',
                    maxWidth: is2DMode ? (isMobile ? '100%' : '1200px') : '90vw',
                    padding: is2DMode ? (isMobile ? '0.75rem 0.15rem 5.5rem' : '2rem') : '1rem 1.5rem',
                    background: is2DMode ? 'transparent' : 'rgba(5, 5, 20, 0.7)',
                    backdropFilter: is2DMode ? 'none' : 'blur(12px)',
                    borderRadius: '16px',
                    border: is2DMode ? 'none' : '1px solid rgba(0, 243, 255, 0.15)',
                    margin: is2DMode ? (isMobile ? '0.75rem auto 5.5rem' : '180px auto 100px') : undefined // Added more bottom margin for scrolling
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
                        {/* Mobile-safe route into the 3D Astra Frontier world. */}
                        <Motion.button
                          type="button"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.06 } }}
                          whileHover={isMobile ? undefined : { scale: 1.05, filter: 'brightness(1.16)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={requestGalaxyEntry}
                          style={{
                            width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                            minHeight: isMobile ? '148px' : '250px',
                            padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                            border: '1px solid rgba(109, 245, 176, 0.52)',
                            borderRadius: isMobile ? '14px' : '20px',
                            color: 'white',
                            cursor: 'pointer',
                            background: 'radial-gradient(circle at 78% 20%, rgba(109,245,176,.27), transparent 34%), linear-gradient(145deg, rgba(14,54,55,.94), rgba(7,21,36,.96))',
                            boxShadow: '0 8px 32px rgba(63, 218, 166, .18)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '.45rem' : '.8rem',
                            font: 'inherit',
                          }}
                        >
                          <span aria-hidden="true" style={{ fontSize: isMobile ? '2.2rem' : '4rem' }}>🌌</span>
                          <strong className="font-tech" style={{ fontSize: isMobile ? '.92rem' : '1.3rem' }}>아스트라 프론티어</strong>
                          <small style={{ color: '#9ee8cc', fontSize: isMobile ? '.68rem' : '.8rem', lineHeight: 1.35 }}>3D 게임 세계로 진입</small>
                        </Motion.button>

                        {/* Special Card: Assignment Hub */}
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                                  whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setAssignmentHubInitialDate(null);
                                    switchRootView('assignment_hub');
                                    if (soundManager?.playWarp) soundManager.playWarp();
                                  }}
                          style={{
                            padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                            width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.4)',
                            borderRadius: isMobile ? '14px' : '20px',
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
                            <div style={{ fontSize: isMobile ? '2.2rem' : '4rem', marginBottom: '0.5rem' }}>🛰️</div>
                            <span className="font-tech" style={{ fontSize: isMobile ? '0.92rem' : '1.3rem', fontWeight: 'bold' }}>과제 기록소</span>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#ffd700', fontWeight: 'bold' }}>Stellar Archive</div>
                          </div>
                        </Motion.div>

                        {/* Special Card: Mistake Notebook */}
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: 0.13 } }}
                          whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            switchRootView('mistake_notebook');
                            if (soundManager?.playWarp) soundManager.playWarp();
                          }}
                          style={{
                            padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                            width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                            background: 'rgba(20, 184, 166, 0.1)',
                            border: '1px solid rgba(45, 212, 191, 0.42)',
                            borderRadius: isMobile ? '14px' : '20px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 8px 32px rgba(20, 184, 166, 0.18)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: isMobile ? '2.2rem' : '4rem', marginBottom: '0.5rem' }}>🧠</div>
                            <span className="font-tech" style={{ fontSize: isMobile ? '0.92rem' : '1.3rem', fontWeight: 'bold' }}>오답노트 행성</span>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#5eead4', fontWeight: 'bold' }}>Memory Planet</div>
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
                            padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                            width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: isMobile ? '14px' : '20px',
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
                            <div style={{ fontSize: isMobile ? '2.2rem' : '4rem', marginBottom: '0.5rem' }}>🌑</div>
                            <span className="font-tech" style={{ fontSize: isMobile ? '0.92rem' : '1.3rem', fontWeight: 'bold' }}>다크 매터</span>
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
                            padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                            width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.45)',
                            borderRadius: isMobile ? '14px' : '20px',
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
                            <div style={{ fontSize: isMobile ? '2.2rem' : '4rem', marginBottom: '0.5rem' }}>⚗️</div>
                            <span className="font-tech" style={{ fontSize: isMobile ? '0.92rem' : '1.3rem', fontWeight: 'bold' }}>다크매터 정제소</span>
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
                    const westernClassicRegionImage = selectedClusterId === 'western-classic' ? getWesternClassicRegionImage(region) : null;
                    
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
                                selectRegion(region.id);
                                if (soundManager?.playWarp) soundManager.playWarp();
                      }}
                      style={{
                        padding: is2DMode ? (isMobile ? '0.85rem 0.65rem' : '1.5rem') : '0.5rem 1rem',
                        width: is2DMode ? (isMobile ? 'calc(50% - 0.45rem)' : '250px') : 'auto',
                        background: is2DMode 
                          ? (isCompleted ? 'rgba(80, 200, 120, 0.15)' : 'rgba(5, 20, 40, 0.8)') 
                          : (isCompleted ? 'rgba(80, 200, 120, 0.2)' : 'rgba(0, 212, 255, 0.1)'),
                        border: is2DMode 
                          ? `1px solid ${isCompleted ? 'rgba(80, 200, 120, 0.6)' : 'rgba(0, 243, 255, 0.4)'}`
                          : `1px solid ${isCompleted ? 'rgba(80, 200, 120, 0.5)' : 'rgba(0, 212, 255, 0.3)'}`,
                        borderRadius: is2DMode ? (isMobile ? '14px' : '20px') : '10px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: is2DMode ? 'column' : 'row',
                        alignItems: 'center',
                        gap: is2DMode ? (isMobile ? '0.55rem' : '1rem') : '0.5rem',
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
                          <RegionPlanetVisual
                            imageSrc={middleMathRegionImage || pythonRegionImage || westernClassicRegionImage}
                            title={region.title}
                            icon={region.icon}
                            isMobile={isMobile}
                            isLocked={isRegionLocked}
                          />
                        )}
                        <span className="font-tech" style={{ 
                          fontSize: is2DMode ? (isMobile ? '0.94rem' : '1.3rem') : '0.85rem',
                          fontWeight: is2DMode ? 'bold' : 'normal',
                          color: isRegionLocked ? '#88aabb' : 'white',
                          display: 'block',
                          maxWidth: '100%',
                          lineHeight: 1.35,
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere',
                          textAlign: 'center'
                        }}>
                          {isRegionLocked && !is2DMode ? '🔒 ' : ''}
                          {region.title}
                        </span>
                        
                        {is2DMode && (
                          <div style={{ marginTop: isMobile ? '0.45rem' : '0.8rem', fontSize: isMobile ? '0.74rem' : '0.9rem', color: isRegionLocked ? '#ff6b6b' : 'var(--crystal-cyan)', fontWeight: 'bold' }}>
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
              <div className="fade-in" style={{ pointerEvents: 'auto', marginTop: isMobile ? '1rem' : '5vh' }}>
                <button 
                  className="space-nav-link font-tech"
                          onClick={() => { selectRegion(null); soundManager.playClick() }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← RETURN TO GALAXY
                </button>
                <div className="glass-card" style={{ padding: isMobile ? '1rem' : '2rem', background: 'rgba(5, 5, 16, 0.8)', backdropFilter: 'blur(20px)', position: 'relative' }}>
                  {/* Close Button */}
                  <button 
                            onClick={() => { selectRegion(null); soundManager.playClick() }}
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
                    fontSize: isMobile ? '1.35rem' : '2rem', 
                    marginBottom: isMobile ? '1rem' : '2rem',
                    borderBottom: '1px solid var(--neon-blue)',
                    paddingBottom: '1rem' 
                  }}>
                    SECTOR: {activeRegion?.title}
                  </h2>
                  <SectorLeaderboard user={user} regionId={selectedRegionId} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: isMobile ? '0.8rem' : '1.5rem'
                  }}>
                    {loadingChapters ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)' }}>SCANNING...</div>
                    ) : chapters?.map(chapter => (
                      <Motion.div
                        key={chapter.docId}
                        whileHover={isMobile ? undefined : { scale: 1.02, backgroundColor: 'rgba(0, 243, 255, 0.1)' }}
                        className="glass-card hud-border"
                                onClick={() => { selectChapter(chapter.docId); soundManager.playWarp() }}
                        style={{ padding: isMobile ? '1.1rem' : '2rem', cursor: 'pointer' }}
                      >
                        <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.5rem' }}>
                          {chapter.title}
                        </h3>
                        {chapterProgress[chapter.docId] ? (
                          chapterProgress[chapter.docId].isFinished ? (
                            <p className="font-tech" style={{ color: '#50c878', fontSize: '0.9rem', fontWeight: 800 }}>완료 🏆</p>
                          ) : (() => {
                            const p = chapterProgress[chapter.docId].counts;
                            const hasAny = p.quiz.total > 0 || p.video.total > 0 || p.text.total > 0 || p.workbook.total > 0 || p.codeTrace.total > 0;
                            
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
                                {p.codeTrace.total > 0 && (
                                  <span className="font-tech" style={{ color: p.codeTrace.completed === p.codeTrace.total ? '#50c878' : 'var(--crystal-cyan)', fontSize: '0.85rem' }}>
                                    ⌨️ {p.codeTrace.completed}/{p.codeTrace.total}
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
                            onClick={() => { selectRegion(null); soundManager.playClick() }}
                    style={{ 
                      display: 'block', 
                      margin: isMobile ? '1.5rem auto 0' : '3rem auto 0',
                      padding: '0.8rem 2.5rem'
                    }}
                  >
                    ← RETURN TO GALAXY
                  </button>
                </div>
              </div>
            ) : (
              // Unit Selection (Overlay)
              <div className="fade-in" style={{ pointerEvents: 'auto', marginTop: isMobile ? '1rem' : '5vh' }}>
                <button 
                  className="space-nav-link font-tech"
                          onClick={() => {
                            soundManager.playClick()
                            selectChapter(null)
                          }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← RETURN TO SECTOR
                </button>
                <div className="glass-card" style={{ padding: isMobile ? '1rem' : '2rem', background: 'rgba(5, 5, 16, 0.8)', backdropFilter: 'blur(20px)', maxWidth: '800px', width: '100%', boxSizing: 'border-box', margin: '0 auto', position: 'relative' }}>
                  {/* Close Button */}
                  <button 
                    onClick={() => {
                              soundManager.playClick()
                              if (chapters?.length === 1) {
                                selectRegion(null)
                              } else {
                                selectChapter(null)
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
                    fontSize: isMobile ? '1.25rem' : '1.8rem', 
                    marginBottom: isMobile ? '1rem' : '2rem', 
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
                      
                      const { hasQuiz, hasVideo, hasText, hasWorkbook, hasCodeTrace } = getUnitContentAvailability(unit, quizAvailabilityMap)
                      const hasAnyContent = hasQuiz || hasVideo || hasText || hasWorkbook || hasCodeTrace

                      const isOverallCompleted = hasAnyContent &&
                        (!hasQuiz || uProg.quiz) &&
                        (!hasVideo || uProg.video) &&
                        (!hasText || uProg.text) &&
                        (!hasWorkbook || uProg.workbook) &&
                        (!hasCodeTrace || uProg.codeTrace)

                      const bestScore = bestScores[unit.docId]

                      return (
                        <Motion.button
                          key={unit.docId}
                          whileHover={isMobile || !hasAnyContent ? undefined : { scale: 1.02, x: 10, backgroundColor: 'rgba(0, 243, 255, 0.15)' }}
                                  className={`glass-card hud-border ${isOverallCompleted ? 'completed' : ''}`}
                                  disabled={!hasAnyContent}
                                  onClick={() => { 
                                    if (!hasAnyContent) return
                                    selectUnit(unit.docId)
                                    soundManager.playClick() 
                          }}
                          style={{
                            padding: isMobile ? '1rem' : '1.2rem 1.5rem',
                            textAlign: 'left',
                            cursor: hasAnyContent ? 'pointer' : 'not-allowed',
                            color: hasAnyContent ? 'var(--text-bright)' : 'rgba(255,255,255,0.45)',
                            fontSize: isMobile ? '0.96rem' : '1.1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'stretch' : 'center',
                            borderLeft: isOverallCompleted ? '4px solid var(--secondary)' : '1px solid var(--neon-blue)',
                            position: 'relative',
                            flexWrap: 'wrap',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: isMobile ? '0.8rem' : '1rem',
                            opacity: hasAnyContent ? 1 : 0.62
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.55rem' : '1rem', minWidth: 0 }}>
                            <span className="font-title" style={{ lineHeight: 1.35, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
                              <span style={{ color: 'var(--neon-blue)', marginRight: isMobile ? '0.45rem' : '1rem' }}>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                              {isOverallCompleted && <span style={{ marginRight: '0.5rem' }}>✅</span>}
                              {unit.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: isMobile ? '0.75rem' : '1.5rem', flexWrap: 'wrap' }}>
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
                              {hasCodeTrace && (
                                <span className="font-tech" style={{
                                  color: uProg.codeTrace ? '#50c878' : 'rgba(255,255,255,0.3)',
                                  fontSize: '1rem',
                                  textShadow: uProg.codeTrace ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title="Code Trace">⌨️</span>
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
                            
                            <span style={{ color: hasAnyContent ? 'var(--crystal-cyan)' : 'var(--text-muted)', minWidth: isMobile ? 'auto' : '80px', textAlign: 'right' }}>
                              {!hasAnyContent ? '준비중' : (isOverallCompleted ? 'REPLAY' : '🚀 START')}
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
                                selectRegion(null)
                              } else {
                                selectChapter(null)
                              }
                    }}
                    style={{ 
                      display: 'block', 
                      margin: isMobile ? '1.5rem auto 0' : '3rem auto 0',
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
          {currentView === 'collection' && <SpaceCollection userData={userDataWithLearningSummary} history={history} />}
          {currentView === 'store' && (
            <SpaceStore user={user} userData={userDataWithLearningSummary} shouldScrollToBottom={shouldScrollStore} history={history} />
          )}
          
          {currentView === 'ranking' && <SpaceRanking user={user} userData={userData} regions={regions} />}
          {currentView === 'journey' && (
            <SpaceJourney 
              userData={userData} 
              initialHistory={history} 
              initialDailyStats={learningSummary?.daily || null}
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
                            switchRootView('dashboard')
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
                            clearMissionSelection()
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
                    initialDateStr={assignmentHubInitialDate}
                    onClose={() => {
                      setAssignmentHubInitialDate(null);
                      switchRootView('planet');
                    }}
                    onNavigateToUnit={(unitId) => {
                      setAssignmentHubInitialDate(null);
                      switchRootView('planet');
                      if (unitId) selectUnit(unitId);
                    }}
          />
        )}
      </AnimatePresence>
    </div>
    );
  };

  return (
    <>
      <RealtimeTopAlerts userId={user?.uid} />
      {renderMainContent()}
      {persistentStudyRoom}
    </>
  );
}


// RewardPotentialModal has been moved to MissionHub.jsx


export default SpaceHome
