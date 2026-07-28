import React, { useState, useEffect, useMemo } from 'react'
import { motion as Motion } from 'framer-motion'
import { collection, doc, getDoc, getDocs, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Gift, Search, Send, UserRound, X } from 'lucide-react'
import { db, auth, functions } from '../../firebase'
import './CrystalLedger.css'
import { getTodayKST, getYesterdayKST, getKSTComponents } from '../../utils/streakUtils'

const CRYSTAL_GIFT_DAILY_LIMIT = 100
const OPERATOR_GIFT_EMAIL = 'paul@dulcine.net'

// Transaction type configs
const TX_CONFIG = {
  quiz_reward: { icon: '🪐', label: '탐사 보상', color: '#4ade80' },
  quiz_battle_reward: { icon: '⚔️', label: '퀴즈 배틀 보상', color: '#fbbf24' },
  data_log_reward: { icon: '📄', label: '데이터 로그 보상', color: '#00f3ff' },
  code_trace_reward: { icon: '⌨️', label: '코드 따라쓰기 보상', color: '#22d3ee' },
  code_trace_exercise_reward: { icon: '⌨️', label: 'CODE TRACE 통과 보상', color: '#a78bfa' },
  transmission_reward: { icon: '📡', label: '트랜스미션 보상', color: '#00ff88' },
  store_purchase: { icon: '🛒', label: '스토어 구매', color: '#f87171' },
  store_gift_purchase: { icon: '🎁', label: '상점 선물 구매', color: '#f87171' },
  store_item_gift_sent: { icon: '🎁', label: '상점 아이템 선물', color: '#60a5fa' },
  store_item_gift_received: { icon: '🎁', label: '상점 아이템 수령', color: '#4ade80' },
  answer_accepted: { icon: '💬', label: '답변 채택 보상', color: '#4ade80' },
  agora_answer_payment: { icon: '💬', label: '채택 보상 지급', color: '#f87171' },
  agora_bounty_award: { icon: '💎', label: '현상금 질문 보상', color: '#4ade80' },
  agora_bounty_lock: { icon: '🎯', label: '현상금 예치', color: '#f87171' },
  question_resolved: { icon: '✅', label: '질문 해결 보상', color: '#4ade80' },
  self_resolve: { icon: '🔍', label: '자가 해결 처리', color: '#60a5fa' },
  teacher_verify: { icon: '👨‍🏫', label: '교사 검증 보상', color: '#4ade80' },
  study_crew_mission: { icon: '🛰️', label: '스터디 크루 미션', color: '#38bdf8' },
  study_crew_team_mission: { icon: '🤝', label: '스터디 크루 팀 미션', color: '#4ade80' },
  crew_crystal_chest_reward: { icon: '🎁', label: '크루 공동 광석 상자', color: '#facc15' },
  attendance_reward: { icon: '🚀', label: '출석 도킹 보상', color: '#38bdf8' },
  streak_bonus: { icon: '🔥', label: '연속 학습 보너스', color: '#fbbf24' },
  assignment_missing_penalty: { icon: '📝', label: '과제 미제출 차감', color: '#fb7185' },
  crystal_gift_sent: { icon: '🎁', label: '친구 광석 선물', color: '#f87171' },
  crystal_gift_received: { icon: '🎁', label: '친구 광석 수령', color: '#4ade80' },
  admin_adjust: { icon: '⚙️', label: '관리자 조정', color: '#a78bfa' },
  other: { icon: '💎', label: '기타', color: '#60a5fa' },
}

const FILTER_TABS = [
  { id: 'all', label: '전체', icon: '📋' },
  { id: 'income', label: '획득', icon: '📈' },
  { id: 'expense', label: '소진', icon: '📉' },
]

const AGORA_REWARD_TX_TYPES = new Set(['answer_accepted', 'agora_bounty_award'])

function getQuestionPreview(content = '') {
  const preview = String(content || '').replace(/\s+/g, ' ').trim()
  return preview.length > 90 ? `${preview.slice(0, 90)}...` : preview
}

