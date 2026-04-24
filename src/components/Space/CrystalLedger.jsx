import React, { useState, useEffect, useMemo } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db, auth } from '../../firebase'
import './CrystalLedger.css'
import { getTodayKST, getYesterdayKST, getKSTComponents } from '../../utils/streakUtils'

// Transaction type configs
const TX_CONFIG = {
  quiz_reward: { icon: '🪐', label: '탐사 보상', color: '#4ade80' },
  data_log_reward: { icon: '📄', label: '데이터 로그 보상', color: '#00f3ff' },
  transmission_reward: { icon: '📡', label: '트랜스미션 보상', color: '#00ff88' },
  store_purchase: { icon: '🛒', label: '스토어 구매', color: '#f87171' },
  answer_accepted: { icon: '💬', label: '답변 채택 보상', color: '#4ade80' },
  question_resolved: { icon: '✅', label: '질문 해결 보상', color: '#4ade80' },
  self_resolve: { icon: '🔍', label: '자가 해결 보상', color: '#4ade80' },
  teacher_verify: { icon: '👨‍🏫', label: '교사 검증 보상', color: '#4ade80' },
  streak_bonus: { icon: '🔥', label: '연속 학습 보너스', color: '#fbbf24' },
  admin_adjust: { icon: '⚙️', label: '관리자 조정', color: '#a78bfa' },
  other: { icon: '💎', label: '기타', color: '#60a5fa' },
}

const FILTER_TABS = [
  { id: 'all', label: '전체', icon: '📋' },
  { id: 'income', label: '획득', icon: '📈' },
  { id: 'expense', label: '소진', icon: '📉' },
]

function formatDateLabel(dateStr) {
  const todayStr = getTodayKST()
  const yesterdayStr = getYesterdayKST()

  if (dateStr === todayStr) return '오늘'
  if (dateStr === yesterdayStr) return '어제'

  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}월 ${parseInt(d)}일`
}

function formatTime(date) {
  const kst = getKSTComponents(date)
  const h = kst.hours
  const m = kst.minutes.toString().padStart(2, '0')
  const period = h < 12 ? '오전' : '오후'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${period} ${hour12}:${m}`
}

