import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';

// Guest entry screen for the crew waiting room.
// Route: /crew-invite/:crewId
// Flow: preview crew -> signInAnonymously -> enterCrewAsGuest -> stash session -> redirect to /
export default function CrewGuestInvite() {
  const { crewId } = useParams();
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';
  const navigate = useNavigate();
  const [phase, setPhase] = useState(() => (crewId ? 'preview' : 'error')); // preview | entering | error
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(() => (crewId ? '' : '초대 링크가 올바르지 않습니다.'));

  useEffect(() => {
    if (!crewId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const fn = httpsCallable(functions, 'previewCrewGuestInvite');
        const result = await fn({ crewId, inviteToken });
        if (!cancelled) {
          setPreview(result.data || null);
          if (!result.data?.guestsAdmitted) {
            setMessage('크루 리더가 게스트 참여를 아직 허용하지 않았습니다. 안내받은 크루 리더에게 문의해 주세요.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setMessage(err?.message || '초대받은 크루를 확인하지 못했습니다.');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [crewId, inviteToken]);

  const handleEnter = async () => {
    setPhase('entering');
    setMessage('');
    try {
      await signInAnonymously(auth);
      const fn = httpsCallable(functions, 'enterCrewAsGuest');
      const result = await fn({ crewId, inviteToken });
      const data = result.data || {};
      const session = {
        crewId: data.crewId || crewId,
        crewName: data.crewName,
        crewColor: data.crewColor,
        guestAlias: data.guestAlias,
        referralToken: data.referralTracked ? inviteToken : '',
        referralTracked: data.referralTracked === true,
        startedAt: Date.now(),
      };
      window.sessionStorage.setItem('crewGuestSession', JSON.stringify(session));
      window.sessionStorage.setItem('metasense_current_view', 'crew');
      navigate('/', { replace: true, state: { view: 'crew' } });
    } catch (err) {
      setPhase('error');
      const code = err?.code || '';
      if (code === 'functions/permission-denied') {
        setMessage('크루 리더가 게스트 참여를 허용하지 않았습니다.');
      } else if (code === 'functions/failed-precondition') {
        setMessage('현재 입장할 수 없는 크루입니다.');
      } else {
        setMessage(err?.message || '게스트 입장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  const crewName = preview?.crewName || '스터디 크루';
  const crewColor = preview?.crewColor || '#00d4ff';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #08111f, #171436 55%, #0b1020)', color: 'white', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif', padding: '28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <main style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 30 }}>
          <Link to="/" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 900, fontSize: '1.1rem' }}>META SENSE</Link>
        </header>

        <section style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 28, boxShadow: '0 24px 70px rgba(0,0,0,0.28)', textAlign: 'center' }}>
          <div className="font-tech" style={{ color: '#86efac', fontWeight: 900, fontSize: '0.8rem', letterSpacing: 1, marginBottom: 14 }}>STUDY CREW · GUEST</div>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: crewColor, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#05111f' }}>
            {(crewName || '?').slice(0, 1)}
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>{crewName}</h1>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, fontSize: '0.92rem' }}>
            초대받은 스터디 크루의 대기룸과 집중방(Google Meet)을 회원가입 없이 체험할 수 있습니다.
          </p>

          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 22, fontSize: '0.84rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
            <div style={{ marginBottom: 6 }}>✓ 크루 대기룸과 집중방(Google Meet) 입장</div>
            <div style={{ marginBottom: 6 }}>✓ 크루 멤버에게 포스트잇 메시지 작성</div>
            <div>✗ 학습 기록·출석·광석·랭킹은 저장되지 않습니다</div>
          </div>

          {message && (
            <div style={{ marginBottom: 18, padding: 13, borderRadius: 12, background: 'rgba(248,113,113,0.09)', color: '#fecaca', fontSize: '0.86rem', lineHeight: 1.5 }}>{message}</div>
          )}

          {phase !== 'error' && (
            <button
              type="button"
              onClick={handleEnter}
              disabled={phase === 'entering' || !preview?.guestsAdmitted}
              style={{ width: '100%', border: 'none', borderRadius: 13, padding: '15px 18px', background: (phase === 'entering' || !preview?.guestsAdmitted) ? 'rgba(0,212,255,0.35)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: 'white', fontWeight: 900, fontSize: '1.05rem', cursor: (phase === 'entering' || !preview?.guestsAdmitted) ? 'not-allowed' : 'pointer' }}
            >
              {phase === 'entering' ? '입장 중...' : '게스트로 입장하기'}
            </button>
          )}

          <div style={{ marginTop: 18 }}>
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>메인으로 돌아가기</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
