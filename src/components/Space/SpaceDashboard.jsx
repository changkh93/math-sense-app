import React, { useState, useEffect, useMemo } from 'react'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import '../../styles/space-theme.css'

/**
 * StarNavigator - 계층적 탐사 지도를 표시 (Region -> Chapter)
 */
function StarNavigator({ regions, history, onFilterChange, currentLevel, navState }) {
  const [chapters, setChapters] = useState([])
  const [loadingChapters, setLoadingChapters] = useState(false)

  // 선택된 리전의 챕터 정보 가져오기
  useEffect(() => {
    if (navState.regionId) {
      setLoadingChapters(true)
      const fetchChapters = async () => {
        const q = query(collection(db, 'chapters'), where('regionId', '==', navState.regionId))
        const snap = await getDocs(q)
        const data = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }))
        setChapters(data.sort((a, b) => (a.order || 0) - (b.order || 0)))
        setLoadingChapters(false)
      }
      fetchChapters()
    }
  }, [navState.regionId])

  // 거시적 로직: 지역별 탐사 횟수 계산 (Total Missions)
  const regionStats = useMemo(() => {
    if (!regions) return []
    return regions.map(r => {
      const missionCount = history.filter(h => {
        const rId = h.regionId || h.unitId?.split('_')[0]
        return rId === r.id
      }).length
      return { ...r, missionCount }
    })
  }, [regions, history])

  // 미시적 로직: 챕터별 탐사 횟수 계산
  const chapterStats = useMemo(() => {
    if (!chapters.length) return []
    return chapters.map(c => {
      const missionCount = history.filter(h => {
        // 1. 명시적 chapterId 매칭
        // 2. 또는 unitId가 chapterId로 시작하는지 확인 (레거시 지원)
        return h.chapterId === c.docId || h.unitId?.startsWith(c.docId)
      }).length
      return { ...c, missionCount }
    })
  }, [chapters, history])

  if (currentLevel === 'galaxy') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {regionStats.map((region, idx) => (
          <motion.div 
            key={region.id}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange('region', { regionId: region.id, regionTitle: region.title })}
            className="glass-card"
            style={{ 
              padding: '1.5rem', 
              textAlign: 'center', 
              border: `1px solid ${region.color}44`,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🛰️</div>
            <h4 style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>{region.title}</h4>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: region.color }}>
              {region.missionCount} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>MISSIONS</span>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '0.8rem',
      marginBottom: '2rem'
    }}>
      {loadingChapters ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: '1/-1', padding: '2rem' }}>성계 전개 중...</div>
      ) : chapterStats.map((chapter, idx) => (
        <motion.div 
          key={chapter.docId}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onFilterChange('chapter', { chapterId: chapter.docId, chapterTitle: chapter.title })}
          className="glass-card"
          style={{ 
            padding: '1rem', 
            textAlign: 'center', 
            fontSize: '0.9rem',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>✨</div>
          <div style={{ color: 'var(--text-bright)', fontWeight: 600, marginBottom: '0.3rem' }}>{chapter.title}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--star-gold)' }}>
            {chapter.missionCount} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>MISSIONS</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * TrajectoryChart - 필터링된 탐사 궤적
 */
function TrajectoryChart({ history, onItemClick, colorScale }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '2rem'
      }}>
        선택한 구간에 최근 탐사 기록이 없습니다.<br/>새로운 우주 탐사를 시작해 보세요!
      </div>
    )
  }

  const data = [...history].reverse()
  const padding = 50
  const width = Math.max(800, data.length * 60)
  const height = 250
  
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (Math.max(data.length - 1, 1))
    const y = height - padding - (d.score * (height - padding * 2)) / 100
    return { ...d, x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '1rem 0' }} className="custom-scrollbar">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient 
            id="orbit-grad" 
            x1={padding} y1="0" 
            x2={width - padding} y2="0" 
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={colorScale[0]} stopOpacity="0.3" />
            <stop offset="50%" stopColor={colorScale[1]} />
            <stop offset="100%" stopColor={colorScale[2]} />
          </linearGradient>
          <filter id="point-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Guides */}
        {[0, 50, 100].map(val => {
          const y = height - padding - (val * (height - padding * 2)) / 100
          return (
            <g key={val}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            </g>
          )
        })}

        <motion.path 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.5 }}
          d={pathD} fill="none" stroke="url(#orbit-grad)" strokeWidth="2"
        />

        {points.map((p, i) => (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => onItemClick && onItemClick(p)}>
            {p.score === 100 && (
              <circle cx={p.x} cy={p.y} r="10" fill="var(--star-gold)" opacity="0.15" />
            )}
            <circle 
              cx={p.x} cy={p.y} r={p.score === 100 ? "5" : "3.5"} 
              fill={p.score === 100 ? 'var(--star-gold)' : colorScale[1]}
              filter={p.score === 100 ? 'url(#point-glow)' : 'none'}
            />
            <text x={p.x} y={p.y - 15} textAnchor="middle" fill="var(--text-bright)" fontSize="10" fontWeight="800">
              {p.score}
            </text>
            <text x={p.x} y={height - 25} textAnchor="middle" fill="var(--text-muted)" fontSize="9">
              {p.unitTitle?.slice(0, 8)}..
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="7" opacity="0.5">
              {p.regionTitle}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * SpaceDashboard Main
 */
export default function SpaceDashboard({ user, userData, onQuizSelect, regions }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [navState, setNavState] = useState({ 
    level: 'galaxy', 
    regionId: null, 
    regionTitle: null, 
    chapterId: null, 
    chapterTitle: null 
  })

  useEffect(() => {
    if (!user) return
    const historyRef = collection(db, 'users', user.uid, 'history')
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(50))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  const filteredHistory = useMemo(() => {
    if (navState.level === 'galaxy') return history
    
    return history.filter(h => {
      // Region 필터링 (레거시 지원 포함)
      const rId = h.regionId || h.unitId?.split('_')[0]
      const regionMatch = rId === navState.regionId
      
      if (navState.level === 'region') return regionMatch
      
      // Chapter 필터링
      const chapterMatch = h.chapterId === navState.chapterId || h.unitId?.startsWith(navState.chapterId)
      return regionMatch && chapterMatch
    })
  }, [history, navState])

  const colorScale = useMemo(() => {
    if (navState.level === 'galaxy') return ['#df5fff', '#00f3ff', '#50C878']
    const activeRegion = regions?.find(r => r.id === navState.regionId)
    const baseColor = activeRegion?.color || 'var(--crystal-cyan)'
    return [baseColor, baseColor, '#ffffff']
  }, [navState, regions])

  const chartTitle = useMemo(() => {
    if (navState.level === 'galaxy') return 'ALL'
    if (navState.level === 'region') return navState.regionTitle
    return navState.chapterTitle
  }, [navState])

  const stats = [
    { label: '희귀 광석', value: `${userData?.crystals || 0}개`, icon: '💎', color: 'var(--crystal-cyan)' },
    { label: '탐사 정답률', value: `${Math.round(userData?.averageScore || 0)}%`, icon: '🎯', color: 'var(--planet-green)' },
    { label: '우주선 레벨', value: `Lv.${userData?.spaceshipLevel || 1}`, icon: '🛸', color: 'var(--planet-purple)' },
  ]

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>📊 탐사 대시보드</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {stats.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '1rem 1.5rem', minWidth: '120px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 900, fontSize: '1.25rem' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Breadcrumb & Navigation */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <button 
            onClick={() => setNavState({ level: 'galaxy', regionId: null, regionTitle: null, chapterId: null, chapterTitle: null })}
            style={{ 
              background: 'none', border: 'none', color: navState.level === 'galaxy' ? 'var(--crystal-cyan)' : 'var(--text-muted)', 
              cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px'
            }}
          >
            GALAXY
          </button>
          
          {navState.regionId && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> &gt; </span>
              <button 
                onClick={() => setNavState(prev => ({ ...prev, level: 'region', chapterId: null, chapterTitle: null }))}
                style={{ 
                  background: 'none', border: 'none', color: navState.level === 'region' ? 'var(--crystal-cyan)' : 'var(--text-muted)', 
                  cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' 
                }}
              >
                {navState.regionTitle}
              </button>
            </>
          )}

          {navState.chapterId && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> &gt; </span>
              <button 
                style={{ 
                  background: 'none', border: 'none', color: 'var(--crystal-cyan)', 
                  cursor: 'default', fontWeight: 800, fontSize: '0.9rem' 
                }}
              >
                {navState.chapterTitle}
              </button>
            </>
          )}
        </div>

        <StarNavigator 
          regions={regions} 
          history={history} 
          currentLevel={navState.level} 
          navState={navState}
          onFilterChange={(level, data) => setNavState(prev => ({ ...prev, level, ...data }))}
        />
      </section>

      {/* Trajectory */}
      <section className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem' }}>
          📈 {chartTitle} 탐사 궤적 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({filteredHistory.length} Sessions)</span>
        </h3>
        {loading ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>궤적 파동 수신 중...</div>
        ) : (
          <TrajectoryChart history={filteredHistory} onItemClick={onQuizSelect} colorScale={colorScale} />
        )}
      </section>
    </div>
  )
}
