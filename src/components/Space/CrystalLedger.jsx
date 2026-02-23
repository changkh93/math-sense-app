import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db, auth } from '../../firebase'
import './CrystalLedger.css'

// Transaction type configs
const TX_CONFIG = {
  quiz_reward: { icon: '🪐', label: '탐사 보상', color: '#4ade80' },
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
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 3600000)
  const todayStr = kstNow.toISOString().split('T')[0]

  const yesterday = new Date(kstNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) return '오늘'
  if (dateStr === yesterdayStr) return '어제'

  const [y, m, d] = dateStr.split('-')
  return `${parseInt(m)}월 ${parseInt(d)}일`
}

function formatTime(date) {
  const d = new Date(date)
  const kst = new Date(d.getTime() + 9 * 3600000)
  const h = kst.getUTCHours()
  const m = kst.getUTCMinutes().toString().padStart(2, '0')
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
    const q = query(
      collection(db, 'users', user.uid, 'crystal_transactions'),
      orderBy('timestamp', 'desc'),
      limit(200)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return () => unsubscribe()
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
      const kst = new Date(tx.timestamp.getTime() + 9 * 3600000)
      const dateKey = kst.toISOString().split('T')[0]
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
    let balance = crystals
    return filteredTransactions.map(tx => {
      const b = balance
      balance -= (tx.amount || 0)
      return { ...tx, balance: b }
    })
  }, [filteredTransactions, crystals])

  // Summary stats
  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const totalExpense = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
    return { totalIncome, totalExpense, txCount: transactions.length }
  }, [transactions])

  return (
    <div className="crystal-ledger-container">
      {/* Page Title (SpaceJourney style) */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '3rem' }}>
        <h2 className="journey-main-title">
          💎 광석 입출금 기록 (Crystal Ledger)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          탐사 활동과 스토어 거래를 통한 광석의 흐름을 한눈에 확인하세요.
        </p>
      </div>

      {/* Summary Stats (stat-chip style like SpaceJourney) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="stat-chip">
            <span>현재 잔고</span>
            <span style={{ color: 'var(--crystal-cyan, #00f3ff)' }}>{crystals.toLocaleString()}</span>
          </div>
          <div className="stat-chip">
            <span>총 획득</span>
            <span style={{ color: '#4ade80' }}>+{stats.totalIncome.toLocaleString()}</span>
          </div>
          <div className="stat-chip">
            <span>총 소진</span>
            <span style={{ color: '#f87171' }}>-{stats.totalExpense.toLocaleString()}</span>
          </div>
          <div className="stat-chip">
            <span>거래 횟수</span>
            <span>{stats.txCount}건</span>
          </div>
        </div>

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
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ fontSize: '2.5rem' }}
                >
                  💎
                </motion.div>
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
                        <motion.div 
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
                        </motion.div>
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
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                <li>정답당 <span style={{color: 'var(--text-bright)'}}>+1</span> 광석</li>
                <li>3연속 정답 콤보 시 <span style={{color: 'var(--text-bright)'}}>+5</span> 광석</li>
                <li>최초 100점 달성 <span style={{color: 'var(--text-bright)'}}>+10</span> 광석</li>
                <li>오답 시 <span style={{color: '#f87171'}}>-2</span> 광석 (쉴드 방어 가능)</li>
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
          </div>
        </div>
      </div>
    </div>
  )
}
