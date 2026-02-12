import React, { useState, useEffect, useMemo } from 'react'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Rocket, Zap, Navigation } from 'lucide-react'
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
 * ChronicleScrubber - 시계열 타임라인 내비게이션
 */
function ChronicleScrubber({ history, windowIndex, windowSize, onWarpTo }) {
  const [hoverNode, setHoverNode] = useState(null)
  const containerRef = React.useRef(null)

  const sorted = useMemo(() => [...history].reverse(), [history])
  if (sorted.length === 0) return null

  const firstTime = sorted[0].timestamp?.seconds * 1000 || Date.now()
  const lastTime = sorted[sorted.length - 1].timestamp?.seconds * 1000 || Date.now()
  const duration = Math.max(1, lastTime - firstTime)

  // 월별 레이블 추출 및 밀도 계산 (Activity Density)
  const sectors = useMemo(() => {
    const months = {}
    sorted.forEach((h, i) => {
      const date = new Date(h.timestamp?.seconds * 1000)
      const key = `${date.getFullYear()}.${date.getMonth() + 1}`
      if (!months[key]) months[key] = { startIdx: i, count: 0 }
      months[key].count++
    })
    return Object.entries(months).map(([label, data]) => {
      const h = sorted[data.startIdx]
      const t = h.timestamp?.seconds * 1000
      const left = ((t - firstTime) / duration) * 100
      const density = Math.min(1, data.count / 30) // 최대 30개 기준 밀도
      return { label, left, density }
    })
  }, [sorted, firstTime, duration])

  return (
    <div className="chronicle-container" ref={containerRef}>
      <div className="chronicle-axis">
        <div className="chronicle-milky-way" />
        
        {/* Activity Clusters (Nebula clouds) */}
        {sectors.map((s, i) => (
          <motion.div 
            key={i} 
            className="chronicle-sector-label" 
            style={{ left: `${s.left}%` }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 4, delay: i * 0.5 }}
          >
            <div style={{ 
              position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
              width: 40 + s.density * 60, height: 20, 
              background: 'var(--crystal-glow)', filter: 'blur(20px)', opacity: s.density * 0.5,
              borderRadius: '50%', zIndex: -1
            }} />
            {s.label}
          </motion.div>
        ))}

        {sorted.map((h, i) => {
          const t = h.timestamp?.seconds * 1000
          const left = ((t - firstTime) / duration) * 100
          // 시간 차이가 너무 크면 점 사이를 띄우기 (이미 duration 기반이라 자동 적용됨)
          
          const targetWindow = Math.floor((history.length - 1 - i) / windowSize)
          const isActive = targetWindow === windowIndex
          const isMilestone = h.score === 100

          return (
            <motion.div
              key={h.id}
              className={`chronicle-node ${isActive ? 'active' : ''} ${isMilestone ? 'milestone' : ''}`}
              style={{ left: `${left}%` }}
              onMouseEnter={() => setHoverNode({ ...h, left, date: new Date(t).toLocaleDateString() })}
              onMouseLeave={() => setHoverNode(null)}
              onClick={() => onWarpTo(targetWindow)}
            />
          )
        })}
      </div>

      <AnimatePresence>
        {hoverNode && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="hologram-preview"
            style={{ left: `${hoverNode.left}%`, transform: 'translateX(-50%)' }}
          >
            <div className="hologram-title">{hoverNode.unitTitle}</div>
            <div className="hologram-meta">
              <span>{hoverNode.date}</span>
              <span style={{ fontWeight: 900 }}>{hoverNode.score}pts</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '3px' }}>
        CHRONICLE TIMELINE
      </div>
    </div>
  )
}

