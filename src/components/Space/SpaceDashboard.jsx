import React, { useState, useEffect } from 'react'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

/**
 * TrajectoryChart - 최근 탐사 점수를 선형 그래프로 표시
 */
function TrajectoryChart({ history, onItemClick }) {
  if (!history || history.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>아직 탐사 기록이 없습니다.</div>
  }

  // 최신 데이터가 오른쪽으로 오게 정렬
  const data = [...history].reverse()
  const padding = 40
  const width = 800
  const height = 150
  
  // 좌표 계산
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (Math.max(data.length - 1, 1))
    const y = height - padding - (d.score * (height - padding * 2)) / 100
    return { x, y, score: d.score, title: d.unitTitle, unitId: d.unitId }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '1rem 0' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 가로 가이드 라인 (0, 50, 100) */}
        {[0, 50, 100].map(val => {
          const y = height - padding - (val * (height - padding * 2)) / 100
          return (
            <line 
              key={val}
              x1={padding} y1={y} x2={width - padding} y2={y}
              stroke="var(--glass-border)"
              strokeDasharray="4 4"
            />
          )
        })}

        {/* 메인 경로 (그라데이션 & 글로우) */}
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--crystal-cyan)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--planet-green)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path 
          d={pathD}
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* 포인트 (별 모양 또는 점) */}
        {points.map((p, i) => (
          <g 
            key={i} 
            className="chart-point" 
            style={{ cursor: 'pointer' }}
            onClick={() => onItemClick && onItemClick(p)}
          >
            <circle 
              cx={p.x} cy={p.y} r="5" 
              fill={p.score === 100 ? 'var(--star-gold)' : 'var(--crystal-cyan)'}
              filter="url(#glow)"
              style={{ transition: 'r 0.2s' }}
              onMouseEnter={(e) => e.target.setAttribute('r', '8')}
              onMouseLeave={(e) => e.target.setAttribute('r', '5')}
            />
            <text 
              x={p.x} y={p.y - 12} 
              textAnchor="middle" 
              fill="var(--text-bright)" 
              fontSize="10"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              {p.score}
            </text>
            <text 
              x={p.x} y={height - 10} 
              textAnchor="middle" 
              fill="var(--text-muted)" 
              fontSize="9"
              className="chart-label-hover"
              style={{ transition: 'fill 0.2s, font-weight 0.2s' }}
            >
              {p.title?.slice(0, 10)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * SpaceDashboard - 우주 테마 탐사 기록
 */
export default function SpaceDashboard({ user, userData, onQuizSelect }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const historyRef = collection(db, 'users', user.uid, 'history')
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(10))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setHistory(historyData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const stats = [
    { label: '희귀 광석 획득', value: `${userData?.crystals || 0}개`, icon: '💎', color: 'var(--crystal-cyan)' },
    { label: '총 탐사 거리', value: `${(userData?.totalQuizzes || 0) * 100} 광년`, icon: '🚀', color: 'var(--star-gold)' },
    { label: '평균 탐사 정답률', value: `${Math.round(userData?.averageScore || 0)}%`, icon: '🎯', color: 'var(--planet-green)' },
    { label: '우주선 레벨', value: `Lv.${userData?.spaceshipLevel || 1}`, icon: '🛸', color: 'var(--planet-purple)' },
  ]

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>📊 탐사 대시보드</h2>
        <p style={{ color: 'var(--text-muted)' }}>{user?.displayName} 대원님의 우주 탐험 기록입니다.</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>📈 최근 탐사 궤적</h3>
        <div style={{ 
          minHeight: '200px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '15px',
          padding: '1rem'
        }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>탐사 데이터를 불러오는 중...</div>
          ) : (
            <TrajectoryChart history={history} onItemClick={onQuizSelect} />
          )}
        </div>
      </div>
    </div>
  )
}
