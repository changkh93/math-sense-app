import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../../firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { getTodayKST, getCometTier, getEffectiveStreak } from '../../utils/streakUtils';
import './SpaceJourney.css';

export default function SpaceJourney({ userData }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('constellation');
  const [popover, setPopover] = useState(null); // { dayData, x, y }
  const [transactions, setTransactions] = useState([]);

  const scrollContainerRef = useRef(null);
  const todayKST = getTodayKST();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      try {
        const hQ = query(
          collection(db, 'users', auth.currentUser.uid, 'history'),
          orderBy('timestamp', 'asc')
        );
        const hSnap = await getDocs(hQ);
        setHistory(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch crystal transactions to find Cryo Core usage/purchases
        const tQ = query(
          collection(db, 'users', auth.currentUser.uid, 'crystal_transactions'),
          orderBy('timestamp', 'asc')
        );
        const tSnap = await getDocs(tQ);
        setTransactions(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // 집계 스탯
  const dailyStats = useMemo(() => {
    const map = new Map();
    history.forEach(h => {
      if (!h.timestamp) return;
      const d = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
      const kst = new Date(d.getTime() + 9 * 3600000);
      const dateStr = kst.toISOString().split('T')[0];
      
      const existing = map.get(dateStr) || { 
        quizzes: 0, scoreSum: 0, crystals: 0, perfCount: 0,
        videos: 0, texts: 0, workbooks: 0, isProtected: false
      };

      const hType = h.type || 'quiz';
      if (hType === 'video') {
        existing.videos += 1;
      } else if (hType === 'text') {
        existing.texts += 1;
      } else if (hType === 'workbook') {
        existing.workbooks += 1;
      } else {
        existing.quizzes += 1;
        existing.scoreSum += (h.score || 0);
        if (h.score === 100) existing.perfCount += 1;
      }
      existing.crystals += (h.crystalsEarned || 0);
      
      map.set(dateStr, existing);
    });

    // Mark protected days from transactions
    transactions.forEach(t => {
      if (t.type === 'streak_freeze' && t.timestamp) {
        const d = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        const kst = new Date(d.getTime() + 9 * 3600000);
        const dateStr = kst.toISOString().split('T')[0];
        
        const existing = map.get(dateStr) || { 
          quizzes: 0, scoreSum: 0, crystals: 0, perfCount: 0, isProtected: true
        };
        existing.isProtected = true;
        map.set(dateStr, existing);
      }
    });

    return map;
  }, [history, transactions]);

  // Cryo Core Stats - Inferred from (purchased vs remaining) + logged usage
  const coreStats = useMemo(() => {
    const purchasedFromLogs = transactions.filter(t => 
      t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core'
    ).length;
    
    const usedFromLogs = transactions.filter(t => t.type === 'streak_freeze').length;
    const remaining = userData?.streakFreezeCount || 0;
    
    // Inferred total purchased (at least what we have now + what we know we used)
    const totalPurchased = Math.max(purchasedFromLogs, usedFromLogs + remaining);
    const totalUsed = totalPurchased - remaining;

    return { purchased: totalPurchased, used: totalUsed, remaining };
  }, [transactions, userData?.streakFreezeCount]);

  // Helper: Identify nodes that SHOULD be protected (historical + current gap)
  const nodesWithProtection = useMemo(() => {
    const protectionSet = new Set();

    // 1. From future-format streak_freeze transactions with explicit defendedDates
    transactions.forEach(t => {
      if (t.type === 'streak_freeze' && t.metadata?.defendedDates) {
        t.metadata.defendedDates.forEach(d => protectionSet.add(d));
      }
    });

    // 2. Full timeline reconstruction: find gaps bridged by cores
    //    Walk through all active dates chronologically. If a gap between
    //    two consecutive active dates is small enough (≤ remaining core budget),
    //    those gap days were core-defended.
    const activeDates = Array.from(dailyStats.keys()).sort();
    const totalCoresUsed = coreStats.used;
    let coresRemaining = totalCoresUsed - protectionSet.size;

    if (coresRemaining > 0 && activeDates.length > 1) {
      for (let i = 0; i < activeDates.length - 1 && coresRemaining > 0; i++) {
        const curr = activeDates[i];
        const next = activeDates[i + 1];
        const d1 = new Date(curr + 'T00:00:00+09:00');
        const d2 = new Date(next + 'T00:00:00+09:00');
        const gap = Math.floor((d2 - d1) / 86400000) - 1;

        if (gap > 0 && gap <= coresRemaining) {
          // These gap days were defended by cores
          const scanObj = new Date(curr + 'T12:00:00Z');
          for (let j = 0; j < gap; j++) {
            scanObj.setUTCDate(scanObj.getUTCDate() + 1);
            const dStr = scanObj.toISOString().split('T')[0];
            if (!protectionSet.has(dStr)) {
              protectionSet.add(dStr);
              coresRemaining--;
            }
          }
        }
      }
    }

    // 3. Current gap: if cores are available and there's an active gap right now
    const dbStreakDate = userData?.lastStreakDate;
    const freezeCount = userData?.streakFreezeCount || 0;

    if (dbStreakDate && freezeCount > 0) {
      const diffMs = new Date(todayKST + 'T00:00:00+09:00').getTime() - new Date(dbStreakDate + 'T00:00:00+09:00').getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const missed = diffDays - 1;

      if (missed > 0 && freezeCount >= missed) {
        const gapScanObj = new Date(dbStreakDate + 'T12:00:00Z');
        for (let i = 0; i < missed; i++) {
          gapScanObj.setUTCDate(gapScanObj.getUTCDate() + 1);
          protectionSet.add(gapScanObj.toISOString().split('T')[0]);
        }
      }
    }

    return protectionSet;
  }, [dailyStats, transactions, coreStats.used, userData, todayKST]);

  // 기간 노드 생성 (기록 시작일 ~ 오늘)
  const timelineData = useMemo(() => {
    let minDate = todayKST;
    history.forEach(h => {
      if (!h.timestamp) return;
      const d = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
      const dateStr = new Date(d.getTime() + 9 * 3600000).toISOString().split('T')[0];
      if (dateStr < minDate) minDate = dateStr;
    });

    // Constellation용 timeline (첫 기록이 있던 달의 1일이 포함된 주의 일요일부터)
    const startMonthStr = minDate.slice(0, 7) + '-01';
    // UTC 12시로 고정하여 타임존에 따른 날짜 밀림/당겨짐 현상 완벽 차단
    const startD = new Date(`${startMonthStr}T12:00:00Z`);
    startD.setUTCDate(startD.getUTCDate() - startD.getUTCDay());

    const endD = new Date(`${todayKST}T12:00:00Z`);
    endD.setUTCDate(endD.getUTCDate() + (6 - endD.getUTCDay()));

    const days = [];
    let curr = new Date(startD);
    while (curr <= endD) {
      const dStr = curr.toISOString().split('T')[0];
      const stats = dailyStats.get(dStr);
      days.push({
        date: dStr,
        isActive: !!stats,
        stats: stats || null,
        isToday: dStr === todayKST,
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // 스트릭 및 connectsNext 계산
    let currentStreakCount = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i].isActive) {
        currentStreakCount++;
      } else if (nodesWithProtection.has(days[i].date)) {
        // Protected days maintain the streak, but do not increment it (just like Duo)
        // If it's the very first node, it might be 0, but usually this happens mid-streak.
      } else {
        currentStreakCount = 0;
      }
      days[i].streakRun = currentStreakCount;
      days[i].isProtected = nodesWithProtection.has(days[i].date);

      // Connect if (active or protected) AND next is (active or protected)
      const isCurrentActiveOrProtected = days[i].isActive || days[i].isProtected;
      const isNextActiveOrProtected = i < days.length - 1 && (days[i+1].isActive || nodesWithProtection.has(days[i+1].date));
      
      days[i].connectsNext = isCurrentActiveOrProtected && isNextActiveOrProtected;
    }

    return { minDate, days };
  }, [history, todayKST, dailyStats, nodesWithProtection]);

  // 달력 뷰용 월별 데이터 (일부 최적화)
  const calendarMonths = useMemo(() => {
    if (!timelineData.minDate) return [];
    
    const startY = parseInt(timelineData.minDate.slice(0, 4), 10);
    const startM = parseInt(timelineData.minDate.slice(5, 7), 10);
    const endY = parseInt(todayKST.slice(0, 4), 10);
    const endM = parseInt(todayKST.slice(5, 7), 10);
    
    const months = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const monthStr = `${y}-${m.toString().padStart(2, '0')}`;
      const firstDay = new Date(`${monthStr}-01T12:00:00Z`);
      const padding = firstDay.getUTCDay(); 
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      
      const cDays = [];
      for (let i = 0; i < padding; i++) cDays.push(null);
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${monthStr}-${day.toString().padStart(2, '0')}`;
        // 미래 날짜 방지
        if (dStr > todayKST) break;
        const stats = dailyStats.get(dStr);
        cDays.push({
          date: dStr,
          isActive: !!stats,
          isProtected: nodesWithProtection.has(dStr),
          stats: stats || null,
          isToday: dStr === todayKST
        });
      }
      months.push({ label: monthStr, days: cDays });
      
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  }, [timelineData.minDate, todayKST, dailyStats, nodesWithProtection]);

  // 로딩 후 또는 뷰 모드 변경 시 맨 아랫부분으로 스크롤 (가장 최근)
  useLayoutEffect(() => {
    if (!loading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [loading, viewMode]);

  // 스트릭 소스 (헤더와 동일한 로직 사용으로 완벽한 일치 보장)
  const streak = useMemo(() => {
    return getEffectiveStreak(userData);
  }, [userData]);

  const tier = getCometTier(streak);
  const activeColor = streak > 0 ? tier.color : '#FF9F43';
  const isSupernova = streak >= 100;
  const isNebula = streak >= 30;

  // db의 스트릭이 데이터 기반 계산값보다 낮을 경우 강제 동기화 (헤더 등 상시 노출 영역 정정)
  // ⚠️ IMPORTANT: lastStreakDate는 절대 여기서 수정하지 않음!
  // lastStreakDate를 코어 소모 없이 오늘로 기록하면, 실제 결석일에 코어가 트리거되지 않는 치명적 버그 발생.
  useEffect(() => {
    const syncStreak = async () => {
      if (!auth.currentUser || loading) return;
      if (streak > (userData?.currentStreak || 0)) {
        try {
          const updates = {
            currentStreak: streak,
            longestStreak: Math.max(userData?.longestStreak || 0, streak)
          };
          // lastStreakDate는 실제 학습 완료 시(handleComplete, handleNonQuizActivityComplete)에서만 기록
          await setDoc(doc(db, 'users', auth.currentUser.uid), updates, { merge: true });
          console.log("🔥 SpaceJourney: Out-of-sync streak repaired to", streak, "(lastStreakDate preserved)");
        } catch (err) {
          console.error("Streak sync failed:", err);
        }
      }
    };
    syncStreak();
  }, [streak, userData?.currentStreak, loading]);

  const handleDayClick = (e, day) => {
    const { clientX, clientY } = e;
    const padding = 20;
    // 툴팁이 화면 밖으로 나가는 것 방지
    const x = Math.min(Math.max(clientX, 130), window.innerWidth - 130);
    const y = Math.max(clientY, 200); 

    setPopover({ day, x, y });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>탐사 기록 다운로드 중...</div>;

  const activeDaysCount = timelineData.days.filter(d => d.isActive).length;

  return (
    <div className={`space-journey-container ${isSupernova ? 'supernova-bg' : isNebula ? 'nebula-bg' : ''}`}>
      
      {/* 페이지 타이틀 (다른 시점과 통일) */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '3rem' }}>
        <h2 className="journey-main-title">
           🚀 연속 탐사 궤도 (Streak Journey)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          매일매일 지식의 항로를 불밝히는 당신의 탐사 기록입니다.
        </p>
      </div>

      {/* 요약 스탯 & 뷰 전환 탭 (중앙 배치) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        
        {/* 요약 스탯 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="stat-chip">
            <span>현재 연속</span>
            <span style={{ color: tier.color }}>{streak}일</span>
          </div>
          <div className="stat-chip">
            <span>우주력</span>
            <span>{activeDaysCount}일 탐사</span>
          </div>
          <div className="stat-chip core-analytics" title={`구매: ${coreStats.purchased} | 사용: ${coreStats.used}`}>
            <span>코어 현황</span>
            <span style={{ color: '#00f3ff' }}>🧊 {coreStats.remaining} (보유) / {coreStats.used} (사용)</span>
          </div>
        </div>
        
        {/* 모드 전환 탭 */}
        <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { id: 'constellation', label: '성좌 뷰', icon: '🌌' },
              { id: 'calendar', label: '달력 뷰', icon: '📅' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => { setViewMode(mode.id); setPopover(null); }}
                className={`font-tech ${viewMode === mode.id ? 'active' : ''}`}
                style={{
                  padding: '0.8rem 1.5rem',
                  background: viewMode === mode.id 
                    ? 'rgba(0, 243, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${viewMode === mode.id 
                    ? 'var(--crystal-cyan, #00f3ff)' 
                    : 'var(--glass-border, rgba(255,255,255,0.1))'}`,
                  borderRadius: '12px',
                  color: viewMode === mode.id 
                    ? 'var(--crystal-cyan, #00f3ff)' 
                    : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  boxShadow: viewMode === mode.id 
                    ? 'var(--glow-cyan, 0 0 15px rgba(0, 243, 255, 0.4))' 
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
      </div>

      {/* 팝업 오버레이 */}
      <AnimatePresence>
        {popover && (
          <>
            <div className="popover-overlay" onClick={() => setPopover(null)}></div>
            <motion.div 
              className="hologram-popover"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{ left: popover.x, top: popover.y, transform: 'translate(-50%, -100%)', marginTop: '-15px' }}
            >
              <h4>{popover.day.date}</h4>
              {(popover.day.isActive || popover.day.isProtected) ? (
                <>
                  <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '10px' }}>
                    {popover.day.isProtected ? '🧊 코어 보호 활성화' : '✨ 탐사항해 완료'}
                  </div>
                  <ul className="hologram-details">
                    {popover.day.isActive ? (
                      <>
                        {popover.day.stats.quizzes > 0 && (
                          <li>🧪 탐사 퀴즈: <strong>{popover.day.stats.quizzes}회</strong>{popover.day.stats.perfCount > 0 && <span style={{ color: '#fbbf24', marginLeft: '6px' }}>⭐{popover.day.stats.perfCount}</span>}</li>
                        )}
                        {popover.day.stats.texts > 0 && (
                          <li>📋 데이터 로그: <strong>{popover.day.stats.texts}회</strong></li>
                        )}
                        {popover.day.stats.videos > 0 && (
                          <li>📡 트랜스미션: <strong>{popover.day.stats.videos}회</strong></li>
                        )}
                        {popover.day.stats.workbooks > 0 && (
                          <li>📝 워크북: <strong>{popover.day.stats.workbooks}회</strong></li>
                        )}
                        <li>획득 광석: <strong style={{ color: '#00f3ff' }}>💎{popover.day.stats.crystals}</strong></li>
                      </>
                    ) : (
                      <li>크라이오 코어로 궤도 유지됨</li>
                    )}
                  </ul>
                  {popover.day.streakRun > 0 && (
                    <div style={{ background: 'rgba(0, 243, 255, 0.1)', padding: '5px', textAlign: 'center', marginTop: '10px', color: '#00f3ff', fontWeight: 'bold' }}>
                      {popover.day.streakRun}-Day Streak!
                    </div>
                  )}
                </>
              ) : (
                <div className="popover-status">
                  <span style={{ fontSize: '1.5rem', display: 'block' }}>🌑</span>
                  이 날은 탐사 기록이 없습니다.
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 메인 뷰 영역 (Ranking 카드 스타일과 통일) */}
      <div className="journey-view-container">
        <div className="glass-card hud-border journey-card">
          <div className="journey-scroll-area" ref={scrollContainerRef}>
            {viewMode === 'constellation' ? (
              <ConstellationView nodes={timelineData.days} tier={tier} activeColor={activeColor} onStarClick={handleDayClick} />
            ) : (
              <TraditionalCalendarView months={calendarMonths} tier={tier} activeColor={activeColor} onDayClick={handleDayClick} />
            )}
          </div>
        </div>
      </div>

      <BottomStreakBanner streak={streak} tier={tier} activeColor={activeColor} timelineDays={timelineData.days} />
    </div>
  );
}

// ------------------------------------------
// 서브 컴포넌트: Bottom Streak Banner (듀오링고 스타일)
// ------------------------------------------
function BottomStreakBanner({ streak, tier, activeColor, timelineDays }) {
  const thisWeek = timelineDays.slice(-7);
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="streak-bottom-banner">
       <div className="streak-banner-header">
          <div className="streak-flame" style={{ filter: `drop-shadow(0 0 10px ${tier.color})`, opacity: streak > 0 ? 1 : 0.5 }}>
             {streak > 0 ? '🔥' : '🌑'}
          </div>
          <h2 style={{ color: streak > 0 ? tier.color : '#94a3b8' }}>
            {streak > 0 
              ? (thisWeek.find(d => d.isToday)?.isProtected ? `🧊 코어 보호 중 (${streak}일)` : `${streak}일 연속 탐사!`) 
              : "오늘의 탐사를 시작해보세요!"}
          </h2>
       </div>
       
       <div className="streak-week-bar">
          <div className="week-columns">
             {dayLabels.map((wd, i) => {
                const d = thisWeek[i];
                const isActive = d?.isActive;
                const isProtected = d?.isProtected;
                const isToday = d?.isToday;
                const color = isActive ? activeColor : (isProtected ? 'rgba(0, 243, 255, 0.4)' : 'rgba(255,255,255,0.08)');
                
                return (
                  <div key={wd} className="day-column">
                    <span className={`day-label ${isToday ? 'banner-today-label' : ''}`}>{wd}</span>
                    <div className={`bar-segment ${isActive ? 'active' : ''} ${isProtected ? 'protected' : ''}`} style={{ backgroundColor: color }}>
                       {isToday && <div className="today-indicator" style={{ borderColor: isProtected ? 'var(--crystal-cyan)' : activeColor }} />}
                       {isActive && <div className="bar-glow" style={{ boxShadow: `0 0 10px ${activeColor}` }}></div>}
                       {isProtected && <div className="freeze-icon" style={{ fontSize: '0.8rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>🧊</div>}
                    </div>
                  </div>
                );
             })}
          </div>
       </div>
        <p className="banner-cheer">
         {thisWeek.find(d => d.isToday)?.isProtected ? "활동을 쉬어가는 날입니다. 크라이오 코어가 궤도를 보호하고 있어요!" :
          streak >= 7 ? "와우! 일주일 내내 완벽한 연속 학습을 달성했어요!" : 
          streak > 0 ? "매일매일 새로운 지식의 항로를 개척하고 있어요!" :
          "단원을 완료하고 지식의 궤적에 처음으로 불을 밝혀보세요!"}
       </p>
    </div>
  )
}

// ------------------------------------------
// 서브 컴포넌트: Constellation View (성좌 뷰)
// ------------------------------------------
function ConstellationView({ nodes, tier, activeColor, onStarClick }) {
  const ROW_HEIGHT = 100;
  const paddingX = 200;
  const contentWidth = 700;
  const totalWeeks = Math.ceil(nodes.length / 7);
  const svgHeight = totalWeeks * ROW_HEIGHT + 150;

  const nodePositions = useMemo(() => {
    return nodes.map((n, i) => {
      const wIdx = Math.floor(i / 7);
      const dIdx = i % 7;
      
      const spacingX = contentWidth / 6;
      const x = paddingX + dIdx * spacingX;
      
      // y 좌표에 약간의 물결 치는 궤도 효과를 주어 너무 정형된 그리드처럼 보이지 않게
      const yOffset = Math.sin((wIdx + dIdx) * 0.5) * 15;
      const y = 100 + wIdx * ROW_HEIGHT + yOffset;

      return { ...n, x, y, wIdx, dIdx };
    });
  }, [nodes]);

  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // 월 구분 마커 추적
  let currentMonth = '';
  const monthsData = [];
  
  nodePositions.forEach((node, i) => {
    const m = node.date.slice(0, 7);
    if (m !== currentMonth) {
      currentMonth = m;
      
      const last = monthsData[monthsData.length - 1];
      // 같은 주(wIdx)에 달이 바뀌면 안 겹치도록 기존 월을 덮어씀 (예: 1월 31일 패딩)
      if (last && last.wIdx === node.wIdx) {
        last.month = m;
      } else {
        // 각 월의 첫 주 라디우스 근처에 Y 앵커 지정
        monthsData.push({ month: m, y: node.y, wIdx: node.wIdx });
      }
    }
  });

  return (
    <div className="constellation-wrapper" style={{ height: svgHeight }}>
      <svg width="100%" height={svgHeight} viewBox={`0 0 1000 ${svgHeight}`}>
        <defs>
          <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="comet-trail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={activeColor} stopOpacity="0.1" />
            <stop offset="50%" stopColor={activeColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* 전체 요일 헤더 (루프 밖에서 한 번만 렌더링) */}
        <g className="global-weekdays">
          {weekdays.map((wd, dIdx) => (
            <text 
              key={wd} 
              x={paddingX + dIdx * (contentWidth / 6)} 
              y={45} 
              fill="#64748b" 
              fontSize="12" 
              fontWeight="bold" 
              textAnchor="middle"
              style={{ letterSpacing: '2px' }}
            >
              {wd}
            </text>
          ))}
          <line x1="120" y1="65" x2="950" y2="65" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </g>

        {/* 월 표시(좌측) 및 가로 구분선 */}
        {monthsData.map((mData, idx) => {
          const isFirstMonth = idx === 0;
          return (
            <g key={`month-${mData.month}`}>
              {/* 왼쪽의 월 타이틀 */}
              <text x="30" y={mData.y - 10} fill="#fff" fontSize="24" fontWeight="900" style={{ letterSpacing: '2px', textShadow: '0 0 10px rgba(0,243,255,0.4)' }}>
                {mData.month.slice(5, 7)}월
              </text>
              <text x="30" y={mData.y + 15} fill="#64748b" fontSize="14" style={{ letterSpacing: '1px' }}>
                {mData.month.slice(0, 4)}
                {isFirstMonth && <tspan fill="rgba(0,243,255,0.8)" fontSize="12" dx="5"> (시작점)</tspan>}
              </text>

              {/* 가로 구분선 (첫 달이 아닐 때만) */}
              {!isFirstMonth && (
                <line x1="120" y1={mData.y - 30} x2="950" y2={mData.y - 30} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
              )}
            </g>
          );
        })}

        {/* 빛의 궤적 선분 (Lines) */}
        {nodePositions.map((node, i) => {
          if (node.connectsNext) {
            const next = nodePositions[i + 1];
            return (
              <motion.line
                key={`line-${i}`}
                x1={node.x} y1={node.y} x2={next.x} y2={next.y}
                stroke="url(#comet-trail)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                style={{ filter: "url(#glow-star)" }}
              />
            );
          }
          return null;
        })}

        {/* 별 (Nodes) */}
        {nodePositions.map((node, i) => {
          // 크기와 광채(히트맵) 계산
          const crystals = node.stats?.crystals || 0;
          let r = 8;
          let glowIntensity = 1;

          if (crystals > 50) { r = 14; glowIntensity = 1.5; }
          else if (crystals > 20) { r = 11; glowIntensity = 1.2; }
          else if (crystals > 0) { r = 9; glowIntensity = 1; }

          return (
            <g
              key={`star-${i}`} 
              transform={`translate(${node.x}, ${node.y})`} 
              className={`star-node ${(node.isActive || node.isProtected) ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => onStarClick(e, node)}
            >
              {(node.isActive || node.isProtected) ? (
                <>
                  <circle 
                    r={r} 
                    fill={node.isProtected ? 'rgba(0, 243, 255, 0.3)' : activeColor} 
                    className="core" 
                    filter="url(#glow-star)" 
                    opacity={glowIntensity}
                    style={{ stroke: node.isProtected ? 'var(--crystal-cyan)' : 'none', strokeWidth: 2 }}
                  />
                  {/* 별빛 중심점 - Only for active stars, Use ice for protected */}
                  {node.isProtected ? (
                    <text textAnchor="middle" dy=".3em" fontSize={r} style={{ pointerEvents: 'none' }}>🧊</text>
                  ) : (
                    <path 
                      d={`M0,-${r/1.5} L${r/3},-${r/3} L${r/1.5},0 L${r/3},${r/3} L0,${r/1.5} L-${r/3},${r/3} L-${r/1.5},0 L-${r/3},-${r/3} Z`}
                      fill="#fff" 
                      transform="scale(1.2)"
                    />
                  )}
                  {node.isToday && (
                    <circle r={r + 8} fill="none" strokeWidth="2" stroke={activeColor} opacity="0.6">
                      <animate attributeName="r" values={`${r+4};${r+12};${r+4}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </>
              ) : (
                // 미학습일: 희미한 점
                <circle r="3" fill="rgba(255,255,255,0.1)" />
              )}

              {/* 밝게 보이는 날짜 텍스트 */}
              <text 
                y={(node.isActive || node.isProtected) ? r + 16 : 12} 
                textAnchor="middle" 
                fill={(node.isActive || node.isProtected) ? '#e2e8f0' : '#475569'} 
                fontSize={(node.isActive || node.isProtected) ? "12" : "11"} 
                fontWeight={(node.isActive || node.isProtected) ? '800' : 'normal'} 
                style={{ pointerEvents: 'none' }}
              >
                {node.date.slice(8, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ------------------------------------------
// 서브 컴포넌트: Traditional Calendar View (달력 뷰)
// ------------------------------------------
function TraditionalCalendarView({ months, tier, activeColor, onDayClick }) {
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="calendar-view-wrapper">
      {months.map((m, idx) => (
        <div key={`month-${idx}`} className="cal-month-block">
          <h3 className="cal-month-title">{m.label.replace('-', '년 ')}월</h3>
          
          <div className="cal-grid">
            {weekdays.map(wd => <div key={wd} className="cal-weekday">{wd}</div>)}
            
            {m.days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="cal-cell empty"></div>;
              
              // 색상 투명도로 활동 강도 표시 (히트맵)
              const intensity = day.isActive ? 0.3 + Math.min((day.stats?.crystals || 0) / 100, 0.7) : 0;

               return (
                <div 
                  key={day.date} 
                  className={`cal-cell clickable ${day.isActive ? 'active' : ''} ${day.isProtected ? 'protected' : ''} ${day.isToday ? 'today' : ''}`}
                  onClick={(e) => onDayClick(e, day)}
                >
                  <span className="cal-date-num">{parseInt(day.date.slice(8, 10), 10)}</span>
                  {day.isActive && (
                    <div 
                      className="cal-intensity-bg" 
                      style={{ background: activeColor, opacity: intensity }}
                    />
                  )}
                  {day.isProtected && <div className="freeze-icon-mini">🧊</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
