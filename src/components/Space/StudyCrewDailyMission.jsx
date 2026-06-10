import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, Loader2, Send, Sparkles, Users } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';

const MISSION_MAX_LENGTH = 60;
const DAILY_MISSIONS = [
  { id: 'mood_color', category: '아이스브레이킹', title: '오늘의 기분 색깔', prompt: '오늘 기분을 색깔 하나와 이유 한마디로 표현해보세요.' },
  { id: 'study_goal', category: '학습 목표', title: '오늘의 목표', prompt: '오늘 집중방에서 끝내고 싶은 공부 목표를 한 줄로 남겨보세요.' },
  { id: 'favorite_snack', category: '취향 공유', title: '집중 간식', prompt: '공부할 때 먹고 싶은 간식 하나를 공유해보세요.' },
  { id: 'mistake_share', category: '수학 습관', title: '자주 하는 실수', prompt: '수학 문제를 풀 때 내가 자주 하는 실수 하나를 적어보세요.' },
  { id: 'encourage_friend', category: '서로 응원', title: '응원 한마디', prompt: '오늘 같이 공부하는 멤버에게 짧은 응원 한마디를 남겨보세요.' },
  { id: 'focus_tip', category: '학습 습관', title: '나만의 집중법', prompt: '내가 집중할 때 도움이 되는 방법 하나를 알려주세요.' },
  { id: 'hard_problem', category: '수학 대화', title: '막히는 순간', prompt: '어려운 문제를 만났을 때 나는 어떻게 버티는지 적어보세요.' },
  { id: 'one_sentence_math', category: '수학 대화', title: '오늘의 수학 한 문장', prompt: '오늘 배운 수학 내용을 한 문장으로 설명해보세요.' },
  { id: 'good_place', category: '취향 공유', title: '좋아하는 공부 장소', prompt: '내가 공부가 잘 되는 장소 유형을 하나 말해보세요.' },
  { id: 'thank_you', category: '서로 응원', title: '고마운 점 찾기', prompt: '오늘 함께 공부하는 멤버에게 고마운 점을 하나 찾아 적어보세요.' },
  { id: 'problem_for_friend', category: '수학 대화', title: '친구에게 낼 문제', prompt: '친구에게 내고 싶은 아주 짧은 수학 문제 아이디어를 적어보세요.' },
  { id: 'break_style', category: '취향 공유', title: '쉬는 방식', prompt: '공부하다 쉴 때 내가 좋아하는 쉬는 방법을 공유해보세요.' },
  { id: 'proud_today', category: '학습 회고', title: '오늘의 뿌듯함', prompt: '오늘 공부하면서 가장 뿌듯했던 순간을 한 줄로 남겨보세요.' },
  { id: 'tomorrow_promise', category: '서로 응원', title: '내일의 약속', prompt: '내일 다시 공부한다면 꼭 지키고 싶은 약속 하나를 적어보세요.' },
];

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function getMissionForDate(dateKey) {
  const seed = String(dateKey || '').replaceAll('-', '');
  const numericSeed = Number(seed) || 0;
  return DAILY_MISSIONS[numericSeed % DAILY_MISSIONS.length];
}

function getScopeKey(scopeType, scopeId) {
  return `${scopeType}_${String(scopeId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export default function StudyCrewDailyMission({ scopeType, scopeId, targetCount = 0, compact = false }) {
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');

  const todayKey = useMemo(() => getTodayKey(), []);
  const mission = useMemo(() => getMissionForDate(todayKey), [todayKey]);
  const scopeKey = useMemo(() => getScopeKey(scopeType, scopeId), [scopeType, scopeId]);
  const myResponse = responses.find((response) => response.userId === user?.uid) || null;
  const completedCount = responses.length;
  const target = Math.max(Number(targetCount || 0), completedCount, 1);
  const teamCompleted = completedCount >= target;

  useEffect(() => {
    if (!scopeType || !scopeId) {
      setResponses([]);
      return undefined;
    }

    const responsesQuery = query(
      collection(db, 'studyCrewDailyMissions', scopeKey, 'days', todayKey, 'responses'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(responsesQuery, (snap) => {
      setResponses(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to listen daily crew mission responses:', err);
      setResponses([]);
    });
    return () => unsub();
  }, [scopeId, scopeKey, scopeType, todayKey]);

  useEffect(() => {
    if (!myResponse) return;
    setDraft('');
  }, [myResponse?.answer]);

  const submitAnswer = async () => {
    const answer = draft.trim().replace(/\s+/g, ' ').slice(0, MISSION_MAX_LENGTH);
    if (!answer || action || !scopeType || !scopeId) return;

    setAction('submitting');
    setMessage('');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'submitStudyCrewDailyMission');
      await fn({ scopeType, scopeId, answer });
      setDraft('');
      setMessage(myResponse ? '오늘의 미션 답변을 수정했습니다.' : '오늘의 미션을 완료했습니다.');
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

  return (
    <section className="glass-card hud-border" style={{
      padding: compact ? '0.9rem' : '1.1rem',
      borderRadius: 12,
      borderColor: teamCompleted ? 'rgba(34,197,94,0.34)' : 'rgba(0,243,255,0.18)',
      background: teamCompleted
        ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(7,13,30,0.82) 58%)'
        : 'rgba(7,13,30,0.78)',
    }}>
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
          {completedCount}/{target} 완료
        </div>
      </div>

      <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'stretch' }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MISSION_MAX_LENGTH))}
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
          <span>{draft.length}/{MISSION_MAX_LENGTH}</span>
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
