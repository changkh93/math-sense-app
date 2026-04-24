import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { Trophy, Medal, Star, Target, Info, ShieldAlert, Zap, CircleHelp } from 'lucide-react'
import { db, auth } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import './SpaceRanking.css'
import soundManager from '../../utils/SoundManager'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import CometBadge from './CometBadge'
import { buildStreakWriteAudit, extractLearningActivityDates, getEffectiveStreak, getTodayKST, getKSTComponents, recalculateStreakState } from '../../utils/streakUtils'
import { calculateSEI } from '../../utils/rankingUtils'
import { useAdmin } from '../../hooks/useAdmin'
import { HALL_OF_FAME_LOOKBACK_DAYS, HALL_SHOWCASE_DURATION_DAYS, getFrameSurfaceStyles, isHallSpotlightActive, isWithinLastDays } from '../../utils/socialUtils'

export default function SpaceRanking({ user, userData }) {
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankMode, setRankMode] = useState('sei') 
  const [inspectUserId, setInspectUserId] = useState(null)
  const [hoveredMetric, setHoveredMetric] = useState(null)
  const [crewLeaderboard, setCrewLeaderboard] = useState([])
  const [hallOfFame, setHallOfFame] = useState({ bestAnswer: null, bestQuestion: null, growthStar: null })
  const [activatingShowcase, setActivatingShowcase] = useState(false)
  const { isAdmin } = useAdmin();

  const SEI_TIPS = {
    skill: {
      title: '전문성(실력)',
      tip: '평균 점수를 높게 유지하며, 최대한 많은 단원에서 **백점 만점(Perfect)**을 달성하세요!'
    },
    diligence: {
      title: '끈기(성실)',
      tip: '매일 조금씩이라도 거르지 않고 학습하여 **연속 학습(Streak)** 기록을 이어가는 것이 핵심입니다.'
    },
    wealth: {
      title: '능력(부)',
      tip: '다양한 탐사와 퀴즈를 통해 **보유 광석(Crystals)** 총량을 늘려 기초 체급을 강화하세요.'
    },
    growth: {
      title: '잠재력(성장)',
      tip: '매주 새로운 탐사를 통해 **주간 획득 광석량**을 높여 당신의 성장 속도를 증명하세요.'
    },
    agora: {
      title: '소통(아고라)',
      tip: '아고라 커뮤니티에서 질문하고 답변하며 **지식을 공유**하여 보너스 점수를 획득하세요.'
    }
  };

  const handleRepairStreaks = async () => {
    if (!window.confirm("모든 랭킹 사용자의 스트릭 데이터를 분석하여 복구하시겠습니까?\n(Firestore 읽기가 다수 발생합니다)")) return;
    try {
      const repairPromises = topUsers.map(async (u) => {
        const histQ = query(collection(db, 'users', u.id, 'history'), orderBy('timestamp', 'desc'), limit(100));
        const txQ = query(collection(db, 'users', u.id, 'crystal_transactions'), orderBy('timestamp', 'asc'));
        const [snap, txSnap] = await Promise.all([getDocs(histQ), getDocs(txQ)]);
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (docs.length === 0) return null;

        const transactions = txSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const activeDates = Array.from(extractLearningActivityDates(docs, transactions)).sort();
        const coreEvidenceDates = transactions
          .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core' && t.timestamp)
          .map(t => getTodayKST(t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)));

        const usageDates = transactions
          .filter(t => t.type === 'streak_freeze' && t.timestamp)
          .map(t => getTodayKST(t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)))
          .sort();

        const currentOwned = u.streakFreezeCount || 0;
        const simulatedInventory = [...coreEvidenceDates].sort();
        usageDates.forEach(usageDate => {
          const idx = simulatedInventory.findIndex(purchaseDate => purchaseDate <= usageDate);
          if (idx !== -1) simulatedInventory.splice(idx, 1);
          else coreEvidenceDates.push(usageDate);
        });

        const currentlyExpected = coreEvidenceDates.length - usageDates.length;
        if (currentOwned > currentlyExpected) {
          for (let i = 0; i < currentOwned - currentlyExpected; i++) {
            coreEvidenceDates.push(getTodayKST());
          }
        }

        const streakState = recalculateStreakState(activeDates, coreEvidenceDates, getTodayKST());
        if (
          streakState.correctStreak !== (u.currentStreak || 0) ||
          streakState.correctLastDate !== (u.lastStreakDate || "") ||
          streakState.coresRemaining !== currentOwned
        ) {
          await setDoc(doc(db, 'users', u.id), {
            currentStreak: streakState.correctStreak,
            lastStreakDate: streakState.correctLastDate,
            longestStreak: Math.max(u.longestStreak || 0, streakState.correctStreak),
            streakFreezeCount: streakState.coresRemaining,
            streakWriteAudit: buildStreakWriteAudit({
              source: 'space_ranking_admin_repair',
              writerUid: user?.uid || auth.currentUser?.uid || '',
              prevState: u,
              nextState: {
                currentStreak: streakState.correctStreak,
                lastStreakDate: streakState.correctLastDate,
                streakFreezeCount: streakState.coresRemaining,
              },
              writtenAt: serverTimestamp(),
              note: u.id,
            }),
          }, { merge: true });
          return u.id;
        }
        return null;
      });
      const results = await Promise.all(repairPromises);
      alert(`${results.filter(Boolean).length}명의 스트릭 데이터가 복구되었습니다.`);
    } catch (err) { alert("오류 발생: " + err.message); }
  };

  useEffect(() => {

    setLoading(true);
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const q = query(
      collection(db, 'users'),
      limit(200) // Fetch up to 200 to allow robust local sorting. We removed orderBy('crystals') so everyone is considered.
    )

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const kstPart = getKSTComponents()
      const todayKey = getTodayKST()
      const mondayOffset = (kstPart.dayOfWeek + 6) % 7
      const mondayDate = new Date()
      mondayDate.setDate(mondayDate.getDate() - mondayOffset)
      const mondayKey = getTodayKST(mondayDate)

      const users = snapshot.docs.map(doc => {
        const d = doc.data()
        const streak = getEffectiveStreak(d) || 0;
        const weeklyGain = d.weeklyGrowthMonday === mondayKey ? (d.weeklyGrowth || 0) : 0;
        const dailyGain = d.dailyGrowthDate === todayKey ? (d.dailyGrowth || 0) : 0;
        
        // Calculate SEI & Tier
        const seiData = calculateSEI(d, weeklyGain, streak);

        return {
          id: doc.id,
          ...d,
          streak,
          dailyGain,
          weeklyGain,
          seiData,
        }
      }).filter(u => u.role !== 'admin' && u.role !== 'developer' && u.role !== 'teacher');

      const growthLeaders = [...users].sort((a, b) => {
        if ((b.weeklyGain || 0) !== (a.weeklyGain || 0)) return (b.weeklyGain || 0) - (a.weeklyGain || 0)
        return (b.seiData?.total || 0) - (a.seiData?.total || 0)
      })

      const crewMap = new Map()
      users.forEach(u => {
        if (!u.crewId) return
        const existing = crewMap.get(u.crewId) || {
          crewId: u.crewId,
          crewName: u.crewName || '이름 없는 크루',
          crewColor: u.crewColor || '#00f3ff',
          totalSEI: 0,
          totalWeeklyGain: 0,
          memberCount: 0,
        }

        existing.totalSEI += u.seiData?.total || 0
        existing.totalWeeklyGain += u.weeklyGain || 0
        existing.memberCount += 1
        crewMap.set(u.crewId, existing)
      })

      const crewLeaders = Array.from(crewMap.values())
        .sort((a, b) => {
          if (b.totalWeeklyGain !== a.totalWeeklyGain) return b.totalWeeklyGain - a.totalWeeklyGain
          return b.totalSEI - a.totalSEI
        })
        .slice(0, 5)

      // Sort based on current rankMode
      if (rankMode === 'sei') {
        users.sort((a, b) => b.seiData.total - a.seiData.total)
      } else if (rankMode === 'growth') {
        users.sort((a, b) => {
          if (b.weeklyGain !== a.weeklyGain) return b.weeklyGain - a.weeklyGain;
          if (b.seiData.total !== a.seiData.total) return b.seiData.total - a.seiData.total;
          return (b.crystals || 0) - (a.crystals || 0);
        });
      } else if (rankMode === 'streak') {
        users.sort((a, b) => b.streak - a.streak)
      }
      
      // 4. Dense Ranking 처리
      let currentRank = 1;
      for (let i = 0; i < users.length; i++) {
        if (i > 0) {
          const prev = users[i - 1];
          const curr = users[i];
          let isTie = false;

          if (rankMode === 'sei') {
            isTie = prev.seiData.total === curr.seiData.total;
          } else if (rankMode === 'growth') {
            isTie = prev.weeklyGain === curr.weeklyGain &&
                    prev.seiData.total === curr.seiData.total &&
                    (prev.crystals || 0) === (curr.crystals || 0);
          } else if (rankMode === 'streak') {
            isTie = prev.streak === curr.streak;
          }

          if (!isTie) {
            currentRank = i + 1;
          }
        }
        users[i].displayRank = currentRank;
      }

      setTopUsers(users.slice(0, 100))
      setCrewLeaderboard(crewLeaders)
      setHallOfFame(prev => ({ ...prev, growthStar: growthLeaders[0] || null }))
      setLoading(false)
    }, (error) => {
      console.error("❌ SpaceRanking: Firestore error:", error)
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
  }, [rankMode])

  useEffect(() => {
    let isMounted = true

    const loadHallOfFame = async () => {
      try {
        const [questionSnap, answerSnap] = await Promise.all([
          getDocs(query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(80))),
          getDocs(query(collection(db, 'answers'), orderBy('createdAt', 'desc'), limit(120)))
        ])

        const questions = questionSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => isWithinLastDays(item.createdAt, HALL_OF_FAME_LOOKBACK_DAYS))

        const answers = answerSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => isWithinLastDays(item.createdAt, HALL_OF_FAME_LOOKBACK_DAYS))

        const bestQuestion = [...questions].sort((a, b) => {
          const aScore = (a.upvotes || 0) * 3 + (a.answerCount || 0) * 2 + Math.floor((a.bountyAmount || 0) / 10)
          const bScore = (b.upvotes || 0) * 3 + (b.answerCount || 0) * 2 + Math.floor((b.bountyAmount || 0) / 10)
          return bScore - aScore
        })[0] || null

        const bestAnswer = [...answers].sort((a, b) => {
          const aScore = (a.isAccepted ? 18 : 0) + (a.isVerified ? 10 : 0) + Math.min((a.content || '').length, 400) / 20
          const bScore = (b.isAccepted ? 18 : 0) + (b.isVerified ? 10 : 0) + Math.min((b.content || '').length, 400) / 20
          return bScore - aScore
        })[0] || null

        if (isMounted) {
          setHallOfFame(prev => ({ ...prev, bestQuestion, bestAnswer }))
        }
      } catch (error) {
        console.error('Failed to load hall of fame:', error)
      }
    }

    loadHallOfFame()
    return () => {
      isMounted = false
    }
  }, [])

  const handleActivateShowcase = async () => {
    if (!user?.uid || activatingShowcase || (userData?.hallShowcaseCredits || 0) < 1) return

    setActivatingShowcase(true)
    try {
      const userRef = doc(db, 'users', user.uid)
      const nextExpiry = Date.now() + (HALL_SHOWCASE_DURATION_DAYS * 24 * 60 * 60 * 1000)

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef)
        if (!userSnap.exists()) throw new Error('USER_NOT_FOUND')

        const liveUser = userSnap.data()
        if ((liveUser?.hallShowcaseCredits || 0) < 1) throw new Error('NO_CREDIT')

        transaction.set(userRef, {
          hallShowcaseCredits: (liveUser?.hallShowcaseCredits || 0) - 1,
          hallSpotlightUntilMs: nextExpiry
        }, { merge: true })
      })
    } catch (error) {
      console.error('Failed to activate showcase:', error)
      alert('쇼케이스를 활성화하지 못했습니다.')
    } finally {
      setActivatingShowcase(false)
    }
  }

  const rewardRules = [
    { 
      category: '🎯 탐사(퀴즈) 보상', 
      icon: <Target className="rule-icon-blue" />,
      items: [
        { label: '문제 정답', value: '+1 💎', desc: '최고 점수 경신 시 지급' },
        { label: '3연속 콤보', value: '+5 💎', desc: '안정적인 비행 보너스' },
        { label: '백점 만점', value: '+10 💎', desc: '단원 최초 1회 보너스' },
        { label: '문제 오답', value: '-2 💎', desc: '에너지 손실 (쉴드로 방어 가능)' },
      ]
    },
    { 
      category: '🤝 아고라(커뮤니티) 보상', 
      icon: <Zap className="rule-icon-purple" />,
      items: [
        { label: '답변 채택', value: '+20 💎', desc: '내가 쓴 답변이 채택됨' },
        { label: '질문 해결', value: '+5 💎', desc: '내 질문이 해결됨' },
        { label: '스스로 해결', value: '+3 💎', desc: '자기 주도 해결 보충' },
        { label: '선생님 인증', value: '+10 💎', desc: '최우수 답변 추가 보너스' },
      ]
    }
  ];

  const kstNow = new Date(Date.now() + 9 * 3600000);
  const isMondayMorning = kstNow.getUTCDay() === 1 && kstNow.getUTCHours() < 12;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fade-in"
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          color: 'var(--text-bright)', 
          marginBottom: '0.8rem',
          textShadow: '0 0 20px var(--crystal-glow)'
        }}>
          🏆 스텔라 관제계 (Meta Sense Universe)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          단순한 광석 수량이 아닌, <strong>실력, 성실함, 성장세, 그리고 소통 능력</strong>을 종합하여 진정한 개척자를 가려냅니다. (대원 {topUsers.length}명 탐사 중)
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {[
          { id: 'sei', label: '전 우주 정거장 (SEI)', icon: '🌌' },
          { id: 'growth', label: '이번 주 급상승 (Warp Star)', icon: '☄️', isSpecial: true },
          { id: 'streak', label: '불멸의 항해사 (Streak)', icon: '🛡️' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => { setRankMode(mode.id); soundManager.playClick(); }}
            className={`font-tech ${rankMode === mode.id ? 'active' : ''}`}
            style={{
              padding: '0.8rem 1.5rem',
              background: rankMode === mode.id 
                ? (mode.isSpecial ? 'rgba(255, 69, 58, 0.2)' : 'rgba(0, 243, 255, 0.2)') 
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${rankMode === mode.id 
                ? (mode.isSpecial ? '#ff453a' : 'var(--crystal-cyan)') 
                : 'var(--glass-border)'}`,
              borderRadius: '12px',
              color: rankMode === mode.id 
                ? (mode.isSpecial ? '#ff453a' : 'var(--crystal-cyan)') 
                : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 700,
              boxShadow: rankMode === mode.id 
                ? (mode.isSpecial ? '0 0 15px rgba(255, 69, 58, 0.4)' : 'var(--glow-cyan)') 
                : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={handleRepairStreaks}
            className="font-tech"
            style={{
              padding: '0.8rem 1.5rem',
              background: 'rgba(255, 191, 0, 0.1)',
              border: '1px dashed #ffbf00',
              borderRadius: '12px',
              color: '#ffbf00',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="모든 사용자의 스트릭 데이터 동기화 (Admin)"
          >
            🔄 동기화
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div className="glass-card hud-border" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>🏆 이번 주 명예의 전당</h3>
            <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              최근 {HALL_OF_FAME_LOOKBACK_DAYS}일
            </span>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <div style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ color: '#fbbf24', fontWeight: 800, marginBottom: '0.35rem' }}>친절한 설명상</div>
              <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>
                {hallOfFame.bestAnswer?.publicProfileSnapshot?.displayName || hallOfFame.bestAnswer?.userName || '아직 선정 중'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.45 }}>
                {hallOfFame.bestAnswer ? (hallOfFame.bestAnswer.content || '').slice(0, 72) : '채택/인증/설명 밀도를 기준으로 계산합니다.'}
              </div>
            </div>
            <div style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ color: '#60a5fa', fontWeight: 800, marginBottom: '0.35rem' }}>질문 개척상</div>
              <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>
                {hallOfFame.bestQuestion ? '익명 질문자' : '아직 선정 중'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.45 }}>
                {hallOfFame.bestQuestion ? (hallOfFame.bestQuestion.content || '').slice(0, 72) : '질문자는 계속 익명으로 보호됩니다.'}
              </div>
            </div>
            <div style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ color: '#34d399', fontWeight: 800, marginBottom: '0.35rem' }}>급상승 파일럿</div>
              <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>
                {hallOfFame.growthStar?.studentName || hallOfFame.growthStar?.name || '아직 선정 중'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                이번 주 성장 +{hallOfFame.growthStar?.weeklyGain || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card hud-border" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>🛰️ 스터디 크루 리더보드</h3>
            <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              크루 상위 5팀
            </span>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {crewLeaderboard.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.86rem' }}>
                아직 크루가 없습니다. 상점에서 창설권을 구매하고 프로필에서 팀을 만들어보세요.
              </div>
            ) : crewLeaderboard.map((crew, index) => (
              <div key={crew.crewId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
                padding: '0.85rem 0.95rem',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)'
              }}>
                <div>
                  <div style={{ color: crew.crewColor, fontWeight: 800 }}>
                    #{index + 1} {crew.crewName}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                    멤버 {crew.memberCount}명 · 총 SEI {crew.totalSEI}
                  </div>
                </div>
                <div style={{ color: '#34d399', fontWeight: 800 }}>
                  +{crew.totalWeeklyGain}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card hud-border" style={{ padding: '1rem 1.2rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--text-bright)', fontWeight: 800 }}>내 쇼케이스 강조</div>
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.84rem', marginTop: '0.25rem' }}>
            보유 {userData?.hallShowcaseCredits || 0}회 · 활성 상태 {isHallSpotlightActive(userData) ? '진행 중' : '대기'}
          </div>
        </div>
        <button
          onClick={handleActivateShowcase}
          disabled={activatingShowcase || (userData?.hallShowcaseCredits || 0) < 1}
          className="font-tech"
          style={{
            padding: '0.75rem 1.2rem',
            borderRadius: '12px',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            background: 'rgba(251, 191, 36, 0.12)',
            color: '#fbbf24',
            cursor: activatingShowcase ? 'wait' : 'pointer'
          }}
        >
          {activatingShowcase ? '활성화 중...' : `1주 강조 활성화 (${HALL_SHOWCASE_DURATION_DAYS}일)`}
        </button>
      </div>

      <div className="glass-card hud-border ranking-main-area" style={{ 
        padding: '1.5rem', 
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(15px)',
        minHeight: '400px',
        position: 'relative'
      }}>
        <AnimatePresence mode="wait">
            <motion.div 
              key="ranking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 헤더 행 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1.5fr 120px 100px 100px',
                padding: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                color: 'var(--crystal-cyan)',
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '1px'
              }}>
                <span>RANK</span>
                <span>PILOT</span>
                <span style={{ textAlign: 'center' }}>SEI INDEX</span>
                <span style={{ textAlign: 'center' }}>CRYSTALS</span>
                <span style={{ textAlign: 'right', position: 'relative' }}>
                  GROWTH
                  {isMondayMorning && rankMode === 'growth' && (
                    <span style={{
                      position: 'absolute',
                      top: '-18px',
                      right: '0',
                      fontSize: '0.65rem',
                      color: 'var(--star-gold)',
                      whiteSpace: 'nowrap',
                      background: 'rgba(255,215,0,0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,215,0,0.3)',
                      boxShadow: '0 0 10px rgba(255,215,0,0.2)'
                    }}>
                      New Season 🚀
                    </span>
                  )}
                </span>
              </div>

              {/* 랭킹 리스트 */}
              <div style={{ paddingRight: '5px' }}>
                {loading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    호로그램 데이터 수신 중...
                  </div>
                ) : topUsers.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    현재 순위 데이터가 없습니다.<br/>
                    <span style={{ fontSize: '0.8rem' }}>탐사를 시작하여 광석을 채집해 보세요!</span>
                  </div>
                ) : (
                  topUsers.map((u, index) => {
                    const isMe = u.id === user?.uid
                    const isExpanded = inspectUserId === u.id
                    const growth = rankMode === 'growth' ? (u.weeklyGain || 0) : (u.dailyGain || 0);
                    const tier = u.seiData?.tier || { name: '브론즈 파일럿', color: '#cd7f32', icon: '🚀' };
                    const isPodium = (u.displayRank || 0) <= 3;
                    const frameTheme = getFrameSurfaceStyles(u.selectedProfileFrame, isExpanded ? 'panel' : 'row')
                    const panelTheme = isPodium
                      ? frameTheme
                      : {
                          background: 'rgba(0, 0, 0, 0.22)',
                          borderColor: 'rgba(255,255,255,0.08)',
                          glow: 'none',
                          accent: 'var(--crystal-cyan)',
                          text: 'rgba(255,255,255,0.92)',
                          mutedText: 'rgba(255,255,255,0.56)',
                        };
                    const frameGlyph = u.selectedProfileFrame === 'nebula'
                      ? '✦'
                      : u.selectedProfileFrame === 'solar'
                        ? '☼'
                        : '◇';

                    return (
                      <React.Fragment key={u.id}>
                      <div
                        className="ranking-row"
                        onClick={() => setInspectUserId(inspectUserId === u.id ? null : u.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1.5fr 120px 100px 100px',
                          padding: '1.2rem 1rem',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          alignItems: 'center',
                          background: isExpanded
                            ? (isPodium ? panelTheme.background : 'rgba(0, 0, 0, 0.18)')
                            : isMe
                              ? 'rgba(0, 243, 255, 0.12)'
                              : 'transparent',
                          boxShadow: isExpanded
                            ? (isPodium ? `${panelTheme.glow}, inset 0 0 0 1px rgba(255,255,255,0.03)` : 'none')
                            : isMe
                              ? 'inset 0 0 20px rgba(0, 243, 255, 0.2)'
                              : 'none',
                          borderRadius: isExpanded || isMe ? '10px' : '0',
                          margin: isExpanded || isMe ? '5px 0' : '0',
                          borderLeft: isExpanded
                            ? `4px solid ${isPodium ? panelTheme.accent : 'rgba(255,255,255,0.2)'}`
                            : isMe
                              ? '4px solid var(--crystal-cyan)'
                              : 'none',
                          border: isExpanded ? `1px solid ${isPodium ? panelTheme.borderColor : 'rgba(255,255,255,0.08)'}` : 'none',
                          color: '#fff !important',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span style={{ 
                          fontSize: u.displayRank === 1 ? '1.8rem' : u.displayRank <= 3 ? '1.5rem' : '1.2rem',
                          fontWeight: 900,
                          color: u.displayRank === 1 ? 'var(--star-gold)' 
                               : u.displayRank === 2 ? '#c0c0c0' 
                               : u.displayRank === 3 ? '#cd7f32' 
                               : 'var(--text-bright)',
                          textShadow: u.displayRank <= 3 ? `0 0 10px ${u.displayRank === 1 ? 'rgba(255,215,0,0.5)' : u.displayRank === 2 ? 'rgba(192,192,192,0.5)' : 'rgba(205,127,50,0.5)'}` : 'none'
                        }}>
                          {u.displayRank}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: isMe ? 800 : 500,
                              color: isMe ? '#ffffff' : 'rgba(255,255,255,0.9)'
                            }}>
                              {u.publicDisplayName || u.studentName || u.name || '무명 탐험가'}
                            </span>
                            {u.publicSignature && (
                              <span style={{
                                maxWidth: '200px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: isExpanded ? `${frameTheme.accent}18` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${isExpanded ? frameTheme.borderColor : 'rgba(255,255,255,0.08)'}`,
                                color: isExpanded ? frameTheme.text : 'rgba(255,255,255,0.78)',
                                fontSize: '0.72rem',
                                lineHeight: 1.3,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {u.publicSignature}
                              </span>
                            )}
                            {u.selectedProfileFrame && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '999px',
                                background: isExpanded ? `${frameTheme.accent}20` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${isExpanded ? frameTheme.borderColor : 'rgba(255,255,255,0.08)'}`,
                                color: isExpanded ? frameTheme.accent : 'rgba(255,255,255,0.72)',
                                fontSize: '0.78rem',
                                flex: '0 0 auto'
                              }} title="프로필 프레임">
                                {frameGlyph}
                              </span>
                            )}
                            {isMe && <span style={{ 
                              fontSize: '0.7rem', 
                              background: 'var(--crystal-cyan)', 
                              color: '#000', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontWeight: 900
                            }}>ME</span>}
                            {isHallSpotlightActive(u) && (
                              <span style={{
                                fontSize: '0.7rem',
                                background: 'rgba(251, 191, 36, 0.18)',
                                color: '#fbbf24',
                                padding: '2px 6px',
                                borderRadius: '999px',
                                fontWeight: 800
                              }}>
                                SHOWCASE
                              </span>
                            )}
                          </div>
                          {u.publicTitle && (
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.35 }}>
                              {u.publicTitle}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {u.streak > 0 && (
                              <CometBadge streak={u.streak} compact showTooltip={false} />
                            )}
                            <span style={{ fontSize: '0.75rem', color: tier.color, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              {tier.icon} {tier.name}
                            </span>
                            {u.crewName && (
                              <span style={{ fontSize: '0.72rem', color: u.crewColor || 'var(--crystal-cyan)', fontWeight: 700 }}>
                                🛰️ {u.crewName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ color: tier.color || 'var(--crystal-cyan)', fontWeight: 800, fontSize: '1.2rem', textShadow: `0 0 10px ${tier.color}40` }}>
                            {u.seiData?.total || 0}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>SEI</span>
                        </div>

                        <span style={{ 
                          textAlign: 'center', 
                          color: 'var(--neon-blue)', 
                          fontWeight: 700 
                        }}>
                          💎 {parseFloat(u.crystals || 0).toLocaleString()}
                        </span>

                        <div style={{ 
                          textAlign: 'right',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end'
                        }}>
                          <span 
                            title={growth === 0 && rankMode === 'growth' ? "첫 광석을 채집하고 이번 주 첫 번째 급상승 주인공이 되세요!" : ""}
                            style={{ 
                            color: growth > 0 ? 'var(--planet-green)' : growth < 0 ? '#ff4d4d' : 'rgba(255,255,255,0.4)',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: growth === 0 && rankMode === 'growth' ? 'help' : 'default'
                          }}>
                            {growth > 0 ? `▲ ${growth}` : growth < 0 ? `▼ ${Math.abs(growth)}` : '─'}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                            {rankMode === 'growth' ? 'WEEKLY' : 'GROWTH'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Inline Expanded Radar Chart */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', padding: '0 2rem' }}
                          >
                            <div style={{ 
                            display: 'flex', 
                            gap: '2rem', 
                            padding: '1.5rem', 
                              background: panelTheme.background, 
                              borderRadius: '0 0 14px 14px',
                              border: `1px solid ${panelTheme.borderColor}`,
                              borderTop: 'none',
                              boxShadow: panelTheme.glow,
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                background: isPodium
                                  ? `radial-gradient(circle at top right, ${panelTheme.accent}20 0%, transparent 42%), radial-gradient(circle at bottom left, ${panelTheme.accent}18 0%, transparent 38%)`
                                  : 'none'
                              }} />
                              <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '300px', height: '260px' }}>
                                <RadarChart width={300} height={260} cx="50%" cy="50%" outerRadius="65%" data={[
                                  { subject: '능력(부)', value: Math.min(100, (u.seiData?.wealth / 50) * 100) || 0, raw: u.seiData?.wealth || 0 },
                                  { subject: '끈기(성실)', value: Math.min(100, (u.seiData?.diligence / 300) * 100) || 0, raw: u.seiData?.diligence || 0 },
                                  { subject: '잠재력(성장)', value: Math.min(100, (u.seiData?.growth / 200) * 100) || 0, raw: u.seiData?.growth || 0 },
                                  { subject: '소통(아고라)', value: Math.min(100, (u.seiData?.agora / 200) * 100) || 0, raw: u.seiData?.agora || 0 },
                                  { subject: '전문성(실력)', value: Math.min(100, (u.seiData?.skill / 1000) * 100) || 0, raw: u.seiData?.skill || 0 },
                                ]}>
                                  <PolarGrid stroke="rgba(255,255,255,0.18)" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: panelTheme.mutedText, fontSize: 11 }} />
                                  <Radar name="Capabilities" dataKey="value" stroke={panelTheme.accent} fill={panelTheme.accent} fillOpacity={0.36} />
                                </RadarChart>
                              </div>
                              <div style={{ flex: 1, maxWidth: '300px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                                  <h4 style={{ color: panelTheme.text, margin: 0 }}>{tier.icon} {tier.name}</h4>
                                  <div style={{ color: panelTheme.mutedText, fontSize: '0.82rem' }}>
                                    {isPodium
                                      ? (u.selectedProfileFrame === 'nebula'
                                        ? '차분한 보랏빛 깊이감이 강한 사용자입니다.'
                                        : u.selectedProfileFrame === 'solar'
                                          ? '따뜻한 금빛 존재감이 강한 사용자입니다.'
                                          : '기본 프레임으로 표시됩니다.')
                                      : '기본 검정 배경으로 표시됩니다.'}
                                  </div>
                                  {u.selectedProfileFrame && (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      width: 'fit-content',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '999px',
                                      background: `${panelTheme.accent}12`,
                                      border: `1px solid ${panelTheme.borderColor}`,
                                      color: panelTheme.text,
                                      fontSize: '0.72rem'
                                    }}>
                                      <span style={{ color: panelTheme.accent }}>{frameGlyph}</span>
                                      <span>
                                        {isPodium
                                          ? (u.selectedProfileFrame === 'nebula'
                                            ? '네뷸라'
                                            : u.selectedProfileFrame === 'solar'
                                              ? '솔라'
                                              : '스타터')
                                          : '프레임'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: panelTheme.text, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                  <li 
                                    onMouseEnter={() => setHoveredMetric('skill')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'skill' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>전문성(실력)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.skill || 0} pts</strong>
                                  </li>
                                  <li 
                                    onMouseEnter={() => setHoveredMetric('diligence')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'diligence' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>끈기(성실)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.diligence || 0} pts</strong>
                                  </li>
                                  <li 
                                    onMouseEnter={() => setHoveredMetric('wealth')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'wealth' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>능력(광석)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.wealth || 0} pts</strong>
                                  </li>
                                  <li 
                                    onMouseEnter={() => setHoveredMetric('growth')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'growth' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>잠재력(성장)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.growth || 0} pts</strong>
                                  </li>
                                  <li 
                                    onMouseEnter={() => setHoveredMetric('agora')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'agora' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>소통(아고라)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.agora || 0} pts</strong>
                                  </li>
                                </ul>
                                <div style={{ 
                                  marginTop: '1.2rem', 
                                  padding: '0.8rem', 
                                  background: `${panelTheme.accent}10`, 
                                  borderRadius: '8px',
                                  border: `1px dashed ${panelTheme.borderColor}`,
                                  fontSize: '0.75rem',
                                  color: panelTheme.mutedText,
                                  lineHeight: '1.4',
                                  minHeight: '75px', // 고정 높이로 레이아웃 흔들림 방지
                                  transition: 'all 0.3s ease'
                                }}>
                                  <AnimatePresence mode="wait">
                                    <motion.div
                                      key={hoveredMetric || 'default'}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <strong style={{ color: panelTheme.accent, display: 'block', marginBottom: '4px' }}>
                                        💡 {hoveredMetric ? SEI_TIPS[hoveredMetric].title : '전문가의 팁'}
                                      </strong>
                                      {hoveredMetric ? 
                                        SEI_TIPS[hoveredMetric].tip.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: panelTheme.text }}>{part}</strong> : part) : 
                                        "항목을 호버하여 점수를 올리는 비결을 확인하세요!"
                                      }
                                    </motion.div>
                                  </AnimatePresence>
                                </div>
                              </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </React.Fragment>
                  )
                })
                )}
              </div>
            </motion.div>
        </AnimatePresence>
      </div>

      {/* 격려 문구 */}
      <div style={{ marginTop: '2.5rem', marginBottom: '4rem', textAlign: 'center' }}>
        <p className="font-tech" style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}>
          {(() => {
            const myTotal = user ? (topUsers.find(u => u.id === user.uid)?.seiData?.total || 0) : 0;
            return myTotal > 0
              ? `🚀 멋집니다! 당신의 스텔라 탐사 지수(SEI)는 ${myTotal}입니다.`
              : "🔭 새로운 탐사를 시작하여 순위를 높여보세요!"
          })()}
        </p>
      </div>

    </motion.div>
  )
}