export default function CrystalLedger({ userData }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const crystals = userData?.crystals || 0

  // Listen to crystal_transactions
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    setLoading(true)
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const q = query(
      collection(db, 'users', user.uid, 'crystal_transactions'),
      orderBy('timestamp', 'desc'),
      limit(200)
    )

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        }
      })
      setTransactions(txs)
      setLoading(false)
    }, (error) => {
      console.error('Crystal ledger error:', error)
      setLoading(false)
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
  }, [])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions
    if (filter === 'income') return transactions.filter(tx => tx.amount > 0)
    if (filter === 'expense') return transactions.filter(tx => tx.amount < 0)
    return transactions
  }, [transactions, filter])

  // Group by date (KST)
  const groupedTransactions = useMemo(() => {
    const groups = {}
    filteredTransactions.forEach(tx => {
      const dateKey = getTodayKST(tx.timestamp)
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          label: formatDateLabel(dateKey),
          transactions: [],
          dailyIncome: 0,
          dailyExpense: 0,
        }
      }
      groups[dateKey].transactions.push(tx)
      if (tx.amount > 0) groups[dateKey].dailyIncome += tx.amount
      else groups[dateKey].dailyExpense += tx.amount
    })
    return Object.values(groups)
  }, [filteredTransactions])

  // Running balance (going backwards from current crystals)
  const transactionsWithBalance = useMemo(() => {
    let currentBalance = crystals
    const result = []
    for (let i = 0; i < filteredTransactions.length; i++) {
      const tx = filteredTransactions[i]
      result.push({ ...tx, balance: currentBalance })
      currentBalance = currentBalance - (tx.amount || 0)
    }
    return result
  }, [filteredTransactions, crystals])

  // Summary stats for filtered transactions
  const totalEarned = useMemo(() => {
    return filteredTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  }, [filteredTransactions])

  const totalSpent = useMemo(() => {
    return Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  }, [filteredTransactions])

  const pastBalance = useMemo(() => {
    return (crystals || 0) - totalEarned + totalSpent
  }, [crystals, totalEarned, totalSpent])

  return (
    <div className="crystal-ledger-container fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '3rem' }}>
        <h2 className="journey-main-title">
          💎 광석 입출금 기록 <span style={{opacity: 0.6, fontSize: '0.6em'}}>(Crystal Ledger)</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          탐사 활동과 스토어 거래를 통한 광석의 흐름을 한눈에 확인하세요.
        </p>
      </div>

      {/* Logical Mathematical Summary */}
      <div className="glass-panel" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem', 
        padding: '1.5rem', 
        alignItems: 'center',
        marginBottom: '2.5rem',
        background: 'rgba(255, 255, 255, 0.03)'
      }}>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.3rem' }}>이전 잔고 ({filteredTransactions.length}건 전)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#94a3b8' }}>
            {pastBalance.toLocaleString()}
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80', fontWeight: 'bold' }}>+</div>
          <div style={{ fontSize: '0.85rem', color: '#4ade80', marginBottom: '0.3rem' }}>최근 획득</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
            {totalEarned.toLocaleString()}
          </div>
        </div>
        
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', color: '#f87171', fontWeight: 'bold', fontSize: '1.5rem', marginTop: '-2px' }}>-</div>
          <div style={{ fontSize: '0.85rem', color: '#f87171', marginBottom: '0.3rem' }}>최근 소진</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>
            {totalSpent.toLocaleString()}
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative', background: 'rgba(0, 243, 255, 0.1)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
          <div style={{ position: 'absolute', left: '-15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--crystal-cyan)', fontWeight: 'bold', fontSize: '1.2rem' }}>=</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--crystal-cyan)', marginBottom: '0.3rem' }}>현재 잔고</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--crystal-cyan)', textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}>
            {crystals?.toLocaleString() || 0}
          </div>
        </div>

      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {/* Filter Tabs (SpaceJourney view toggle style) */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="font-tech"
              style={{
                padding: '0.8rem 1.5rem',
                background: filter === tab.id 
                  ? 'rgba(0, 243, 255, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${filter === tab.id 
                  ? 'var(--crystal-cyan, #00f3ff)' 
                  : 'var(--glass-border, rgba(255,255,255,0.1))'}`,
                borderRadius: '12px',
                color: filter === tab.id 
                  ? 'var(--crystal-cyan, #00f3ff)' 
                  : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700,
                boxShadow: filter === tab.id 
                  ? 'var(--glow-cyan, 0 0 15px rgba(0, 243, 255, 0.4))' 
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (glass-card like SpaceJourney) */}
      <div className="ledger-view-container">
        <div className="glass-card hud-border ledger-card">
          <div className="ledger-scroll-area">
            {loading ? (
              <div className="ledger-empty-state">
                <Motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ fontSize: '2.5rem' }}
                >
                  💎
                </Motion.div>
                <p>거래 내역 불러오는 중...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="ledger-empty-state">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                  {filter === 'all' ? '아직 거래 내역이 없습니다.' 
                   : filter === 'income' ? '획득 내역이 없습니다.'
                   : '소진 내역이 없습니다.'}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  퀴즈를 풀거나 활동에 참여하면 광석을 획득할 수 있어요!
                </p>
              </div>
            ) : (
              <div className="ledger-tx-list">
                {groupedTransactions.map((group, gi) => (
                  <div key={group.date} className="ledger-date-group">
                    {/* Date Header */}
                    <div className="ledger-date-header">
                      <span className="ledger-date-label">{group.label}</span>
                      <div className="ledger-date-summary">
                        {group.dailyIncome > 0 && (
                          <span className="ledger-day-income">+{group.dailyIncome}</span>
                        )}
                        {group.dailyExpense < 0 && (
                          <span className="ledger-day-expense">{group.dailyExpense}</span>
                        )}
                      </div>
                    </div>

                    {/* Transactions */}
                    {group.transactions.map((tx, ti) => {
                      const config = TX_CONFIG[tx.type] || TX_CONFIG.other
                      const isPositive = (tx.amount || 0) >= 0
                      const balanceEntry = transactionsWithBalance.find(t => t.id === tx.id)

                      return (
                        <Motion.div 
                          key={tx.id}
                          className="ledger-tx-row"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: gi * 0.03 + ti * 0.02 }}
                        >
                          {/* Icon */}
                          <div 
                            className="ledger-tx-icon"
                            style={{ 
                              background: `${config.color}15`,
                              border: `1px solid ${config.color}30`
                            }}
                          >
                            <span>{config.icon}</span>
                          </div>

                          {/* Info */}
                          <div className="ledger-tx-info">
                            <div className="ledger-tx-type">{config.label}</div>
                            {tx.description && (
                              <div className="ledger-tx-desc">{tx.description}</div>
                            )}
                            <div className="ledger-tx-time">{formatTime(tx.timestamp)}</div>
                          </div>

                          {/* Amount & Balance */}
                          <div className="ledger-tx-amount-section">
                            <div className={`ledger-tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                              {isPositive ? '+' : ''}{tx.amount}
                            </div>
                            {balanceEntry && (
                              <div className="ledger-tx-balance">
                                잔고 {balanceEntry.balance.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </Motion.div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Summary Banner (like SpaceJourney's BottomStreakBanner) */}
      <div className="ledger-bottom-banner">
        <div className="ledger-banner-header">
          <div style={{ fontSize: '2.2rem', lineHeight: 1, filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.5))' }}>💎</div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.8rem', 
            fontFamily: 'var(--font-title)',
            letterSpacing: '1px',
            color: 'var(--crystal-cyan, #00f3ff)'
          }}>
            {crystals.toLocaleString()} 광석 보유 중
          </h2>
        </div>
        <p className="ledger-banner-cheer">
          {crystals >= 1000 ? '🚀 굉장한 광석 보유량이에요! 스토어에서 특별한 아이템을 확인해보세요.'
           : crystals >= 500 ? '💪 꾸준한 학습으로 광석을 잘 모으고 있어요!'
           : crystals >= 100 ? '🌟 좋은 시작이에요! 계속 탐사하면 더 많은 광석을 획득할 수 있어요.'
           : '🎯 퀴즈를 풀고 활동에 참여하면 광석을 획득할 수 있어요!'}
        </p>

        {/* Reward Guide Panel */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          borderRadius: '16px',
          textAlign: 'left'
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            margin: '0 0 1rem 0', 
            color: 'var(--crystal-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>💡</span> 광석 획득 가이드
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            fontSize: '0.9rem',
            color: 'var(--text-bright)'
          }}>
            <div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '0.3rem' }}>🚀 탐사 퀴즈</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                <li>정답 시 <span style={{color: 'var(--text-bright)'}}>+1</span> / 3콤보 <span style={{color: 'var(--text-bright)'}}>+5</span> / 최초 100점 <span style={{color: 'var(--text-bright)'}}>+10</span></li>
                <li>오답 시 광석 유실 <span style={{color: '#f87171'}}>(1회차 -2, 2회차 -4, 3회차 -6 ...)</span></li>
                <li>언제든 <span style={{color: 'var(--crystal-cyan)'}}>100점 달성 가능</span> (점수 제한 없음)</li>
                <li>오답 시 <span style={{color: '#f87171'}}>시스템 복구 대기(3~9초)</span> 발생</li>
              </ul>
            </div>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.3rem' }}>💬 스텔라 아고라</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                <li>질문 등록 완료 시 <span style={{color: 'var(--text-bright)'}}>+5</span> 광석</li>
                <li>질문 스스로 해결 시 <span style={{color: 'var(--text-bright)'}}>+3</span> 광석</li>
                <li>내 답변이 채택될 시 <span style={{color: 'var(--text-bright)'}}>+20</span> 광석</li>
                <li>선생님 인증 추가 <span style={{color: 'var(--text-bright)'}}>+10</span> 광석</li>
              </ul>
            </div>
            <div>
              <div style={{ color: '#00f3ff', fontWeight: 'bold', marginBottom: '0.3rem' }}>📄 데이터 로그</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                <li>학습 완료 시 <span style={{color: 'var(--text-bright)'}}>+30</span> 광석</li>
                <li>1분 이상 학습 후 버튼 활성화</li>
                <li>단원당 <span style={{color: 'var(--text-bright)'}}>최초 1회</span>만 지급</li>
              </ul>
            </div>
            <div>
              <div style={{ color: '#00ff88', fontWeight: 'bold', marginBottom: '0.3rem' }}>📡 트랜스미션 (영상)</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                <li>3분 학습마다 <span style={{color: 'var(--text-bright)'}}>+10</span> 광석</li>
                <li>90% 시청 완료 <span style={{color: 'var(--text-bright)'}}>+20</span> 광석</li>
                <li><span style={{color: '#f87171', fontSize: '0.85em'}}>⚠️ 다중 창 및 기기 동시재생 보상 차단 (170초 쿨타임)</span></li>
                <li><span style={{color: '#f87171', fontSize: '0.85em'}}>⚠️ 영상 시청 보상 1일 상한선: 500 광석</span></li>
              </ul>
            </div>
            <div>
              <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '0.3rem' }}>📁 항행 일지 (과제)</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                <li>과제 제출 및 승인 시 <span style={{color: 'var(--text-bright)'}}>+10 ~ 40</span> 광석</li>
                <li>제출 내용의 성실도에 따라 본부에서 차등 지급</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