function getAgoraRewardContext(tx, questionMetaById = {}) {
  if (!AGORA_REWARD_TX_TYPES.has(tx.type)) return null
  const metadata = tx.metadata || {}
  const hydratedMeta = metadata.questionId ? questionMetaById[metadata.questionId] : null
  const questionPreview = metadata.questionPreview || metadata.questionTitle || hydratedMeta?.questionPreview || ''
  const askerName = metadata.askerName || metadata.questionAskerName || hydratedMeta?.askerName || ''

  if (!questionPreview && !askerName) return null

  return {
    questionPreview,
    askerName,
  }
}

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

function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback
}

function getProfileHint(profile = {}) {
  return profile.publicTitle || profile.crewName || profile.email || ''
}

function getTransferErrorMessage(err) {
  if (err?.code === 'functions/internal') return '광석 송금 서버가 아직 준비되지 않았습니다. Cloud Functions 배포가 필요합니다.'
  if (err?.message) return err.message
  return '광석 송금에 실패했습니다. 다시 시도해주세요.'
}

export default function CrystalLedger({ userData }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [txLimit, setTxLimit] = useState(30)
  const [hasMore, setHasMore] = useState(true)
  const [recipients, setRecipients] = useState([])
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferMessage, setTransferMessage] = useState(null)
  const [questionMetaById, setQuestionMetaById] = useState({})

  const crystals = userData?.crystals || 0
  const isOperatorGiftExempt = String(userData?.email || auth.currentUser?.email || '').toLowerCase() === OPERATOR_GIFT_EMAIL

  // Listen to crystal_transactions
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const q = query(
      collection(db, 'users', user.uid, 'crystal_transactions'),
      orderBy('timestamp', 'desc'),
      limit(txLimit)
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
      setHasMore(snapshot.docs.length === txLimit)
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
  }, [txLimit])

  useEffect(() => {
    const missingQuestionIds = Array.from(new Set(
      transactions
        .filter(tx => AGORA_REWARD_TX_TYPES.has(tx.type))
        .map(tx => tx.metadata?.questionId)
        .filter(questionId => questionId && !questionMetaById[questionId])
    ))

    if (missingQuestionIds.length === 0) return undefined

    let isCancelled = false

    Promise.all(missingQuestionIds.map(async (questionId) => {
      try {
        const questionSnap = await getDoc(doc(db, 'questions', questionId))
        if (!questionSnap.exists()) return null
        const question = questionSnap.data() || {}
        return {
          questionId,
          questionPreview: getQuestionPreview(question.content),
          askerName: question.userName || question.askerName || '질문자',
        }
      } catch (error) {
        console.error('Failed to hydrate Agora ledger question metadata:', error)
        return null
      }
    })).then((items) => {
      if (isCancelled) return
      const nextMeta = items
        .filter(Boolean)
        .reduce((acc, item) => {
          acc[item.questionId] = item
          return acc
        }, {})
      if (Object.keys(nextMeta).length > 0) {
        setQuestionMetaById(prev => ({ ...prev, ...nextMeta }))
      }
    })

    return () => {
      isCancelled = true
    }
  }, [transactions, questionMetaById])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setRecipients([])
      return undefined
    }

    const keyword = recipientSearch.trim()
    if (!keyword) {
      setRecipients([])
      return undefined
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const term = keyword
        const termLower = keyword.toLowerCase()
        const usersRef = collection(db, 'users')

        const [snap1, snap2, snap3, snap4] = await Promise.all([
          getDocs(query(usersRef, where('publicDisplayName', '>=', term), where('publicDisplayName', '<=', term + '\uf8ff'), limit(10))),
          getDocs(query(usersRef, where('studentName', '>=', term), where('studentName', '<=', term + '\uf8ff'), limit(10))),
          getDocs(query(usersRef, where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(10))),
          getDocs(query(usersRef, where('email', '>=', termLower), where('email', '<=', termLower + '\uf8ff'), limit(10))),
        ])

        if (cancelled) return

        const resultMap = new Map()
        ;[snap1, snap2, snap3, snap4].forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            if (docSnap.id !== user.uid) {
              const data = docSnap.data()
              if (data.role !== 'parent' && data.role !== 'admin') {
                resultMap.set(docSnap.id, { uid: docSnap.id, ...data })
              }
            }
          })
        })

        const list = Array.from(resultMap.values()).sort((a, b) => getProfileName(a).localeCompare(getProfileName(b), 'ko'))
        setRecipients(list)
        setSelectedRecipientId(prev => (prev && list.some(item => item.uid === prev) ? prev : ''))
      } catch (error) {
        console.error('Crystal transfer recipients error:', error)
        if (!cancelled) setRecipients([])
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [recipientSearch])

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

  const selectedRecipient = useMemo(
    () => recipients.find(recipient => recipient.uid === selectedRecipientId) || null,
    [recipients, selectedRecipientId]
  )

  const filteredRecipients = useMemo(() => {
    const keyword = recipientSearch.trim().toLowerCase()
    if (!keyword || selectedRecipient) return []

    return recipients.filter(recipient => {
      const haystack = [
        recipient.publicDisplayName || '',
        recipient.studentName || '',
        recipient.name || '',
        recipient.displayName || '',
        recipient.crewName || '',
        recipient.publicTitle || '',
        recipient.email || '',
      ].join(' ').toLowerCase()
      return haystack.includes(keyword)
    }).slice(0, 8)
  }, [recipientSearch, recipients, selectedRecipient])

  const handleSelectRecipient = (recipient) => {
    setSelectedRecipientId(recipient.uid)
    setRecipientSearch('')
    setTransferMessage(null)
  }

  const handleClearRecipient = () => {
    setSelectedRecipientId('')
    setRecipientSearch('')
  }

  const handleTransferAmountChange = (event) => {
    const value = event.target.value.replace(/[^\d]/g, '')
    setTransferAmount(value)
    setTransferMessage(null)
  }

  const handleCrystalTransfer = async (event) => {
    event.preventDefault()
    if (transferBusy) return

    const amount = Number(transferAmount)
    if (!selectedRecipient) {
      setTransferMessage({ type: 'error', text: '광석을 받을 친구를 선택해주세요.' })
      return
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setTransferMessage({ type: 'error', text: '보낼 광석 수를 1 이상 정수로 입력해주세요.' })
      return
    }
    if (!isOperatorGiftExempt && amount > CRYSTAL_GIFT_DAILY_LIMIT) {
      setTransferMessage({ type: 'error', text: `하루에 보낼 수 있는 광석은 최대 ${CRYSTAL_GIFT_DAILY_LIMIT}개입니다.` })
      return
    }
    if (amount > crystals) {
      setTransferMessage({ type: 'error', text: '보유 광석이 부족합니다.' })
      return
    }

    setTransferBusy(true)
    setTransferMessage(null)

    try {
      const transferCrystals = httpsCallable(functions, 'transferCrystals')
      const result = await transferCrystals({
        recipientId: selectedRecipient.uid,
        amount,
        message: transferNote.trim(),
      })
      const data = result?.data || {}
      setTransferAmount('')
      setTransferNote('')
      setSelectedRecipientId('')
      setRecipientSearch('')
      setTransferMessage({
        type: 'success',
        text: data.operatorGiftExempt
          ? `${data.recipientName || getProfileName(selectedRecipient)}님에게 ${amount}광석을 보냈습니다. 운영자 계정은 제한 없이 전송됩니다.`
          : `${data.recipientName || getProfileName(selectedRecipient)}님에게 ${amount}광석을 보냈습니다. 오늘 남은 송금 한도는 ${data.remainingToday ?? 0}광석입니다.`
      })
    } catch (err) {
      console.error('Crystal transfer failed:', err)
      setTransferMessage({ type: 'error', text: getTransferErrorMessage(err) })
    } finally {
      setTransferBusy(false)
    }
  }

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

      <form className="crystal-transfer-panel" onSubmit={handleCrystalTransfer}>
        <div className="crystal-transfer-copy">
          <span className="crystal-transfer-icon"><Gift size={19} /></span>
          <div>
            <h3>친구에게 광석 선물</h3>
            <p>{isOperatorGiftExempt ? '운영자 계정은 제한 없이 광석을 보낼 수 있습니다. 송금 기록은 양쪽 Ledger에 남습니다.' : `하루 최대 ${CRYSTAL_GIFT_DAILY_LIMIT}광석까지 보낼 수 있습니다. 송금 기록은 양쪽 Ledger에 남습니다.`}</p>
          </div>
        </div>

        <div className="crystal-transfer-controls">
          <div className="crystal-recipient-field">
            {selectedRecipient ? (
              <div className="crystal-selected-recipient">
                <span className="crystal-recipient-avatar"><UserRound size={16} /></span>
                <span className="crystal-recipient-copy">
                  <strong>{getProfileName(selectedRecipient)}</strong>
                  {getProfileHint(selectedRecipient) && <small>{getProfileHint(selectedRecipient)}</small>}
                </span>
                <button 
                  type="button" 
                  onClick={handleClearRecipient} 
                  aria-label="받는 친구 변경" 
                  disabled={transferBusy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8', // subtle gray/blue
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    flexShrink: 0,
                  }}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="crystal-recipient-search">
                <Search size={16} />
                <input
                  type="search"
                  value={recipientSearch}
                  onChange={(event) => {
                    setRecipientSearch(event.target.value)
                    setTransferMessage(null)
                  }}
                  placeholder="친구 이름 또는 이메일 검색"
                  disabled={transferBusy}
                />
                {filteredRecipients.length > 0 && (
                  <div className="crystal-recipient-results">
                    {filteredRecipients.map(recipient => (
                      <button
                        key={recipient.uid}
                        type="button"
                        onClick={() => handleSelectRecipient(recipient)}
                      >
                        <span className="crystal-recipient-avatar"><UserRound size={15} /></span>
                        <span className="crystal-recipient-copy">
                          <strong>{getProfileName(recipient)}</strong>
                          {getProfileHint(recipient) && <small>{getProfileHint(recipient)}</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="crystal-amount-field">
            <input
              type="text"
              inputMode="numeric"
              value={transferAmount}
              onChange={handleTransferAmountChange}
              placeholder="광석"
              disabled={transferBusy}
            />
            <span>개</span>
          </div>

          <div className="crystal-quick-amounts">
            {[10, 30, 50, 100].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setTransferAmount(String(amount))
                  setTransferMessage(null)
                }}
                disabled={transferBusy || amount > crystals}
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="crystal-note-field">
            <input
              type="text"
              value={transferNote}
              onChange={(e) => {
                setTransferNote(e.target.value)
                setTransferMessage(null)
              }}
              maxLength={60}
              placeholder="메시지 (선택, 최대 60자)"
              disabled={transferBusy}
            />
          </div>

          <button
            type="submit"
            className="crystal-transfer-submit"
            disabled={transferBusy || !selectedRecipient || !transferAmount}
          >
            <Send size={16} />
            {transferBusy ? '전송 중' : '선물'}
          </button>
        </div>

        {transferMessage && (
          <div className={`crystal-transfer-message ${transferMessage.type}`}>
            {transferMessage.text}
          </div>
        )}
      </form>

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
                      const agoraContext = getAgoraRewardContext(tx, questionMetaById)

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
                            {(tx.metadata?.message || tx.message) && (
                              <div className="ledger-tx-note">
                                💬 "{tx.metadata?.message || tx.message}"
                              </div>
                            )}
                            {agoraContext && (
                              <div className="ledger-agora-context">
                                {agoraContext.questionPreview && (
                                  <div className="ledger-agora-question">
                                    <span>질문</span>
                                    <strong>{agoraContext.questionPreview}</strong>
                                  </div>
                                )}
                                {agoraContext.askerName && (
                                  <div className="ledger-agora-asker">질문자: {agoraContext.askerName}</div>
                                )}
                              </div>
                            )}
                            {tx.metadata?.rewardMultiplier > 1 && (
                              <div className="ledger-tx-bonus">
                                {tx.metadata.rewardMultiplierLabel || `${tx.metadata.rewardMultiplier}배 보너스`}
                                {tx.metadata.rewardBonusAmount > 0 && (
                                  <span> 기본 {tx.metadata.rewardBaseAmount} + 보너스 {tx.metadata.rewardBonusAmount}</span>
                                )}
                              </div>
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
            
            {hasMore && !loading && filteredTransactions.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1rem', paddingBottom: '1rem' }}>
                <button 
                  onClick={() => setTxLimit(prev => prev + 30)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-bright)',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  내역 더보기 ⬇️
                </button>
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
          width: '100%',
          maxWidth: '1200px',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '1.2rem',
            fontSize: '0.85rem',
            color: 'var(--text-bright)'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>🚀</span> 탐사 퀴즈
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>정답 시 <span style={{color: 'var(--text-bright)'}}>+1</span> / 3콤보 <span style={{color: 'var(--text-bright)'}}>+5</span> / 최초 100점 <span style={{color: 'var(--text-bright)'}}>+10</span></li>
                <li>오답 시 광석 유실 <span style={{color: '#f87171'}}>(1회차 -2, 2회차 -4...)</span></li>
                <li>언제든 <span style={{color: 'var(--crystal-cyan)'}}>100점 달성 가능</span></li>
                <li>오답 시 <span style={{color: '#f87171'}}>복구 대기(3~9초)</span> 발생</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>⚔️</span> 퀴즈 배틀
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>승리 시 <span style={{color: 'var(--text-bright)'}}>+20</span> 보너스 + 정답당 <span style={{color: 'var(--text-bright)'}}>+2</span> 광석</li>
                <li>패배해도 완주하면 <span style={{color: 'var(--text-bright)'}}>+10</span> 광석</li>
                <li>무승부 시 양쪽 모두 <span style={{color: 'var(--text-bright)'}}>+20</span> 광석</li>
                <li>NOVA-7 대전은 계산된 배틀 보상의 <span style={{color: 'var(--text-bright)'}}>1/3</span> 지급 <span style={{color: 'var(--text-muted)'}}>(소수점 버림)</span></li>
                <li>NOVA-7은 공식 승률·연승·아레나 순위에서 제외되며, 정답률·완주에 따라 전체 SEI에 <span style={{color: 'var(--text-bright)'}}>최대 60점</span> 반영</li>
                <li>현재 학습 중인 <span style={{color: 'var(--text-bright)'}}>과정과 리전</span>에서만 참여 가능</li>
                <li>배틀 광석은 하루 최대 <span style={{color: 'var(--text-bright)'}}>500개</span></li>
                <li>같은 범위 또는 같은 상대는 하루 <span style={{color: 'var(--text-bright)'}}>3회</span>까지만 보상·공식 전적 반영</li>
                <li>중도 포기 시 <span style={{color: '#f87171'}}>보상 없음</span></li>
                <li><span style={{color: '#f87171'}}>AI 사용 및 부정행위 적발 시 퀴즈 배틀에서 영구 퇴출될 수 있습니다.</span></li>
              </ul>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>⚗️</span> 다크매터 정제소
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>정화 작전 완료 시 <span style={{color: 'var(--text-bright)'}}>+50</span> 광석 보너스</li>
                <li>정제 성공 문항당 <span style={{color: 'var(--text-bright)'}}>+2</span> 광석 추가</li>
                <li>오답 노트를 해결하고 보너스 획득!</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>💬</span> 스텔라 아고라
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>질문 등록 시 <span style={{color: 'var(--text-bright)'}}>+5</span></li>
                <li>내 답변 채택 시 질문자에게서 <span style={{color: 'var(--text-bright)'}}>+20</span></li>
                <li>선생님 인증 추가 <span style={{color: 'var(--text-bright)'}}>+10</span></li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>🛰️</span> 스터디 크루
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>오늘의 개인 미션 완료 시 <span style={{color: 'var(--text-bright)'}}>+5</span> 광석</li>
                <li>개인 미션 보상은 <span style={{color: 'var(--text-bright)'}}>하루 1회</span>만 지급</li>
                <li>팀 미션 완료 시 <span style={{color: 'var(--text-bright)'}}>+20</span> 광석</li>
                <li>팀 미션 보상은 <span style={{color: 'var(--text-bright)'}}>하루 최대 2회</span>, 2명 이상 참여 시 가능</li>
              </ul>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>🚀</span> 워프 게이트 도킹 (출석)
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>정시 출석 체크 시 <span style={{color: 'var(--text-bright)'}}>+5</span> 광석</li>
                <li>지각 출석 체크 시 <span style={{color: 'var(--text-bright)'}}>+2</span> 광석</li>
                <li>수업 시작 10분 전부터 도킹 가능</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#67e8f9', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>✨</span> 학습 보상 배율
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>주말/휴일 학습 보상은 <span style={{color: 'var(--text-bright)'}}>1.5배</span> 지급</li>
                <li>정규 수업시간 외 학습 보상은 <span style={{color: 'var(--text-bright)'}}>1.2배</span> 지급</li>
                <li>소수점은 올림 처리, 휴일 배율이 우선 적용</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#00ff88', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>📡</span> 트랜스미션 (영상)
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>3분 학습마다 <span style={{color: 'var(--text-bright)'}}>+10</span> / 90% 시청 <span style={{color: 'var(--text-bright)'}}>+20</span></li>
                <li><span style={{color: '#f87171'}}>⚠️ 동시재생 보상 차단 (170초 쿨타임)</span></li>
                <li><span style={{color: '#f87171'}}>⚠️ 1일 상한선: 500 광석</span></li>
              </ul>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#00f3ff', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>📄</span> 데이터 로그
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>학습 완료 시 <span style={{color: 'var(--text-bright)'}}>+30</span> 광석</li>
                <li>1분 이상 학습 후 완료 버튼 활성화</li>
                <li>단원당 <span style={{color: 'var(--text-bright)'}}>최초 1회</span>만 지급</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>⌨️</span> 코드 따라쓰기
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>코드 <span style={{color: 'var(--text-bright)'}}>줄 수 × 1.5</span> 광석 (긴 코드일수록 더 많이)</li>
                <li>같은 세트 반복 연습 시 <span style={{color: 'var(--text-bright)'}}>2/3씩 감소</span> (15→10→7), <span style={{color: 'var(--text-bright)'}}>최대 3회</span></li>
                <li>주말/휴일 <span style={{color: 'var(--text-bright)'}}>1.5배</span>, 수업시간 외 <span style={{color: 'var(--text-bright)'}}>1.2배</span> 적용</li>
                <li>정답 코드는 복사할 수 없고, 손으로 따라 써야 합니다</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2em' }}>📁</span> 항행 일지 (과제)
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>과제 제출 및 승인 시 <span style={{color: 'var(--text-bright)'}}>+10 ~ 40</span> 광석</li>
                <li>제출 내용의 성실도에 따라 차등 지급</li>
                <li>출석 후 과제 미제출 시 <span style={{color: '#f87171'}}>-15</span> 광석</li>
                <li>연속 미제출 시 <span style={{color: '#f87171'}}>누적 차감</span> <span style={{color: 'var(--text-muted)'}}>(-20, -25...)</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
