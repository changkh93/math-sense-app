import React, { useState, useEffect } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, runTransaction } from 'firebase/firestore'
import './SpaceRanking.css'
import soundManager from '../../utils/SoundManager'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import CometBadge from './CometBadge'
import CrewMothership from './CrewMothership'
import ModularShip from './ModularShip'
import { getEffectiveStreak, getTodayKST, getKSTComponents } from '../../utils/streakUtils'
import { calculateSEI, FOCUS_MAX_SCORE, BATTLE_MAX_SCORE } from '../../utils/rankingUtils'
import { HALL_OF_FAME_LOOKBACK_DAYS, HALL_SHOWCASE_DURATION_DAYS, getFrameSurfaceStyles, getQuestionAnonymousLabel, isHallSpotlightActive, isWithinLastDays } from '../../utils/socialUtils'
import { getCrewMothershipLevel, getEquippedCrewModules } from '../../utils/crewMothershipCatalog'

function CrewLeaderboardVessel({ summary, crew, rank }) {
  const resolvedCrew = crew || {
    id: summary.crewId,
    name: summary.crewName,
    color: summary.crewColor,
    memberCount: summary.memberCount,
    mothershipXP: summary.mothershipXP,
  }
  const level = getCrewMothershipLevel(resolvedCrew)
  const moduleCount = getEquippedCrewModules(resolvedCrew).length
  const memberCount = Math.max(Number(resolvedCrew.memberCount || 0), Number(summary.memberCount || 0), 1)
  const mothershipXP = Math.max(0, Number(resolvedCrew.mothershipXP || resolvedCrew.mothershipStats?.xp || summary.mothershipXP || 0))
  const xpBonus = mothershipXP * 10
  const weeklyScore = summary.totalWeeklyGain + xpBonus

  return (
    <div className={`ranking-crew-vessel ranking-crew-vessel--${Math.min(rank, 3)}`} style={{ '--ranking-crew-accent': resolvedCrew.color || summary.crewColor || '#00f3ff' }}>
      <div className="ranking-crew-vessel__ship">
        <CrewMothership crew={resolvedCrew} variant="leaderboard" />
      </div>
      <div className="ranking-crew-vessel__copy">
        <div><span>#{rank}</span><strong>{resolvedCrew.name || summary.crewName}</strong></div>
        <small className="font-tech">LV.{level.level} {level.name} · 멤버 {memberCount}명 · 시설 {moduleCount}</small>
        <small className="font-tech">총 SEI {summary.totalSEI.toLocaleString()}{mothershipXP > 0 ? ` · MISSION ${mothershipXP.toLocaleString()} XP` : ''}</small>
      </div>
      <div className="ranking-crew-vessel__growth font-tech"><span>WEEKLY SCORE</span><strong>+{weeklyScore.toLocaleString()}</strong></div>
    </div>
  )
}

