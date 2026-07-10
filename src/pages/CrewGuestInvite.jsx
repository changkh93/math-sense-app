import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  browserSessionPersistence,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, Check, Clipboard, DoorOpen, RefreshCw, Send, ShieldCheck, Users } from 'lucide-react';
import { auth, functions } from '../firebase';
import StarField from '../components/Space/StarField';
import '../styles/space-theme.css';

const REACTIONS = [
  { id: 'cheer', emoji: '👏', label: '잘했어요' },
  { id: 'together', emoji: '🔥', label: '같이 가요' },
  { id: 'ready', emoji: '✅', label: '준비됐어요' },
  { id: 'help', emoji: '❓', label: '도움이 필요해요' },
];

function parseInviteToken(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return '';
  try {
    const url = new URL(clean);
    const match = url.pathname.match(/\/crew-invite\/([A-Za-z0-9]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // A raw token is also accepted.
  }
  return clean.replace(/[^A-Za-z0-9]/g, '').slice(0, 80);
}

function getErrorMessage(error, fallback) {
  const code = String(error?.code || '');
  if (code.includes('operation-not-allowed')) return '게스트 체험 인증이 아직 준비되지 않았습니다. 운영자에게 알려주세요.';
  if (code.includes('permission-denied')) return error?.message || '방 개설자가 아직 게스트 참여를 허용하지 않았습니다.';
  if (code.includes('failed-precondition')) return error?.message || fallback;
  if (code.includes('not-found')) return '유효한 크루 초대 링크를 찾지 못했습니다.';
  if (code.includes('unavailable')) return error?.message || '게스트 체험이 현재 잠시 중지되었습니다.';
  if (code.includes('internal')) return fallback;
  return error?.message || fallback;
}

function formatRemaining(expiresAtMs) {
  const minutes = Math.max(0, Math.ceil((Number(expiresAtMs || 0) - Date.now()) / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
  return `${minutes}분`;
}

export default function CrewGuestInvite() {
  const { inviteToken = '' } = useParams();
  const navigate = useNavigate();
  const token = useMemo(() => parseInviteToken(inviteToken), [inviteToken]);
  const [tokenDraft, setTokenDraft] = useState('');
  const [preview, setPreview] = useState(null);
  const [guestState, setGuestState] = useState(null);
  const [phase, setPhase] = useState(token ? 'preview' : 'enter-link');
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState('');
  const [reactionBusy, setReactionBusy] = useState('');
  const [handoff, setHandoff] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');

  const loadPreview = async ({ quiet = false } = {}) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    try {
      const fn = httpsCallable(functions, 'previewCrewGuestInvite');
      const result = await fn({ token });
      setPreview(result.data || null);
      setError('');
    } catch (err) {
      if (!quiet) setError(getErrorMessage(err, '초대 정보를 확인하지 못했습니다.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadGuestState = async ({ quiet = false } = {}) => {
    if (!auth.currentUser?.isAnonymous) return;
    try {
      const fn = httpsCallable(functions, 'getGuestCrewRoomState');
      const result = await fn();
      const next = result.data || null;
      setGuestState(next);
      if (next?.active) {
        setPhase('active');
        setError('');
      } else if (phase === 'active') {
        setPhase('ended');
      }
    } catch (err) {
      if (!quiet) setError(getErrorMessage(err, '게스트 체험방 상태를 확인하지 못했습니다.'));
    }
  };

  useEffect(() => {
    if (!token) return;
    loadPreview();
    const timer = window.setInterval(() => loadPreview({ quiet: true }), 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    return onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.isAnonymous) loadGuestState({ quiet: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const timer = window.setInterval(() => loadGuestState({ quiet: true }), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleTokenSubmit = (event) => {
    event.preventDefault();
    const parsed = parseInviteToken(tokenDraft);
    if (!parsed) {
      setError('크루에서 받은 초대 링크를 붙여 넣어주세요.');
      return;
    }
    navigate(`/crew-invite/${parsed}`);
  };

  const startGuestSession = async () => {
    if (!token || loading) return;
    if (!preview?.room?.isOpen || !preview?.room?.allowGuests) {
      setError('방 개설자가 게스트 참여를 허용한 뒤 입장할 수 있습니다.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        throw new Error('현재 정식 계정으로 로그인되어 있습니다. 정식 계정은 메인 화면에서 크루에 참여해 주세요.');
      }
      await setPersistence(auth, browserSessionPersistence);
      if (!auth.currentUser) await signInAnonymously(auth);
      const join = httpsCallable(functions, 'joinCrewGuestRoom');
      const result = await join({ token });
      setGuestState({ active: true, ...(result.data || {}) });
      setPhase('active');
    } catch (err) {
      setError(getErrorMessage(err, '게스트 체험방에 입장하지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  const sendReaction = async (reactionId) => {
    if (!guestState?.active || reactionBusy) return;
    setReactionBusy(reactionId);
    setError('');
    try {
      const fn = httpsCallable(functions, 'sendCrewGuestReaction');
      await fn({ reactionId });
      await loadGuestState({ quiet: true });
    } catch (err) {
      setError(getErrorMessage(err, '반응을 보내지 못했습니다.'));
    } finally {
      setReactionBusy('');
    }
  };

  const leaveGuestSession = async () => {
    setLoading(true);
    try {
      if (auth.currentUser?.isAnonymous) {
        await httpsCallable(functions, 'leaveCrewGuestRoom')().catch(() => null);
        await deleteUser(auth.currentUser).catch(async () => signOut(auth));
      }
    } finally {
      setGuestState(null);
      setPhase('ended');
      setLoading(false);
    }
  };

  const returnToMain = async () => {
    if (auth.currentUser?.isAnonymous) {
      await httpsCallable(functions, 'leaveCrewGuestRoom')().catch(() => null);
      await deleteUser(auth.currentUser).catch(async () => signOut(auth));
    }
    navigate('/');
  };

  const createHandoff = async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'createGuardianHandoff');
      const result = await fn();
      const handoffCode = result.data?.handoffCode || '';
      const url = `${window.location.origin}/signup?handoff=${encodeURIComponent(handoffCode)}`;
      setHandoff({ ...result.data, url });
    } catch (err) {
      setError(getErrorMessage(err, '보호자 안내 링크를 만들지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  const copyHandoff = async () => {
    if (!handoff?.url) return;
    await navigator.clipboard.writeText(handoff.url);
    setCopyMessage('보호자 안내 링크를 복사했습니다.');
  };

  const shareHandoff = async () => {
    if (!handoff?.url) return;
    if (navigator.share) {
      await navigator.share({
        title: '메타센스 보호자 회원가입 안내',
        text: `${guestState?.crew?.name || preview?.crew?.name || '스터디 크루'} 체험 후 정식 계정을 만들 수 있어요.`,
        url: handoff.url,
      });
      return;
    }
    await copyHandoff();
  };

  const cardStyle = {
    width: 'min(680px, calc(100% - 28px))',
    borderRadius: 18,
    padding: 'clamp(1.15rem, 4vw, 1.8rem)',
    background: 'rgba(5, 10, 25, 0.9)',
    border: '1px solid rgba(0, 212, 255, 0.24)',
    boxShadow: '0 20px 70px rgba(0,0,0,0.38)',
    backdropFilter: 'blur(16px)',
  };

  return (
    <div className="space-bg" style={{ minHeight: '100dvh', color: 'white', position: 'relative', overflowX: 'hidden' }}>
      <StarField count={130} />
      <div className="nebula-bg" />
      <main style={{ position: 'relative', zIndex: 20, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '28px 0 54px' }}>
        <section style={cardStyle}>
          <button type="button" onClick={returnToMain} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.68)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}>
            <ArrowLeft size={16} /> 메인으로
          </button>

          {phase === 'enter-link' && (
            <form onSubmit={handleTokenSubmit} style={{ marginTop: 28, display: 'grid', gap: 14 }}>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900 }}>GUEST EXPLORER</div>
              <h1 className="font-title" style={{ margin: 0, fontSize: 'clamp(1.65rem, 6vw, 2.4rem)' }}>초대 링크로 게스트 체험</h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>크루 멤버에게 받은 초대 링크를 붙여 넣어주세요. 방 개설자가 게스트 참여를 허용한 시간에만 입장할 수 있어요.</p>
              <input value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} placeholder="초대 링크 붙여 넣기" style={{ minHeight: 52, borderRadius: 12, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(255,255,255,0.07)', color: 'white', padding: '0.8rem 1rem', fontSize: '1rem' }} />
              <button type="submit" className="space-btn cosmic-btn font-tech" style={{ minHeight: 52, borderRadius: 12 }}>초대 링크 확인</button>
            </form>
          )}

          {token && phase !== 'active' && phase !== 'ended' && (
            <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900 }}>TODAY&apos;S GUEST CREW</div>
              <h1 className="font-title" style={{ margin: 0, fontSize: 'clamp(1.65rem, 6vw, 2.4rem)' }}>{preview?.crew?.name || '크루 초대 확인 중'}</h1>
              {preview?.crew?.motto && <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{preview.crew.motto}</p>}
              <div style={{ display: 'grid', gap: 9, padding: '1rem', borderRadius: 14, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bbf7d0', fontWeight: 850 }}><ShieldCheck size={18} /> 안전한 게스트 체험</div>
                <div style={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, fontSize: '0.92rem' }}>자동 별명만 사용하며 자유 채팅·카메라·마이크는 열리지 않습니다. 회원 프로필과 학습 기록도 만들지 않아요.</div>
              </div>
              {preview?.room?.isOpen && preview?.room?.allowGuests ? (
                <button type="button" onClick={startGuestSession} disabled={loading} className="space-btn cosmic-btn font-tech" style={{ minHeight: 54, borderRadius: 12, fontSize: '1.02rem' }}>
                  <DoorOpen size={18} style={{ verticalAlign: -4, marginRight: 7 }} /> {loading ? '입장 준비 중...' : '오늘만 게스트로 참여'}
                </button>
              ) : (
                <div style={{ padding: '1rem', borderRadius: 13, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', color: '#fde68a', lineHeight: 1.6 }}>
                  {preview?.room?.isOpen ? '체험방은 열려 있지만 방 개설자가 아직 게스트 참여를 허용하지 않았습니다.' : '아직 열려 있는 게스트 체험방이 없습니다.'}
                  <button type="button" onClick={() => loadPreview()} disabled={loading} style={{ marginLeft: 8, border: 'none', background: 'transparent', color: 'var(--crystal-cyan)', cursor: 'pointer' }}><RefreshCw size={15} style={{ verticalAlign: -3 }} /> 다시 확인</button>
                </div>
              )}
            </div>
          )}

          {phase === 'active' && guestState?.active && (
            <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
              <div>
                <div className="font-tech" style={{ color: 'var(--planet-green)', fontWeight: 900 }}>GUEST SESSION ACTIVE</div>
                <h1 className="font-title" style={{ margin: '0.35rem 0 0', fontSize: 'clamp(1.65rem, 6vw, 2.35rem)' }}>{guestState.crew?.name}</h1>
                <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>오늘의 별명은 <strong style={{ color: 'var(--crystal-cyan)' }}>{guestState.alias}</strong>입니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '0.5rem 0.75rem', borderRadius: 999, background: 'rgba(0,212,255,0.1)', color: '#a5f3fc' }}><Users size={15} style={{ verticalAlign: -3 }} /> 게스트 {guestState.guestCount || 1}명</span>
                <span style={{ padding: '0.5rem 0.75rem', borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)' }}>남은 시간 {formatRemaining(guestState.expiresAtMs)}</span>
              </div>
              <div>
                <div className="font-tech" style={{ color: 'rgba(255,255,255,0.76)', marginBottom: 9 }}>자유 채팅 대신 안전한 반응을 보내요.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
                  {REACTIONS.map((reaction) => (
                    <button key={reaction.id} type="button" onClick={() => sendReaction(reaction.id)} disabled={!!reactionBusy} style={{ minHeight: 66, borderRadius: 13, border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'white', cursor: reactionBusy ? 'wait' : 'pointer', fontWeight: 800 }}>
                      <span style={{ fontSize: '1.3rem', marginRight: 6 }}>{reaction.emoji}</span>{reactionBusy === reaction.id ? '보내는 중' : reaction.label}
                    </button>
                  ))}
                </div>
              </div>
              {guestState.recentReactions?.length > 0 && (
                <div style={{ display: 'grid', gap: 7, padding: '1rem', borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
                  <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 850 }}>방금 도착한 반응</div>
                  {guestState.recentReactions.slice(-4).reverse().map((reaction, index) => <div key={`${reaction.createdAtMs}-${index}`} style={{ color: 'rgba(255,255,255,0.72)' }}>{reaction.emoji} {reaction.alias} · {reaction.label}</div>)}
                </div>
              )}
              <div style={{ padding: '1.15rem', borderRadius: 15, background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(0,212,255,0.11))', border: '1px solid rgba(165,180,252,0.24)' }}>
                <h2 className="font-title" style={{ margin: 0, fontSize: '1.15rem' }}>오늘의 체험을 계속 이어가고 싶나요?</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: 12 }}>보호자가 먼저 가입한 뒤 자녀 계정을 만들면, 이 크루 초대가 자녀 계정에 14일간 보관됩니다. 아이가 보호자 연락처를 입력할 필요는 없어요.</p>
                {!handoff ? (
                  <button type="button" onClick={createHandoff} disabled={loading} className="space-btn font-tech" style={{ borderRadius: 10, color: 'var(--crystal-cyan)' }}><Send size={16} style={{ verticalAlign: -3, marginRight: 6 }} />보호자에게 가입 안내 보내기</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={copyHandoff} className="space-btn font-tech" style={{ borderRadius: 10, color: 'var(--crystal-cyan)' }}><Clipboard size={16} style={{ verticalAlign: -3, marginRight: 6 }} />링크 복사</button>
                    <button type="button" onClick={shareHandoff} className="space-btn cosmic-btn font-tech" style={{ borderRadius: 10 }}><Send size={16} style={{ verticalAlign: -3, marginRight: 6 }} />공유하기</button>
                    {copyMessage && <span style={{ color: '#bbf7d0', alignSelf: 'center' }}><Check size={15} style={{ verticalAlign: -3 }} /> {copyMessage}</span>}
                  </div>
                )}
              </div>
              <button type="button" onClick={leaveGuestSession} disabled={loading} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 8 }}>체험 종료하고 임시 세션 삭제</button>
            </div>
          )}

          {phase === 'ended' && (
            <div style={{ marginTop: 28, textAlign: 'center', display: 'grid', gap: 14 }}>
              <div style={{ fontSize: '2.2rem' }}>🌙</div>
              <h1 className="font-title" style={{ margin: 0 }}>오늘의 게스트 체험이 끝났어요</h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7 }}>임시 별명과 참여 정보는 삭제됩니다. 보호자 안내 링크를 만들었다면 그 링크는 24시간 동안만 사용할 수 있어요.</p>
              <button type="button" onClick={returnToMain} className="space-btn cosmic-btn font-tech" style={{ borderRadius: 12, minHeight: 50 }}>메인으로 돌아가기</button>
            </div>
          )}

          {loading && phase === 'preview' && <div style={{ marginTop: 24, color: 'var(--crystal-cyan)' }}>초대 좌표를 확인하고 있어요...</div>}
          {error && <div style={{ marginTop: 16, padding: '0.8rem 0.9rem', borderRadius: 11, background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.22)', color: '#fecaca', lineHeight: 1.55 }}>{error}</div>}
        </section>
      </main>
    </div>
  );
}
