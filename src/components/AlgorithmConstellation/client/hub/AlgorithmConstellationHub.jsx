import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import firebaseApp from '../../../../firebase.js'
import AlgorithmMissionShell from '../shell/AlgorithmMissionShell.jsx'
import { createAlgorithmConstellationGateway } from '../services/AlgorithmConstellationGateway.js'
import { createAlgorithmConstellationMockGateway } from '../services/AlgorithmConstellationMockGateway.js'
import { AC_COND_001 } from '../../shared/problems/ac_cond_001.js'
import { AC_COND_002 } from '../../shared/problems/ac_cond_002.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../../shared/problems/ac_pat_003.js'
import { AC_PAT_004 } from '../../shared/problems/ac_pat_004.js'
import { AC_SEQ_005 } from '../../shared/problems/ac_seq_005.js'
import { AC_NAV_005 } from '../../shared/problems/ac_nav_005.js'
import { AC_NAV_006 } from '../../shared/problems/ac_nav_006.js'
import soundManager from '../../../../utils/SoundManager.js'

const TRACK_TABS = [
  { id: 'all', label: '전체 탐사', icon: '🌌' },
  { id: 'condition', label: '🧩 조건 판단하기', icon: '⚡' },
  { id: 'pattern', label: '🔁 규칙 발견하기', icon: '❄️' },
  { id: 'sequence', label: '📦 데이터 처리하기', icon: '🪐' },
  { id: 'navigation', label: '🗺 길 탐색하기', icon: '🚀' },
]

const MISSIONS = [
  {
    kernel: AC_COND_001,
    track: 'condition',
    tag: '🎯 두 조건을 함께 판단하기 (and)',
    badge: '⚡ 입문 항로',
    badgeStyle: {
      background: 'rgba(234, 179, 8, 0.18)',
      border: '1px solid rgba(234, 179, 8, 0.5)',
      color: '#fef08a',
    },
    icon: '⚡',
    accentColor: '#00f0ff',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    glowColor: 'rgba(0, 240, 255, 0.15)',
    btnGradient: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
    chips: ['🎯 두 스위치 판단 (and)', '🔍 4상황 직관 발견', '⏱️ 약 5~8분'],
  },
  {
    kernel: AC_COND_002,
    track: 'condition',
    tag: '🚪 대안 조건을 판단하기 (or)',
    badge: '⚡ 입문 항로',
    badgeStyle: {
      background: 'rgba(56, 189, 248, 0.18)',
      border: '1px solid rgba(56, 189, 248, 0.5)',
      color: '#bae6fd',
    },
    icon: '🚪',
    accentColor: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    glowColor: 'rgba(56, 189, 248, 0.15)',
    btnGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    chips: ['🚪 구명정 대안 판단 (or)', '🔍 4상황 직관 발견', '⏱️ 약 6~8분'],
  },
  {
    kernel: AC_PAT_003_PUBLIC_KERNEL,
    track: 'pattern',
    tag: '⏳ 반복되는 신호 주기 찾기 (%)',
    badge: '❄️ 심화 항로',
    badgeStyle: {
      background: 'rgba(129, 140, 248, 0.18)',
      border: '1px solid rgba(129, 140, 248, 0.5)',
      color: '#c7d2fe',
    },
    icon: '❄️',
    accentColor: '#818cf8',
    borderColor: 'rgba(129, 140, 248, 0.3)',
    glowColor: 'rgba(129, 140, 248, 0.15)',
    btnGradient: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
    chips: ['⏳ 3초 주기 나머지 (%)', '📊 시간 흐름 시뮬레이션', '⏱️ 약 8~10분'],
  },
  {
    kernel: AC_PAT_004,
    track: 'pattern',
    tag: '💡 회전하는 등대 발광 구간 (<)',
    badge: '❄️ 심화 항로',
    badgeStyle: {
      background: 'rgba(168, 85, 247, 0.18)',
      border: '1px solid rgba(168, 85, 247, 0.5)',
      color: '#e9d5ff',
    },
    icon: '💡',
    accentColor: '#a855f7',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    glowColor: 'rgba(168, 85, 247, 0.15)',
    btnGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    chips: ['💡 주기 구간 판별', '📊 발광 시간대 관찰', '⏱️ 약 8~10분'],
  },
  {
    kernel: AC_SEQ_005,
    track: 'sequence',
    tag: '🪐 유효 데이터 선별 누적',
    badge: '🪐 도약 항로',
    badgeStyle: {
      background: 'rgba(52, 211, 153, 0.18)',
      border: '1px solid rgba(52, 211, 153, 0.5)',
      color: '#a7f3d0',
    },
    icon: '🪐',
    accentColor: '#34d399',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    glowColor: 'rgba(52, 211, 153, 0.15)',
    btnGradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    chips: ['📦 유효 에너지 선별 합산', '🔍 캡슐 순회 및 필터링', '⏱️ 약 10~12분'],
  },
  {
    kernel: AC_NAV_005,
    track: 'navigation',
    tag: '📡 선입선출 신호 대기열',
    badge: '🚀 심우주 항로',
    badgeStyle: {
      background: 'rgba(251, 146, 60, 0.18)',
      border: '1px solid rgba(251, 146, 60, 0.5)',
      color: '#fed7aa',
    },
    icon: '📡',
    accentColor: '#fb923c',
    borderColor: 'rgba(251, 146, 60, 0.3)',
    glowColor: 'rgba(251, 146, 60, 0.15)',
    btnGradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
    chips: ['📡 도착 순서대로 처리', '🔍 대기열 구조 관찰', '⏱️ 약 10~12분'],
  },
  {
    kernel: AC_NAV_006,
    track: 'navigation',
    tag: '🗺️ 성운 최단 경로 탐색',
    badge: '🚀 심우주 항로',
    badgeStyle: {
      background: 'rgba(244, 63, 94, 0.18)',
      border: '1px solid rgba(244, 63, 94, 0.5)',
      color: '#fecdd3',
    },
    icon: '🗺️',
    accentColor: '#f43f5e',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    glowColor: 'rgba(244, 63, 94, 0.15)',
    btnGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    chips: ['🗺️ 최단 경로 탐색', '🔒 중복 방문 방지', '⏱️ 약 15~20분'],
  },
]

