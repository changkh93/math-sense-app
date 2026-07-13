import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { BookOpenCheck, Gem, Gift, Hand, Loader2, Sparkles, X } from 'lucide-react';
import { functions } from '../../firebase';
import './CrewCrystalChest.css';

function formatEventTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getErrorMessage(error, fallback) {
  const message = String(error?.message || '');
  if (message.includes('내일 다시')) return message.replace(/^FirebaseError:\s*/i, '');
  return fallback;
}

export default function CrewCrystalChest({ crewId, isGuest = false }) {
  const [chest, setChest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [celebrateReward, setCelebrateReward] = useState(null);
  const [claimedAmount, setClaimedAmount] = useState(0);

  const loadChest = useCallback(async ({ openReward = true } = {}) => {
    if (!crewId) return;
    try {
      const fn = httpsCallable(functions, 'getCrewCrystalChest');
      const result = await fn({ crewId });
      const next = result.data || null;
      setChest(next);
      if (openReward && !isGuest && next?.availableRewards?.length) {
        setCelebrateReward((current) => current || next.availableRewards[0]);
      }
    } catch (error) {
      console.warn('Crew crystal chest load failed:', error);
      setMessage('크루 광석 상자 신호를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [crewId, isGuest]);

  useEffect(() => {
    setLoading(true);
    loadChest();
    const timerId = window.setInterval(() => loadChest({ openReward: false }), 45000);
    return () => window.clearInterval(timerId);
  }, [loadChest]);

  const latestReward = chest?.rewards?.[0] || null;
  const progress = Math.min(100, Math.max(0, ((chest?.energy || 0) / Math.max(1, chest?.target || 100)) * 100));
  const contributorLabel = useMemo(() => {
    const names = chest?.currentContributorNames || [];
    if (!names.length) return '다음 만점 성취를 기다리고 있어요.';
    if (names.length <= 3) return `${names.join(' · ')} 대원이 채우는 중`;
    return `${names.slice(0, 3).join(' · ')} 외 ${names.length - 3}명 기여 중`;
  }, [chest?.currentContributorNames]);

  const claimReward = async (reward = celebrateReward) => {
    if (!reward?.id || action) return;
    setAction('claim');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'claimCrewCrystalChestReward');
      const result = await fn({ crewId, rewardId: reward.id });
      const amount = Number(result.data?.amount || reward.rewardAmount || 0);
      setClaimedAmount(amount);
      setMessage(amount > 0 ? `크루의 선물 ${amount}광석을 받았습니다!` : '이미 받은 상자입니다.');
      await loadChest({ openReward: false });
    } catch (error) {
      setMessage(getErrorMessage(error, '광석을 받지 못했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setAction('');
    }
  };

  const applaudReward = async (reward = celebrateReward || latestReward) => {
    if (!reward?.id || action || reward.applaudedByMe) return;
    setAction('applaud');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'applaudCrewCrystalChest');
      const result = await fn({ crewId, rewardId: reward.id });
      setMessage(result.data?.applauded ? '기여한 대원들에게 박수를 보냈습니다! 👏' : '이미 박수를 보냈습니다.');
      await loadChest({ openReward: false });
      setCelebrateReward((current) => current ? {
        ...current,
        applaudedByMe: true,
        applauseCount: Number(result.data?.applauseCount || current.applauseCount || 0),
      } : current);
    } catch {
      setMessage('박수를 보내지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  if (!crewId) return null;

  return (
    <>
      <section className="crew-crystal-chest">
        <div className="crew-crystal-chest__glow" aria-hidden="true" />
        <div className="crew-crystal-chest__head">
          <div className="crew-crystal-chest__icon"><Gift size={24} /><Sparkles size={13} /></div>
          <div>
            <span className="font-tech">CREW CRYSTAL CHEST</span>
            <strong className="font-title">한 사람의 만점이 모두의 선물이 됩니다</strong>
          </div>
          <b className="font-tech"><Gem size={15} /> {loading ? '…' : `${chest?.energy || 0} / ${chest?.target || 100}`}</b>
        </div>

        <div className="crew-crystal-chest__track" aria-label={`크루 광석 상자 ${Math.round(progress)}% 충전`}>
          <Motion.div initial={false} animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }}>
            <span />
          </Motion.div>
        </div>

        <div className="crew-crystal-chest__meta font-tech">
          <span>{contributorLabel}</span>
          <span><BookOpenCheck size={13} /> 과제 피드백 40광석 → 상자 +{chest?.perfectAssignmentContribution || 20}</span>
        </div>

        <div className="crew-crystal-chest__body">
          <div className="crew-crystal-chest__feed">
            <div className="crew-crystal-chest__section-title font-tech">TODAY'S CREW LIGHT</div>
            {chest?.events?.length ? chest.events.slice(0, 4).map((event) => (
              <div className="crew-crystal-chest__event" key={event.id}>
                <div><BookOpenCheck size={16} /></div>
                <p><strong>{event.contributorName} 대원</strong>이 과제 피드백 40광석을 달성했습니다.<span>크루 상자 +{event.acceptedAmount}</span></p>
                <time className="font-tech">{formatEventTime(event.createdAtMs)}</time>
              </div>
            )) : (
              <div className="crew-crystal-chest__empty font-tech">첫 번째 빛나는 성취가 여기에 기록됩니다.</div>
            )}
          </div>

          <aside className="crew-crystal-chest__rules font-tech">
            <strong>상자 운용 규칙</strong>
            <span>100 충전 시 당시 정식 크루원에게 5광석</span>
            <span>개인 기여 하루 최대 40 · 크루 상자 하루 2회</span>
            <span>멤버 수령 하루 최대 10광석 · 게스트는 축하 참여</span>
            {latestReward && (
              <button type="button" onClick={() => setCelebrateReward(latestReward)}>
                <Hand size={13} /> 최근 상자 박수 {latestReward.applauseCount || 0}
              </button>
            )}
          </aside>
        </div>
        {message && <div className="crew-crystal-chest__message font-tech">{message}</div>}
      </section>

      <AnimatePresence>
        {celebrateReward && (
          <Motion.div className="crew-chest-celebration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.div className="crew-chest-celebration__card" initial={{ scale: 0.82, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
              <button className="crew-chest-celebration__close" type="button" onClick={() => { setCelebrateReward(null); setClaimedAmount(0); }} aria-label="닫기"><X size={18} /></button>
              <div className="crew-chest-celebration__stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <div className="crew-chest-celebration__gift"><Gift size={54} /><Gem size={23} /></div>
              <span className="font-tech">SUPPLY CHEST · CYCLE {celebrateReward.cycle}</span>
              <h2 className="font-title">크루 광석 상자 완성!</h2>
              <p><strong>{celebrateReward.contributorNames?.join(' · ') || '우리 크루 대원'}</strong>의 빛나는 성취가 모여 상자가 열렸습니다.</p>
              {claimedAmount > 0 ? (
                <Motion.div className="crew-chest-celebration__reward" initial={{ scale: 0.4 }} animate={{ scale: [0.4, 1.2, 1] }}>
                  <Gem size={25} /> +{claimedAmount}
                </Motion.div>
              ) : celebrateReward.available ? (
                <button className="crew-chest-celebration__claim font-tech" type="button" disabled={!!action} onClick={() => claimReward()}>
                  {action === 'claim' ? <Loader2 size={18} className="crew-spin" /> : <Gift size={18} />} 광석 {celebrateReward.rewardAmount}개 받기
                </button>
              ) : isGuest ? (
                <div className="crew-chest-celebration__guest font-tech">게스트는 광석 대신 기여한 대원에게 박수를 보낼 수 있어요.</div>
              ) : (
                <div className="crew-chest-celebration__guest font-tech">이 상자의 광석은 수령 완료되었거나 당시 탑승 멤버에게 지급됩니다.</div>
              )}
              <button className="crew-chest-celebration__applause font-tech" type="button" disabled={!!action || celebrateReward.applaudedByMe} onClick={() => applaudReward()}>
                {action === 'applaud' ? <Loader2 size={16} className="crew-spin" /> : <Hand size={16} />}
                {celebrateReward.applaudedByMe ? '박수를 보냈어요' : '기여한 대원들에게 박수 보내기'} · {celebrateReward.applauseCount || 0}
              </button>
              {message && <small className="font-tech">{message}</small>}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