function TrajectoryChart({ data, onItemClick, colorScale, windowIndex, isWarping }) {
  const [hoveredNode, setHoveredNode] = useState(null)
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: '250px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '2rem'
      }}>
        탐사 기록이 없습니다.
      </div>
    )
  }

  const padding = 60
  const width = 1000 // 고정 너비 (가로 스크롤 제거)
  const height = 300
  const maxNodes = 20
  
  const points = data.map((d, i) => {
    const space = (width - padding * 2) / (maxNodes - 1);
    // 데이터가 20개보다 적을 경우 오른쪽 정렬 (최신이 오른쪽)
    const offset = maxNodes - data.length;
    const x = padding + (i + offset) * space;
    const y = height - padding - 30 - (d.score * (height - padding * 2 - 40)) / 100
    return { ...d, x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div style={{ position: 'relative', width: '100%', height: height + 20, overflow: 'hidden' }} className={isWarping ? 'glitch-warp' : ''}>
      <AnimatePresence mode="wait">
        <motion.div
          key={windowIndex}
          initial={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ width: '100%', height: '100%' }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="orbit-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colorScale[0]} stopOpacity="0" />
                <stop offset="20%" stopColor={colorScale[0]} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colorScale[1]} />
              </linearGradient>
              <filter id="point-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="nebula-filter">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Guides */}
            {[0, 50, 100].map(val => {
              const y = height - padding - 30 - (val * (height - padding * 2 - 40)) / 100
              return (
                <g key={val}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <text x={padding - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{val}</text>
                </g>
              )
            })}

            <motion.path 
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1 }}
              d={pathD} fill="none" stroke="url(#orbit-grad)" strokeWidth="3"
              strokeLinecap="round"
            />

            {points.map((p, i) => {
              const isLatest = i === points.length - 1 && windowIndex === 0;
              const isOld = i < 3 && windowIndex > 0;
              
              return (
                <g 
                  key={i} 
                  style={{ cursor: 'pointer', filter: isOld ? 'url(#nebula-filter)' : 'none', opacity: isOld ? 0.4 : 1 }} 
                  onClick={() => onItemClick && onItemClick(p)}
                  onMouseEnter={() => setHoveredNode(p)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {p.score === 100 && (
                    <circle cx={p.x} cy={p.y} r="12" fill="var(--star-gold)" opacity="0.1" />
                  )}
                  
                  <motion.circle 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    cx={p.x} cy={p.y} r={p.score === 100 ? "6" : "4.5"} 
                    fill={p.score === 100 ? 'var(--star-gold)' : colorScale[1]}
                    filter={p.score === 100 ? 'url(#point-glow)' : 'none'}
                  />

                  {isLatest && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Rocket 
                        x={p.x - 10} y={p.y - 35} 
                        size={20} 
                        color="var(--crystal-cyan)" 
                        style={{ filter: 'drop-shadow(0 0 8px var(--crystal-cyan))', transform: 'rotate(45deg)' }} 
                      />
                    </motion.g>
                  )}

                  {/* 세션 넘버 표시 (텍스트 대신) */}
                  <text x={p.x} y={height - 15} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="700">
                    {`EXP-${String(i + 1).padStart(2, '0')}`}
                  </text>
                  
                  {/* 행성 아이콘 (랜드마크) */}
                  <circle cx={p.x} cy={height - 35} r="3" fill={colorScale[1]} opacity={0.4} />
                </g>
              )
            })}
          </svg>
        </motion.div>
      </AnimatePresence>

      {/* Hologram Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="hologram-preview"
            style={{ 
              left: `${(hoveredNode.x / width) * 100}%`, 
              top: hoveredNode.y - 70,
              transform: 'translateX(-50%)' 
            }}
          >
            <div className="hologram-title">{hoveredNode.unitTitle}</div>
            <div className="hologram-meta">
              <span>{new Date(hoveredNode.timestamp?.seconds * 1000).toLocaleDateString()}</span>
              <span style={{ color: 'var(--star-gold)', fontWeight: 800 }}>{hoveredNode.score} PTS</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '8px', opacity: 0.5, letterSpacing: '2px', textTransform: 'uppercase' }}>
              SECTOR: {hoveredNode.regionTitle || 'UNKNOWN'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warp overlay */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="warp-drive-overlay"
          >
            <div className="warp-star-field" />
            <div className="warp-tunnel-lines" />
            <div className="scanline-warp" />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              style={{ color: 'var(--neon-blue)', fontSize: '2rem', fontWeight: 900, zIndex: 102, textShadow: '0 0 20px var(--neon-blue)' }}
            >
              WARP DRIVE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    // 늘어난 데이터 규모를 고려하여 200개까지 가져오기
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(200))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  // 윈도우 인덱스 (뒤에서부터 0, 1, 2... 순서)
  const [windowIndex, setWindowIndex] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const WINDOW_SIZE = 20;

  const handleWarp = (targetIdx) => {
    if (targetIdx === windowIndex) return;
    setIsWarping(true);
    setWindowIndex(targetIdx);
    setTimeout(() => setIsWarping(false), 800);
  };

  const filteredHistory = useMemo(() => {
    if (navState.level === 'galaxy') return history
    
    return history.filter(h => {
      const rId = h.regionId || h.unitId?.split('_')[0]
      const regionMatch = rId === navState.regionId
      
      if (navState.level === 'region') return regionMatch
      
      const chapterMatch = h.chapterId === navState.chapterId || h.unitId?.startsWith(navState.chapterId)
      return regionMatch && chapterMatch
    })
  }, [history, navState])

  const totalPages = Math.ceil(filteredHistory.length / WINDOW_SIZE);
  
  // 윈도우 데이터 추출 (최신순에서 과거순으로 슬라이싱)
  const windowedData = useMemo(() => {
    const raw = [...filteredHistory].reverse(); // 과거 -> 최신 순으로 정렬
    const total = raw.length;
    const start = Math.max(0, total - (windowIndex + 1) * WINDOW_SIZE);
    const end = total - windowIndex * WINDOW_SIZE;
    return raw.slice(start, end);
  }, [filteredHistory, windowIndex])

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
      <section className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-bright)' }}>
            📈 {chartTitle} 탐사 궤적 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({filteredHistory.length} Sessions)</span>
          </h3>
          
          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => handleWarp(Math.min(totalPages - 1, windowIndex + 1))}
                disabled={windowIndex >= totalPages - 1}
                className="glass-btn"
                style={{ padding: '0.5rem', opacity: windowIndex >= totalPages - 1 ? 0.3 : 1 }}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => handleWarp(Math.max(0, windowIndex - 1))}
                disabled={windowIndex <= 0}
                className="glass-btn"
                style={{ padding: '0.5rem', opacity: windowIndex <= 0 ? 0.3 : 1 }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>궤적 파동 수신 중...</div>
        ) : (
          <>
            <TrajectoryChart 
              data={windowedData} 
              onItemClick={onQuizSelect} 
              colorScale={colorScale} 
              windowIndex={windowIndex}
              isWarping={isWarping}
            />
            
            <ChronicleScrubber 
              history={filteredHistory}
              windowIndex={windowIndex}
              windowSize={WINDOW_SIZE}
              onWarpTo={handleWarp}
            />
          </>
        )}
      </section>
    </div>
  )
}
