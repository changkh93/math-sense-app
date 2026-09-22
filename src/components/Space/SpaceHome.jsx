import { initialAssignmentCluster } from './assignmentNavigation'
import { lazy, useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, db, functions } from '../../firebase'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, documentId, serverTimestamp, query, orderBy, onSnapshot, doc, where, getDocs, getDoc, writeBatch, increment, limit, runTransaction, Timestamp, updateDoc } from 'firebase/firestore'
import { useClusters, useRegions, useRegion, useChapters, useChapter, useUnits, useUnit, useQuizzes } from '../../hooks/useContent'
import { useAuth } from '../../hooks/useAuth'
import { usePresence } from '../../hooks/usePresence'
// import { regions as localRegions } from '../../data/regions'
import { motion as Motion, AnimatePresence } from 'framer-motion' // Added Framer Motion
import { httpsCallable } from 'firebase/functions'

// Space Components
import StarField from './StarField'
import ClusterSelector from './ClusterSelector'
import RegionAccessModal from './RegionAccessModal' // New Integration
import WarpGateDocking from './WarpGateDocking'
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
import CrewMothershipFlyby from './CrewMothershipFlyby'
import { useGlobalActiveRoomId } from '../../utils/roomState'
import { useApplyMissingAssignmentPenalties, useRecordAttendance, useStudentAttendance } from '../../hooks/useAssignments'

// import { useParticles, createParticleBurst } from './ParticleEffects'
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST, getMondayKSTKey, calculateStreakFromHistory, extractDefendedDates, extractLearningActivityDates, isRadarActive } from '../../utils/streakUtils'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import { applyCrystalRewardMultiplier } from '../../utils/holidayUtils'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'
import { normalizeNotificationLink } from '../../utils/socialUtils'
import { StreakCelebrationModal, StreakToast } from './StreakCelebration'
import { getAttendanceDockingStatus } from '../../utils/attendanceUtils'
import { prepareWorkbookPageCheckpoint } from '../../utils/workbookPersistence'
import { getLearningProgressCompletion, mergeUnitProgressCompletion, mergeSummaryWithRecentHistory, shouldCheckLearningSummaryFreshness } from '../../utils/learningSummaryUtils'
import { checkWebGLSupport } from '../../utils/webglSupport'
import {
  consumeGoogleRedirect,
  getGoogleAuthErrorMessage,
  signInWithGooglePopup,
  startGoogleRedirect,
} from '../../utils/googleAuthFlow'
import { hasPythonMissionSetForUnit, isMissionLabRequired, PYTHON_PROTOCOL_ENTRY_UNITS } from '../PythonWorld/pythonMissionCatalog'
import { validateQuizCompletionSnapshot } from '../../utils/quizSessionGuards'

import soundManager from '../../utils/SoundManager'
import SpaceNavbar from './SpaceNavbar'
import { BellRing, Sparkles, X } from 'lucide-react'

// Styles
import '../../styles/space-theme.css'

const SpaceQuizView = lazy(() => import('./SpaceQuizView'))
const Planet3D = lazy(() => import('./Planet3D'))
const SpaceScene = lazy(() => import('./SpaceScene'))
const ElementaryPlanetExplorer = lazy(() => import('./ElementaryPlanetExplorer'))
const CoursePlanetExplorer = lazy(() => import('./CoursePlanetExplorer'))
const MissionHub = lazy(() => import('./MissionHub'))
const SpaceDashboard = lazy(() => import('./SpaceDashboard'))
const SpaceCollection = lazy(() => import('./SpaceCollection'))
const SpaceStore = lazy(() => import('./SpaceStore'))
const SpaceRanking = lazy(() => import('./SpaceRanking'))
const SpaceJourney = lazy(() => import('./SpaceJourney'))
const AssignmentHub = lazy(() => import('./AssignmentHub'))
const MistakeNotebookPlanet = lazy(() => import('./MistakeNotebookPlanet'))
const ProfileEditView = lazy(() => import('./ProfileEditView'))
const StudyCrewView = lazy(() => import('./StudyCrewView'))
const QuizBattleHub = lazy(() => import('./QuizBattleHub'))
const DarkMatterView = lazy(() => import('./DarkMatterView'))
const DarkMatterRefineryView = lazy(() => import('./DarkMatterRefineryView'))
const StudyStreamRoomView = lazy(() => import('./StudyStreamRoomView'))
const CrystalLedger = lazy(() => import('./CrystalLedger'))
const loadMetaGalaxy = () => import('../GalaxySocial/MetaGalaxy')
const MetaGalaxy = lazy(loadMetaGalaxy)
const PythonGameStudioPage = lazy(() => import('../PythonGameStudio/PythonGameStudioPage'))
const PythonProtocolHub = lazy(() => import('../PythonWorld/PythonProtocolHub'))
const AlgorithmConstellationHub = lazy(() => import('../AlgorithmConstellation/client/hub/AlgorithmConstellationHub'))
const ReadingLibraryView = lazy(() => import('./ReadingLibrary/ReadingLibraryView'))
const MultiplicationCardLab = lazy(() => import('./MultiplicationCardLab'))
const VerticalMultiplicationLab = lazy(() => import('./VerticalMultiplicationLab'))
const DivisionCardLab = lazy(() => import('./DivisionCardLab'))
const VerticalDivisionLab = lazy(() => import('./VerticalDivisionLab'))
const EquivalentFractionLab = lazy(() => import('./EquivalentFractionLab'))
const CommonDenominatorLab = lazy(() => import('./CommonDenominatorLab'))
const FractionReductionLab = lazy(() => import('./FractionReductionLab'))
import { isWesternClassicCluster, filterWesternClassicRegions } from '../../constants/westernClassicNavigation'
import { isCourseExplorerCluster } from './coursePlanetCatalog'
import PublicHomeIntro from '../PublicHomeIntro'
import PublicHomeLoginDialog from '../PublicHomeLoginDialog'
import AuthBootstrapScreen from '../AuthBootstrapScreen'
import Footer from '../common/Footer'

const ASSIGNMENT_PENALTY_SWEEP_STORAGE_PREFIX = 'metasense.assignmentPenaltySweep.v1'

function getAssignmentPenaltySweepClusterIds(userData, accessClaims) {
  if (!userData || userData.isGuest || userData.role === 'admin' || userData.role === 'parent') return []

  if (accessClaims?.version >= 1) {
    return [...new Set((accessClaims.courses || []).filter(Boolean))].sort()
  }

  return Object.entries(userData.clusterAccess || {})
    .filter(([, status]) => status === 'active')
    .map(([clusterId]) => clusterId)
    .sort()
}

function getAssignmentPenaltySweepStorageKey(userId, clusterId) {
  return `${ASSIGNMENT_PENALTY_SWEEP_STORAGE_PREFIX}:${userId}:${clusterId}`
}

function SpaceViewFallback() {
  return (
    <div
      role="status"
      className="space-bg space-hud"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeContent: 'center',
        gap: 12,
        padding: 24,
        color: '#e0f2fe',
        textAlign: 'center',
      }}
    >
      <div className="journey-loader" style={{ margin: '0 auto 4px' }} />
      <strong className="font-title">화면 좌표 동기화 중</strong>
      <small className="font-tech" style={{ color: 'rgba(224, 242, 254, 0.68)' }}>
        선택한 탐사 모듈을 불러오고 있습니다.
      </small>
    </div>
  )
}

function ExperienceLearningCard({ testId, eyebrow, badge, title, description, icon, accent, isMobile, onClick }) {
  return (
    <Motion.button
      type="button"
      data-testid={testId}
      whileHover={isMobile ? undefined : { y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: isMobile ? 148 : 176,
        padding: isMobile ? '1rem' : '1.3rem',
        border: `1px solid ${accent.border}`,
        borderRadius: isMobile ? 16 : 20,
        background: accent.background,
        boxShadow: accent.shadow,
        color: 'white',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: isMobile ? '0.8rem' : '1.05rem',
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: isMobile ? 50 : 62,
          height: isMobile ? 50 : 62,
          borderRadius: isMobile ? 15 : 20,
          display: 'grid',
          placeItems: 'center',
          background: accent.icon,
          color: '#05212a',
          fontSize: isMobile ? '1.5rem' : '2rem',
          boxShadow: accent.iconShadow,
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <strong style={{ color: accent.label, fontSize: '0.69rem', letterSpacing: '0.1em' }}>{eyebrow}</strong>
          <span style={{ color: '#b8cdd8', fontSize: '0.7rem' }}>{badge}</span>
        </span>
        <strong className="font-title" style={{ display: 'block', fontSize: isMobile ? '1rem' : '1.2rem', marginBottom: '0.3rem' }}>
          {title}
        </strong>
        <span style={{ display: 'block', color: '#b8cdd8', fontSize: isMobile ? '0.73rem' : '0.84rem', lineHeight: 1.5 }}>
          {description}
        </span>
      </span>
      <span aria-hidden="true" style={{ color: accent.label, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>→</span>
    </Motion.button>
  )
}

function CompletionResultModal({ result, onClose, onDashboard, onContinue }) {
  useEffect(() => {
    if (!result) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, result])

  if (!result || typeof document === 'undefined') return null

  // Windows touch Chrome can occasionally lose the synthetic click while the
  // quiz view is being replaced. Activate touch controls on pointer-up as a
  // direct path, while retaining click for mouse, pen, and keyboard input.
  const handleTouchActivation = (event, action) => {
    if (event.pointerType !== 'touch') return
    event.preventDefault()
    action()
  }

  return createPortal(
    <div
      className="modal-overlay space-hud"
      data-overlay="completion-result"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-result-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 50000,
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.76)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        isolation: 'isolate',
        pointerEvents: 'auto',
        touchAction: 'manipulation'
      }}
    >
      <div
        className="hud-border completion-modal-space"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(500px, calc(100vw - 2rem))',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          padding: '3rem',
          textAlign: 'center',
          borderRadius: '20px',
          background: 'rgba(0, 15, 30, 0.98)',
          boxShadow: result.isPerfect ? 'var(--glow-gold)' : 'var(--glow-cyan)',
          pointerEvents: 'auto',
          touchAction: 'pan-y'
        }}
      >
        <button
          type="button"
          aria-label="완료 화면 닫기"
          title="닫기"
          onClick={onClose}
          onPointerUp={(event) => handleTouchActivation(event, onClose)}
          style={{
            position: 'absolute',
            top: '0.85rem',
            right: '0.85rem',
            zIndex: 2,
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: '50%',
            background: 'rgba(3, 12, 24, 0.82)',
            color: 'var(--text-bright)',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <div className="hud-line mb-4"></div>
        <h2
          className="font-title gradient-text-space"
          id="completion-result-title"
          style={{
            fontSize: '2.5rem',
            marginBottom: '1.5rem',
            background: 'linear-gradient(to right, #00f3ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {result.isPerfect ? '🌟 MISSION PERFECT' : '🚀 MISSION COMPLETE'}
        </h2>

        <div style={{ margin: '2rem 0' }}>
          <div className="crystal-icon large" style={{ width: '60px', height: '60px', margin: '0 auto 1.5rem' }}></div>
          <p className="font-tech" style={{ fontSize: '1.2rem', color: 'var(--text-bright)' }}>
            획득한 메타 광석: <span style={{ color: 'var(--crystal-cyan)', fontWeight: 900 }}>{result.crystalsEarned}개</span>
          </p>
          {result.rewardMessage && (
            <p className="font-tech" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
              {result.rewardMessage}
            </p>
          )}
        </div>

        <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          행성 탐사가 성공적으로 종료되었습니다.<br />다음 경로를 선택하십시오.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            type="button"
            className="hud-btn primary glass"
            onClick={onDashboard}
            onPointerUp={(event) => handleTouchActivation(event, onDashboard)}
            style={{
              padding: '1rem',
              background: 'rgba(0, 243, 255, 0.2)',
              border: '1px solid var(--neon-blue)',
              color: 'var(--text-bright)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              touchAction: 'manipulation'
            }}
          >
            📊 성장 기록 분석 (DASHBOARD)
          </button>
          <button
            type="button"
            className="hud-btn secondary glass"
            onClick={onContinue}
            onPointerUp={(event) => handleTouchActivation(event, onContinue)}
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-muted)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              touchAction: 'manipulation'
            }}
          >
            🛰️ 연속 탐사 진행 (CONTINUE)
          </button>
        </div>
        <div className="hud-line mt-4"></div>
      </div>
    </div>,
    document.body
  )
}

