import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { Gem, Gift, Loader2, Rocket, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { functions } from '../../firebase';
import './CrewGrowthRewardExperience.css';

const REACTIONS = [
  { id: 'applause', emoji: '👏', label: '축하해요' },
  { id: 'launch', emoji: '🚀', label: '계속 전진!' },
  { id: 'thanks', emoji: '💎', label: '함께해서 고마워요' },
];

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    { label: 'DAY', value: days },
    { label: 'HOUR', value: hours },
    { label: 'MIN', value: minutes },
    { label: 'SEC', value: seconds },
  ];
}

function formatArrivalTime(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

function fireSupplyConfetti() {
  const colors = ['#22d3ee', '#60a5fa', '#8b5cf6', '#fde047', '#ffffff'];
  confetti({ particleCount: 110, spread: 86, origin: { y: 0.64 }, colors, scalar: 1.05 });
  window.setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 58, origin: { x: 0, y: 0.72 }, colors }), 180);
  window.setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 58, origin: { x: 1, y: 0.72 }, colors }), 250);
}

export default function CrewGrowthRewardExperience({
  crewId,
  progress,
  onProgressChange,
  compact = false,
  isGuest = false,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [celebration, setCelebration] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');

  const verificationEndsAtMs = Number(progress?.verificationEndsAtMs || 0);
  const achievedAtMs = Number(progress?.achievedAtMs || 0);
  const rewarded = progress?.rewarded === true;
  const remainingMs = verificationEndsAtMs - nowMs;
  const verifying = verificationEndsAtMs > 0 && !rewarded;
  const awaitingSupply = verifying && remainingMs <= 0;
  const finalApproach = verifying && remainingMs > 0 && remainingMs <= 60 * 60 * 1000;
  const countdown = useMemo(() => formatCountdown(remainingMs), [remainingMs]);
  const voyageProgress = verifying && verificationEndsAtMs > achievedAtMs
    ? Math.min(100, Math.max(0, ((nowMs - achievedAtMs) / (verificationEndsAtMs - achievedAtMs)) * 100))
    : rewarded ? 100 : 0;

  const targetTierId = progress?.tierId || 't20';

  const loadCelebration = useCallback(async ({ autoOpen = false } = {}) => {
    if (isGuest) return null;
    try {
      const fn = httpsCallable(functions, 'getCrewGrowthRewardCelebration');
      const result = await fn({});
      const next = result.data || null;
      setCelebration(next);
      if (autoOpen && next?.available && !next.opened) {
        setRevealed(false);
        setModalOpen(true);
      }
      return next;
    } catch (error) {
      console.warn('Crew growth celebration load failed:', error);
      return null;
    }
  }, [isGuest]);

  const refreshProgress = useCallback(async () => {
    if (!crewId) return;
    try {
      const fn = httpsCallable(functions, 'getCrewGrowthEventProgress');
      const result = await fn({ crewId });
      onProgressChange?.(result.data || null);
    } catch (error) {
      console.warn('Crew growth progress refresh failed:', error);
    }
  }, [crewId, onProgressChange]);

  useEffect(() => {
    if (!verifying) return undefined;
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [verifying]);

  useEffect(() => {
    loadCelebration({ autoOpen: true });
  }, [loadCelebration, rewarded, targetTierId]);

  const openSupply = async () => {
    if (action) return;
    if (celebration?.opened) {
      setRevealed(true);
      setModalOpen(true);
      return;
    }
    setAction('open');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'openCrewGrowthRewardCelebration');
      const result = await fn({ tierId: celebration?.tierId || targetTierId });
      const next = result.data || celebration;
      setCelebration(next);
      setRevealed(true);
      fireSupplyConfetti();
      await refreshProgress();
    } catch (error) {
      setMessage(String(error?.message || '보급 상자를 열지 못했습니다. 잠시 후 다시 시도해주세요.').replace(/^FirebaseError:\s*/i, ''));
    } finally {
      setAction('');
    }
  };

  const sendReaction = async (reaction) => {
    if (action || !celebration?.opened) return;
    setAction(`reaction-${reaction}`);
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'reactCrewGrowthRewardCelebration');
      const result = await fn({ reaction, tierId: celebration?.tierId || targetTierId });
      setCelebration(result.data || celebration);
      await refreshProgress();
      setMessage('크루 항해 기록에 마음을 남겼습니다.');
    } catch {
      setMessage('반응을 전송하지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  const isCurrentCrewReward = celebration?.available && celebration.crewId === crewId;
  const rewardedMemberCount = Number(
    (isCurrentCrewReward ? celebration?.rewardedMemberCount : progress?.rewardedMemberCount) ||
    progress?.snapshotEligibleCount || 20
  );
  const openedMemberCount = Number(
    (isCurrentCrewReward ? celebration?.openedMemberCount : progress?.openedMemberCount) || 0
  );
  const reactionCounts = isCurrentCrewReward ? celebration?.reactionCounts : progress?.reactionCounts;
  const showStatus = verifying || rewarded;

  return (
    <>
      {showStatus && (
        <section className={`crew-growth-voyage ${compact ? 'is-compact' : ''} ${finalApproach ? 'is-final' : ''} ${rewarded ? 'is-arrived' : ''}`}>
          <div className="crew-growth-voyage__signal" aria-hidden="true"><span /><span /><span /></div>
          <div className="crew-growth-voyage__heading">
            <div className="crew-growth-voyage__icon">{rewarded ? <Gift size={22} /> : <Rocket size={22} />}</div>
            <div>
              <span className="font-tech">{rewarded ? 'SUPPLY SHIP · ARRIVED' : finalApproach ? 'FINAL APPROACH' : `${progress?.target === 40 ? 'CREW 40' : 'CREW 20'} · VERIFICATION FLIGHT`}</span>
              <strong className="font-title">{rewarded ? `${progress?.target === 40 ? 'CREW 40' : 'CREW 20'} 보급선 도착 완료` : awaitingSupply ? '검증 완료 · 보급품 적재 중' : '48시간 항해 카운트다운'}</strong>
            </div>
            <div className="crew-growth-voyage__roster font-tech"><ShieldCheck size={14} /> 고정 승무원 {progress?.snapshotRetainedCount || 0} / {progress?.snapshotEligibleCount || progress?.target || 20}</div>
          </div>

          {!rewarded && !awaitingSupply && (
            <>
              <div className="crew-growth-voyage__countdown" aria-label={`검증 종료까지 ${Math.max(0, Math.floor(remainingMs / 1000))}초`}>
                {countdown.map((item) => (
                  <div key={item.label}><strong>{String(item.value).padStart(2, '0')}</strong><span className="font-tech">{item.label}</span></div>
                ))}
              </div>
              <div className="crew-growth-voyage__arrival font-tech">보급선 도착 예정 · {formatArrivalTime(verificationEndsAtMs)}</div>
            </>
          )}

          {awaitingSupply && (
            <div className="crew-growth-voyage__loading font-tech"><Loader2 size={17} className="crew-spin" /> 명단 최종 확인 후 최대 1시간 안에 자동 지급됩니다.</div>
          )}

          {rewarded && (
            <>
              <div className="crew-growth-voyage__arrival-grid">
                <div className="crew-growth-voyage__crew-lights" aria-label={`${rewardedMemberCount}명 달성`}>
                  {Array.from({ length: Math.min(20, Math.max(1, rewardedMemberCount)) }, (_, index) => <i key={index} style={{ '--light-delay': `${index * 0.055}s` }} />)}
                </div>
                <div className="crew-growth-voyage__opened">
                  <Users size={16} /><strong>{openedMemberCount} / {rewardedMemberCount}</strong><span className="font-tech">승무원 개봉 완료</span>
                </div>
                {isCurrentCrewReward && (
                  <button type="button" className="crew-growth-voyage__open font-tech" onClick={() => { setRevealed(Boolean(celebration.opened)); setModalOpen(true); }}>
                    <Gift size={16} /> {celebration.opened ? '달성식 다시 보기' : '내 보급 상자 개봉'}
                  </button>
                )}
              </div>
              <div className="crew-growth-voyage__history font-tech">
                항해 기록 · {formatArrivalTime(progress?.rewardedAtMs)} · 정식 승무원 {rewardedMemberCount}명 · 총 {((progress?.reward || celebration?.amount || 1000) * rewardedMemberCount).toLocaleString('ko-KR')}광석 지급
              </div>
            </>
          )}

          <div className="crew-growth-voyage__track"><Motion.span initial={false} animate={{ width: `${voyageProgress}%` }} transition={{ duration: 0.45 }} /></div>
          {rewarded && (
            <div className="crew-growth-voyage__reactions font-tech">
              {REACTIONS.map((item) => <span key={item.id}>{item.emoji} {Number(reactionCounts?.[item.id] || 0)}</span>)}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {modalOpen && celebration?.available && (
          <Motion.div className="crew-growth-ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.div className={`crew-growth-ceremony__card ${revealed ? 'is-open' : ''}`} initial={{ scale: 0.82, y: 34 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 18 }}>
              <button type="button" className="crew-growth-ceremony__close" onClick={() => setModalOpen(false)} aria-label="닫기"><X size={18} /></button>
              <div className="crew-growth-ceremony__orbit" aria-hidden="true"><i /><i /><i /></div>
              <div className="crew-growth-ceremony__lights" aria-hidden="true">
                {Array.from({ length: Math.min(20, Math.max(1, celebration.rewardedMemberCount || 20)) }, (_, index) => <i key={index} style={{ '--light-delay': `${index * 0.06}s` }} />)}
              </div>
              <span className="font-tech">CREW MILESTONE · SUPPLY CEREMONY</span>
              <h2 className="font-title">{celebration.crewName}</h2>
              {!revealed ? (
                <>
                  <div className="crew-growth-ceremony__chest"><Gift size={62} /><Sparkles size={22} /></div>
                  <h3 className="font-title">{celebration.target || 20}명의 항해가 하나의 빛이 되었습니다</h3>
                  <p>48시간 동안 자리를 지킨 승무원에게 보급 상자가 도착했습니다. 광석은 이미 계정에 안전하게 지급되어 있습니다.</p>
                  <button type="button" className="crew-growth-ceremony__open font-tech" onClick={openSupply} disabled={!!action}>
                    {action === 'open' ? <Loader2 size={18} className="crew-spin" /> : <Gift size={18} />} CREW 보급 상자 개봉
                  </button>
                </>
              ) : (
                <>
                  <Motion.div className="crew-growth-ceremony__gem" initial={{ scale: 0.35, rotate: -18 }} animate={{ scale: [0.35, 1.18, 1], rotate: 0 }}>
                    <Gem size={42} /><strong>+{celebration.amount || (celebration.target === 40 ? 4000 : 1000)}</strong><span className="font-tech">광석</span>
                  </Motion.div>
                  <h3 className="font-title">{celebration.target === 40 ? 'CREW 40' : 'CREW 20'} 항해 성공!</h3>
                  <p>{celebration.rewardedMemberCount || celebration.target || 20}명의 승무원이 함께 만든 기록입니다. 이 순간은 크루 항해 기록에 영구 보존됩니다.</p>
                  <div className="crew-growth-ceremony__reaction-title font-tech">우리 크루에게 마음 보내기</div>
                  <div className="crew-growth-ceremony__reactions">
                    {REACTIONS.map((item) => (
                      <button key={item.id} type="button" className={celebration.reaction === item.id ? 'is-selected' : ''} onClick={() => sendReaction(item.id)} disabled={!!action}>
                        <span>{item.emoji}</span><strong>{item.label}</strong><small>{Number(celebration.reactionCounts?.[item.id] || 0)}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {message && <div className="crew-growth-ceremony__message font-tech">{message}</div>}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