export default function AlgorithmConstellationHub({ onBack }) {
  const navigate = useNavigate()
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  const gateway = useMemo(() => {
    if (import.meta.env.DEV) {
      return createAlgorithmConstellationMockGateway()
    }
    return createAlgorithmConstellationGateway(firebaseApp)
  }, [])

  const handleBack = () => {
    soundManager.playWarp?.()
    if (onBack) onBack()
    else navigate('/')
  }

  const handleSelectMission = (kernel) => {
    soundManager.playClick?.()
    setSelectedProblem(kernel)
  }

  const filteredMissions = useMemo(() => {
    if (activeTab === 'all') return MISSIONS
    return MISSIONS.filter((m) => m.track === activeTab)
  }, [activeTab])

  if (selectedProblem) {
    return (
      <AlgorithmMissionShell
        key={selectedProblem.id}
        kernel={selectedProblem}
        gateway={gateway}
        initialShell="explorer"
        onExit={() => {
          soundManager.playWarp?.()
          setSelectedProblem(null)
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
      {/* Top Navigation Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '12px',
            color: '#94a3b8',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >
          <span>←</span>
          <span>우주로 돌아가기</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '13px',
            color: '#38bdf8',
            fontWeight: 600,
          }}
        >
          <span>✦</span>
          <span>컴퓨팅 사고력 코어 가동 중</span>
        </div>
      </header>

      {/* Hero Header */}
      <section
        style={{
          textAlign: 'center',
          maxWidth: '820px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(129, 140, 248, 0.15)',
            border: '1px solid rgba(129, 140, 248, 0.4)',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#c7d2fe',
            marginBottom: '14px',
          }}
        >
          <span>🌌</span>
          <span>LUMI ALGORITHM CONSTELLATION</span>
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: '0 0 10px',
            background: 'linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          생각의 항로 (알고리즘 성단)
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: '#cbd5e1',
            lineHeight: 1.6,
            margin: '0 auto',
            maxWidth: '640px',
          }}
        >
          정답 코드를 외워 입력하는 곳이 아닙니다.
          현상을 관측하고, 규칙을 발견하고, 자신의 생각이 Python 코드로 자라나는 과정을 경험하세요.
        </p>
      </section>

      {/* Track Filter Tabs */}
      <nav
        style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '28px',
          justifyContent: 'center',
        }}
      >
        {TRACK_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundManager.playClick?.()
                setActiveTab(tab.id)
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isActive ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#38bdf8' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Missions Grid */}
      <section
        style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {filteredMissions.map((item, index) => {
          const { kernel, tag, badge, badgeStyle, icon, accentColor, borderColor, glowColor, btnGradient, chips } = item
          const isHovered = hoveredCard === kernel.id
          const explorerShell = kernel.shells?.explorer

          return (
            <article
              key={kernel.id}
              onMouseEnter={() => setHoveredCard(kernel.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: 'rgba(10, 20, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '20px',
                border: `1px solid ${isHovered ? accentColor : borderColor}`,
                boxShadow: isHovered
                  ? `0 12px 36px -8px ${glowColor}, 0 0 20px -2px ${glowColor}`
                  : '0 8px 24px -4px rgba(0, 0, 0, 0.5)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: 'pointer',
              }}
              onClick={() => handleSelectMission(kernel)}
            >
              <div>
                {/* Header with Badge and ID */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      ...badgeStyle,
                    }}
                  >
                    {badge}
                  </span>

                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontWeight: 600,
                    }}
                  >
                    {kernel.id}
                  </span>
                </div>

                {/* Title & Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{icon}</span>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {kernel.identity?.studentTitle || kernel.title}
                  </h2>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: accentColor,
                    marginBottom: '14px',
                  }}
                >
                  {tag}
                </div>

                {/* Story preview */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.6,
                    margin: '0 0 18px',
                    minHeight: '42px',
                  }}
                >
                  {explorerShell?.story || kernel.description}
                </p>

                {/* Chips */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '20px',
                  }}
                >
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontWeight: 500,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: '12px',
                  border: 'none',
                  background: btnGradient,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px 0 ${glowColor}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                <span>🚀 항로 탐사 시작</span>
                <span style={{ fontSize: '12px' }}>➔</span>
              </button>
            </article>
          )
        })}
      </section>
    </main>
  )
}