function GalaxyModuleFallback() {
  return (
    <div
      role="status"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeContent: 'center',
        gap: 10,
        padding: 24,
        background: '#03050c',
        color: '#e0f2fe',
        textAlign: 'center',
      }}
    >
      <strong className="font-title">아스트라 프론티어로 워프 중</strong>
      <small className="font-tech" style={{ color: 'rgba(224, 242, 254, 0.68)' }}>
        행성 지형 모듈을 불러오고 있습니다.
      </small>
    </div>
  )
}

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

function getStableWorkbookRewardKey(workbookSignature, pageId, attempt) {
  const signature = String(workbookSignature || 'legacy')
  let signatureHash = 2166136261
  for (let index = 0; index < signature.length; index += 1) {
    signatureHash ^= signature.charCodeAt(index)
    signatureHash = Math.imul(signatureHash, 16777619)
  }
  const safePageId = String(pageId || 'page').replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeAttempt = Math.max(1, Math.floor(Number(attempt) || 1))
  return `${(signatureHash >>> 0).toString(36)}_${safePageId}_a${safeAttempt}`
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

function getNotificationPreview(notification = {}) {
  return String(notification.message || notification.title || '새 알림이 도착했어요.').replace(/\s+/g, ' ').trim()
}

function RealtimeTopAlerts({ userId }) {
  const navigate = useNavigate()
  const [latestNotification, setLatestNotification] = useState(null)
  const [dismissedIds, setDismissedIds] = useState({})
  const [activeAlert, setActiveAlert] = useState(null)
  const [alertAction, setAlertAction] = useState('')

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
      if (alert.kind === 'notification' && !alert.source.isRead) {
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
            top: 'max(5.2rem, calc(env(safe-area-inset-top, 0px) + 4.4rem))',
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
                {activeAlert.kind === 'notification' && activeAlert.source.link && (() => {
                  const targetLink = normalizeNotificationLink(activeAlert.source.link)
                  return (
                    <>
                      <button
                        type="button"
                        className="space-btn font-tech"
                        onClick={() => {
                          setActiveAlert(null)
                          navigate(targetLink)
                        }}
                        style={{ borderRadius: 9, minHeight: 36, padding: '0 0.8rem', color: activeAlert.color, borderColor: `${activeAlert.color}66` }}
                      >
                        바로 확인하기
                      </button>
                      <button
                        type="button"
                        className="space-nav-link font-tech"
                        onClick={() => {
                          window.open(targetLink, '_blank', 'noopener,noreferrer')
                        }}
                        style={{ borderRadius: 9, minHeight: 36, padding: '0 0.8rem' }}
                      >
                        새 탭에서 열기
                      </button>
                    </>
                  )
                })()}
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

function getUnitContentAvailability(unit, quizAvailabilityMap = {}, clusterId = '') {
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
    hasCodeTrace: hasFlag('hasCodeTrace') ? flags.hasCodeTrace : false,
    hasMissionLab: hasPythonMissionSetForUnit(unit, clusterId)
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
const ROOT_VIEWS = new Set(['planet', 'galaxy', 'battle', 'dashboard', 'ranking', 'store', 'crew', 'journey', 'ledger', 'profile', 'assignment_hub', 'mistake_notebook', 'lumi_protocol', 'algorithm_constellation', 'reading_library', 'python_game_studio'])

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
  const { user, userData, accessClaims, loading: authLoading } = useAuth()
  const { mutateAsync: applyMissingAssignmentPenalties } = useApplyMissingAssignmentPenalties()
  const penaltySweepInFlightRef = useRef(new Set())
  const penaltySweepCompletedRef = useRef(new Set())
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
  useEffect(() => {
    if (!user && location.hash === '#login') setLoginPanelOpen(true)
  }, [user, location.hash])
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [googlePopupPending, setGooglePopupPending] = useState(false)
  const [googlePopupSlow, setGooglePopupSlow] = useState(false)
  const googleRedirectStartedRef = useRef(false)
  const loginBusy = loginLoading || googlePopupPending
  const [guestInvitePanelOpen, setGuestInvitePanelOpen] = useState(false)
  const [guestInviteLink, setGuestInviteLink] = useState('')
  const [guestInviteError, setGuestInviteError] = useState('')
  const [signupPrompt, setSignupPrompt] = useState(null)
  const [acceptedQuizBattle, setAcceptedQuizBattle] = useState(null)
  const [quizBattleReturnView, setQuizBattleReturnView] = useState('planet')
  const [multiplicationCardLabOpen, setMultiplicationCardLabOpen] = useState(false)
  const [verticalMultiplicationLabOpen, setVerticalMultiplicationLabOpen] = useState(false)
  const [divisionCardLabOpen, setDivisionCardLabOpen] = useState(false)
  const [verticalDivisionLabOpen, setVerticalDivisionLabOpen] = useState(false)
  const [equivalentFractionLabOpen, setEquivalentFractionLabOpen] = useState(false)
  const [commonDenominatorLabOpen, setCommonDenominatorLabOpen] = useState(false)
  const [fractionReductionLabOpen, setFractionReductionLabOpen] = useState(false)
  const galaxyPlay = useGalaxyPlaySession({ uid: user?.uid, active: currentView === 'galaxy', isGuest: userData?.isGuest === true })

  useEffect(() => {
    if (currentView !== 'galaxy') return
    loadMetaGalaxy().catch((error) => {
      console.warn('Failed to preload Astra Frontier:', error)
    })
  }, [currentView])

  useEffect(() => {
    soundManager.setUserBinding(
      user?.uid || null,
      Boolean(user?.isAnonymous || userData?.isGuest),
    )
  }, [user, userData?.isGuest])

  // Legacy/query fallback: redirect /?view=agora&... to /agora?...
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('view') === 'agora') {
      params.delete('view')
      const remaining = params.toString()
      navigate(remaining ? `/agora?${remaining}` : '/agora', { replace: true })
    }
  }, [location.search, navigate])

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

  const clearSignupPrompt = useCallback(() => {
    window.sessionStorage.removeItem(LOGIN_NOTICE_KEY)
    setSignupPrompt(null)
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
  
  // A new NAV landing always starts at Multi-Verse. Learning coordinates are
  // persisted only after an explicit selection so in-app navigation can keep
  // its context without silently reopening the last (often elementary) cluster.
  const [selectedClusterId, setSelectedClusterId] = useState(() => initialAssignmentCluster(currentView, location, sessionStorage.getItem('metasense_cluster_id')));
  const [assignmentHubInitialDate, setAssignmentHubInitialDate] = useState(null);
  
  // --- 2D Mode Setup ---
  const [is2DMode, setIs2DMode] = useState(() => {
    return window.innerWidth <= 768 || localStorage.getItem('metasense_2d_mode') === 'true';
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

  const [selectedRegionId, internalSetSelectedRegionId] = useState(null);

  const [selectedChapterDocId, internalSetSelectedChapterDocId] = useState(null);

  const [selectedUnitDocId, internalSetSelectedUnitDocId] = useState(null);

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

  const enterLumiProtocolMission = useCallback((unitId) => {
    switchRootView('planet')
    setQuickQuizUnitId(unitId)
    setQuickQuizMode('mission')
    soundManager.playWarp()
  }, [switchRootView])

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
    // 사용자 제스처가 유지되는 동안 Web Audio를 먼저 해제해야 Safari/iPad에서 재생된다.
    soundManager.unlock()
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
      } catch { /* non-critical */ }
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
  const canLoadCourseCatalog = Boolean(
    !authLoading && user && userData && !userData.dataLoadError && !userData.recoveryRequired
  )
  const {
    data: clusters,
    isLoading: loadingClusters,
    isError: errorClusters,
    error: clusterQueryError,
    isFetching: fetchingClusters,
    refetch: refetchClusters
  } = useClusters({ enabled: canLoadCourseCatalog })
  
  const activeClusters = useMemo(() => {
    if (loadingClusters) return [];
    if (user && (!userData || userData.dataLoadError || userData.recoveryRequired)) return [];
    
    let list = clusters || [];
    if (list.length === 0) {
      // Fallback only if really empty after loading
      list = [{ id: 'cluster_elementary', docId: 'cluster_elementary', name: '초등수학', isPrivate: false, order: 0 }];
    }
    const access = userData?.clusterAccess || { cluster_elementary: 'active' };
    const claimsAreAuthoritative = accessClaims?.version >= 1;
    const claimedCourses = new Set(accessClaims?.courses || []);
    
    // Admin can see all clusters
    if (userData?.role === 'admin') return list;
    
    // Logic: 
    // 1. Show all public clusters (isPrivate: false)
    // 2. Show private clusters if user has 'active' access in clusterAccess
    return list.filter(c => {
      if (!c.isPrivate) return true;
      const clusterId = c.docId || c.id;
      return claimsAreAuthoritative
        ? claimedCourses.has(clusterId)
        : access[clusterId] === 'active';
    });
  }, [accessClaims, clusters, loadingClusters, user, userData]);

  const penaltySweepClusterIds = useMemo(
    () => getAssignmentPenaltySweepClusterIds(userData, accessClaims),
    [accessClaims, userData]
  )
  const penaltySweepClusterKey = penaltySweepClusterIds.join('|')

  useEffect(() => {
    if (
      authLoading
      || !user?.uid
      || !userData
      || userData.dataLoadError
      || userData.recoveryRequired
      || penaltySweepClusterIds.length === 0
    ) return

    const runDailySweeps = async () => {
      for (const clusterId of penaltySweepClusterIds) {
        const storageKey = getAssignmentPenaltySweepStorageKey(user.uid, clusterId)
        const dailySweepKey = `${storageKey}:${todayKSTForAttendance}`
        let wasCompletedOnThisBrowser = penaltySweepCompletedRef.current.has(dailySweepKey)
        try {
          wasCompletedOnThisBrowser = wasCompletedOnThisBrowser || localStorage.getItem(storageKey) === todayKSTForAttendance
        } catch {
          // In-memory de-duplication still protects this session when storage is unavailable.
        }

        if (wasCompletedOnThisBrowser || penaltySweepInFlightRef.current.has(dailySweepKey)) continue

        penaltySweepInFlightRef.current.add(dailySweepKey)
        try {
          const result = await applyMissingAssignmentPenalties({
            userId: user.uid,
            clusterId,
          })
          penaltySweepCompletedRef.current.add(dailySweepKey)
          try {
            localStorage.setItem(storageKey, todayKSTForAttendance)
          } catch {
            // The successful server result remains valid even in private-storage modes.
          }
          if (result?.applied > 0) {
            console.info('과제 미제출 일일 검토 차감 적용:', result)
          }
        } catch (error) {
          console.error('과제 미제출 일일 검토 실패:', error)
        } finally {
          penaltySweepInFlightRef.current.delete(dailySweepKey)
        }
      }
    }

    runDailySweeps()
  }, [
    authLoading,
    applyMissingAssignmentPenalties,
    penaltySweepClusterKey,
    penaltySweepClusterIds,
    todayKSTForAttendance,
    user?.uid,
    userData,
  ])

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
    if (!canLoadCourseCatalog || loadingClusters || errorClusters || !clusters) return;

    // 1. Validate if the currently selected cluster still exists in activeClusters
    if (selectedClusterId && activeClusters.length > 0) {
      const isValid = activeClusters.some(c => c.docId === selectedClusterId || c.id === selectedClusterId);
      if (!isValid) {
        // A late access/cluster refresh may invalidate a persisted learning
        // coordinate while the user is already opening RANKING/STORE/etc.
        // Clear only the stale hierarchy; do not overwrite the chosen root view.
        updateSelectedClusterId(null);
        updateSelectedRegionId(null);
        updateSelectedChapterDocId(null);
        clearMissionSelection();
      }
    }

  }, [
    activeClusters,
    canLoadCourseCatalog,
    clusters,
    errorClusters,
    clearMissionSelection,
    loadingClusters,
    selectedClusterId,
    updateSelectedChapterDocId,
    updateSelectedClusterId,
    updateSelectedRegionId
  ]);

  const canLoadLearningMap = Boolean(userData && !userData.dataLoadError && !userData.recoveryRequired && selectedClusterId)
  const {
    data: regions,
    isLoading: loadingRegions,
    isError: errorRegions,
    refetch: refetchRegions
  } = useRegions(selectedClusterId, {
    enabled: canLoadLearningMap
  })
  const {
    data: chapters,
    isLoading: loadingChapters,
    isError: errorChapters,
    refetch: refetchChapters
  } = useChapters(selectedRegionId)
  const chapterClaimRetryRef = useRef(null)
  const chapterClaimKey = `${accessClaims?.version || 0}:${(accessClaims?.regions || []).slice().sort().join(',')}`

  useEffect(() => {
    if (!errorChapters || !selectedRegionId || !accessClaims?.regions?.includes(selectedRegionId)) return
    const retryKey = `${selectedRegionId}:${chapterClaimKey}`
    if (chapterClaimRetryRef.current === retryKey) return
    chapterClaimRetryRef.current = retryKey
    refetchChapters()
  }, [accessClaims, chapterClaimKey, errorChapters, refetchChapters, selectedRegionId])

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

  // Subscribe only to units in the visible region. Summary triggers can lag or
  // omit a completed modality; the source progress documents remain authoritative.
  const completionScopeKey = JSON.stringify(quizAvailabilityUnitIds);
  const [sourceCompletion, setSourceCompletion] = useState(null);
  useEffect(() => {
    if (!user?.uid) return undefined;
    let active = true;
    const scopeUserId = user.uid;
    const ids = JSON.parse(completionScopeKey);
    const subscriptions = chunkArray(ids, 30).map((chunk, index) => onSnapshot(
      query(collection(db, 'users', scopeUserId, 'learning_progress'), where(documentId(), 'in', chunk)),
      snapshot => {
        if (!active) return;
        const data = Object.fromEntries(snapshot.docs.map(row => [row.id, getLearningProgressCompletion(row.data())]));
        setSourceCompletion(previous => ({
          userId: scopeUserId, scopeKey: completionScopeKey,
          chunks: { ...(previous?.userId === scopeUserId && previous?.scopeKey === completionScopeKey ? previous.chunks : {}), [index]: data },
        }));
      }, error => console.warn('Unit completion subscription failed:', error)
    ));
    return () => { active = false; subscriptions.forEach(unsubscribe => unsubscribe()); };
  }, [completionScopeKey, user?.uid]);
  const sourceCompletionMap = useMemo(() => (
    sourceCompletion?.userId === user?.uid && sourceCompletion?.scopeKey === completionScopeKey
      ? Object.assign({}, ...Object.values(sourceCompletion.chunks)) : {}
  ), [completionScopeKey, sourceCompletion, user?.uid]);

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
    console.warn('[NavigationGuard] Clearing stale mission coordinate:', missionUnitId);
    clearMissionSelection();
  }, [activeUnit, clearMissionSelection, loadingSingleUnit, missionUnitId, singleUnitFetched]);

  const handleBackFromMission = useCallback(() => {
    const cameFromLumiProtocol = quickQuizMode === 'mission'
      && PYTHON_PROTOCOL_ENTRY_UNITS.some((entry) => entry.unitId === quickQuizUnitId)

    if (cameFromLumiProtocol) {
      switchRootView('lumi_protocol')
      return
    }

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
  }, [activeUnit, activeChapter, singleChapter, singleRegion, activeRegion, selectedChapterDocId, selectedRegionId, selectedClusterId, clearMissionSelection, quickQuizMode, quickQuizUnitId, switchRootView, updateSelectedChapterDocId, updateSelectedClusterId, updateSelectedRegionId]);

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
    if (currentView === 'lumi_protocol') return '루미 프로토콜 복구 중';
    if (currentView === 'reading_library') return '나의 책장 & 독서 기록 확인 중';
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

  const fetchDarkMatterQuestions = async ({ throwOnError = false } = {}) => {
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

      // 2. Fetch fresh quiz data from 'quizzes' via getDoc (prevents Firestore security rule get() limit violations)
      const quizDocSnaps = await Promise.all(allIds.map(id => getDoc(doc(db, 'quizzes', id)).catch(() => null)))
      const freshQuestions = []
      quizDocSnaps.forEach((docSnap, idx) => {
        if (!docSnap || !docSnap.exists()) return
        const id = allIds[idx]
        const qData = docSnap.data()
        const rmItem = rmMeta.find(m => m.id === id)
        const iqItem = iqMeta.find(m => m.id === id)
        
        const activeAt = iqItem?.lastFailedAt || rmItem?.markedAt || rmItem?.masteredAt || null

        freshQuestions.push({
          ...qData,
          id,
          _source: iqItem ? 'incorrect' : 'review',
          _reviewMark: !!rmItem,
          _reviewStatus: rmItem?.status || null,
          _activeAt: activeAt,
          failCount: iqItem?.failCount || 0,
          lastFailedAt: iqItem?.lastFailedAt || null,
          unitId: qData.unitId || iqItem?.unitId || rmItem?.unitId,
          unitTitle: qData.unitTitle || iqItem?.unitTitle || rmItem?.unitTitle
        })
      })

      // 3. Resolve unitTitles for all unique unitIds via getDoc
      const uniqueUnitIds = Array.from(new Set(freshQuestions.map(q => q.unitId).filter(Boolean)))
      if (uniqueUnitIds.length > 0) {
        const unitDocSnaps = await Promise.all(uniqueUnitIds.map(uId => getDoc(doc(db, 'units', uId)).catch(() => null)))
        const unitTitlesMap = {}
        unitDocSnaps.forEach((uSnap, idx) => {
          if (uSnap && uSnap.exists()) {
            unitTitlesMap[uniqueUnitIds[idx]] = uSnap.data().title
          }
        })
        
        // Update questions with resolved titles
        freshQuestions.forEach(q => {
          q.unitTitle = unitTitlesMap[q.unitId] || q.unitTitle || "수학 탐사"
        })
      }

      // 4. Sort by unitTitle for logical grouping in dashboard
      return freshQuestions.sort((a, b) => (a.unitTitle || '').localeCompare(b.unitTitle || ''))
    } catch (err) {
      console.error('Error fetching dark matter questions:', err)
      if (throwOnError) throw err
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 768
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

  const routeAfterAuth = useCallback(async (uid) => {
    const parentSnap = await getDoc(doc(db, 'parents', uid))
    if (isActiveMemberDoc(parentSnap)) {
      clearSignupPrompt()
      navigate('/parent/dashboard')
      return true
    }
    const userSnap = await getDoc(doc(db, 'users', uid))
    if (isActiveMemberDoc(userSnap)) {
      clearSignupPrompt()
      return true
    }

    persistSignupPrompt({ reason: 'missing-membership', email: auth.currentUser?.email || '' })
    await signOut(auth)
    return false
  }, [clearSignupPrompt, navigate, persistSignupPrompt])

  useEffect(() => {
    let active = true

    consumeGoogleRedirect(auth)
      .then(async ({ intent, result }) => {
        if (!active || !intent) return
        if (!result?.user) {
          setLoginPanelOpen(true)
          setLoginError('Google 로그인이 완료되지 않았습니다. 다시 시도해 주세요.')
          return
        }

        setLoginLoading(true)
        await routeAfterAuth(result.user.uid)
      })
      .catch((error) => {
        if (!active) return
        console.error('Google redirect login failed:', error)
        setLoginPanelOpen(true)
        setLoginError(getGoogleAuthErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoginLoading(false)
      })

    return () => {
      active = false
    }
  }, [routeAfterAuth])

  const handleGoogleLogin = async () => {
    setLoginError('')
    setGooglePopupSlow(false)
    setGooglePopupPending(true)
    googleRedirectStartedRef.current = false
    try {
      soundManager.playClick()
      const cred = await signInWithGooglePopup(auth, googleProvider, {
        onSlow: () => setGooglePopupSlow(true),
      })
      const allowed = await routeAfterAuth(cred.user.uid)
      if (!allowed) return
    } catch (error) {
      if (googleRedirectStartedRef.current && error?.code === 'auth/cancelled-popup-request') return
      console.error("Google login failed:", error)
      setLoginError(getGoogleAuthErrorMessage(error))
    } finally {
      setGooglePopupPending(false)
      setGooglePopupSlow(false)
    }
  }

  const handleGoogleRedirectLogin = async () => {
    setLoginError('')
    setLoginLoading(true)
    googleRedirectStartedRef.current = true
    try {
      soundManager.playClick()
      await startGoogleRedirect(auth, googleProvider, {
        path: `${location.pathname}${location.search}${location.hash}`,
        purpose: 'login',
      })
    } catch (error) {
      googleRedirectStartedRef.current = false
      console.error('Google redirect login failed:', error)
      setLoginError(getGoogleAuthErrorMessage(error))
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

  const closeCompletionResult = useCallback(() => {
    setCompletionResult(null)
    if (isDarkMatterMode) stopDarkMatterMode()
    soundManager.playClick()
  }, [isDarkMatterMode, stopDarkMatterMode])

  const openCompletionDashboard = useCallback(() => {
    setCompletionResult(null)
    switchRootView('dashboard')
    soundManager.playClick()
  }, [switchRootView])

  const continueAfterCompletion = useCallback(() => {
    setCompletionResult(null)
    if (isDarkMatterMode) stopDarkMatterMode()
    clearMissionSelection()
    soundManager.playClick()
  }, [clearMissionSelection, isDarkMatterMode, stopDarkMatterMode])

  useEffect(() => {
    if (!user?.uid) return undefined
    let requestedValidation = false
    const summaryRef = doc(db, 'learningSummaries', user.uid)
    return onSnapshot(summaryRef, (snapshot) => {
      const summaryData = snapshot.exists() ? snapshot.data() : null
      if (summaryData) {
        setLearningSummary(summaryData)
        setLoadingHistory(false)
      }
      if (requestedValidation) return

      const lastCheckedKey = `last_learning_summary_checked_${user.uid}`
      let lastCheckedMs = 0
      try {
        lastCheckedMs = Math.max(
          Number(sessionStorage.getItem(lastCheckedKey) || 0),
          Number(localStorage.getItem(lastCheckedKey) || 0)
        )
      } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
        lastCheckedMs = 0
      }
      const needsCheck = shouldCheckLearningSummaryFreshness({
        summary: summaryData,
        lastCheckedMs,
        nowMs: Date.now(),
      })

      if (!needsCheck) {
        setLoadingHistory(false)
        return
      }

      requestedValidation = true
      httpsCallable(functions, 'getOrRebuildLearningSummary')({ validateFreshness: true })
        .then(() => {
          const nowStr = String(Date.now())
          try {
            sessionStorage.setItem(lastCheckedKey, nowStr)
            localStorage.setItem(lastCheckedKey, nowStr)
          } catch {
            // ignore storage quota errors
            return
          }
        })
        .catch((error) => {
          console.warn('Learning summary validation failed:', error)
        })
        .finally(() => {
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
  // unitProgressMap: { unitDocId: { quiz, video, text, workbook, codeTrace, missionLab } }
  const { explorationStatus, recentRegionId, bestScores, unitProgressMap } = useMemo(() => {
    const statusMap = {}
    const scores = {}
    const historyProgressMap = {}
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
      else if (h.type === 'python_mission') hType = 'missionLab'

      // Tracking modality completion
      if (!historyProgressMap[uid]) {
        historyProgressMap[uid] = { quiz: false, video: false, text: false, workbook: false, codeTrace: false, missionLab: false }
      }
      historyProgressMap[uid][hType] = true

      // Tracking scores for old logic (MissionHub cards)
      // ONLY include 'quiz' and 'workbook' in bestScores to prevent video/text nominal scores (100) from leaking
      let scoreKey = null;
      if (hType === 'workbook') scoreKey = `${uid}_workbook`;
      else if (hType === 'quiz') scoreKey = uid;

      if (scoreKey && (!scores[scoreKey] || h.score > scores[scoreKey])) {
        scores[scoreKey] = h.score
      }
    })

    const progressMap = mergeUnitProgressCompletion(historyProgressMap, sourceCompletionMap)

    if (effectiveHistory.length === 0) {
      regions?.forEach(r => statusMap[r.id] = 'not_started')
      return { explorationStatus: statusMap, recentRegionId: null, bestScores: scores, unitProgressMap: progressMap }
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
  }, [effectiveHistory, regions, selectedClusterId, sourceCompletionMap])

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
        codeTrace: { total: 0, completed: 0 },
        missionLab: { total: 0, completed: 0, requiredTotal: 0, requiredCompleted: 0 }
      }

      unitsData.forEach(unit => {
        // Find progress using docId or fallback id
        const uProg = unitProgressMap[unit.docId] || unitProgressMap[unit.id] || {}

        const { hasQuiz, hasVideo, hasText, hasWorkbook, hasCodeTrace, hasMissionLab } = getUnitContentAvailability(unit, quizAvailabilityMap, selectedClusterId)

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
        if (hasMissionLab) {
          counts.missionLab.total++
          if (uProg.missionLab) counts.missionLab.completed++
          if (isMissionLabRequired(unit)) {
            counts.missionLab.requiredTotal++
            if (uProg.missionLab) counts.missionLab.requiredCompleted++
          }
        }
      })
      
      // Determine if the entire chapter is finished across ALL active modalities
      const hasAnyContent = counts.quiz.total > 0 || counts.video.total > 0 || counts.text.total > 0 || counts.workbook.total > 0 || counts.codeTrace.total > 0 || counts.missionLab.total > 0
      const isFinished = hasAnyContent && 
        (counts.quiz.total === counts.quiz.completed) &&
        (counts.video.total === counts.video.completed) &&
        (counts.text.total === counts.text.completed) &&
        (counts.workbook.total === counts.workbook.completed) &&
        (counts.codeTrace.total === counts.codeTrace.completed) &&
        (counts.missionLab.requiredTotal === counts.missionLab.requiredCompleted)
      
      progress[chapter.docId] = {
        counts,
        isFinished
      }
    })
    return progress
  }, [chapters, unitProgressMap, chapterUnitResults, loadingHistory, loadingQuizAvailability, quizAvailabilityMap, selectedClusterId])

  // Auto-promote region access to 'completed' when student finishes all chapters in selectedRegionId
  useEffect(() => {
    if (!user?.uid || !selectedRegionId || !chapters || chapters.length === 0) return;
    if (userData?.regionAccess?.[selectedRegionId] === 'completed') return;

    const allFinished = chapters.every((ch) => chapterProgress[ch.docId]?.isFinished);
    if (allFinished) {
      console.log(`[Auto-Promote] All chapters completed in region ${selectedRegionId}. Updating regionAccess to completed...`);
      const completeAccess = httpsCallable(functions, 'completeRegionAccess');
      completeAccess({ regionId: selectedRegionId })
        .catch((err) => console.error("Failed to auto-promote region access:", err));
    }
  }, [user?.uid, selectedRegionId, chapters, chapterProgress, userData?.regionAccess]);


  const isProcessingSave = useRef(false)

  const handleComplete = async (result) => {
    if (!user) return { ok: false, error: new Error('로그인 정보를 확인할 수 없습니다.') }
    if (isProcessingSave.current) return { ok: false, error: new Error('이전 결과를 저장하고 있습니다.') }
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
      const isWorkbookResult = result.type === 'workbook'
      const isDarkMatterQuizResult = currentUnitId === 'dark_matter_zone'
      let refreshedDarkMatterList = null
      const scoreKey = isWorkbookResult ? `${currentUnitId}_workbook` : currentUnitId
      const previousBest = bestScores[scoreKey] || 0
      let actualCrystalsEarned = 0

      if (crystalsEarned < 0) {
        // --- Negative Reward (Penalty) ---
        // Always apply penalty even if score didn't improve
        actualCrystalsEarned = crystalsEarned
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
          }
        }
        
        if (actualCrystalsEarned <= 0) {
          actualCrystalsEarned = 0
        }
      } else {
        actualCrystalsEarned = 0
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

        if (result.quizSessionId) {
          const completionValidation = validateQuizCompletionSnapshot({
            session: freshProgressData.quizSession,
            sessionId: result.quizSessionId,
            clientInstanceId: result.quizClientInstanceId,
            questionIds: result.answeredQuestionIds,
            totalCount: Number(result.totalCount || 0),
            correctCount: Number(result.correctCount || 0),
            score: Number(result.score || 0),
          })
          if (!completionValidation.ok) {
            const validationError = new Error(`퀴즈 세션 검증에 실패했습니다: ${completionValidation.reason}`)
            validationError.code = 'quiz-session-verification-failed'
            validationError.reason = completionValidation.reason
            throw validationError
          }
        }

        // --- Server-side Reward Calculation (Prevent duplicate payout) ---
        const serverPreviousBest = isWorkbookResult
          ? Number(freshProgressData.workbookBestScore ?? previousBest ?? 0)
          : Number(freshProgressData.quizBestScore ?? previousBest ?? 0)
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
        const lastWorkbookDate = freshUserData.lastWorkbookDate || ""
        const dailyWorkbookCount = (lastWorkbookDate === today) ? (freshUserData.dailyWorkbookCount || 0) + 1 : 1

        // --- Direct Growth Counter ---
        const todayKST = getTodayKST()
        const mondayKST = getMondayKSTKey()

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
        let crystalTransactionId = ''
        if (atomicCrystalsEarned !== 0) {
          const activityPrefix = isWorkbookResult ? 'workbook' : 'quiz'
          const stableActivityTxId = `${activityPrefix}_${currentUnitId}_s${score}_${Date.now()}`; // penalties may repeat
          crystalTransactionId = atomicCrystalsEarned > 0 ? `${activityPrefix}_${currentUnitId}_s${score}` : stableActivityTxId
          
          recordCrystalTransaction(user.uid, {
            amount: atomicCrystalsEarned,
            type: isWorkbookResult
              ? (atomicCrystalsEarned > 0 ? 'workbook_reward' : 'workbook_penalty')
              : (atomicCrystalsEarned > 0 ? 'quiz_reward' : 'quiz_penalty'),
            description: `${currentUnitTitle} ${atomicCrystalsEarned > 0 ? `(${score}점)` : '(시스템 손상)'}`,
            metadata: {
              unitId: currentUnitId,
              unitTitle: currentUnitTitle,
              activityType: isWorkbookResult ? 'workbook' : 'quiz',
              source: isWorkbookResult ? 'smart_workbook_complete' : 'field_test_complete',
              score,
              correctCount: Number(result.correctCount || 0),
              totalCount: Number(result.totalCount || 0),
              attemptCount: Number(result.attemptCount || 1),
              penalty: atomicCrystalsEarned < 0,
              balanceBefore: Number(freshUserData.crystals || 0),
              balanceAfter: Number(freshUserData.crystals || 0) + atomicCrystalsEarned,
              ...buildRewardMultiplierMetadata(rewardMultiplierMeta)
            }
          }, transaction, crystalTransactionId)
        }

        // --- Atomic Logging: History ---
        const existingInitialScore = isWorkbookResult
          ? freshProgressData.workbookInitialScore
          : freshProgressData.quizInitialScore
        const sessionAttemptCount = result.attemptCount || 1 // 1 pass + N re-solves
        const currentAttemptCount = (
          isWorkbookResult ? freshProgressData.workbookAttemptCount : freshProgressData.quizAttemptCount
        ) || 0
        const nextAttemptCount = currentAttemptCount + sessionAttemptCount
        
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
          ...(isWorkbookResult ? {
            workbookPageCrystalsEarned: Number(result.pageRewardsEarned || 0),
            workbookPageBaseCrystalsEarned: Number(result.pageRewardsPaid || 0),
            workbookTotalCrystalsEarned: Number(result.pageRewardsEarned || 0) + atomicCrystalsEarned,
          } : {}),
          crystalTransactionId,
          rewardMultiplier: rewardMultiplierMeta?.multiplier || 1,
          rewardMultiplierReason: rewardMultiplierMeta?.reason || 'none',
          rewardBaseAmount: rewardMultiplierMeta?.baseAmount ?? atomicCrystalsEarned,
          rewardBonusAmount: rewardMultiplierMeta?.bonusAmount || 0,
          type: isWorkbookResult ? 'workbook' : 'quiz',
          ...(isWorkbookResult ? { workbookResponses: result.workbookResponses || [] } : {}),
          timestamp: serverTimestamp()
        })

        // Quiz and workbook metrics intentionally use separate fields.
        const progressScoreUpdates = isWorkbookResult ? {
          workbookBestScore: Math.max(serverPreviousBest, score),
          workbookInitialScore: initialScoreToSave,
          workbookAttemptCount: nextAttemptCount,
          workbookCompleted: true,
        } : {
          // Keep legacy fields quiz-only for consumers that have not migrated yet.
          bestScore: Math.max(serverPreviousBest, score),
          initialScore: initialScoreToSave,
          attemptCount: nextAttemptCount,
          quizBestScore: Math.max(serverPreviousBest, score),
          quizInitialScore: initialScoreToSave,
          quizAttemptCount: nextAttemptCount,
          quizCompleted: true,
        }
        transaction.set(progressDocRef, { ...progressScoreUpdates, updatedAt: serverTimestamp() }, { merge: true })

        const commonUserUpdates = {
          crystals: (freshUserData.crystals || 0) + atomicCrystalsEarned,
          shieldDefended: (freshUserData.shieldDefended || 0) + (shieldsUsed || 0),
          lastActive: serverTimestamp(),
          shieldCharges: Math.max(0, currentShieldCharges - (shieldsUsed || 0)),
          ...growthUpdates,
          ...streakUpdates
        }
        const userUpdates = isWorkbookResult ? {
          ...commonUserUpdates,
          totalWorkbooks: (freshUserData.totalWorkbooks || 0) + 1,
          workbookTotalScore: (freshUserData.workbookTotalScore || 0) + score,
          workbookAverageScore: ((freshUserData.workbookTotalScore || 0) + score) / ((freshUserData.totalWorkbooks || 0) + 1),
          workbookPerfectCount: (isPerfect && serverPreviousBest < 100)
            ? (freshUserData.workbookPerfectCount || 0) + 1
            : (freshUserData.workbookPerfectCount || 0),
          dailyWorkbookCount,
          lastWorkbookDate: today,
        } : {
          ...commonUserUpdates,
          totalQuizzes: (freshUserData.totalQuizzes || 0) + 1,
          totalScore: (freshUserData.totalScore || 0) + score,
          averageScore: ((freshUserData.totalScore || 0) + score) / ((freshUserData.totalQuizzes || 0) + 1),
          perfectCount: (isPerfect && serverPreviousBest < 100) ? (freshUserData.perfectCount || 0) + 1 : (freshUserData.perfectCount || 0),
          consecutiveGood: prevConsecutiveGood,
          dailyQuizCount,
          lastQuizDate: today,
        }

        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: isWorkbookResult ? 'space_home_workbook_complete' : 'space_home_quiz_complete',
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
      if (!result.wrongQuestionsPreSynced && result.wrongQuestions && result.wrongQuestions.length > 0) {
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
        const updatedList = await fetchDarkMatterQuestions({ throwOnError: true })
        refreshedDarkMatterList = updatedList
        setDarkMatterQuestions(updatedList)
        setDarkMatterCount(updatedList.length)
      } catch { /* non-critical */ }

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

      const isDarkMatterCompletion = isDarkMatterMode || isDarkMatterQuizResult
      const clearedFinalDarkMatter = isDarkMatterCompletion && refreshedDarkMatterList?.length === 0

      // Do not leave SpaceHome in the contradictory state where Dark Matter is
      // still active but its final question list is empty. That transition used
      // to remount the whole planet screen underneath a new portal modal and
      // could leave Windows touch Chrome with a stale hit-test layer.
      if (clearedFinalDarkMatter) stopDarkMatterMode()

      const nextCompletionResult = {
        crystalsEarned: finalCrystals,
        isPerfect: isPerfect && previousBest < 100, // Only show perfect effect for first time
        rewardMessage: finalCrystals > 0 
          ? (isDarkMatterCompletion
              ? `🌌 다크 매터 정화 성공! (+${finalCrystals} 광석)` 
              : `${score}점으로 최고 기록을 경신했습니다! (+${finalCrystals} 광석)`) + getRewardMultiplierSuffix(rewardMultiplierMeta)
          : (isDarkMatterCompletion
              ? "문제를 맞혔으나 '재검토' 마크를 유지하여 보상이 지급되지 않았습니다. (학습 지속)"
              : (score === 100 ? "이미 100점을 달성한 마스터 레벨입니다! (추가 광석 없음)" : `최고 점수를 넘지 못해 추가 광석을 획득할 수 없습니다.`)),
        streakInfo: {
          currentStreak: finalStreakUpdates.currentStreak || streakResultsFinal?.meta?.newStreak,
          freezeUsed: streakResultsFinal?.meta?.freezeUsed,
          isNewRecord: streakResultsFinal?.meta?.isNewRecord,
          alreadyDoneToday: streakResultsFinal?.meta?.alreadyDoneToday,
          justReachedMilestone: streakResultsFinal?.meta?.justReachedMilestone
        }
      }

      // Intermediate Dark Matter batches return to the Dark Matter dashboard;
      // only the batch that actually clears the final item shows this modal.
      setCompletionResult(!isDarkMatterCompletion || clearedFinalDarkMatter ? nextCompletionResult : null)
      clearMissionSelection()
      return { ok: true }
    } catch (error) {
      console.error("Error saving quiz result:", error)
      return { ok: false, error }
    } finally {
      isProcessingSave.current = false
    }
  }

  const processingWorkbookPageRewards = useRef(new Set())

  const handleWorkbookPageReward = async (pageResult = {}) => {
    if (!user?.uid) return { ok: false, error: new Error('로그인 정보를 확인할 수 없습니다.') }

    const currentUnitId = pageResult.unitId || selectedUnitDocId || quickQuizUnitId || 'unknown'
    const currentUnitTitle = pageResult.unitTitle || activeUnit?.title || '스마트 워크북'
    const pageId = pageResult.pageId || `page_${Math.max(1, Number(pageResult.pageNumber) || 1)}`
    const pageNumber = Math.max(1, Math.floor(Number(pageResult.pageNumber) || 1))
    const pageAttempt = Math.max(1, Math.floor(Number(pageResult.pageAttempt) || 1))
    const isLegacySessionSettlement = pageResult.rewardScope === 'legacy_session'
    const baseAmount = Math.max(0, Math.floor(Number(pageResult.baseCrystalsEarned) || 0))
    const rewardKey = getStableWorkbookRewardKey(pageResult.workbookSignature, pageId, pageAttempt)
    const processingKey = `${currentUnitId}:${rewardKey}`

    if (processingWorkbookPageRewards.current.has(processingKey)) {
      return { ok: false, error: new Error('해당 페이지 보상을 저장하고 있습니다.') }
    }

    processingWorkbookPageRewards.current.add(processingKey)
    try {
      const rewardDate = new Date()
      const userDocRef = doc(db, 'users', user.uid)
      const progressDocRef = doc(db, 'users', user.uid, 'learning_progress', currentUnitId)

      const outcome = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef)
        const progressSnap = await transaction.get(progressDocRef)
        if (!userSnap.exists()) throw new Error('User document not found')

        const freshUserData = userSnap.data()
        const freshProgressData = progressSnap.exists() ? progressSnap.data() : {}
        const rewardAttempts = freshProgressData.workbookPageRewardAttempts || {}
        const existingReward = rewardAttempts[rewardKey]
        const persistCheckpoint = (reward) => {
          const checkpoint = prepareWorkbookPageCheckpoint(pageResult, freshProgressData.workbookSession, reward)
          if (checkpoint) transaction.set(progressDocRef, {
            workbookSession: checkpoint, workbookSessionUpdatedAt: serverTimestamp(),
          }, { mergeFields: ['workbookSession', 'workbookSessionUpdatedAt'] })
          return checkpoint
        }
        if (existingReward) {
          const workbookCheckpoint = persistCheckpoint({ baseAmount: existingReward.baseAmount || 0, actualReward: existingReward.amount || 0 })
          return {
            duplicate: true,
            workbookCheckpoint,
            actualReward: Math.max(0, Number(existingReward.amount) || 0),
            baseAmount: Math.max(0, Number(existingReward.baseAmount) || baseAmount),
          }
        }

        const rewardMultiplierMeta = baseAmount > 0
          ? applyCrystalRewardMultiplier(baseAmount, {
              clusterId: selectedClusterId,
              date: rewardDate,
              dateStr: getTodayKST(rewardDate),
            })
          : null
        const actualReward = rewardMultiplierMeta?.amount || 0
        const workbookCheckpoint = persistCheckpoint({ baseAmount, actualReward })
        const streakCalc = calculateStreakUpdate(freshUserData)
        const streakUpdates = streakCalc.streakUpdate || {}
        const growthUpdates = calculateGrowthUpdates(freshUserData, actualReward)
        const nextBalance = Number(freshUserData.crystals || 0) + actualReward

        if (streakCalc.meta?.freezeUsed) {
          recordCrystalTransaction(user.uid, {
            amount: 0,
            type: 'streak_freeze',
            description: '크라이오 코어로 연속 탐사 궤도 보호',
            metadata: {
              unitId: currentUnitId,
              streakBefore: Number(freshUserData.currentStreak || 0),
              streakAfter: streakCalc.meta.newStreak,
              defendedDates: streakCalc.meta.defendedDates || [],
              consumedFreezeCount: streakCalc.meta.consumedFreezeCount || 0,
              balanceBefore: Number(freshUserData.streakFreezeCount || 0),
              balanceAfter: streakUpdates.streakFreezeCount ?? freshUserData.streakFreezeCount ?? 0,
            },
          }, transaction)
        }

        if (actualReward > 0) {
          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: 'workbook_reward',
            description: isLegacySessionSettlement
              ? `${currentUnitTitle} 기존 진행 보상 정산`
              : `${currentUnitTitle} ${pageNumber}페이지`,
            metadata: {
              unitId: currentUnitId,
              unitTitle: currentUnitTitle,
              activityType: 'workbook',
              source: isLegacySessionSettlement
                ? 'smart_workbook_legacy_pause_settlement'
                : 'smart_workbook_page_check',
              rewardScope: isLegacySessionSettlement ? 'legacy_session' : 'page',
              pageId,
              pageNumber,
              pageAttempt,
              correctCount: Math.max(0, Number(pageResult.correctCount) || 0),
              wrongCount: Math.max(0, Number(pageResult.wrongCount) || 0),
              totalCount: Math.max(0, Number(pageResult.totalCount) || 0),
              balanceBefore: Number(freshUserData.crystals || 0),
              balanceAfter: nextBalance,
              ...buildRewardMultiplierMetadata(rewardMultiplierMeta),
            },
          }, transaction, `workbook_page_${currentUnitId}_${rewardKey}`)
        }

        const nextRewardAttempts = {
          ...rewardAttempts,
          [rewardKey]: {
            pageId,
            pageNumber,
            pageAttempt,
            baseAmount,
            amount: actualReward,
            correctCount: Math.max(0, Number(pageResult.correctCount) || 0),
            wrongCount: Math.max(0, Number(pageResult.wrongCount) || 0),
            totalCount: Math.max(0, Number(pageResult.totalCount) || 0),
            rewardMultiplier: rewardMultiplierMeta?.multiplier || 1,
            paidAtMs: Date.now(),
          },
        }

        transaction.set(progressDocRef, {
          unitTitle: currentUnitTitle,
          clusterId: selectedClusterId || '',
          chapterId: selectedChapterDocId || '',
          regionId: selectedRegionId || '',
          workbookPageRewardAttempts: nextRewardAttempts,
          workbookPageRewardTotal: Number(freshProgressData.workbookPageRewardTotal || 0) + actualReward,
          workbookPageBaseRewardTotal: Number(freshProgressData.workbookPageBaseRewardTotal || 0) + baseAmount,
          workbookLastRewardedPageId: pageId,
          workbookLastRewardedPageNumber: pageNumber,
          workbookLastRewardedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })

        const userUpdates = {
          crystals: nextBalance,
          lastActive: serverTimestamp(),
          ...growthUpdates,
          ...streakUpdates,
        }
        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: 'space_home_workbook_page',
            writerUid: user.uid,
            prevState: freshUserData,
            nextState: {
              currentStreak: streakUpdates.currentStreak,
              lastStreakDate: streakUpdates.lastStreakDate,
              streakFreezeCount: streakUpdates.streakFreezeCount,
            },
            writtenAt: serverTimestamp(),
            note: `${currentUnitId}:${pageId}`,
          })
        }
        transaction.update(userDocRef, userUpdates)

        return { duplicate: false, actualReward, baseAmount, rewardMultiplierMeta, workbookCheckpoint }
      })

      if (!outcome.duplicate && outcome.actualReward > 0) soundManager.playCrystal()
      return { ok: true, ...outcome }
    } catch (error) {
      console.error('Error saving workbook page reward:', error)
      return { ok: false, error }
    } finally {
      processingWorkbookPageRewards.current.delete(processingKey)
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
               videoProgress: { [transmissionId]: {
                 completed: true,
                 completionBonusGiven: true,
                 // Set only when this transaction also records a video completion.
                 ...((shouldLogHistory && ((!shouldLogFocusOnly && !isAttentionMiss) || attentionSource === 'completion_bonus'))
                   ? { completionHistorySynced: true } : {}),
                 updatedAt: serverTimestamp(),
               } },
               updatedAt: serverTimestamp()
             }, { merge: true })
          } else if (activityType.includes('수신') && stampedSeconds) {
             // Cumulative watch fields are monotonic — clamp against the fresh
             // server record so a client that restored from zero cannot erase
             // previously stored history.
             const existingVideoProg = freshProgressData.videoProgress?.[transmissionId] || {}
             const existingStamps = Array.isArray(existingVideoProg.stampedSeconds)
               ? existingVideoProg.stampedSeconds
               : []
             const mergedStamps = Array.from(new Set([...existingStamps, ...stampedSeconds]))
               .sort((a, b) => a - b)
             transaction.set(progressDocRef, {
               [`${baseKey}.rewardedStampCount`]: Math.max(
                 Number(existingVideoProg.rewardedStampCount) || 0,
                 stampedSeconds.length
               ),
               [`${baseKey}.stampedSeconds`]: mergedStamps,
               [`${baseKey}.totalTimeSpent`]: Math.max(
                 Number(existingVideoProg.totalTimeSpent) || 0,
                 Number(totalTimeSpent) || 0
               ),
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
            // completion_bonus 이벤트는 영상 시청 완료(coverage 임계값 도달)와 함께 발생하므로,
            // 보너스 타이머를 놓쳐(attentionResult='miss') type:'attention'으로 덮어써 단원 완료가 누락되지 않도록
            // completion_bonus는 miss 여부와 무관하게 type:'video'로 기록한다.
            // time_attack miss는 별도 video_attention_... 문서 ID로 분리되어 여기엔 도달하지 않는다.
            // attentionSource/attentionResult 필드는 그대로 보존되어 어텐션 통계에 영향을 주지 않는다.
            type: (() => {
              if (isLogActivity) return 'text'
              const isCompletionBonus = isVideoActivity && attentionSource === 'completion_bonus'
              if (isCompletionBonus) return 'video'
              return (isAttentionMiss || shouldLogFocusOnly) ? 'attention' : 'video'
            })(),
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

  // No sound engine sync needed for typing anymore

  // Loading State with Timeout & Error handling
  const hasAccountDataIssue = Boolean(userData?.dataLoadError || userData?.recoveryRequired)
  const isUserDataPending = Boolean(user && !userData && !hasAccountDataIssue)
  // Only identity is allowed to gate the whole application. Course/map reads
  // render inside the shell with their own loading/error states, so one slow
  // Firestore request cannot strand the page on a full-screen loader.
  const isLoading = authLoading || isUserDataPending

  if (isLoading) {
    return <AuthBootstrapScreen />
  }

  // Public education homepage; existing authentication handlers are unchanged.
  if (!user) {
    return <>
      <PublicHomeIntro onLogin={handleLogin} />
      <PublicHomeLoginDialog open={loginPanelOpen} onClose={() => setLoginPanelOpen(false)}>
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
                    아이디로 로그인
                  </div>
                  <input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    aria-label="아이디 또는 전화번호"
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
                    aria-label="비밀번호"
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
                    disabled={loginBusy}
                    className="font-tech"
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      background: loginLoading ? '#91a981' : '#dcedb8',
                      color: '#04111f',
                      padding: '0.82rem 1rem',
                      fontWeight: 900,
                      cursor: loginBusy ? 'not-allowed' : 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    {loginLoading ? '접속 중...' : '로그인'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                    <span className="font-tech">또는</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <button
                    type="button"
                    disabled={loginBusy}
                    onClick={handleGoogleLogin}
                    className="font-tech"
                    style={{
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      padding: '0.8rem 1rem',
                      fontWeight: 800,
                      cursor: loginBusy ? 'not-allowed' : 'pointer',
                      fontSize: '0.98rem'
                    }}
                  >
                    {googlePopupPending ? 'Google 계정 선택 대기 중...' : 'Google 계정 로그인'}
                  </button>
                  {googlePopupSlow && (
                    <div style={{
                      display: 'grid',
                      gap: 8,
                      border: '1px solid rgba(103, 232, 249, 0.32)',
                      background: 'rgba(8, 145, 178, 0.12)',
                      borderRadius: 10,
                      padding: '0.78rem 0.85rem',
                      color: '#cffafe',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      textAlign: 'left'
                    }}>
                      <span>계정 선택 창이 보이지 않으면 현재 화면에서 Google 로그인으로 이동할 수 있습니다.</span>
                      <button
                        type="button"
                        onClick={handleGoogleRedirectLogin}
                        disabled={loginLoading}
                        className="font-tech"
                        style={{
                          border: '1px solid rgba(103, 232, 249, 0.48)',
                          borderRadius: 8,
                          background: 'rgba(6, 182, 212, 0.2)',
                          color: '#ecfeff',
                          padding: '0.68rem 0.8rem',
                          fontWeight: 900,
                          cursor: loginLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        새 창 없이 Google 로그인 계속
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                    <span className="font-tech">초대받은 학습자</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <button
                    type="button"
                    disabled={loginBusy}
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
                      cursor: loginBusy ? 'not-allowed' : 'pointer',
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
                            aria-label="게스트 초대 링크"
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
      </PublicHomeLoginDialog>
      <Footer />
    </>
  }

  if (hasAccountDataIssue) {
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
        onWorkbookPageReward={handleWorkbookPageReward}
        onNonQuizActivityComplete={handleNonQuizActivityComplete}
      />
    )
  }

  if (currentView === 'python_game_studio') {
    return <Suspense fallback={<SpaceViewFallback />}><PythonGameStudioPage onBack={() => switchRootView('planet')} /></Suspense>
  }

  if (currentView === 'lumi_protocol') {
    return (
      <div className="space-bg" style={{ height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SpaceNavbar currentView={currentView} onViewChange={switchRootView} />
        <Suspense fallback={<SpaceViewFallback />}>
          <PythonProtocolHub
            unitProgressMap={unitProgressMap}
            onEnterMission={enterLumiProtocolMission}
            onBack={() => {
              switchRootView('planet')
              soundManager.playWarp()
            }}
          />
        </Suspense>
      </div>
    )
  }

  if (currentView === 'algorithm_constellation') {
    return (
      <div className="space-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SpaceNavbar currentView={currentView} onViewChange={switchRootView} />
        <Suspense fallback={<SpaceViewFallback />}>
          <AlgorithmConstellationHub
            onBack={() => {
              switchRootView('planet')
              soundManager.playWarp()
            }}
          />
        </Suspense>
      </div>
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
            <Suspense fallback={<GalaxyModuleFallback />}>
              <MetaGalaxy
                user={user}
                userData={userData}
                playSession={galaxyPlay.session}
                playRemainingSeconds={galaxyPlay.remainingSeconds}
                dailyUsedSeconds={galaxyPlay.dailyUsedSeconds}
                dailyLimitSeconds={galaxyPlay.session.dailyLimitSeconds}
                warningStage={galaxyPlay.warningStage}
                onBack={() => galaxyPlay.endSession('manual_exit')}
              />
            </Suspense>
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
            onRetry={() => galaxyPlay.loadAccess({ force: true })}
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

  if (currentView === 'reading_library') {
    return (
      <div className="space-focus-route">
        <Suspense fallback={<SpaceViewFallback />}>
          <ReadingLibraryView
            onBack={() => {
              switchRootView('planet');
              if (soundManager?.playWarp) soundManager.playWarp();
            }}
          />
        </Suspense>
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
          const outcome = await handleComplete(result)
          if (outcome?.ok !== false) {
            // If we finished the current batch, go back to dashboard to see remaining
            setActiveDarkMatterQuizQs(null)
          }
          // We don't exit entirely so they can see the progress in the meter
          return outcome
        }}
        hasShield={userData?.shieldCharges || 0}
        hasRadar={false}
      />
    )
  }

  if (multiplicationCardLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <MultiplicationCardLab
          userId={user?.uid}
          onExit={() => {
            setMultiplicationCardLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (verticalMultiplicationLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <VerticalMultiplicationLab
          userId={user?.uid}
          onExit={() => {
            setVerticalMultiplicationLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (verticalDivisionLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <VerticalDivisionLab
          userId={user?.uid}
          onExit={() => {
            setVerticalDivisionLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (divisionCardLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <DivisionCardLab
          userId={user?.uid}
          onExit={() => {
            setDivisionCardLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (equivalentFractionLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <EquivalentFractionLab
          userId={user?.uid}
          onExit={() => {
            setEquivalentFractionLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (commonDenominatorLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <CommonDenominatorLab
          userId={user?.uid}
          onExit={() => {
            setCommonDenominatorLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
    )
  }

  if (fractionReductionLabOpen) {
    return (
      <Suspense fallback={<SpaceViewFallback />}>
        <FractionReductionLab
          userId={user?.uid}
          onExit={() => {
            setFractionReductionLabOpen(false)
            soundManager.playClick?.()
          }}
        />
      </Suspense>
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
            <Suspense fallback={null}>
              <SpaceScene
                regions={regions}
                clusterId={selectedClusterId}
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
                onSelectReadingLibrary={() => {
                  switchRootView('reading_library');
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
              showLumiProtocol={selectedClusterId === 'python'}
              onSelectLumiProtocol={() => {
                switchRootView('lumi_protocol')
                soundManager.playWarp()
              }}
              onSelectAlgorithmConstellation={() => {
                switchRootView('algorithm_constellation')
                soundManager.playWarp()
              }}
              darkMatterCount={darkMatterCount}
              equipment={equipment}
              shipData={userData}
              shipCustomization={userData?.shipCustomization || {}}
              isBoosting={isBoosting}
            />
            </Suspense>
          </Motion.div>
        )}
      </AnimatePresence>

      {currentView === 'planet' && selectedClusterId && !selectedRegionId && !is2DMode && !isMobile && userData?.crewId && !userData?.isGuest && (
        <CrewMothershipFlyby crewId={userData.crewId} />
      )}

      {currentView === 'planet' && selectedClusterId === 'python' && !selectedRegionId && !is2DMode && !isMobile && (
        <button type="button" className="space-btn cosmic-btn" style={{ position: 'fixed', right: 24, bottom: 28, zIndex: 50 }} onClick={() => window.open('/python-game-studio', '_blank', 'noopener,noreferrer')}>
          ⌘ 코드 스튜디오 열기
        </button>
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
            const redeem = httpsCallable(functions, 'redeemRegionAccessCode');
            await redeem({ regionId: region.id, accessCode: code });
            setPendingRegion(null);
            selectRegion(region.id);
            soundManager.playWarp();
          } catch (err) {
            console.error('[Region Access Error]', err);
            setAccessError(err?.code === 'functions/permission-denied'
              ? '접근 코드가 올바르지 않거나 군집 권한이 없습니다.'
              : '오류가 발생했습니다. 다시 시도해주세요.');
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
              loading={loadingClusters}
              error={errorClusters}
              errorCode={clusterQueryError?.code}
              retrying={fetchingClusters}
              onRetry={() => refetchClusters()}
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
            {!selectedRegionId && selectedClusterId === 'cluster_elementary' && is2DMode ? (
              <Suspense fallback={<div role="status" style={{ padding: 40 }}>행성 지도를 준비하고 있어요…</div>}>
                <ElementaryPlanetExplorer
                  regions={regions}
                  loading={loadingRegions}
                  error={errorRegions}
                  onRetry={refetchRegions}
                  is2DMode={is2DMode}
                  canUse3D={!isMobile}
                  onToggleMode={toggle2DMode}
                  onBack={activeClusters.length > 1 ? () => { selectCluster(null); soundManager.playClick(); } : undefined}
                  onEnterFrontier={requestGalaxyEntry}
                  regionAccess={userData?.regionAccess}
                  explorationStatus={explorationStatus}
                  recentRegionId={recentRegionId}
                  darkMatterCount={darkMatterCount}
                  onSelectRegion={(id) => {
                    const region = regions?.find(item => item.id === id);
                    if (!region) return;
                    if (region.isPrivate) {
                      const access = userData?.regionAccess?.[id];
                      if (access === 'suspended') {
                        alert('이 행성에 대한 접근이 일시정지되었습니다. 선생님께 문의하세요.');
                        return;
                      }
                      if (access !== 'active' && access !== 'completed') {
                        setPendingRegion(region);
                        soundManager.playClick();
                        return;
                      }
                    }
                    selectRegion(id);
                    soundManager.playWarp();
                  }}
                  onSelectStation={(id) => {
                    if (id === 'archive') {
                      setAssignmentHubInitialDate(null);
                      switchRootView('assignment_hub');
                    } else if (id === 'notebook') switchRootView('mistake_notebook');
                    else if (id === 'dark') startDarkMatterMode('learning');
                    else if (id === 'refinery') startDarkMatterMode('refinery');
                    soundManager.playWarp();
                  }}
                />
              </Suspense>
            ) : !selectedRegionId && is2DMode && isCourseExplorerCluster(selectedClusterId) ? (
              <Suspense fallback={<div role="status" style={{ padding: 40 }}>행성 목록을 준비하고 있어요…</div>}>
                <CoursePlanetExplorer
                  clusterId={selectedClusterId}
                  regions={regions}
                  loading={loadingRegions}
                  error={errorRegions}
                  onRetry={refetchRegions}
                  canUse3D={!isMobile}
                  onToggleMode={toggle2DMode}
                  onBack={activeClusters.length > 1 ? () => { selectCluster(null); soundManager.playClick(); } : undefined}
                  onEnterFrontier={requestGalaxyEntry}
                  regionAccess={userData?.regionAccess}
                  explorationStatus={explorationStatus}
                  recentRegionId={recentRegionId}
                  darkMatterCount={darkMatterCount}
                  onSelectRegion={(id) => {
                    const region = regions?.find(item => item.id === id)
                    if (!region) return
                    if (region.isPrivate) {
                      const access = userData?.regionAccess?.[id]
                      if (access === 'suspended') {
                        alert('이 행성에 대한 접근이 일시정지되었습니다. 선생님께 문의하세요.')
                        return
                      }
                      if (access !== 'active' && access !== 'completed') {
                        setPendingRegion(region)
                        soundManager.playClick()
                        return
                      }
                    }
                    selectRegion(id)
                    soundManager.playWarp()
                  }}
                  onSelectStation={(id) => {
                    if (id === 'archive') {
                      setAssignmentHubInitialDate(null)
                      switchRootView('assignment_hub')
                    } else if (id === 'notebook') switchRootView('mistake_notebook')
                    else if (id === 'dark') startDarkMatterMode('learning')
                    else if (id === 'refinery') startDarkMatterMode('refinery')
                    else if (id === 'reading_library') switchRootView('reading_library')
                    else if (id === 'lumi_protocol') switchRootView('lumi_protocol')
                    else if (id === 'algorithm_constellation') switchRootView('algorithm_constellation')
                    else if (id === 'python_game_studio') window.open('/python-game-studio', '_blank', 'noopener,noreferrer')
                    soundManager.playWarp()
                  }}
                />
              </Suspense>
            ) : !selectedRegionId ? (
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
                  ) : errorRegions ? (
                    <div className="font-tech" role="alert" style={{ color: '#ff9b9b', fontSize: '1rem', lineHeight: 1.6 }}>
                      <div>⚠ 행성 맵을 불러오지 못했습니다.</div>
                      <button
                        type="button"
                        className="space-btn font-tech"
                        onClick={() => refetchRegions()}
                        style={{ marginTop: '.75rem', padding: '.65rem .9rem', color: 'var(--crystal-cyan)' }}
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : (!regions || regions.length === 0) ? (
                    <span className="font-tech" style={{ color: '#ff6b6b', fontSize: '1.2rem' }}>
                      ⚠ 탐사가능한 행성이 없습니다
                    </span>
                  ) : (
                    <>
                    {is2DMode && (
                      <>
                        {selectedClusterId === 'python' && (
                          <>
                            <Motion.button
                              type="button"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1, transition: { delay: 0.04 } }}
                              whileHover={isMobile ? undefined : { scale: 1.05, filter: 'brightness(1.18)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                switchRootView('lumi_protocol')
                                soundManager.playWarp()
                              }}
                              style={{
                                width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                                minHeight: isMobile ? '148px' : '250px',
                                padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                                border: '1px solid rgba(85, 241, 200, 0.58)',
                                borderRadius: isMobile ? '14px' : '20px',
                                color: 'white',
                                cursor: 'pointer',
                                background: 'radial-gradient(circle at 50% 20%, rgba(73,233,255,.3), transparent 35%), linear-gradient(145deg, rgba(8,48,74,.96), rgba(12,18,48,.97))',
                                boxShadow: '0 8px 34px rgba(73, 233, 255, .2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isMobile ? '.45rem' : '.8rem',
                                font: 'inherit',
                              }}
                            >
                              <span aria-hidden="true" style={{ fontSize: isMobile ? '2.2rem' : '4rem', filter: 'drop-shadow(0 0 12px #49e9ff)' }}>▲</span>
                              <strong className="font-tech" style={{ color: '#55f1c8', fontSize: isMobile ? '.92rem' : '1.3rem' }}>루미 프로토콜</strong>
                              <small style={{ color: '#b8f8ff', fontSize: isMobile ? '.68rem' : '.8rem', lineHeight: 1.35 }}>Python Mission World · 20 Missions</small>
                            </Motion.button>

                            <Motion.button
                              type="button"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1, transition: { delay: 0.05 } }}
                              whileHover={isMobile ? undefined : { scale: 1.05, filter: 'brightness(1.18)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                switchRootView('algorithm_constellation')
                                soundManager.playWarp()
                              }}
                              style={{
                                width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                                minHeight: isMobile ? '148px' : '250px',
                                padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                                border: '1px solid rgba(129, 140, 248, 0.58)',
                                borderRadius: isMobile ? '14px' : '20px',
                                color: 'white',
                                cursor: 'pointer',
                                background: 'radial-gradient(circle at 50% 20%, rgba(129, 140, 248, .3), transparent 35%), linear-gradient(145deg, rgba(15,23,42,.96), rgba(30,27,75,.97))',
                                boxShadow: '0 8px 34px rgba(129, 140, 248, .2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isMobile ? '.45rem' : '.8rem',
                                font: 'inherit',
                              }}
                            >
                              <img
                                src="/assets/planets/algorithm-constellation.png"
                                alt="생각의 항로"
                                style={{
                                  width: isMobile ? '46px' : '72px',
                                  height: isMobile ? '46px' : '72px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  filter: 'drop-shadow(0 0 14px rgba(0, 240, 255, 0.65))',
                                }}
                              />
                              <strong className="font-tech" style={{ color: '#c7d2fe', fontSize: isMobile ? '.92rem' : '1.3rem' }}>생각의 항로</strong>
                              <small style={{ color: '#e0e7ff', fontSize: isMobile ? '.68rem' : '.8rem', lineHeight: 1.35 }}>알고리즘 성단 · 사고력 훈련</small>
                            </Motion.button>
                          </>
                        )}

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

                        {/* Special Card: Reading Bookshelf for Western Classic */}
                        {isWesternClassicCluster(selectedClusterId) && (
                          <Motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1, transition: { delay: 0.12 } }}
                            whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              switchRootView('reading_library');
                              if (soundManager?.playWarp) soundManager.playWarp();
                            }}
                            style={{
                              padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
                              width: isMobile ? 'calc(50% - 0.45rem)' : '250px',
                              background: 'rgba(20, 184, 166, 0.12)',
                              border: '1px solid rgba(45, 212, 191, 0.5)',
                              borderRadius: isMobile ? '14px' : '20px',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '1rem',
                              boxShadow: '0 8px 32px rgba(20, 184, 166, 0.22)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img
                                src="/assets/planets/reading-library.webp"
                                alt="나의 책장"
                                style={{
                                  width: isMobile ? '64px' : '92px',
                                  height: isMobile ? '64px' : '92px',
                                  objectFit: 'contain',
                                  borderRadius: '50%',
                                  boxShadow: '0 0 20px rgba(94, 234, 212, 0.4)',
                                  marginBottom: '0.5rem'
                                }}
                              />
                              <span className="font-tech" style={{ fontSize: isMobile ? '0.92rem' : '1.3rem', fontWeight: 'bold' }}>나의 책장</span>
                              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#5eead4', fontWeight: 'bold' }}>Reading Bookshelf</div>
                            </div>
                          </Motion.div>
                        )}

                        {/* Special Card: Mistake Notebook (Hidden for Western Classic) */}
                        {!isWesternClassicCluster(selectedClusterId) && (
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
                        )}

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

                        {/* Special Card: Dark Matter Refinery (Hidden for Western Classic) */}
                        {!isWesternClassicCluster(selectedClusterId) && (
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
                        )}
                      </>
                    )}
                    {(isWesternClassicCluster(selectedClusterId) ? filterWesternClassicRegions(regions, selectedClusterId) : regions).map((region, idx) => {
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
                    ) : errorChapters ? (
                      <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
                        <p className="font-tech" style={{ color: '#ff8f8f', marginBottom: '1rem' }}>
                          📡 미션 데이터를 불러오지 못했습니다. 권한 동기화 후 다시 시도해 주세요.
                        </p>
                        <button
                          className="hud-btn secondary glass"
                          onClick={() => refetchChapters()}
                          style={{ padding: '0.65rem 1.5rem' }}
                        >
                          ↻ RETRY SCAN
                        </button>
                      </div>
                    ) : chapters?.length === 0 ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                        등록된 미션이 없습니다.
                      </div>
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
                            const hasAny = p.quiz.total > 0 || p.video.total > 0 || p.text.total > 0 || p.workbook.total > 0 || p.codeTrace.total > 0 || p.missionLab.total > 0;
                            
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
                                {p.missionLab.total > 0 && (
                                  <span className="font-tech" style={{ color: p.missionLab.completed === p.missionLab.total ? '#50c878' : '#55f1c8', fontSize: '0.85rem' }}>
                                    🛰️ {p.missionLab.completed}/{p.missionLab.total}
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

                  {selectedRegionId === 'multiplication' && (
                    <section
                      aria-labelledby="multiplication-experience-title"
                      style={{
                        marginTop: isMobile ? '1.35rem' : '2.25rem',
                        paddingTop: isMobile ? '1.1rem' : '1.5rem',
                        borderTop: '1px solid rgba(69, 230, 210, 0.18)',
                      }}
                    >
                      <div style={{ marginBottom: isMobile ? '0.8rem' : '1rem' }}>
                        <strong id="multiplication-experience-title" className="font-title" style={{ display: 'block', color: '#effcff', fontSize: isMobile ? '1rem' : '1.22rem' }}>
                          NEW · 체험 학습
                        </strong>
                        <span style={{ display: 'block', marginTop: '0.28rem', color: '#7fa0b0', fontSize: isMobile ? '0.72rem' : '0.82rem' }}>
                          일반 학습에서 배운 곱셈을 직접 만지고 반복하며 익혀요.
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? '0.75rem' : '1rem' }}>
                        <ExperienceLearningCard
                          testId="times-card-lab-entry"
                          eyebrow="먼저 도전"
                          badge="2단~12단"
                          title="구구단 불빛 카드"
                          description="여러 단을 골라 카드를 맞혀요. 틀린 카드는 다시 만나고, 자주 틀린 문제는 다음날 먼저 연습해요."
                          icon="✨"
                          isMobile={isMobile}
                          accent={{
                            border: 'rgba(255, 192, 88, 0.48)',
                            background: 'linear-gradient(120deg, rgba(87, 58, 22, 0.76), rgba(60, 43, 68, 0.84))',
                            shadow: '0 14px 38px rgba(255, 166, 66, 0.12)',
                            icon: 'linear-gradient(135deg, #ffe08b, #ff9b63)',
                            iconShadow: '0 0 28px rgba(255, 190, 88, 0.28)',
                            label: '#ffd27b',
                          }}
                          onClick={() => {
                            setMultiplicationCardLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                        <ExperienceLearningCard
                          testId="big-multiply-lab-entry"
                          eyebrow="다음 도전"
                          badge="10개 미션"
                          title="큰곱셈 조립소"
                          description="왕새우쌤과 세 자리 수 × 세 자리 수를 한 칸씩 계산해요. 올림부터 마지막 세로 덧셈까지 직접!"
                          icon="🧩"
                          isMobile={isMobile}
                          accent={{
                            border: 'rgba(69, 230, 210, 0.48)',
                            background: 'linear-gradient(115deg, rgba(18, 88, 106, 0.72), rgba(17, 48, 85, 0.82))',
                            shadow: '0 14px 38px rgba(0, 210, 190, 0.13)',
                            icon: 'linear-gradient(135deg, #45e6d2, #65a9ff)',
                            iconShadow: '0 0 28px rgba(69, 230, 210, 0.28)',
                            label: '#6ff5df',
                          }}
                          onClick={() => {
                            setVerticalMultiplicationLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                      </div>
                    </section>
                  )}

                  {selectedRegionId === 'fractions' && (
                    <section
                      aria-labelledby="fraction-experience-title"
                      style={{
                        marginTop: isMobile ? '1.35rem' : '2.25rem',
                        paddingTop: isMobile ? '1.1rem' : '1.5rem',
                        borderTop: '1px solid rgba(118, 103, 255, 0.2)',
                      }}
                    >
                      <div style={{ marginBottom: isMobile ? '0.8rem' : '1rem' }}>
                        <strong id="fraction-experience-title" className="font-title" style={{ display: 'block', color: '#effcff', fontSize: isMobile ? '1rem' : '1.22rem' }}>
                          NEW · 체험 학습
                        </strong>
                        <span style={{ display: 'block', marginTop: '0.28rem', color: '#7fa0b0', fontSize: isMobile ? '0.72rem' : '0.82rem' }}>
                          분수카드를 겹치고 조각을 묶으며, 같은 크기 분수·통분·약분의 원리를 발견해요.
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? '0.75rem' : '1rem' }}>
                        <ExperienceLearningCard
                          testId="equivalent-fraction-lab-entry"
                          eyebrow="관찰하고 발견하기"
                          badge="6개 렌즈 탐구"
                          title="분수 겹침 렌즈"
                          description="종이카드 위에 투명카드를 끌어 겹쳐요. 색칠한 넓이는 그대로인데 분자와 분모가 함께 늘어나는 순간을 직접 확인해요."
                          icon="▦"
                          isMobile={isMobile}
                          accent={{
                            border: 'rgba(146, 124, 255, 0.5)',
                            background: 'linear-gradient(120deg, rgba(44, 72, 119, 0.82), rgba(76, 42, 111, 0.8))',
                            shadow: '0 14px 38px rgba(113, 94, 255, 0.14)',
                            icon: 'linear-gradient(135deg, #74f1de, #9b87ff)',
                            iconShadow: '0 0 28px rgba(141, 116, 255, 0.3)',
                            label: '#a99aff',
                          }}
                          onClick={() => {
                            setEquivalentFractionLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                        <ExperienceLearningCard
                          testId="common-denominator-lab-entry"
                          eyebrow="겹치고 비교하기"
                          badge="8개 공통 칸"
                          title="통분 렌즈 연구소"
                          description="서로 다른 두 분수카드에 투명 렌즈를 겹쳐 같은 크기의 방을 만들어요. 통분한 두 분수를 직접 쓰고 크기도 비교해요."
                          icon="▥"
                          isMobile={isMobile}
                          accent={{
                            border: 'rgba(82, 226, 210, 0.5)',
                            background: 'linear-gradient(120deg, rgba(22, 91, 105, 0.82), rgba(77, 48, 118, 0.82))',
                            shadow: '0 14px 38px rgba(77, 220, 207, 0.14)',
                            icon: 'linear-gradient(135deg, #5ce8d2, #c09dff)',
                            iconShadow: '0 0 28px rgba(101, 223, 214, 0.28)',
                            label: '#71ead8',
                          }}
                          onClick={() => {
                            setCommonDenominatorLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                        <ExperienceLearningCard
                          testId="fraction-reduction-lab-entry"
                          eyebrow="묶고 압축하기"
                          badge="8개 약분 탐구"
                          title="약분 묶음 연구소"
                          description="정사각형 분수 빌딩의 작은 칸을 같은 수만큼 묶어요. 빌딩 전체에 남는 칸이 없을 때 더 간단한 큰 방 빌딩으로 바뀌는 모습을 관찰해요."
                          icon="⊟"
                          isMobile={isMobile}
                          accent={{
                            border: 'rgba(255, 196, 99, 0.52)',
                            background: 'linear-gradient(120deg, rgba(14, 101, 89, 0.84), rgba(112, 69, 41, 0.8))',
                            shadow: '0 14px 38px rgba(255, 190, 89, 0.12)',
                            icon: 'linear-gradient(135deg, #61ebcc, #ffc56a)',
                            iconShadow: '0 0 28px rgba(255, 194, 97, 0.28)',
                            label: '#ffd077',
                          }}
                          onClick={() => {
                            setFractionReductionLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                      </div>
                    </section>
                  )}

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
                  {selectedRegionId === 'division' && (
                    <section
                      aria-labelledby="division-experience-title"
                      style={{
                        marginBottom: isMobile ? '1rem' : '1.35rem',
                        padding: isMobile ? '0.85rem' : '1rem',
                        border: '1px solid rgba(255, 176, 102, 0.3)',
                        borderRadius: isMobile ? 16 : 20,
                        background: 'linear-gradient(115deg, rgba(87, 46, 34, 0.46), rgba(22, 64, 79, 0.68))',
                        boxShadow: '0 18px 48px rgba(255, 151, 91, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', marginBottom: '0.7rem' }}>
                        <div>
                          <strong id="division-experience-title" className="font-title" style={{ display: 'block', color: '#ffd19b', fontSize: isMobile ? '0.88rem' : '1rem' }}>
                            NEW · 원리 실험실
                          </strong>
                          <span style={{ display: 'block', color: '#8eacb8', fontSize: isMobile ? '0.68rem' : '0.76rem', marginTop: '0.2rem' }}>
                            15개 일반 미션과 별도로, 세로셈을 손으로 움직이며 배워요.
                          </span>
                        </div>
                        <span style={{ color: '#ffbd78', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>20개 미션</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? '0.7rem' : '0.9rem' }}>
                        <ExperienceLearningCard
                          testId="division-card-lab-entry"
                          eyebrow="먼저 도전"
                          badge="2단~12단"
                          title="나눗셈 묶음 카드"
                          description="같은 수씩 묶으며 몫을 찾아요. 구구단 소리와 묶음 불빛을 따라가고, 어려운 카드는 다시 만나요."
                          icon="🟠"
                          isMobile
                          accent={{
                            border: 'rgba(255, 194, 105, 0.5)',
                            background: 'linear-gradient(115deg, rgba(89, 55, 25, 0.8), rgba(17, 65, 72, 0.84))',
                            shadow: '0 12px 34px rgba(255, 172, 76, 0.12)',
                            icon: 'linear-gradient(135deg, #ffe091, #ff9d5c)',
                            iconShadow: '0 0 26px rgba(255, 184, 88, 0.26)',
                            label: '#ffd093',
                          }}
                          onClick={() => {
                            setDivisionCardLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                        <ExperienceLearningCard
                          testId="vertical-division-lab-entry"
                          eyebrow="다음 도전"
                          badge="20개 미션"
                          title="나눗셈 내려오기 연구소"
                          description="왕새우쌤과 몫·곱하기·빼기·내려오기를 정확한 자리에 한 칸씩 써요."
                          icon="↘"
                          isMobile
                          accent={{
                            border: 'rgba(89, 223, 210, 0.46)',
                            background: 'linear-gradient(115deg, rgba(32, 65, 62, 0.78), rgba(13, 56, 79, 0.84))',
                            shadow: '0 12px 34px rgba(66, 216, 201, 0.1)',
                            icon: 'linear-gradient(135deg, #ffc576, #55dfd2)',
                            iconShadow: '0 0 26px rgba(85, 223, 210, 0.24)',
                            label: '#75eadb',
                          }}
                          onClick={() => {
                            setVerticalDivisionLabOpen(true)
                            soundManager.playWarp?.()
                          }}
                        />
                      </div>
                    </section>
                  )}
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
                      
                      const { hasQuiz, hasVideo, hasText, hasWorkbook, hasCodeTrace, hasMissionLab } = getUnitContentAvailability(unit, quizAvailabilityMap, selectedClusterId)
                      const hasAnyContent = hasQuiz || hasVideo || hasText || hasWorkbook || hasCodeTrace || hasMissionLab

                      const isOverallCompleted = hasAnyContent &&
                        (!hasQuiz || uProg.quiz) &&
                        (!hasVideo || uProg.video) &&
                        (!hasText || uProg.text) &&
                        (!hasWorkbook || uProg.workbook) &&
                        (!hasCodeTrace || uProg.codeTrace) &&
                        (!isMissionLabRequired(unit) || uProg.missionLab)

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
                              {hasMissionLab && (
                                <span className="font-tech" style={{
                                  color: uProg.missionLab ? '#50c878' : 'rgba(255,255,255,0.3)',
                                  fontSize: '1rem',
                                  textShadow: uProg.missionLab ? '0 0 10px rgba(80, 200, 120, 0.5)' : 'none'
                                }} title={isMissionLabRequired(unit) ? 'Mission Lab · 필수' : 'Mission Lab · 선택'}>🛰️</span>
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

      <CompletionResultModal
        result={completionResult}
        onClose={closeCompletionResult}
        onDashboard={openCompletionDashboard}
        onContinue={continueAfterCompletion}
      />

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
      <Suspense fallback={<SpaceViewFallback />}>
        {renderMainContent()}
      </Suspense>
      {persistentStudyRoom}
    </>
  );
}


// RewardPotentialModal has been moved to MissionHub.jsx


export default SpaceHome
