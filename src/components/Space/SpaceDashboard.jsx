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
function ChronicleScrubber({ history, windowIndex, windowSize, onWarpTo, onHoverItem }) {
  const containerRef = React.useRef(null)
  const sorted = useMemo(() => [...history].reverse(), [history])
  const firstTime = sorted.length > 0 ? (sorted[0].timestamp?.seconds * 1000 || Date.now()) : Date.now()
  const lastTime = sorted.length > 0 ? (sorted[sorted.length - 1].timestamp?.seconds * 1000 || Date.now()) : Date.now()
  const duration = Math.max(1, lastTime - firstTime)

  const sectors = useMemo(() => {
    if (sorted.length === 0) return []
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
      const density = Math.min(1, data.count / 30)
      return { label, left, density }
    })
  }, [sorted, firstTime, duration])

  if (sorted.length === 0) return null

  return (
    <div className="chronicle-container" ref={containerRef}>
      <div className="chronicle-axis">
        <div className="chronicle-milky-way" />
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
          const targetWindow = Math.floor((history.length - 1 - i) / windowSize)
          const isActive = targetWindow === windowIndex
          const isMilestone = h.score === 100

          return (
            <motion.div
              key={h.id}
              className={`chronicle-node ${isActive ? 'active' : ''} ${isMilestone ? 'milestone' : ''}`}
              style={{ left: `${left}%` }}
              onMouseEnter={() => onHoverItem(h)}
              onMouseLeave={() => onHoverItem(null)}
              onClick={() => onWarpTo(targetWindow)}
            />
          )
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '3px' }}>
        CHRONICLE TIMELINE
      </div>
    </div>
  )
}

