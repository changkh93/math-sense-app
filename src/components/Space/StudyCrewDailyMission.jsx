import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, CircleHelp, Hammer, Loader2, Send, ShieldCheck, Snowflake, Sparkles, Users, X } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import { STUDY_CREW_MISSION_MAX_LENGTH, getStudyCrewMissionForDate, getTodayStudyCrewMissionKey } from './studyCrewMissionDefaults';

function getScopeKey(scopeType, scopeId) {
  return `${scopeType}_${String(scopeId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function getTimestampKey(value) {
  if (!value) return '';
  if (typeof value.toMillis === 'function') return String(value.toMillis());
  if (typeof value.seconds === 'number') return `${value.seconds}_${value.nanoseconds || 0}`;
  return String(value);
}

const CREW_MISSION_POLICY_NOTICE_VERSION = 'hibernation-construction-v2';

export default function StudyCrewDailyMission({
  scopeType,
  scopeId,
  targetCount = 0,
  totalMemberCount = 0,
  constructionXP = 0,
  compact = false,
  teamRewardsEnabled = true,
}) {
  const { user, userData } = useAuth();
  const [responses, setResponses] = useState([]);
  const [missionPlan, setMissionPlan] = useState(null);
  const [missionDay, setMissionDay] = useState(null);
  const [activityStatus, setActivityStatus] = useState(null);
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [rewardToasts, setRewardToasts] = useState([]);
  const [showPolicy, setShowPolicy] = useState(false);
  const missionDaySeenRef = useRef(false);
  const shownTeamRewardKeyRef = useRef('');
  const suppressNextTeamRewardToastRef = useRef(false);
  const policyCloseButtonRef = useRef(null);
  const policyOpenButtonRef = useRef(null);
  const policyAutoCheckedRef = useRef('');

  const todayKey = useMemo(() => getTodayStudyCrewMissionKey(), []);
  const mission = useMemo(() => {
    if (missionPlan?.disabled) return null;
    if (missionPlan?.title && missionPlan?.prompt) {
      return {
        id: missionPlan.missionId || `admin_${todayKey}`,
        category: missionPlan.category || '운영 미션',
        title: missionPlan.title,
        prompt: missionPlan.prompt,
      };
    }
    return getStudyCrewMissionForDate(todayKey);
  }, [missionPlan, todayKey]);
  const scopeKey = useMemo(() => getScopeKey(scopeType, scopeId), [scopeType, scopeId]);
  const isGuest = userData?.isGuest === true;
  const myResponse = responses.find((response) => response.userId === user?.uid) || null;
  const completedCount = responses.filter((response) => response.isGuest !== true).length;
  const isCrewMission = scopeType === 'crew';
  const resolvedActiveMemberCount = Number(missionDay?.activeMemberCount ?? activityStatus?.activeMemberCount ?? 0);
  const resolvedTotalMemberCount = Number(missionDay?.totalMemberCount ?? activityStatus?.totalMemberCount ?? totalMemberCount ?? targetCount ?? 0);
  const resolvedHibernatingMemberCount = Number(
    missionDay?.hibernatingMemberCount
      ?? activityStatus?.hibernatingMemberCount
      ?? Math.max(0, resolvedTotalMemberCount - resolvedActiveMemberCount)
  );
  const target = Math.max(Number(missionDay?.teamTargetCount ?? activityStatus?.teamTargetCount ?? targetCount ?? 0), 1);
  const teamTarget = teamRewardsEnabled && target >= 2 ? target : 0;
  const teamCompleted = missionDay?.teamCompleted === true || (teamTarget > 0 && completedCount >= teamTarget);
  const remainingForTeam = Math.max(0, teamTarget - completedCount);
  const wasReactivatedToday = Boolean(activityStatus?.myReactivatedToday || (
    myResponse && activityStatus?.myWasActiveBeforeToday === false
  ));
  const isActivityStatusLoading = isCrewMission && !activityStatus && !myResponse;
  const isHibernating = isCrewMission && activityStatus?.myStatus === 'hibernating' && !myResponse;
  const resolvedConstructionXP = Math.max(
    Number(constructionXP || 0),
    Number(activityStatus?.constructionXP || 0),
    Number(missionDay?.crewMothershipXP || 0),
  );
  const teamRewardKey = getTimestampKey(missionDay?.teamRewardAwardedAt);

  const closePolicyModal = useCallback(() => {
    setShowPolicy(false);
    if (typeof window === 'undefined' || !user?.uid) return;
    try {
      window.localStorage.setItem(`${CREW_MISSION_POLICY_NOTICE_VERSION}:${user.uid}`, 'seen');
    } catch {
      // Storage can be unavailable in private browsing; closing the modal must still work.
    }
  }, [user?.uid]);

  const pushRewardToast = (amount, label = '광석 획득') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setRewardToasts((items) => [...items, { id, amount, label }]);
    window.setTimeout(() => {
      setRewardToasts((items) => items.filter((item) => item.id !== id));
    }, 5200);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'studyCrewMissionPlans', todayKey), (snap) => {
      setMissionPlan(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (err) => {
      console.error('Failed to listen daily crew mission plan:', err);
      setMissionPlan(null);
    });
    return () => unsub();
  }, [todayKey]);

  useEffect(() => {
    if (scopeType !== 'crew' || !scopeId || !user?.uid || isGuest) {
      setActivityStatus(null);
      return undefined;
    }
    let cancelled = false;
    const loadActivityStatus = async () => {
      try {
        const fn = httpsCallable(functions, 'getStudyCrewMissionActivityStatus');
        const result = await fn({ crewId: scopeId });
        if (!cancelled) setActivityStatus(result?.data || null);
      } catch (err) {
        console.error('Failed to load crew mission activity status:', err);
        if (!cancelled) setActivityStatus(null);
      }
    };
    loadActivityStatus();
    return () => {
      cancelled = true;
    };
  }, [isGuest, scopeId, scopeType, user?.uid]);

  useEffect(() => {
    if (!scopeType || !scopeId) {
      setResponses([]);
      setMissionDay(null);
      return undefined;
    }

    missionDaySeenRef.current = false;
    shownTeamRewardKeyRef.current = '';
    suppressNextTeamRewardToastRef.current = false;
    const missionDayRef = doc(db, 'studyCrewDailyMissions', scopeKey, 'days', todayKey);
    const unsubMission = onSnapshot(missionDayRef, (snap) => {
      setMissionDay(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (err) => {
      console.error('Failed to listen daily crew mission status:', err);
      setMissionDay(null);
    });

    const responsesQuery = query(
      collection(db, 'studyCrewDailyMissions', scopeKey, 'days', todayKey, 'responses'),
      orderBy('createdAt', 'asc')
    );
    const unsubResponses = onSnapshot(responsesQuery, (snap) => {
      setResponses(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to listen daily crew mission responses:', err);
      setResponses([]);
    });
    return () => {
      unsubMission();
      unsubResponses();
    };
  }, [scopeId, scopeKey, scopeType, todayKey]);

  useEffect(() => {
    if (!myResponse?.answer) return;
    setDraft('');
  }, [myResponse?.answer]);

  useEffect(() => {
    if (!isCrewMission || isGuest || !activityStatus || !user?.uid || policyAutoCheckedRef.current === user.uid) return;
    policyAutoCheckedRef.current = user.uid;
    try {
      const noticeKey = `${CREW_MISSION_POLICY_NOTICE_VERSION}:${user.uid}`;
      if (window.localStorage.getItem(noticeKey) !== 'seen') setShowPolicy(true);
    } catch {
      setShowPolicy(true);
    }
  }, [activityStatus, isCrewMission, isGuest, user?.uid]);

  useEffect(() => {
    if (!showPolicy || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    const policyOpenButton = policyOpenButtonRef.current;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => policyCloseButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePolicyModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      policyOpenButton?.focus();
    };
  }, [closePolicyModal, showPolicy]);

  useEffect(() => {
    if (!user?.uid) return;
    if (!missionDaySeenRef.current) {
      missionDaySeenRef.current = true;
      shownTeamRewardKeyRef.current = teamRewardKey;
      return;
    }
    if (!teamRewardKey || shownTeamRewardKeyRef.current === teamRewardKey) return;
    if (!teamRewardsEnabled) return;

    shownTeamRewardKeyRef.current = teamRewardKey;
    const rewardUserIds = Array.isArray(missionDay?.teamRewardUserIds) ? missionDay.teamRewardUserIds : [];
    if (!rewardUserIds.includes(user.uid)) return;
    if (suppressNextTeamRewardToastRef.current) {
      suppressNextTeamRewardToastRef.current = false;
      return;
    }

    pushRewardToast(20, '팀 미션 완료');
    setMessage('팀 미션이 완료되어 +20 광석을 획득했습니다.');
  }, [missionDay?.teamRewardUserIds, teamRewardKey, teamRewardsEnabled, user?.uid]);

  const submitAnswer = async () => {
    const answer = draft.trim().replace(/\s+/g, ' ').slice(0, STUDY_CREW_MISSION_MAX_LENGTH);
    if (!answer || action || !scopeType || !scopeId || !mission) return;

    setAction('submitting');
    setMessage('');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'submitStudyCrewDailyMission');
      const result = await fn({ scopeType, scopeId, answer });
      const rewards = result?.data?.rewards || {};
      const reactivationPrefix = rewards.reactivated ? '동면 해제! ' : '';
      if (isCrewMission) {
        setActivityStatus((current) => ({
          ...(current || {}),
          activeMemberCount: Number(rewards.activeMemberCount ?? current?.activeMemberCount ?? 0),
          hibernatingMemberCount: Number(rewards.hibernatingMemberCount ?? current?.hibernatingMemberCount ?? 0),
          teamTargetCount: Number(rewards.teamTargetCount ?? current?.teamTargetCount ?? targetCount ?? 0),
          myStatus: 'active',
          myWasActiveBeforeToday: rewards.wasHibernating === true ? false : current?.myWasActiveBeforeToday,
          myReactivatedToday: rewards.reactivated === true || current?.myReactivatedToday === true,
          constructionXP: Number(current?.constructionXP || constructionXP || 0) + Number(rewards.constructionXpAwarded || 0),
        }));
      }
      setDraft('');
      if (isGuest) {
        setMessage(myResponse ? '게스트 미션 답변을 수정했습니다.' : '게스트 미션 답변을 저장했습니다.');
      } else if (rewards.individualAwarded) {
        pushRewardToast(rewards.individualAmount || 5);
        setMessage(`${reactivationPrefix}오늘의 미션을 완료해 +5 광석을 획득했습니다.`);
      } else {
        setMessage(myResponse ? '오늘의 미션 답변을 수정했습니다.' : `${reactivationPrefix}오늘의 미션을 저장했습니다.`);
      }
      if (teamRewardsEnabled && rewards.teamAwarded) {
        suppressNextTeamRewardToastRef.current = true;
        pushRewardToast(rewards.teamAmount || 20, '팀 미션 완료');
        setMessage(`${reactivationPrefix}팀 미션이 완료되어 +20 광석을 획득했습니다.`);
      }
    } catch (err) {
      console.error('Failed to submit daily crew mission:', err);
      setMessage(err?.message || '미션 답변을 저장하지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    submitAnswer();
  };

  if (!mission) return null;

  return (
    <>
    <section className="glass-card hud-border" style={{
      position: 'relative',
      overflow: 'hidden',
      padding: compact ? '0.9rem' : '1.1rem',
      borderRadius: 12,
      borderColor: teamCompleted ? 'rgba(34,197,94,0.34)' : 'rgba(0,243,255,0.18)',
      background: teamCompleted
        ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(7,13,30,0.82) 58%)'
        : 'rgba(7,13,30,0.78)',
    }}>
      <style>{`
        @keyframes missionRewardFloat {
          0% { transform: translate3d(0, 38px, 0) scale(0.82); opacity: 0; }
          10% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
          72% { transform: translate3d(-18px, -92px, 0) scale(1.05); opacity: 1; }
          100% { transform: translate3d(-34px, -168px, 0) scale(1.12); opacity: 0; }
        }
        @keyframes missionPolicyIn {
          from { transform: translate3d(0, 18px, 0) scale(0.96); opacity: 0; }
          to { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
        }
      `}</style>
      {rewardToasts.length > 0 && (
        <div style={{
          position: 'absolute',
          right: compact ? 14 : 22,
          top: compact ? 14 : 18,
          zIndex: 4,
          display: 'grid',
          gap: '0.4rem',
          pointerEvents: 'none',
        }}>
          {rewardToasts.map((toast) => (
            <div
              key={toast.id}
              className="font-tech"
              style={{
                animation: 'missionRewardFloat 5.1s cubic-bezier(0.16, 0.8, 0.24, 1) forwards',
                borderRadius: 999,
                border: '1px solid rgba(125,211,252,0.78)',
                background: 'linear-gradient(135deg, rgba(8,47,73,0.96), rgba(14,165,233,0.95) 48%, rgba(37,99,235,0.96))',
                boxShadow: '0 18px 44px rgba(14,165,233,0.48), 0 0 0 3px rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontWeight: 900,
                padding: compact ? '0.5rem 0.72rem' : '0.62rem 0.9rem',
                fontSize: compact ? '0.82rem' : '0.94rem',
                letterSpacing: '0.01em',
                textShadow: '0 2px 6px rgba(0,0,0,0.62)',
                whiteSpace: 'nowrap',
              }}
            >
              💎 +{toast.amount} {toast.label}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={15} /> TODAY CREW MISSION
          </div>
          <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.28rem 0 0', fontSize: compact ? '1rem' : '1.12rem' }}>
            {mission.title}
          </h3>
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.38rem', lineHeight: 1.55, fontSize: compact ? '0.82rem' : '0.9rem' }}>
            {mission.prompt}
          </div>
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.42)', marginTop: '0.38rem', fontSize: '0.76rem' }}>
            개인정보는 적지 말고, 짧고 안전한 이야기만 남겨주세요.
          </div>
        </div>
        {isGuest ? (
          <div className="font-tech" style={{
            color: '#bbf7d0',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(134,239,172,0.2)',
            borderRadius: 999,
            padding: '0.36rem 0.62rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            fontSize: '0.76rem',
          }}>
            <Sparkles size={14} /> 게스트 참여 · 보상 없음
          </div>
        ) : teamRewardsEnabled ? (
          <div className="font-tech" style={{
            color: teamCompleted ? '#86efac' : 'rgba(255,255,255,0.7)',
            background: teamCompleted ? 'rgba(34,197,94,0.13)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${teamCompleted ? 'rgba(34,197,94,0.26)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 999,
            padding: '0.36rem 0.62rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            fontSize: '0.76rem',
          }}>
            {teamCompleted ? <CheckCircle2 size={14} /> : <Users size={14} />}
            {teamTarget > 0 ? `${completedCount}/${teamTarget} 완료` : '팀 미션은 2명 이상'}
          </div>
        ) : (
          <div className="font-tech" style={{
            color: '#7dd3fc',
            background: 'rgba(14,165,233,0.12)',
            border: '1px solid rgba(14,165,233,0.24)',
            borderRadius: 999,
            padding: '0.36rem 0.62rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            fontSize: '0.76rem',
          }}>
            <Sparkles size={14} />
            개인 보상 +5
          </div>
        )}
      </div>

      {isCrewMission && !isGuest && (
        <div style={{
          marginTop: '0.9rem',
          padding: compact ? '0.72rem' : '0.82rem',
          borderRadius: 12,
          border: '1px solid rgba(125,211,252,0.16)',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(15,23,42,0.42))',
          display: 'grid',
          gap: '0.65rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.45rem' }}>
            {[
              { label: '활동 승무원', value: `${resolvedActiveMemberCount}명`, color: '#86efac' },
              { label: '동면실', value: `${resolvedHibernatingMemberCount}명`, color: '#bfdbfe' },
              { label: '누적 건조 동력', value: `${resolvedConstructionXP} XP`, color: '#fde68a' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '0.55rem 0.45rem', borderRadius: 9, background: 'rgba(2,6,23,0.42)', textAlign: 'center', minWidth: 0 }}>
                <span className="font-tech" style={{ display: 'block', color: 'rgba(255,255,255,0.48)', fontSize: '0.66rem' }}>{item.label}</span>
                <strong className="font-tech" style={{ display: 'block', color: item.color, marginTop: '0.18rem', fontSize: '0.88rem' }}>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="font-tech" style={{ color: teamCompleted ? '#86efac' : 'rgba(255,255,255,0.76)', fontSize: '0.78rem', lineHeight: 1.55 }}>
            {teamCompleted
              ? `오늘 ${completedCount}명이 함께해 협동 보너스를 확보했습니다.`
              : `오늘 ${completedCount} / ${teamTarget}명 참여 · ${remainingForTeam}명만 더 참여하면 실제 참여자에게만 +20 광석이 분배됩니다.`}
          </div>
          <div className="font-tech" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.42rem', color: isHibernating || isActivityStatusLoading ? '#bfdbfe' : '#a7f3d0', fontSize: '0.74rem', lineHeight: 1.5 }}>
            {isActivityStatusLoading
              ? <Loader2 size={15} className="spin" style={{ flex: '0 0 auto', marginTop: 1 }} />
              : isHibernating
                ? <Snowflake size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />
                : <CheckCircle2 size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />}
            <span>
              {isActivityStatusLoading
                ? '내 승무 상태를 확인하고 있습니다.'
                : isHibernating
                ? '나는 현재 동면 승무원입니다. 오늘의 미션을 완료하면 즉시 해제되며, 내일 목표부터 활동 승무원으로 반영됩니다.'
                : wasReactivatedToday
                  ? '동면 해제! 오늘의 건조대에 복귀했습니다. 오늘 목표 인원은 그대로 유지됩니다.'
                  : '나는 활동 승무원입니다. 미션 첫 참여는 성공 여부와 관계없이 모함에 +1 XP로 영구 누적됩니다.'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.55rem' }}>
            <div className="font-tech" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.42)', fontSize: '0.69rem', flex: '1 1 260px' }}>
              <Hammer size={13} style={{ flex: '0 0 auto' }} /> 동면 승무원은 소속과 기록은 유지되지만, 미참여 날의 팀 광석·건조자 보상은 받지 못합니다.
            </div>
            <button
              ref={policyOpenButtonRef}
              type="button"
              className="font-tech"
              onClick={() => setShowPolicy(true)}
              aria-haspopup="dialog"
              style={{
                border: '1px solid rgba(125,211,252,0.24)',
                borderRadius: 999,
                background: 'rgba(14,165,233,0.1)',
                color: '#bae6fd',
                padding: '0.38rem 0.62rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.32rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <CircleHelp size={13} /> 동면·건조 규칙
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'stretch' }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, STUDY_CREW_MISSION_MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={myResponse ? '답변을 바꾸고 싶으면 다시 입력하세요.' : '짧게 답변을 남겨보세요.'}
            className="font-tech"
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 10,
              border: '1px solid rgba(0,243,255,0.24)',
              background: 'rgba(2,6,23,0.68)',
              color: 'var(--text-bright)',
              padding: '0.72rem 0.8rem',
              outline: 'none',
              minHeight: 44,
            }}
          />
          <button
            type="button"
            className="space-btn cosmic-btn font-tech"
            onClick={submitAnswer}
            disabled={!draft.trim() || !!action}
            style={{ borderRadius: 10, minWidth: compact ? 88 : 110, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            {action ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            {myResponse ? '수정' : '완료'}
          </button>
        </div>
        <div className="font-tech" style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.42)', fontSize: '0.74rem' }}>
          <span>{message || (myResponse ? '오늘 미션 완료됨' : 'Enter로도 저장할 수 있습니다.')}</span>
            <span>{draft.length}/{STUDY_CREW_MISSION_MAX_LENGTH}</span>
        </div>
      </div>

      {responses.length > 0 && (
        <div style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.55rem' }}>
          {responses.map((response) => (
            <div key={response.id} style={{ borderRadius: 10, background: 'rgba(2,6,23,0.45)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.72rem' }}>
              <div className="font-tech" style={{ color: 'rgba(255,255,255,0.56)', fontSize: '0.74rem', marginBottom: '0.32rem' }}>
                {response.userName || '탐사원'}{response.userId === user?.uid ? ' (나)' : ''}
              </div>
              <div className="font-tech" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {response.answer}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
    {showPolicy && typeof document !== 'undefined' && createPortal(
      <div
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePolicyModal();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 12000,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
          background: 'rgba(1,6,20,0.82)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="crew-mission-policy-title"
          aria-describedby="crew-mission-policy-description"
          style={{
            width: 'min(680px, 100%)',
            maxHeight: 'min(780px, calc(100vh - 2rem))',
            overflowY: 'auto',
            border: '1px solid rgba(125,211,252,0.28)',
            borderRadius: 20,
            background: 'radial-gradient(circle at 85% 0, rgba(56,189,248,0.14), transparent 30%), linear-gradient(155deg, rgba(10,20,43,0.99), rgba(3,8,24,0.99))',
            boxShadow: '0 30px 90px rgba(0,0,0,0.62), 0 0 42px rgba(14,165,233,0.12)',
            color: '#f8fafc',
            animation: 'missionPolicyIn 180ms ease-out both',
          }}
        >
          <div style={{ padding: '1rem 1rem 0.85rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div className="font-tech" style={{ color: '#7dd3fc', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} /> CREW POLICY
              </div>
              <h2 id="crew-mission-policy-title" className="font-title" style={{ margin: '0.3rem 0 0', fontSize: '1.28rem' }}>
                동면 승무원·누적 건조 안내
              </h2>
              <p id="crew-mission-policy-description" className="font-tech" style={{ margin: '0.48rem 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem', lineHeight: 1.55 }}>
                매일 참여하는 승무원의 노력이 사라지지 않고, 돌아온 승무원도 바로 함께할 수 있도록 변경된 규칙입니다.
              </p>
            </div>
            <button
              ref={policyCloseButtonRef}
              type="button"
              onClick={closePolicyModal}
              aria-label="정책 안내 닫기"
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 auto' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '0.7rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
              {[
                { label: '현재 활동', value: `${resolvedActiveMemberCount}명`, color: '#86efac' },
                { label: '현재 동면', value: `${resolvedHibernatingMemberCount}명`, color: '#bfdbfe' },
                { label: '오늘 팀 목표', value: teamTarget > 0 ? `${teamTarget}명` : '개인 미션', color: '#fde68a' },
              ].map((item) => (
                <div key={item.label} style={{ padding: '0.72rem 0.5rem', borderRadius: 11, textAlign: 'center', background: 'rgba(2,6,23,0.54)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="font-tech" style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem' }}>{item.label}</span>
                  <strong className="font-tech" style={{ display: 'block', marginTop: '0.2rem', color: item.color, fontSize: '0.94rem' }}>{item.value}</strong>
                </div>
              ))}
            </div>

            {[
              {
                icon: <Users size={18} />,
                title: '1. 활동 승무원 판정',
                body: '직전 7일 안에 ‘오늘의 미션’을 1회 이상 수행한 정식 크루원입니다. 단순 로그인이나 학습 기록은 이 판정에 사용하지 않습니다.',
                color: '#86efac',
              },
              {
                icon: <Sparkles size={18} />,
                title: '2. 오늘의 팀 목표',
                body: '활동 승무원의 60%로 계산하며, 크루원이 2명 이상이면 최소 목표는 2명입니다. 오늘 동면에서 복귀한 인원은 내일 목표부터 반영되어 당일 목표가 갑자기 늘지 않습니다.',
                color: '#7dd3fc',
              },
              {
                icon: <Hammer size={18} />,
                title: '3. 기여는 영구 누적',
                body: '오늘의 미션에 처음 참여하면 목표 달성 여부와 관계없이 모함에 +1 XP가 영구 누적됩니다. 팀 목표를 달성하면 모함에 협동 보너스 +20 XP가 추가됩니다.',
                color: '#fde68a',
              },
              {
                icon: <Snowflake size={18} />,
                title: '4. 동면·복귀·광석 규칙',
                body: '동면 중에도 크루 소속과 과거 기록은 유지됩니다. 다만 미참여 날의 팀 광석과 건조자 보상은 받지 못합니다. 미션 1회로 즉시 복귀하며, 공동 광석 상자는 활동 승무원과 실제 상자 기여자만 받습니다.',
                color: '#c4b5fd',
              },
            ].map((item) => (
              <div key={item.title} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: '0.65rem', padding: '0.78rem', borderRadius: 12, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: item.color, background: `${item.color}12`, border: `1px solid ${item.color}30` }}>{item.icon}</div>
                <div>
                  <strong className="font-tech" style={{ display: 'block', color: '#f8fafc', fontSize: '0.8rem' }}>{item.title}</strong>
                  <p className="font-tech" style={{ margin: '0.34rem 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '0.74rem', lineHeight: 1.62 }}>{item.body}</p>
                </div>
              </div>
            ))}

            <div className="font-tech" style={{ padding: '0.72rem 0.8rem', borderRadius: 11, color: '#bae6fd', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(125,211,252,0.16)', fontSize: '0.72rem', lineHeight: 1.55 }}>
              개인별 마지막 참여일은 다른 크루원에게 공개하지 않고, 본인의 승무 상태와 전체 집계만 화면에 표시합니다.
            </div>
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              onClick={closePolicyModal}
              style={{ minHeight: 44, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <CheckCircle2 size={16} /> 확인했어요 · 미션으로 돌아가기
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}
