import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import firebaseApp, { auth } from '../../../../firebase.js'
import AlgorithmMissionShell from '../shell/AlgorithmMissionShell.jsx'
import { createAlgorithmConstellationGateway } from '../services/AlgorithmConstellationGateway.js'
import { createAlgorithmConstellationMockGateway } from '../services/AlgorithmConstellationMockGateway.js'
import { CONSTELLATIONS, getConstellationAccess, getMissingPrerequisites } from '../../shared/catalog/constellationRegistry.js'
import { ALGORITHM_EDITORIAL_CATALOG } from '../../shared/catalog/algorithmEditorialCatalog.js'
import { PUBLIC_KERNELS } from '../../shared/problems/index.js'
import soundManager from '../../../../utils/SoundManager.js'

const ROUTE_FILTERS = [
  { id: 'all', label: '전체 항로', icon: '🌌' },
  { id: 'core', label: '🌟 본 항로 (Core)', icon: '🌟' },
  { id: 'branch', label: '🌿 선택 항로 (Branch)', icon: '🌿' },
]

const PUBLISHED_ENTRIES = ALGORITHM_EDITORIAL_CATALOG.filter((item) => item.status === 'published')
const DEFAULT_CONSTELLATION_ID = CONSTELLATIONS.find((constellation) =>
  PUBLISHED_ENTRIES.some((entry) => entry.constellationId === constellation.id)
)?.id || 'constellation-0'

// Local records (dev mock ledger + owner-scoped drafts) are PREVIEW data only:
// they may display stars and fill gaps while offline, but they can never raise
// or rewrite server-authoritative progress, mastery status, or unlock gating.
const LOCAL_PREVIEW_SOURCE = 'local-preview'

function readLocalProgressSnapshot(ownerKey) {
  const local = {}
  if (typeof window === 'undefined' || !window.localStorage) return local
  try {
    const raw = window.localStorage.getItem('msense_alg_dev_progress_v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      // The dev mock ledger writes a plain object; accept the legacy array form too.
      const entries = Array.isArray(parsed) ? parsed : Object.entries(parsed || {})
      for (const [pid, record] of entries) {
        if (pid && record) {
          local[pid] = {
            ...record,
            problemId: pid,
            source: LOCAL_PREVIEW_SOURCE,
            masteryStatus: record.masteryStatus === 'mastered' ? 'mastered' : 'preview_only',
          }
        }
      }
    }
    const draftPrefix = ownerKey
      ? `msense_alg_draft_v2_${encodeURIComponent(ownerKey.trim())}_`
      : 'msense_alg_draft_v2_'
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(draftPrefix)) {
        try {
          const draft = JSON.parse(window.localStorage.getItem(k))
          if (draft?.problemId) {
            const isCompleted = (draft.stars || 0) >= 1 || draft.fsmState === 'COMPLETE' || Boolean(draft.completionResult?.passed)
            if (isCompleted) {
              const existing = local[draft.problemId]
              const stars = Math.max(existing?.bestStars || 0, draft.stars || (draft.fsmState === 'COMPLETE' ? 3 : 0))
              local[draft.problemId] = {
                problemId: draft.problemId,
                bestStars: stars,
                masteryStatus: 'preview_only',
                source: LOCAL_PREVIEW_SOURCE,
              }
            }
          }
        } catch { /* skip */ }
      }
    }
  } catch (e) {
    console.warn('Failed to read local progress snapshot:', e)
  }
  return local
}

