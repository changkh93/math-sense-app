import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, Loader2, Send, Sparkles, Users } from 'lucide-react';
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

export default function StudyCrewDailyMission({ scopeType, scopeId, targetCount = 0, compact = false, teamRewardsEnabled = true }) {
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [missionPlan, setMissionPlan] = useState(null);
  const [missionDay, setMissionDay] = useState(null);
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [rewardToasts, setRewardToasts] = useState([]);
  const missionDaySeenRef = useRef(false);
  const shownTeamRewardKeyRef = useRef('');
  const suppressNextTeamRewardToastRef = useRef(false);

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
  const myResponse = responses.find((response) => response.userId === user?.uid) || null;
  const completedCount = responses.length;
  const target = Math.max(Number(targetCount || 0), completedCount, 1);
  const teamTarget = teamRewardsEnabled && target >= 2 ? target : 0;
  const teamCompleted = teamTarget > 0 && completedCount >= teamTarget;
  const teamRewardKey = getTimestampKey(missionDay?.teamRewardAwardedAt);

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
      setDraft('');
      if (rewards.individualAwarded) {
        pushRewardToast(rewards.individualAmount || 5);
        setMessage('오늘의 미션을 완료해 +5 광석을 획득했습니다.');
      } else {
        setMessage(myResponse ? '오늘의 미션 답변을 수정했습니다.' : '오늘의 미션을 저장했습니다.');
      }
      if (teamRewardsEnabled && rewards.teamAwarded) {
        suppressNextTeamRewardToastRef.current = true;
        pushRewardToast(rewards.teamAmount || 20, '팀 미션 완료');
        setMessage('팀 미션이 완료되어 +20 광석을 획득했습니다.');
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
        {teamRewardsEnabled ? (
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
  );
}
