import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import firebaseApp from '../../../../firebase.js'
import AlgorithmMissionShell from '../shell/AlgorithmMissionShell.jsx'
import { createAlgorithmConstellationGateway } from '../services/AlgorithmConstellationGateway.js'
import { createAlgorithmConstellationMockGateway } from '../services/AlgorithmConstellationMockGateway.js'
import { AC_COND_001 } from '../../shared/problems/ac_cond_001.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../../shared/problems/ac_pat_003.js'
import soundManager from '../../../../utils/SoundManager.js'

const MISSIONS = [
  {
    kernel: AC_COND_001,
    tag: '🎯 두 조건을 함께 판단하기',
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
    kernel: AC_PAT_003_PUBLIC_KERNEL,
    tag: '⏳ 반복되는 신호 주기 찾기',
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
]

export default function AlgorithmConstellationHub({ onBack }) {
  const navigate = useNavigate()
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)

  const gateway = useMemo(() => {
    if (import.meta.env.DEV) {
      return createAlgorithmConstellationMockGateway()
    }
    try {
      return createAlgorithmConstellationGateway(firebaseApp)
    } catch {
      return createAlgorithmConstellationMockGateway()
    }
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
      <div style={{ width: '100%', maxWidth: '1060px' }}>
        {/* Top Return Button */}
        <div style={{ marginBottom: '28px' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              background: 'rgba(10, 20, 40, 0.75)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease',
            }}
            onPointerOver={(e) => {
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)'
              e.currentTarget.style.borderColor = '#00f0ff'
            }}
            onPointerOut={(e) => {
              e.currentTarget.style.background = 'rgba(10, 20, 40, 0.75)'
              e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)'
            }}
          >
            <span>←</span>
            <span>파이썬 행성군집으로 복귀</span>
          </button>
        </div>

        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.85) 0%, rgba(6, 11, 25, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '32px 36px',
            marginBottom: '36px',
            boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>🌌</span>
            <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.8px' }}>
              LUMI ALGORITHM CONSTELLATION
            </span>
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            생각의 항로 · 알고리즘 성단
          </h1>

          <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.65', margin: 0, maxWidth: '780px' }}>
            관찰하고, 직관적으로 예측하며, 코드로 증명하는 알고리즘 사고력 탐사입니다.
            <br />
            문제를 작은 단위로 분해하고 결정적 Time-Travel 디버거로 나의 사고 과정을 직접 확인해 보세요.
          </p>
        </div>

        {/* Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px' }}>🛰️</span>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
            탐사 가능한 성단 항로 (Missions)
          </h2>
        </div>

        {/* Mission Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {MISSIONS.map(
            ({
              kernel,
              tag,
              badge,
              badgeStyle,
              icon,
              accentColor,
              borderColor,
              glowColor,
              btnGradient,
              chips,
            }) => {
              const isHovered = hoveredCard === kernel.id

              return (
                <div
                  key={kernel.id}
                  onPointerEnter={() => setHoveredCard(kernel.id)}
                  onPointerLeave={() => setHoveredCard(null)}
                  style={{
                    background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 12, 28, 0.98) 100%)',
                    border: `1px solid ${isHovered ? accentColor : borderColor}`,
                    borderRadius: '20px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '20px',
                    boxShadow: isHovered
                      ? `0 20px 40px -4px rgba(0, 0, 0, 0.8), 0 0 30px ${glowColor}`
                      : `0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 15px ${glowColor}`,
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Card Header & Body */}
                  <div>
                    {/* Top Row: Icon & Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px',
                        }}
                      >
                        {icon}
                      </div>

                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          padding: '5px 12px',
                          borderRadius: '16px',
                          letterSpacing: '0.4px',
                          ...badgeStyle,
                        }}
                      >
                        {badge}
                      </span>
                    </div>

                    {/* Mission Tag / Domain */}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: accentColor,
                        fontFamily: 'monospace',
                        marginBottom: '6px',
                      }}
                    >
                      {kernel.id} · {tag}
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: '#ffffff',
                        margin: '0 0 12px',
                        lineHeight: '1.3',
                      }}
                    >
                      {kernel.identity?.studentTitle || kernel.identity?.systemName}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#cbd5e1',
                        lineHeight: '1.65',
                        margin: '0 0 20px',
                      }}
                    >
                      {kernel.identity?.shortDescription}
                    </p>

                    {/* Feature Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          style={{
                            fontSize: '12px',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontWeight: '500',
                          }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Launch Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectMission(kernel)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: btnGradient,
                      color: kernel.id === 'AC-COND-001' ? '#030712' : '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: `0 6px 20px ${glowColor}`,
                      transition: 'all 0.2s ease',
                      marginTop: '6px',
                    }}
                    onPointerOver={(e) => {
                      e.currentTarget.style.filter = 'brightness(1.15)'
                    }}
                    onPointerOut={(e) => {
                      e.currentTarget.style.filter = 'none'
                    }}
                  >
                    <span>🚀 탐사 개시 (Launch Mission)</span>
                    <span style={{ fontSize: '16px' }}>➔</span>
                  </button>
                </div>
              )
            },
          )}
        </div>
      </div>
    </main>
  )
}