export default function AlgorithmConstellationHub({ onBack }) {
  const navigate = useNavigate()
  const [selectedConstellationId, setSelectedConstellationId] = useState(DEFAULT_CONSTELLATION_ID)
  const [routeFilter, setRouteFilter] = useState('all')
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [serverAvailable, setServerAvailable] = useState(false)
  const [progressMap, setProgressMap] = useState(() => readLocalProgressSnapshot(auth.currentUser?.uid || 'guest_pilot'))

  const gateway = useMemo(() => {
    if (import.meta.env.DEV) {
      return createAlgorithmConstellationMockGateway()
    }
    return createAlgorithmConstellationGateway(firebaseApp)
  }, [])

  const syncProgress = useCallback(async () => {
    const localSnap = readLocalProgressSnapshot(auth.currentUser?.uid || 'guest_pilot')
    let serverSnap = null
    try {
      serverSnap = (await gateway.getProgress({ problemId: 'all' })) || {}
    } catch (err) {
      console.warn('Algorithm progress: server unavailable, using local preview only:', err)
    }
    const merged = {}
    if (serverSnap) {
      // Server truth wins. Local drafts may only fill problems the server
      // does not know about, and always as non-authoritative previews.
      for (const [pid, record] of Object.entries(serverSnap)) {
        if (pid && record) merged[pid] = { ...record, problemId: pid, source: 'server' }
      }
      for (const [pid, localRecord] of Object.entries(localSnap)) {
        if (!merged[pid]) merged[pid] = localRecord
      }
      setServerAvailable(true)
    } else {
      Object.assign(merged, localSnap)
      setServerAvailable(false)
    }
    setProgressMap(merged)
  }, [gateway])

  // Authoritative & resilient progress loading
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void syncProgress()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [syncProgress])

  // Preview records count toward gating only while the server is unreachable
  // (offline resilience); once server data is loaded, gating is server-only.
  const isAuthoritativeRecord = (record) => (
    record && (record.source !== LOCAL_PREVIEW_SOURCE || !serverAvailable)
  )

  const completedProblemIds = useMemo(() => {
    const ids = []
    for (const [pid, record] of Object.entries(progressMap)) {
      if (!isAuthoritativeRecord(record)) continue
      if ((record.bestStars || 0) >= 1 || record.masteryStatus === 'mastered' || record.masteryStatus === 'preview_only') {
        ids.push(pid)
      }
    }
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap, serverAvailable])

  const handleBack = () => {
    soundManager.playWarp?.()
    if (onBack) onBack()
    else navigate('/')
  }

  const activeConstellation = useMemo(() => {
    return CONSTELLATIONS.find((c) => c.id === selectedConstellationId) || CONSTELLATIONS[0]
  }, [selectedConstellationId])

  const constellationMissions = useMemo(() => {
    const entries = PUBLISHED_ENTRIES.filter((item) => item.constellationId === activeConstellation.id)
    if (routeFilter === 'all') return entries
    return entries.filter((item) => item.routeRole === routeFilter)
  }, [activeConstellation, routeFilter])

  const totalStarsEarned = useMemo(() => {
    return Object.values(progressMap).reduce(
      (sum, p) => sum + (isAuthoritativeRecord(p) ? (p?.bestStars || 0) : 0),
      0,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap, serverAvailable])

  const previewStarsCount = useMemo(() => {
    return Object.values(progressMap).reduce(
      (sum, p) => sum + (!isAuthoritativeRecord(p) ? (p?.bestStars || 0) : 0),
      0,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap, serverAvailable])

  const totalMasteredCount = useMemo(() => {
    return Object.values(progressMap).filter((p) => (
      isAuthoritativeRecord(p) &&
      (p?.masteryStatus === 'mastered' || p?.masteryStatus === 'preview_only' || (p?.bestStars || 0) >= 3)
    )).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap, serverAvailable])

  const handleSelectMission = (problemId) => {
    if (getMissingPrerequisites(problemId, completedProblemIds, ALGORITHM_EDITORIAL_CATALOG).length > 0) {
      return
    }
    const kernel = PUBLIC_KERNELS[problemId]
    if (kernel) {
      soundManager.playClick?.()
      setSelectedProblem(kernel)
    }
  }

  if (selectedProblem) {
    return (
      <AlgorithmMissionShell
        key={selectedProblem.problemId || selectedProblem.id}
        kernel={selectedProblem}
        gateway={gateway}
        draftOwnerKey={auth.currentUser?.uid || 'guest_pilot'}
        initialShell="explorer"
        onProgressUpdate={(record) => {
          if (!record?.problemId) return
          setProgressMap((previous) => ({ ...previous, [record.problemId]: record }))
        }}
        onExit={async () => {
          soundManager.playWarp?.()
          setSelectedProblem(null)
          await syncProgress()
        }}
      />
    )
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, #0c1b33 0%, #030712 80%)',
        color: '#ffffff',
        padding: '36px 20px 60px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '12px',
            padding: '10px 18px',
            color: '#e2e8f0',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <span>←</span>
          <span>우주 기지로 귀환</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#fde047',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⭐</span>
            <span>획득한 별: {totalStarsEarned}개{previewStarsCount > 0 ? ` (미리보기 ${previewStarsCount})` : ''}</span>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#6ee7b7',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🏆</span>
            <span>마스터 미션: {totalMasteredCount}개</span>
          </div>
        </div>
      </header>

      {/* Main Title Banner */}
      <div style={{ textAlign: 'center', maxWidth: '800px', marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: '900',
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          🌌 LUMI 알고리즘 성단 : 생각의 항로
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8', lineHeight: '1.6' }}>
          정답 코드를 외우는 대신, 작은 장면을 관찰하고 규칙을 발견하며 스스로 생각의 알고리즘을 구축합니다.
        </p>
      </div>

      {/* Constellation Selector Bar */}
      <nav
        aria-label="성단 선택"
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          marginBottom: '32px',
        }}
      >
        {CONSTELLATIONS.map((c) => {
          const isSelected = c.id === activeConstellation.id
          const access = getConstellationAccess(c.number, completedProblemIds, ALGORITHM_EDITORIAL_CATALOG)
          const isUnlocked = access.accessible
          const constellationCoreProblems = PUBLISHED_ENTRIES.filter(
            (item) => item.constellationId === c.id && item.routeRole === 'core'
          )
          const completedInConstellation = constellationCoreProblems.filter((p) =>
            completedProblemIds.includes(p.problemId)
          ).length

          return (
            <button
              key={c.id}
              onClick={() => {
                if (isUnlocked) {
                  soundManager.playClick?.()
                  setSelectedConstellationId(c.id)
                }
              }}
              disabled={!isUnlocked}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isSelected
                  ? `2px solid ${c.accentColor}`
                  : isUnlocked
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px dashed rgba(255, 255, 255, 0.05)',
                background: isSelected
                  ? `linear-gradient(135deg, ${c.accentColor}22 0%, rgba(15, 23, 42, 0.8) 100%)`
                  : isUnlocked
                  ? 'rgba(15, 23, 42, 0.5)'
                  : 'rgba(10, 15, 28, 0.3)',
                color: isUnlocked ? '#f8fafc' : '#64748b',
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 15px ${c.accentColor}33` : 'none',
                opacity: isUnlocked ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>{isUnlocked ? c.icon : access.mode === 'unavailable' ? '🛠️' : '🔒'}</span>
                <span style={{ fontSize: '11px', color: isSelected ? c.accentColor : isUnlocked ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}>
                  {isUnlocked ? `성단 ${c.number}` : access.mode === 'unavailable' ? '준비 중' : '잠김'}
                </span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: isSelected ? '#ffffff' : isUnlocked ? '#cbd5e1' : '#64748b', marginBottom: '2px' }}>
                {c.title}
              </span>
              <span style={{ fontSize: '11px', color: isUnlocked ? '#94a3b8' : '#475569' }}>
                {completedInConstellation}/{constellationCoreProblems.length} 공개 Core 완료
              </span>
              {access.reason === 'previous-release-incomplete' && (
                <span style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                  성단 {c.number - 1}의 후속 미션 준비 중
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Active Constellation Information & Route Filter Bar */}
      <section
        style={{
          width: '100%',
          maxWidth: '1080px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '22px' }}>{activeConstellation.icon}</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#f8fafc' }}>
              성단 {activeConstellation.number}. {activeConstellation.title}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            {activeConstellation.subtitle} • 현재 출판된 미션 {constellationMissions.length}개
          </p>
        </div>

        {/* Route Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px' }}>
          {ROUTE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setRouteFilter(f.id)}
              style={{
                background: routeFilter === f.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: routeFilter === f.id ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
                color: routeFilter === f.id ? '#38bdf8' : '#94a3b8',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Problem Cards Grid */}
      <section
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {constellationMissions.map((item) => {
          const kernel = PUBLIC_KERNELS[item.problemId]
          const isPublished = item.status === 'published' && Boolean(kernel)
          const missingPrereqIds = isPublished
            ? getMissingPrerequisites(item.problemId, completedProblemIds, ALGORITHM_EDITORIAL_CATALOG)
            : []
          const isPrereqUnlocked = missingPrereqIds.length === 0
          const isPlayable = isPublished && isPrereqUnlocked

          const isHovered = hoveredCard === item.problemId
          const record = progressMap[item.problemId]
          const stars = record?.bestStars || 0
          const isPreviewRecord = Boolean(record?.source === LOCAL_PREVIEW_SOURCE && serverAvailable)
          const isMastered = !isPreviewRecord && (
            record?.masteryStatus === 'mastered' || record?.masteryStatus === 'preview_only' || stars >= 3
          )

          const missingPrereqTitles = missingPrereqIds.map((pid) => {
            const entry = ALGORITHM_EDITORIAL_CATALOG.find((cat) => cat.problemId === pid)
            return entry?.studentTitle || pid
          })

          return (
            <article
              key={item.problemId}
              onMouseEnter={() => setHoveredCard(item.problemId)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: isPlayable
                  ? isMastered
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
                  : 'rgba(15, 23, 42, 0.4)',
                border: isPlayable
                  ? isMastered
                    ? '1px solid rgba(16, 185, 129, 0.5)'
                    : isHovered
                    ? '1px solid rgba(56, 189, 248, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.12)'
                  : '1px dashed rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
                transform: isPlayable && isHovered ? 'translateY(-3px)' : 'none',
                boxShadow: isPlayable && isHovered
                  ? '0 12px 28px rgba(0, 0, 0, 0.4), 0 0 16px rgba(56, 189, 248, 0.15)'
                  : '0 4px 12px rgba(0, 0, 0, 0.2)',
                opacity: isPlayable ? 1 : isPublished ? 0.6 : 0.45,
              }}
            >
              <div>
                {/* Badges Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: item.learningRole === 'anchor'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : item.learningRole === 'capstone'
                          ? 'rgba(236, 72, 153, 0.15)'
                          : 'rgba(56, 189, 248, 0.15)',
                        color: item.learningRole === 'anchor'
                          ? '#fde047'
                          : item.learningRole === 'capstone'
                          ? '#f472b6'
                          : '#38bdf8',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      #{item.catalogOrder} • {item.learningRole.toUpperCase()}
                    </span>

                    {stars > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: 'rgba(234, 179, 8, 0.2)',
                          color: '#fde047',
                        }}
                      >
                        {isPreviewRecord ? '☆' : '⭐'}{isPreviewRecord ? stars : '⭐'.repeat(stars)}
                      </span>
                    )}

                    {isPreviewRecord && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '3px 6px',
                          borderRadius: '6px',
                          background: 'rgba(148, 163, 184, 0.18)',
                          color: '#cbd5e1',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                        }}
                      >
                        미리보기
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                    {item.routeRole === 'core' ? '🌟 본 항로' : item.routeRole === 'capstone' ? '👑 캡스톤' : '🌿 선택 항로'}
                  </span>
                </div>

                {/* Problem Title & Subtitle */}
                <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#f8fafc' }}>
                  {item.studentTitle}
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                  {kernel?.identity?.subtitle || item.provenance?.adaptationNotes || '사고력 훈련 미션'}
                </p>
              </div>

              {/* Action Button & Prerequisite Notices */}
              <div>
                {isPublished && !isPrereqUnlocked && (
                  <div
                    style={{
                      marginBottom: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '11px',
                      color: '#fca5a5',
                      lineHeight: '1.4',
                    }}
                  >
                    🔒 먼저 완료할 항로: <strong>{missingPrereqTitles.join(', ')}</strong>
                  </div>
                )}

                {isPlayable ? (
                  <button
                    onClick={() => handleSelectMission(item.problemId)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: isMastered
                        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                        : stars > 0
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{isMastered ? '🏆 마스터 복습하기' : stars > 0 ? '🔄 다시 풀기 (복습)' : '🚀 탐사 시작하기'}</span>
                    <span>→</span>
                  </button>
                ) : isPublished ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔒 선수 항로를 먼저 완료하세요</span>
                  </button>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: '600',
                    }}
                  >
                    🚧 탐사 준비 중 (출판 대기)
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