export default function SpaceRanking({ user, userData }) {
  const navigate = useNavigate()
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankMode, setRankMode] = useState('sei') 
  const [inspectUserId, setInspectUserId] = useState(null)
  const [hoveredMetric, setHoveredMetric] = useState(null)
  const [crewLeaderboard, setCrewLeaderboard] = useState([])
  const [rankingCrewsById, setRankingCrewsById] = useState({})
  const [hallOfFame, setHallOfFame] = useState({ bestAnswer: null, bestQuestion: null, growthStar: null })
  const [activatingShowcase, setActivatingShowcase] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'crews'), (snapshot) => {
      const next = {}
      snapshot.docs.forEach((crewDoc) => {
        const crew = crewDoc.data() || {}
        if (crew.status === 'approved') next[crewDoc.id] = { id: crewDoc.id, ...crew }
      })
      setRankingCrewsById(next)
    }, (error) => {
      console.warn('Crew mothership ranking sync failed:', error)
    })
    return () => unsubscribe()
  }, [])

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
    },
    focus: {
      title: '집중도(영상)',
      tip: '영상 중 제시되는 **광석 획득 기회**를 빠짐없이 잡으세요. 성공률과 전체 기회 수를 함께 보는 Wilson 보정 점수입니다.'
    },
    battle: {
      title: '배틀(경쟁)',
      tip: 'PVP는 **battleRating**과 공식 승률·연승에 반영됩니다. NOVA-7 훈련은 아레나 순위에서 제외되고, 정답률과 완주에 따라 전체 SEI에 최대 60점만 반영됩니다.'
    }
  };

  useEffect(() => {

    setLoading(true);
    let isActive = true;
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const baseQuery = query(
      collection(db, 'users'),
      limit(500)
    )

    unsubscribeSnapshot = onSnapshot(baseQuery, async (snapshot) => {
      const docMap = new Map(snapshot.docs.map((userDoc) => [userDoc.id, userDoc]));
      if (rankMode === 'battle') {
        try {
          // orderBy('battleRating')는 해당 필드가 없는 문서를 제외한다.
          // 기본 목록과 병합해 개발/초기 데이터에서도 미참전 사용자가 사라지지 않게 한다.
          const battleSnap = await getDocs(query(
            collection(db, 'users'),
            orderBy('battleRating', 'desc'),
            limit(500)
          ));
          battleSnap.docs.forEach((userDoc) => docMap.set(userDoc.id, userDoc));
        } catch (error) {
          console.warn('Battle ranking query failed; falling back to base users', error);
        }
      }
      if (!isActive) return;

      const kstPart = getKSTComponents()
      const todayKey = getTodayKST()
      const mondayOffset = (kstPart.dayOfWeek + 6) % 7
      const mondayDate = new Date()
      mondayDate.setDate(mondayDate.getDate() - mondayOffset)
      const mondayKey = getTodayKST(mondayDate)

      const users = Array.from(docMap.values()).map(userDoc => {
        const d = userDoc.data()
        const streak = getEffectiveStreak(d) || 0;
        const weeklyGain = d.weeklyGrowthMonday === mondayKey ? (d.weeklyGrowth || 0) : 0;
        const dailyGain = d.dailyGrowthDate === todayKey ? (d.dailyGrowth || 0) : 0;
        
        // Calculate SEI & Tier
        const seiData = calculateSEI(d, weeklyGain, streak);

        return {
          id: userDoc.id,
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
        const rankingCrew = rankingCrewsById[u.crewId]
        const mothershipXP = Math.max(0, Number(rankingCrew?.mothershipXP || rankingCrew?.mothershipStats?.xp || 0))
        const existing = crewMap.get(u.crewId) || {
          crewId: u.crewId,
          crewName: u.crewName || rankingCrew?.name || '이름 없는 크루',
          crewColor: u.crewColor || rankingCrew?.color || '#00f3ff',
          totalSEI: 0,
          totalWeeklyGain: 0,
          memberCount: 0,
          mothershipXP,
        }

        existing.totalSEI += u.seiData?.total || 0
        existing.totalWeeklyGain += u.weeklyGain || 0
        existing.memberCount += 1
        crewMap.set(u.crewId, existing)
      })

      const crewLeaders = Array.from(crewMap.values())
        .sort((a, b) => {
          const scoreA = a.totalWeeklyGain + (a.mothershipXP * 10)
          const scoreB = b.totalWeeklyGain + (b.mothershipXP * 10)
          if (scoreB !== scoreA) return scoreB - scoreA
          return b.totalSEI - a.totalSEI
        })
        .slice(0, 3)

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
      } else if (rankMode === 'battle') {
        users.sort((a, b) => {
          // 배틀 경험이 없는 사용자는 항상 뒤로 보낸다. 실제 순위는 전적 수가 아니라
          // battle SEI를 우선한다. battleRating이 아직 0인 과거/개발 데이터도 공정하게 정렬된다.
          const aMatches = a.totalBattleMatches || 0;
          const bMatches = b.totalBattleMatches || 0;
          const aHasBattle = aMatches > 0;
          const bHasBattle = bMatches > 0;
          if (aHasBattle !== bHasBattle) return bHasBattle ? 1 : -1;
          if ((b.seiData?.battleCompetitive || 0) !== (a.seiData?.battleCompetitive || 0)) return (b.seiData?.battleCompetitive || 0) - (a.seiData?.battleCompetitive || 0);
          const aRating = a.seiData?.battleData?.battleRating || 0;
          const bRating = b.seiData?.battleData?.battleRating || 0;
          if (bRating !== aRating) return bRating - aRating;
          const aWinRate = aMatches > 0 ? (a.totalBattleWins || 0) / aMatches : 0;
          const bWinRate = bMatches > 0 ? (b.totalBattleWins || 0) / bMatches : 0;
          if (bWinRate !== aWinRate) return bWinRate - aWinRate;
          if (bMatches !== aMatches) return bMatches - aMatches;
          return (b.seiData?.total || 0) - (a.seiData?.total || 0);
        });
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
          } else if (rankMode === 'battle') {
            // 배틀 미참전자끼리는 동점으로 묶는다.
            const prevMatches = prev.totalBattleMatches || 0;
            const currMatches = curr.totalBattleMatches || 0;
            if (prevMatches === 0 && currMatches === 0) {
              isTie = true;
            } else {
              const prevWinRate = prevMatches > 0 ? (prev.totalBattleWins || 0) / prevMatches : 0;
              const currWinRate = currMatches > 0 ? (curr.totalBattleWins || 0) / currMatches : 0;
              isTie = (prev.seiData?.battleCompetitive || 0) === (curr.seiData?.battleCompetitive || 0) &&
                      (prev.seiData?.battleData?.battleRating || 0) === (curr.seiData?.battleData?.battleRating || 0) &&
                      prevWinRate === currWinRate &&
                      prevMatches === currMatches;
            }
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
      if (!isActive) return;
      console.error("❌ SpaceRanking: Firestore error:", error)
      setLoading(false)
    })

    return () => {
      isActive = false;
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

        const bestAnswer = [...answers]
          .filter((answer) => answer?.isTeacher !== true && answer?.userId !== 'admin')
          .sort((a, b) => {
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

  const openPublicProfile = (event, uid) => {
    event.stopPropagation()
    if (!uid) return
    soundManager.playClick()
    navigate(`/profile/${uid}`)
  }

  const kstNow = new Date(Date.now() + 9 * 3600000);
  const isMondayMorning = kstNow.getUTCDay() === 1 && kstNow.getUTCHours() < 12;
  const showUniverseHighlights = rankMode === 'sei';

  return (
    <Motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fade-in"
    >
      <div className="space-ranking-header">
        <h2 className="space-ranking-title">
          🏆 스텔라 관제계 (Meta Sense Universe)
        </h2>
        <p className="space-ranking-subtitle">
          단순한 광석 수량이 아닌, <strong>실력, 성실함, 집중도, 성장세, 그리고 소통 능력</strong>을 종합하여 진정한 개척자를 가려냅니다. (대원 {topUsers.length}명 탐사 중)
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div className="space-ranking-modes">
        {[
          { id: 'sei', label: '전 우주 정거장 (SEI)', icon: '🌌' },
          { id: 'growth', label: '이번 주 급상승 (Warp Star)', icon: '☄️', isSpecial: true },
          { id: 'streak', label: '불멸의 항해사 (Streak)', icon: '🛡️' },
          { id: 'battle', label: '배틀 아레나 (Battle)', icon: '⚔️', isBattle: true }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => { setRankMode(mode.id); soundManager.playClick(); }}
            className={`space-ranking-mode-btn font-tech ${rankMode === mode.id ? 'active' : ''}`}
            style={{
              padding: '0.8rem 1.5rem',
              background: rankMode === mode.id
                ? (mode.isSpecial ? 'rgba(255, 69, 58, 0.2)' : mode.isBattle ? 'rgba(244, 63, 94, 0.18)' : 'rgba(0, 243, 255, 0.2)')
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${rankMode === mode.id
                ? (mode.isSpecial ? '#ff453a' : mode.isBattle ? '#f43f5e' : 'var(--crystal-cyan)')
                : 'var(--glass-border)'}`,
              borderRadius: '12px',
              color: rankMode === mode.id
                ? (mode.isSpecial ? '#ff453a' : mode.isBattle ? '#f43f5e' : 'var(--crystal-cyan)')
                : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 700,
              boxShadow: rankMode === mode.id
                ? (mode.isSpecial ? '0 0 15px rgba(255, 69, 58, 0.4)' : mode.isBattle ? '0 0 15px rgba(244, 63, 94, 0.35)' : 'var(--glow-cyan)')
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

      </div>

      {rankMode === 'battle' && (
        <div className="glass-card hud-border" style={{
          padding: '1rem 1.2rem',
          marginBottom: '1.5rem',
          borderColor: 'rgba(244, 63, 94, 0.35)',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(255,255,255,0.04))'
        }}>
          <div style={{ color: '#f43f5e', fontWeight: 900, marginBottom: '0.45rem' }}>
            ⚔️ 배틀 아레나 랭킹 기준
          </div>
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.86rem', lineHeight: 1.65 }}>
            순위는 <strong style={{ color: 'var(--text-bright)' }}>배틀 SEI</strong> 높은 순입니다.
            배틀 SEI는 보정 Rating, Wilson 보정 승률, 참여량, 연승을 함께 반영합니다.
            NOVA-7 훈련 기록은 배틀 아레나 순위·공식 승률·연승에서 제외됩니다.
            단순히 전적 수가 많은 순서가 아니며, 3전 미만은 <strong style={{ color: '#fbbf24' }}>배치 중</strong>으로 표시됩니다.
            기존 전적은 있지만 Rating이 아직 동기화되지 않은 경우에는 <strong style={{ color: '#fbbf24' }}>통계 동기화 중</strong>으로 표시하고,
            공식 Rating 계산이 끝난 뒤 순위에 반영합니다.
          </div>
        </div>
      )}

      {showUniverseHighlights && (
        <>
          <div className="ranking-highlights-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}>
            <div className="glass-card hud-border ranking-highlight-panel" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>🏆 이번 주 명예의 전당</h3>
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  최근 {HALL_OF_FAME_LOOKBACK_DAYS}일
                </span>
              </div>
              <div className="ranking-highlight-list" style={{ display: 'grid', gap: '0.8rem' }}>
                  <div className="ranking-highlight-card" style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 800, marginBottom: '0.35rem' }}>친절한 설명상</div>
                  {hallOfFame.bestAnswer?.userId ? (
                    <button
                      type="button"
                      className="ranking-profile-link ranking-profile-link-inline"
                      onClick={(event) => openPublicProfile(event, hallOfFame.bestAnswer.userId)}
                    >
                      {hallOfFame.bestAnswer?.publicProfileSnapshot?.displayName || hallOfFame.bestAnswer?.userName || '아직 선정 중'}
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>아직 선정 중</div>
                  )}
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {hallOfFame.bestAnswer ? (hallOfFame.bestAnswer.content || '').slice(0, 72) : '채택/인증/설명 밀도를 기준으로 계산합니다.'}
                  </div>
                </div>
                <div className="ranking-highlight-card" style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 800, marginBottom: '0.35rem' }}>질문 개척상</div>
                  <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>
                    {hallOfFame.bestQuestion
                      ? getQuestionAnonymousLabel(hallOfFame.bestQuestion)
                      : '아직 선정 중'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {hallOfFame.bestQuestion ? (hallOfFame.bestQuestion.content || '').slice(0, 72) : '질문자는 계속 익명으로 보호됩니다.'}
                  </div>
                </div>
                  <div className="ranking-highlight-card" style={{ padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ color: '#34d399', fontWeight: 800, marginBottom: '0.35rem' }}>급상승 파일럿</div>
                  {hallOfFame.growthStar?.id ? (
                    <button
                      type="button"
                      className="ranking-profile-link ranking-profile-link-inline"
                      onClick={(event) => openPublicProfile(event, hallOfFame.growthStar.id)}
                    >
                      {hallOfFame.growthStar?.publicDisplayName || hallOfFame.growthStar?.studentName || hallOfFame.growthStar?.name || '아직 선정 중'}
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-bright)', fontWeight: 700 }}>아직 선정 중</div>
                  )}
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                    이번 주 성장 +{hallOfFame.growthStar?.weeklyGain || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card hud-border ranking-highlight-panel" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>🛰️ 스터디 크루 리더보드</h3>
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  크루 상위 3팀
                </span>
              </div>
              <div className="ranking-highlight-list ranking-highlight-list--crews" style={{ display: 'grid', gap: '0.75rem' }}>
                {crewLeaderboard.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.86rem' }}>
                    아직 크루가 없습니다. 상점에서 창설권을 구매하고 프로필에서 팀을 만들어보세요.
                  </div>
                ) : crewLeaderboard.map((crew, index) => (
                  <CrewLeaderboardVessel
                    key={crew.crewId}
                    summary={crew}
                    crew={rankingCrewsById[crew.crewId]}
                    rank={index + 1}
                  />
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
        </>
      )}

      <div className="glass-card hud-border ranking-main-area" style={{ 
        padding: '1.5rem', 
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(15px)',
        minHeight: '400px',
        position: 'relative'
      }}>
        <AnimatePresence mode="wait">
            <Motion.div 
              key="ranking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 헤더 행 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: rankMode === 'battle' ? '60px 1.5fr 90px 110px 130px' : '60px 1.5fr 120px 100px 100px',
                padding: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                color: rankMode === 'battle' ? '#f43f5e' : 'var(--crystal-cyan)',
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '1px'
              }}>
                <span>RANK</span>
                <span>PILOT</span>
                {rankMode === 'battle' ? (
                  <>
                    <span style={{ textAlign: 'center' }}>배틀 SEI</span>
                    <span style={{ textAlign: 'center' }}>RATING</span>
                    <span style={{ textAlign: 'right' }}>전적 (승률)</span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                  topUsers.map((u) => {
                    const isMe = u.id === user?.uid
                    const isExpanded = inspectUserId === u.id
                    const growth = rankMode === 'growth' ? (u.weeklyGain || 0) : (u.dailyGain || 0);
                    const tier = u.seiData?.tier || { name: '브론즈 파일럿', color: '#cd7f32', icon: '🚀' };
                    const isPodium = (u.displayRank || 0) <= 3;
                    const hasCustomFrame = u.selectedProfileFrame === 'nebula' || u.selectedProfileFrame === 'solar';
                    const frameTheme = getFrameSurfaceStyles(u.selectedProfileFrame, isExpanded ? 'panel' : 'row')
                    const panelTheme = (isPodium || hasCustomFrame)
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
                        className={`ranking-row${(isMe && !isExpanded && !hasCustomFrame) ? ' ranking-row-me' : ''}`}
                        onClick={() => setInspectUserId(inspectUserId === u.id ? null : u.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: rankMode === 'battle' ? '60px 1.5fr 90px 110px 130px' : '60px 1.5fr 120px 100px 100px',
                          padding: '1.2rem 1rem',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          alignItems: 'center',
                          background: isExpanded
                            ? panelTheme.background
                            : hasCustomFrame
                              ? frameTheme.background
                            : isMe
                              ? 'rgba(0, 243, 255, 0.12)'
                              : 'transparent',
                          boxShadow: isExpanded
                            ? `${panelTheme.glow}, inset 0 0 0 1px rgba(255,255,255,0.03)`
                            : hasCustomFrame
                              ? `${frameTheme.glow}, inset 0 0 0 1px ${frameTheme.borderColor}`
                            : 'none',
                          borderRadius: isExpanded || isMe || hasCustomFrame ? '10px' : '0',
                          margin: isExpanded || isMe || hasCustomFrame ? '5px 0' : '0',
                          borderLeft: isExpanded
                            ? `4px solid ${panelTheme.accent}`
                            : hasCustomFrame
                              ? `4px solid ${frameTheme.accent}`
                            : isMe
                              ? '4px solid var(--crystal-cyan)'
                              : 'none',
                          border: isExpanded
                            ? `1px solid ${panelTheme.borderColor}`
                            : hasCustomFrame
                              ? `1px solid ${frameTheme.borderColor}`
                              : 'none',
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
                        <div className={`ranking-pilot-cell ${isPodium ? 'is-podium' : ''}`}>
                          <div className="ranking-pilot-ship" style={{ '--ranking-ship-accent': tier.color || '#35dfff' }}>
                            <ModularShip
                              userData={u}
                              size={isPodium ? 76 : 68}
                              animate={false}
                              title={`${u.publicDisplayName || u.studentName || u.name || '무명 탐험가'}의 탐사선`}
                            />
                          </div>
                          <div className="ranking-pilot-copy" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className={`ranking-profile-link${(isMe && !isExpanded) ? ' ranking-profile-link-me' : ''}`}
                              onClick={(event) => openPublicProfile(event, u.id)}
                              aria-label={`${u.publicDisplayName || u.studentName || u.name || '무명 탐험가'}님의 탐험기지 보기`}
                              style={{
                                fontSize: '1.1rem',
                                fontWeight: isMe ? 800 : 500,
                                color: isMe ? '#ffffff' : 'rgba(255,255,255,0.9)'
                              }}
                            >
                              {u.publicDisplayName || u.studentName || u.name || '무명 탐험가'}
                            </button>
                            {u.publicSignature && (
                              <span style={{
                                maxWidth: '200px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: (isExpanded || hasCustomFrame) ? `${frameTheme.accent}18` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${(isExpanded || hasCustomFrame) ? frameTheme.borderColor : 'rgba(255,255,255,0.08)'}`,
                                color: (isExpanded || hasCustomFrame) ? frameTheme.text : 'rgba(255,255,255,0.78)',
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
                                background: (isExpanded || hasCustomFrame) ? `${frameTheme.accent}20` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${(isExpanded || hasCustomFrame) ? frameTheme.borderColor : 'rgba(255,255,255,0.08)'}`,
                                color: (isExpanded || hasCustomFrame) ? frameTheme.accent : 'rgba(255,255,255,0.72)',
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
                        </div>

                        {rankMode === 'battle' ? (
                          (() => {
                            const matches = u.totalBattleMatches || 0;
                            const isPlacement = matches > 0 && matches < 3;
                            const noBattle = matches === 0;
                            const battleData = u.seiData?.battleData || {};
                            const displayRating = battleData.battleRating || 0;
                            const isSyncPending = matches > 0 && !battleData.hasExplicitBattleRating;
                            return (
                          <>
                            {/* 배틀 SEI: 배틀 아레나의 실제 순위 기준 */}
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: '#f43f5e', fontWeight: 800, fontSize: '1.05rem' }}>
                                {u.seiData?.battleCompetitive || 0}
                              </span>
                              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                /{BATTLE_MAX_SCORE}
                              </span>
                            </div>
                            {/* 배틀 RATING */}
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: '#f43f5e', fontWeight: 800, fontSize: '1.2rem', textShadow: '0 0 10px rgba(244,63,94,0.3)' }}>
                                {noBattle || isSyncPending ? '—' : displayRating}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                {isSyncPending ? '통계 동기화 중' : 'RATING'}
                              </span>
                            </div>
                            {/* 전적 + 승률 */}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              {noBattle ? (
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.8rem' }}>
                                  미참전
                                </span>
                              ) : (
                                <>
                                  <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {matches}전 {u.totalBattleWins || 0}승 {matches - (u.totalBattleWins || 0) - (u.totalBattleDraws || 0)}패{u.totalBattleDraws ? ` ${u.totalBattleDraws}무` : ''}
                                  </span>
                                  {isPlacement ? (
                                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>
                                      배치 중
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>
                                      승률 {Math.round(((u.totalBattleWins || 0) / matches) * 100)}%
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                            );
                          })()
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                      
                      {/* Inline Expanded Radar Chart */}
                      <AnimatePresence>
                        {isExpanded && (
                          <Motion.div
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
                                  { subject: '집중도(영상)', value: Math.min(100, ((u.seiData?.focus || 0) / FOCUS_MAX_SCORE) * 100) || 0, raw: u.seiData?.focus || 0 },
                                  { subject: '잠재력(성장)', value: Math.min(100, (u.seiData?.growth / 200) * 100) || 0, raw: u.seiData?.growth || 0 },
                                  { subject: '소통(아고라)', value: Math.min(100, (u.seiData?.agora / 200) * 100) || 0, raw: u.seiData?.agora || 0 },
                                  { subject: '전문성(실력)', value: Math.min(100, (u.seiData?.skill / 1000) * 100) || 0, raw: u.seiData?.skill || 0 },
                                  { subject: '배틀(경쟁)', value: Math.min(100, ((u.seiData?.battle || 0) / BATTLE_MAX_SCORE) * 100) || 0, raw: u.seiData?.battle || 0 },
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
                                      : hasCustomFrame
                                        ? (u.selectedProfileFrame === 'nebula'
                                          ? '차분한 보랏빛 프레임을 장착했습니다.'
                                          : '따뜻한 금빛 프레임을 장착했습니다.')
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
                                    onMouseEnter={() => setHoveredMetric('focus')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'focus' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>집중도(영상)</span><strong style={{ color: panelTheme.accent }}>{u.seiData?.focus || 0} pts</strong>
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
                                  <li
                                    onMouseEnter={() => setHoveredMetric('battle')}
                                    onMouseLeave={() => setHoveredMetric(null)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'help', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s', background: hoveredMetric === 'battle' ? `${panelTheme.accent}16` : 'transparent' }}
                                  >
                                    <span>배틀(PVP+AI 훈련)</span>
                                    <strong style={{ color: panelTheme.accent }}>
                                      {u.seiData?.battle || 0} pts
                                      <small style={{ display: 'block', fontWeight: 500, opacity: 0.72 }}>
                                        PVP {u.seiData?.battleCompetitive || 0} + AI {u.seiData?.battleTraining || 0}
                                      </small>
                                    </strong>
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
                                    <Motion.div
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
                                    </Motion.div>
                                  </AnimatePresence>
                                </div>
                              </div>
                              </div>
                            </div>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                      </React.Fragment>
                  )
                })
                )}
              </div>
            </Motion.div>
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

    </Motion.div>
  )
}