function TrajectoryChart({ data, ghostData, onItemClick, colorScale, windowIndex, isWarping, onHoverItem }) {
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
    const offset = maxNodes - data.length;
    const x = padding + (i + offset) * space;
    const y = height - padding - 30 - (d.score * (height - padding * 2 - 40)) / 100
    return { ...d, x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const ghostPoints = (ghostData || []).map((d, i) => {
    const space = (width - padding * 2) / (maxNodes - 1);
    const offset = maxNodes - ghostData.length;
    const x = padding + (i + offset) * space;
    const y = height - padding - 30 - (d.score * (height - padding * 2 - 40)) / 100
    return { ...d, x, y }
  })

  const ghostPathD = ghostPoints.length > 0 
    ? ghostPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const currentAvg = data.length > 0 ? (data.reduce((acc, d) => acc + (d.score || 0), 0) / data.length) : 0;
  const ghostAvg = ghostData?.length > 0 ? (ghostData.reduce((acc, d) => acc + (d.score || 0), 0) / ghostData.length) : 0;
  const perfDiff = currentAvg - ghostAvg;
  
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

            {/* Ghost Trajectory Line */}
            {ghostPathD && (
              <motion.path 
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.2 }}
                transition={{ duration: 1.5 }}
                d={ghostPathD} fill="none" stroke="var(--text-muted)" strokeWidth="2"
                strokeLinecap="round" strokeDasharray="5 5"
              />
            )}

            {/* Main Trajectory Line */}
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
                  onMouseEnter={() => onHoverItem(p)}
                  onMouseLeave={() => onHoverItem(null)}
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
                  <text x={p.x} y={height - 32} style={{ fontSize: '12px', opacity: 0.6, cursor: 'default', userSelect: 'none' }}>
                    {['🪐', '🌑', '🌍', '☄️'][i % 4]}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Ghost Comparison Message */}
          {ghostData?.length > 0 && windowIndex === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${perfDiff >= 0 ? 'var(--planet-green)' : '#ff4d4d'}44`,
                padding: '0.6rem 1.2rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                color: 'var(--text-bright)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: `0 0 15px ${perfDiff >= 0 ? 'var(--planet-green)' : '#ff4d4d'}22`
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: perfDiff >= 0 ? 'var(--planet-green)' : '#ff4d4d' }} />
              <span>
                고스트 궤적(과거의 나)보다 엔진 출력이 
                <strong style={{ color: perfDiff >= 0 ? 'var(--planet-green)' : '#ff4d4d', marginLeft: '4px' }}>
                  {Math.abs(perfDiff).toFixed(1)}% {perfDiff >= 0 ? '높습니다! 🚀' : '낮습니다. 분발하세요! 🔥'}
                </strong>
              </span>
            </motion.div>
          )}

        </motion.div>
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
 * DiscoveryHUD - 고정형 정보 패널 (Hybrid Panel)
 */
function DiscoveryHUD({ activeItem, latestItem }) {
  const display = activeItem || latestItem;

  return (
    <div className="discovery-hud">
      <AnimatePresence mode="wait">
        <motion.div
          key={display?.id || 'empty'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          style={{ width: '100%' }}
        >
          {display ? (
            <>
              <div className="hud-label">DISCOVERY LOG</div>
              <div className="hud-title">{display.unitTitle}</div>
              <div className="hud-metrics">
                <div className="hud-metric">
                  <span className="hud-metric-label">DATE</span>
                  <span className="hud-metric-value">
                    {new Date(display.timestamp?.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="hud-metric">
                  <span className="hud-metric-label">SCORE</span>
                  <span className="hud-metric-value" style={{ color: 'var(--star-gold)' }}>
                    {display.score} PTS
                  </span>
                </div>
              </div>
              <div className="hud-footer">
                SECTOR: {display.regionTitle || 'UNKNOWN'}
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              탐사 노드를 선택하세요
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * SpaceDashboard Main
 */
export default function SpaceDashboard({ user, userData, onQuizSelect, regions, startMemoryCoreMode, loadingMemoryCore }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredDiscovery, setHoveredDiscovery] = useState(null)
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
    const end = Math.max(0, Math.min(total, total - windowIndex * WINDOW_SIZE));
    return raw.slice(start, end);
  }, [filteredHistory, windowIndex])

  // 고스트 데이터 추출 (과거 윈도우)
  const ghostData = useMemo(() => {
    const raw = [...filteredHistory].reverse();
    const total = raw.length;
    const pastWindowIndex = windowIndex + 1;
    const start = Math.max(0, total - (pastWindowIndex + 1) * WINDOW_SIZE);
    const end = Math.max(0, Math.min(total, total - pastWindowIndex * WINDOW_SIZE));
    if (end <= 0) return [];
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

  // Calculate spaceship level dynamically from crystals
  const crystals = userData?.crystals || 0;
  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000];
  let spaceLevel = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (crystals >= LEVEL_THRESHOLDS[i]) spaceLevel = i + 1;
    else break;
  }

  const stats = [
    { label: '희귀 광석', value: `${crystals}개`, icon: '💎', color: 'var(--crystal-cyan)' },
    { label: '탐사 정답률', value: `${Math.round(userData?.averageScore || 0)}%`, icon: '🎯', color: 'var(--planet-green)' },
    { label: '우주선 레벨', value: `Lv.${spaceLevel}`, icon: '🛸', color: 'var(--planet-purple)' },
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
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-card hud-border" 
            style={{ 
              padding: '1rem 1.5rem', 
              minWidth: '200px', 
              cursor: 'pointer',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem'
            }}
            onClick={startMemoryCoreMode}
          >
            <div style={{ fontSize: '1.5rem' }}>☄️</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--planet-purple)', fontWeight: 900 }}>STELLAR MEMORY CORE</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                {loadingMemoryCore ? '복구 모듈 기동 중...' : `별빛 메모리 코어 (${userData?.memoryCoreCharges || 0}회)`}
              </div>
            </div>
          </motion.div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--text-bright)', marginBottom: '0.4rem' }}>
              📈 {chartTitle} 탐사 궤적
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({filteredHistory.length} Sessions)
            </div>
          </div>
          
          <DiscoveryHUD 
            activeItem={hoveredDiscovery} 
            latestItem={filteredHistory[0]} 
          />
        </div>

        {loading ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>궤적 파동 수신 중...</div>
        ) : (
          <div className="exploration-stage">
            <TrajectoryChart 
              key={`${navState.level}-${navState.regionId || 'all'}-${windowIndex}`}
              data={windowedData} 
              ghostData={ghostData}
              onItemClick={onQuizSelect} 
              colorScale={colorScale} 
              windowIndex={windowIndex}
              isWarping={isWarping}
              onHoverItem={setHoveredDiscovery}
            />

            {/* Edge Navigation Buttons */}
            {totalPages > 1 && (
              <>
                <button 
                  className="edge-nav-btn left"
                  onClick={() => handleWarp(Math.min(totalPages - 1, windowIndex + 1))}
                  disabled={windowIndex >= totalPages - 1}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <ChevronLeft size={32} />
                    <span style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '1px' }}>PAST</span>
                  </div>
                </button>
                <button 
                  className="edge-nav-btn right"
                  onClick={() => handleWarp(Math.max(0, windowIndex - 1))}
                  disabled={windowIndex <= 0}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <ChevronRight size={32} />
                    <span style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '1px' }}>NEWER</span>
                  </div>
                </button>
              </>
            )}
            <ChronicleScrubber 
              history={filteredHistory}
              windowIndex={windowIndex}
              windowSize={WINDOW_SIZE}
              onWarpTo={handleWarp}
              onHoverItem={setHoveredDiscovery}
            />
          </div>
        )}
      </section>
    </div>
  )
}
