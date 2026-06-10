import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getTodayKST, getCometTier, getEffectiveStreak, extractDefendedDates } from '../../utils/streakUtils';
import { isRestDay } from '../../utils/holidayUtils';
import './SpaceJourney.css';

const JOURNEY_MAX_RENDER_DAYS = 540;
const JOURNEY_LOADING_FAILSAFE_MS = 8000;

function hasLearningActivity(stats) {
  if (!stats) return false;
  return (stats.quizzes || 0) > 0 || (stats.videos || 0) > 0 || (stats.texts || 0) > 0 || (stats.workbooks || 0) > 0;
}

function getActiveDatesFromDailyStats(dailyStats) {
  return new Set(
    Array.from(dailyStats.entries())
      .filter(([, stats]) => hasLearningActivity(stats))
      .map(([date]) => date)
  );
}

function getActiveDailyStats(dailyStats) {
  return new Map(
    Array.from(dailyStats.entries())
      .filter(([, stats]) => hasLearningActivity(stats))
  );
}

function addDaysKST(dateStr, delta) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split('T')[0];
}

function shiftMonth(monthStr, delta) {
  const d = new Date(`${monthStr}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return `${year}년 ${month}월`;
}

function getMonthWindow(monthStr) {
  const monthStart = new Date(`${monthStr}-01T12:00:00Z`);
  const start = new Date(monthStart);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const end = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 12));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function SpaceJourney({ userData, initialHistory, initialTransactions, parentLoading }) {
  const [history, setHistory] = useState(initialHistory || []);
  const [loading, setLoading] = useState(parentLoading || !initialHistory);
  
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('metasense_journey_view_mode') || 'calendar';
  });
  const [popover, setPopover] = useState(null); // { dayData, x, y }
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [selectedMonth, setSelectedMonth] = useState(() => getTodayKST().slice(0, 7));

  const scrollContainerRef = useRef(null);
  const todayKST = getTodayKST();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
        scrollContainerRef.current.scrollLeft = 0;
      }
    });
  }, []);

  useEffect(() => {
    if (!loading) return undefined;

    const timer = setTimeout(() => {
      console.warn('[SpaceJourney] Loading timed out. Rendering with available local data.');
      setLoading(false);
    }, JOURNEY_LOADING_FAILSAFE_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (parentLoading) {
      setLoading(true);
      return;
    }

    const fetchHistory = async () => {
      // If props were provided, we don't need to fetch again
      if (initialHistory && initialTransactions) {
        setLoading(false);
        return;
      }

      if (!auth.currentUser) {
        // If auth isn't ready yet, we wait. 
        // Component will re-run when auth.currentUser changes.
        return;
      }
      
      try {
        setLoading(true);
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
        setHistory([]);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [parentLoading, auth.currentUser?.uid]);

  // Sync props from parent when parent finishes loading
  useEffect(() => {
    if (!parentLoading && initialHistory) {
      setHistory(initialHistory);
    }
  }, [parentLoading, initialHistory]);

  useEffect(() => {
    if (!parentLoading && initialTransactions) {
      setTransactions(initialTransactions);
    }
  }, [parentLoading, initialTransactions]);

  // 집계 스탯
  const dailyStats = useMemo(() => {
    const map = new Map();
    history.forEach(h => {
      if (!h.timestamp) return;
      const d = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
      const dateStr = getTodayKST(d);
      
      const existing = map.get(dateStr) || { 
        quizzes: 0, scoreSum: 0, crystals: 0, perfCount: 0,
        videos: 0, texts: 0, workbooks: 0
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

    // Mark protected days and fallback activities from transactions
    transactions.forEach(t => {
      if (!t.timestamp) return;
      const d = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
      const dateStr = getTodayKST(d);
      
      const existing = map.get(dateStr) || { 
        quizzes: 0, scoreSum: 0, crystals: 0, perfCount: 0,
        videos: 0, texts: 0, workbooks: 0
      };

      if (t.type === 'streak_freeze') {
        return;
      } else if (t.type === 'transmission_reward' || t.type === 'data_log_reward') {
        // Fallback for missing history logs
        // Note: We use a simple count if history didn't record it
        const historyOnDate = history.some(h => getTodayKST(h.timestamp?.toDate?.() || h.timestamp) === dateStr);
        if (!historyOnDate) {
          if (t.type === 'transmission_reward') existing.videos += 1;
          if (t.type === 'data_log_reward') existing.texts += 1;
          existing.crystals += (t.amount || 0);
        }
      }
      
      map.set(dateStr, existing);
    });

    return map;
  }, [history, transactions]);

  // Cryo Core Stats - Inferred from (purchased vs remaining) + logged usage
  const coreStats = useMemo(() => {
    const purchasedFromLogs = transactions.filter(t => 
      t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core'
    ).length;
    
    const usedFromLogs = extractDefendedDates(transactions, {}, getActiveDailyStats(dailyStats)).size;
    const remaining = userData?.streakFreezeCount || 0;
    
    // Inferred total purchased (at least what we have now + what we know we used)
    const totalPurchased = Math.max(purchasedFromLogs, usedFromLogs + remaining);
    const totalUsed = totalPurchased - remaining;

    return { purchased: totalPurchased, used: totalUsed, remaining };
  }, [transactions, userData?.streakFreezeCount, dailyStats]);

  // Helper: Identify nodes that SHOULD be protected (historical + current gap)
  const baseNodesWithProtection = useMemo(() => {
    return extractDefendedDates(transactions, userData, getActiveDailyStats(dailyStats));
  }, [dailyStats, transactions, userData]);

  // DB Source-of-truth correction:
  // If the DB says the streak is higher than what raw history proves (due to an admin or system override),
  // we conceptually "protect" the missing days backwards from lastStreakDate so the visual graph connects.
  const nodesWithProtection = useMemo(() => {
    const activeDates = getActiveDatesFromDailyStats(dailyStats);
    
    // Use the base calculation to see what the raw history yields
    // Important: Don't import calculateStreakFromHistory since not imported directly, just use logic or getEffectiveStreak
    const rawCalcStreak = getEffectiveStreak(userData, { activeDates, defendedDates: baseNodesWithProtection }, todayKST);
    const dbStreak = getEffectiveStreak(userData, null, todayKST); // Calculates pure DB value from header logic

    if (dbStreak > rawCalcStreak && userData?.lastStreakDate) {
      const newDefended = new Set(baseNodesWithProtection);
      let cursor = userData.lastStreakDate;
      let count = 0;
      let failsafe = 0;

      // Bridging backwards from the last logged streak date
      while (count < dbStreak && failsafe < 365) {
        if (!dailyStats.has(cursor) && !isRestDay(cursor)) {
          newDefended.add(cursor); // Missing day -> Virtual Protection (🧊)
        }
        // Keep moving backwards. Even if it was active or newly defended, it counts towards the streak run
        count++;
        cursor = addDaysKST(cursor, -1);
        failsafe++;
      }
      return newDefended;
    }
    return baseNodesWithProtection;
  }, [userData, dailyStats, baseNodesWithProtection, todayKST]);

  const journeyStreak = useMemo(() => {
    const activeDates = getActiveDatesFromDailyStats(dailyStats);
    const historyStreak = getEffectiveStreak(userData, { activeDates, defendedDates: nodesWithProtection }, todayKST);
    const cachedStreak = getEffectiveStreak(userData, null, todayKST);

    // The journey screen has the full local history. If the cached user doc is stale,
    // prefer the deterministic reconstruction rather than showing a misleading 1-day streak.
    return Math.max(cachedStreak, historyStreak);
  }, [userData, dailyStats, nodesWithProtection, todayKST]);

  // 기간 노드 생성 (기록 시작일 ~ 오늘)
  const timelineData = useMemo(() => {
    if (!todayKST) return { minDate: '', days: [] };

    let minDate = todayKST;
    const oldestRenderableDate = addDaysKST(todayKST, -(JOURNEY_MAX_RENDER_DAYS - 1));
    const activeDates = Array.from(getActiveDatesFromDailyStats(dailyStats)).sort();
    const lastJourneyDate = userData?.lastStreakDate || activeDates[activeDates.length - 1] || todayKST;

    if (journeyStreak > 0 && lastJourneyDate) {
      const streakStartStr = addDaysKST(lastJourneyDate, -(journeyStreak - 1));
      if (streakStartStr < minDate) minDate = streakStartStr;
    }

    history.forEach(h => {
      if (!h.timestamp) return;
      const d = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
      if (isNaN(d.getTime())) return;
      const dateStr = getTodayKST(d);
      if (dateStr < minDate) minDate = dateStr;
    });

    if (minDate < oldestRenderableDate) {
      minDate = oldestRenderableDate;
    }

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
      const isRest = isRestDay(dStr);
      days.push({
        date: dStr,
        isActive: hasLearningActivity(stats),
        isRestDay: isRest,
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
      } else if (nodesWithProtection.has(days[i].date) || days[i].isRestDay) {
        // Protected days maintain the streak, but do not increment it (just like Duo)
        // Rest days also maintain the streak by policy: weekends and holidays do not break continuity.
      } else if (days[i].date < todayKST) {
        // 어제가 마지막이었고 오늘 아직 안 했더라도, 오늘이 지나기 전까지는 스트릭 유지 (Duo 스타일)
        currentStreakCount = 0;
      }
      days[i].streakRun = currentStreakCount;
      days[i].isProtected = nodesWithProtection.has(days[i].date) && !days[i].isRestDay;
      days[i].isRestBridge = days[i].isRestDay && days[i].date <= todayKST && currentStreakCount > 0;

      // Connect learned/protected days through rest days without treating rest days as core defense.
      const isCurrentStreakNode = days[i].isActive || days[i].isProtected || days[i].isRestBridge;
      const isNextStreakNode = i < days.length - 1 && (
        days[i+1].isActive ||
        (nodesWithProtection.has(days[i+1].date) && !days[i+1].isRestDay) ||
        (days[i+1].isRestDay && days[i+1].date <= todayKST && currentStreakCount > 0)
      );
      
      days[i].connectsNext = isCurrentStreakNode && isNextStreakNode;
    }

    return { minDate, days };
  }, [history, todayKST, dailyStats, nodesWithProtection, userData, journeyStreak]);

  const availableMonths = useMemo(() => {
    if (!timelineData.minDate) return [todayKST.slice(0, 7)];

    const months = [];
    let cursor = timelineData.minDate.slice(0, 7);
    const endMonth = todayKST.slice(0, 7);
    let failsafe = 0;

    while (cursor <= endMonth && failsafe < 240) {
      months.push(cursor);
      cursor = shiftMonth(cursor, 1);
      failsafe++;
    }

    return months;
  }, [timelineData.minDate, todayKST]);

  useEffect(() => {
    if (!availableMonths.length) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  const visibleTimelineDays = useMemo(() => {
    const { startDate, endDate } = getMonthWindow(selectedMonth);
    const days = timelineData.days
      .filter(day => day.date >= startDate && day.date <= endDate)
      .map(day => ({ ...day }));

    if (days.length > 0) {
      days[days.length - 1].connectsNext = false;
    }

    return days;
  }, [timelineData.days, selectedMonth]);

  // 달력 뷰용 월별 데이터 (일부 최적화)
  const calendarMonths = useMemo(() => {
    if (!timelineData.minDate) return [];
    const timelineDayByDate = new Map(timelineData.days.map(day => [day.date, day]));
    
    const y = parseInt(selectedMonth.slice(0, 4), 10);
    const m = parseInt(selectedMonth.slice(5, 7), 10);
    
    const months = [];
    const monthStr = selectedMonth;
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
      const timelineDay = timelineDayByDate.get(dStr);
      cDays.push({
        date: dStr,
        isActive: hasLearningActivity(stats),
        isRestDay: isRestDay(dStr),
        isProtected: timelineDay?.isProtected || false,
        isRestBridge: timelineDay?.isRestBridge || false,
        streakRun: timelineDay?.streakRun || 0,
        stats: stats || null,
        isToday: dStr === todayKST
      });
    }
    months.push({ label: monthStr, days: cDays });

    return months;
  }, [timelineData, todayKST, dailyStats, selectedMonth]);

  // 뷰 전환 시 내부 패널의 시작 지점부터 보이게 유지한다.
  // 모바일에서는 자동 하단 스크롤이 성좌 그래프를 화면 아래로 밀어 보이게 만든다.
  useLayoutEffect(() => {
    if (!loading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [loading, viewMode]);

  // Journey has full history locally, so display the reconstructed value when cached user data is stale.
  const streak = journeyStreak;

  const tier = getCometTier(streak);
  const activeColor = streak > 0 ? tier.color : '#FF9F43';
  const isSupernova = streak >= 100;
  const isNebula = streak >= 30;

  // removed destructive syncStreak loop. DB is the source of truth for streak numbers.

  const handleDayClick = (e, day) => {
    const { clientX, clientY } = e;
    const padding = 20;
    // 툴팁이 화면 밖으로 나가는 것 방지
    const x = Math.min(Math.max(clientX, 130), window.innerWidth - 130);
    const y = Math.max(clientY, 200); 

    setPopover({ day, x, y });
  };

  if (loading) {
    return (
      <div className="journey-loading-container">
        <div className="journey-loader"></div>
        <div className="journey-loading-text">탐선 항로 데이터 복구 중...</div>
      </div>
    );
  }

  const activeHistory = history.filter(h => h.timestamp);
  if (activeHistory.length === 0 && transactions.length === 0 && streak <= 0) {
    return (
      <div className="space-journey-container empty-journey">
        <div className="journey-empty-card glass-card hud-border">
          <div className="empty-icon">🌑</div>
          <h3>아직 탐사 기록이 없습니다</h3>
          <p>첫 단원을 완료하고 지식의 혜성 궤도를 활성화해보세요!</p>
          <button className="font-tech" onClick={() => (window.location.href = '/')}>
            탐사 시작하기
          </button>
        </div>
      </div>
    );
  }

  const activeDaysCount = timelineData.days.filter(d => d.isActive).length;
  const selectedMonthActiveDaysCount = visibleTimelineDays.filter(d => d.date.startsWith(selectedMonth) && d.isActive).length;
  const selectedMonthIndex = availableMonths.indexOf(selectedMonth);
  const canGoPrevMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < availableMonths.length - 1;

  return (
    <div className={`space-journey-container ${isSupernova ? 'journey-supernova-bg' : isNebula ? 'journey-nebula-bg' : ''}`}>
      
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
        
        <div className="journey-month-nav" aria-label="월 이동">
          <button
            type="button"
            className="month-nav-btn"
            disabled={!canGoPrevMonth}
            onClick={() => {
              if (!canGoPrevMonth) return;
              setPopover(null);
              setSelectedMonth(availableMonths[selectedMonthIndex - 1]);
            }}
          >
            이전 달
          </button>
          <div className="month-nav-current">
            <strong>{formatMonthLabel(selectedMonth)}</strong>
            <span>{selectedMonthActiveDaysCount}일 탐사 표시 중</span>
          </div>
          <button
            type="button"
            className="month-nav-btn"
            disabled={!canGoNextMonth}
            onClick={() => {
              if (!canGoNextMonth) return;
              setPopover(null);
              setSelectedMonth(availableMonths[selectedMonthIndex + 1]);
            }}
          >
            다음 달
          </button>
        </div>

        {/* 모드 전환 탭 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { id: 'constellation', label: '성좌 뷰', icon: '🌌' },
              { id: 'calendar', label: '달력 뷰', icon: '📅' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  setViewMode(mode.id);
                  localStorage.setItem('metasense_journey_view_mode', mode.id);
                  setPopover(null);
                }}
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
              {(popover.day.isActive || popover.day.isProtected || popover.day.isRestBridge) ? (
                <>
                  <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '10px' }}>
                    {popover.day.isActive && popover.day.isProtected
                      ? '✨ 탐사항해 완료 + 🧊 코어 사용 기록'
                      : popover.day.isActive
                        ? '✨ 탐사항해 완료'
                        : popover.day.isProtected
                          ? '🧊 코어 보호 활성화'
                          : '🌙 휴식일 - 연속일 유지'}
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
                    ) : popover.day.isProtected ? (
                      <li>크라이오 코어로 궤도 유지됨</li>
                    ) : popover.day.isRestBridge ? (
                      <li>주말/공휴일은 코어를 쓰지 않고 연속일을 유지합니다.</li>
                    ) : null}
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
        <div className="journey-card">
          <div className="journey-scroll-area" ref={scrollContainerRef}>
            {viewMode === 'constellation' ? (
              <ConstellationView nodes={visibleTimelineDays} displayMonth={selectedMonth} tier={tier} activeColor={activeColor} onStarClick={handleDayClick} />
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
  const today = thisWeek.find(d => d.isToday);

  return (
    <div className="streak-bottom-banner">
       <div className="streak-banner-header">
          <div className="streak-flame" style={{ filter: `drop-shadow(0 0 10px ${tier.color})`, opacity: streak > 0 ? 1 : 0.5 }}>
             {streak > 0 ? '🔥' : '🌑'}
          </div>
          <h2 style={{ color: streak > 0 ? tier.color : '#94a3b8' }}>
            {streak > 0 
              ? (today?.isProtected
                ? `🧊 코어 보호 중 (${streak}일)`
                : today?.isRestBridge
                  ? `🌙 휴식일 (${streak}일 유지)`
                  : `${streak}일 연속 탐사!`)
              : "오늘의 탐사를 시작해보세요!"}
          </h2>
       </div>
       
       <div className="streak-week-bar">
          <div className="week-columns">
             {dayLabels.map((wd, i) => {
                const d = thisWeek[i];
                const isActive = d?.isActive;
                const isProtected = d?.isProtected;
                const isRestBridge = d?.isRestBridge;
                const isToday = d?.isToday;
                const color = isActive
                  ? activeColor
                  : isProtected
                    ? 'rgba(0, 243, 255, 0.4)'
                    : isRestBridge
                      ? 'rgba(148, 163, 184, 0.22)'
                      : 'rgba(255,255,255,0.08)';
                
                return (
                  <div key={wd} className="day-column">
                    <span className={`day-label ${isToday ? 'banner-today-label' : ''}`}>{wd}</span>
                    <div className={`bar-segment ${isActive ? 'active' : ''} ${isProtected ? 'protected' : ''} ${isRestBridge ? 'rest-bridge' : ''}`} style={{ backgroundColor: color }}>
                       {isToday && <div className="today-indicator" style={{ borderColor: isProtected ? 'var(--crystal-cyan)' : activeColor }} />}
                       {isActive && <div className="bar-glow" style={{ boxShadow: `0 0 10px ${activeColor}` }}></div>}
                       {isProtected && <div className="freeze-icon" style={{ fontSize: '0.8rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>🧊</div>}
                       {!isProtected && isRestBridge && <div className="rest-icon" style={{ fontSize: '0.7rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#cbd5e1' }}>휴</div>}
                    </div>
                  </div>
                );
             })}
          </div>
       </div>
        <p className="banner-cheer">
         {today?.isProtected ? "크라이오 코어가 평일 공백을 방어하고 있어요!" :
          today?.isRestBridge ? "주말/공휴일은 쉬어도 연속일이 유지됩니다. 코어는 사용하지 않아요." :
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
function ConstellationView({ nodes, displayMonth, tier, activeColor, onStarClick }) {
  const [isMobileConstellation, setIsMobileConstellation] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    const handleResize = () => {
      setIsMobileConstellation(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ROW_HEIGHT = isMobileConstellation ? 58 : 100;
  const viewBoxWidth = isMobileConstellation ? 420 : 1000;
  const paddingX = isMobileConstellation ? 64 : 200;
  const contentWidth = isMobileConstellation ? 318 : 700;
  const monthLabelX = isMobileConstellation ? 8 : 30;
  const monthLineStartX = isMobileConstellation ? 58 : 120;
  const monthLineEndX = isMobileConstellation ? 410 : 950;
  const startY = isMobileConstellation ? 62 : 100;
  const headerY = isMobileConstellation ? 24 : 45;
  const headerLineY = isMobileConstellation ? 38 : 65;
  const totalWeeks = Math.ceil(nodes.length / 7);
  const svgHeight = totalWeeks * ROW_HEIGHT + (isMobileConstellation ? 80 : 150);

  const nodePositions = useMemo(() => {
    return nodes.map((n, i) => {
      const wIdx = Math.floor(i / 7);
      const dIdx = i % 7;
      
      const spacingX = contentWidth / 6;
      const x = paddingX + dIdx * spacingX;
      
      // y 좌표에 약간의 물결 치는 궤도 효과를 주어 너무 정형된 그리드처럼 보이지 않게
      const yOffset = Math.sin((wIdx + dIdx) * 0.5) * 15;
      const y = startY + wIdx * ROW_HEIGHT + yOffset;

      return { ...n, x, y, wIdx, dIdx };
    });
  }, [nodes, ROW_HEIGHT, paddingX, contentWidth, startY]);

  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const monthsData = nodePositions.length > 0
    ? [{ month: displayMonth || nodePositions[0].date.slice(0, 7), y: nodePositions[0].y, wIdx: nodePositions[0].wIdx }]
    : [];

  return (
    <div className="constellation-wrapper">
      <svg
        width="100%"
        viewBox={`0 0 ${viewBoxWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMin meet"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        style={{ display: 'block', height: 'auto' }}
      >
        <defs>
          <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
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
              y={headerY} 
              fill="#64748b" 
              fontSize={isMobileConstellation ? 7 : 12}
              fontWeight="bold" 
              textAnchor="middle"
              style={{ letterSpacing: isMobileConstellation ? '1px' : '2px' }}
            >
              {wd}
            </text>
          ))}
          <line x1={monthLineStartX} y1={headerLineY} x2={monthLineEndX} y2={headerLineY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </g>

        {/* 월 표시(좌측) 및 가로 구분선 */}
        {monthsData.map((mData, idx) => {
          const isFirstMonth = idx === 0;
          return (
            <g key={`month-${mData.month}`}>
              {/* 왼쪽의 월 타이틀 */}
              <text x={monthLabelX} y={mData.y - 10} fill="#fff" fontSize={isMobileConstellation ? 11 : 24} fontWeight="900" style={{ letterSpacing: isMobileConstellation ? '1px' : '2px', textShadow: '0 0 10px rgba(0,243,255,0.4)' }}>
                {mData.month.slice(5, 7)}월
              </text>
              <text x={monthLabelX} y={mData.y + (isMobileConstellation ? 5 : 15)} fill="#64748b" fontSize={isMobileConstellation ? 8 : 14} style={{ letterSpacing: '1px' }}>
                {mData.month.slice(0, 4)}
                {isFirstMonth && !isMobileConstellation && <tspan fill="rgba(0,243,255,0.8)" fontSize="12" dx="5"> (시작점)</tspan>}
              </text>

              {/* 가로 구분선 (첫 달이 아닐 때만) */}
              {!isFirstMonth && (
                <line x1={monthLineStartX} y1={mData.y - 30} x2={monthLineEndX} y2={mData.y - 30} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
              )}
            </g>
          );
        })}

        {/* 빛의 궤적 선분 (Lines) */}
        {nodePositions.map((node, i) => {
          const next = nodePositions[i + 1];
          if (node.connectsNext && next) {
            return (
              <motion.line
                key={`line-${i}`}
                x1={node.x} y1={node.y} x2={next.x} y2={next.y}
                stroke="url(#comet-trail)"
                strokeWidth={isMobileConstellation ? 2.4 : 4}
                strokeLinecap="round"
                opacity="0.8"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />
            );
          }
          return null;
        })}

        {/* 별 (Nodes) */}
        {nodePositions.map((node, i) => {
          // 크기와 광채(히트맵) 계산
          const crystals = node.stats?.crystals || 0;
          const isStreakNode = node.isActive || node.isProtected || node.isRestBridge;
          let r = isMobileConstellation ? 5 : 8;
          let glowIntensity = 1;

          if (crystals > 50) { r = isMobileConstellation ? 8 : 14; glowIntensity = 1.5; }
          else if (crystals > 20) { r = isMobileConstellation ? 7 : 11; glowIntensity = 1.2; }
          else if (crystals > 0) { r = isMobileConstellation ? 6 : 9; glowIntensity = 1; }

          return (
            <g
              key={`star-${i}`} 
              transform={`translate(${node.x}, ${node.y})`} 
              className={`star-node ${isStreakNode ? 'active' : ''} ${node.isRestBridge ? 'rest-bridge' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => onStarClick(e, node)}
            >
              {isStreakNode ? (
                <>
                  <circle 
                    r={r} 
                    fill={node.isProtected ? 'rgba(0, 243, 255, 0.3)' : node.isRestBridge ? 'rgba(148, 163, 184, 0.22)' : activeColor} 
                    className="core" 
                    filter={node.isToday ? 'url(#glow-star)' : undefined}
                    opacity={node.isRestBridge ? 0.8 : glowIntensity}
                    style={{ stroke: node.isProtected ? 'var(--crystal-cyan)' : node.isRestBridge ? 'rgba(203, 213, 225, 0.55)' : 'none', strokeWidth: 2 }}
                  />
                  {/* 별빛 중심점 - Only for active stars, Use ice for protected */}
                  {node.isProtected ? (
                    <text textAnchor="middle" dy=".3em" fontSize={r} style={{ pointerEvents: 'none' }}>🧊</text>
                  ) : node.isRestBridge ? (
                    <text textAnchor="middle" dy=".3em" fontSize={Math.max(6, r * 0.9)} fill="#cbd5e1" fontWeight="800" style={{ pointerEvents: 'none' }}>휴</text>
                  ) : (
                    <path 
                      d={`M0,-${r/1.5} L${r/3},-${r/3} L${r/1.5},0 L${r/3},${r/3} L0,${r/1.5} L-${r/3},${r/3} L-${r/1.5},0 L-${r/3},-${r/3} Z`}
                      fill="#fff" 
                      transform="scale(1.2)"
                    />
                  )}
                  {node.isToday && (
                    <circle r={r + (isMobileConstellation ? 5 : 8)} fill="none" strokeWidth="2" stroke={activeColor} opacity="0.6">
                      <animate attributeName="r" values={`${r+4};${r+(isMobileConstellation ? 8 : 12)};${r+4}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </>
              ) : (
                // 미학습일: 희미한 점
                <circle r={isMobileConstellation ? 1.8 : 3} fill="rgba(255,255,255,0.1)" />
              )}

              {/* 밝게 보이는 날짜 텍스트 */}
              <text 
                y={isStreakNode ? r + (isMobileConstellation ? 8 : 16) : (isMobileConstellation ? 7 : 12)}
                textAnchor="middle" 
                fill={isStreakNode ? '#e2e8f0' : '#475569'} 
                fontSize={isStreakNode ? (isMobileConstellation ? "6" : "12") : (isMobileConstellation ? "5" : "11")}
                fontWeight={isStreakNode ? '800' : 'normal'} 
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
              const crystalsEarned = day.stats?.crystals || 0;
              const intensity = day.isActive ? 0.3 + Math.min(crystalsEarned / 100, 0.7) : 0;

               return (
                <div 
                  key={day.date} 
                  className={`cal-cell clickable ${day.isActive ? 'active' : ''} ${day.isProtected ? 'protected' : ''} ${day.isRestBridge ? 'rest-bridge' : ''} ${day.isToday ? 'today' : ''}`}
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
                  {!day.isProtected && day.isRestBridge && <div className="rest-icon-mini">휴</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
