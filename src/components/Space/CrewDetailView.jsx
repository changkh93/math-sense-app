import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, Camera, CameraOff, Clock3, Crown, Hash, Radio, Send, Users } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';

const CREW_GROUP_PRESETS = [
  { id: 'python', name: '파이썬' },
  { id: 'elementary_math', name: '초등수학' },
  { id: 'middle_math', name: '중등수학' }
];

const inputStyle = {
  width: '100%', minHeight: 46, boxSizing: 'border-box', borderRadius: 8,
  border: '1px solid rgba(0, 243, 255, 0.28)', background: 'rgba(5, 10, 24, 0.72)',
  color: 'var(--text-bright)', padding: '0.75rem 0.9rem', outline: 'none'
};
const panelStyle = {
  background: 'rgba(7, 13, 30, 0.78)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 8, padding: '1.2rem'
};

function getCrewStatusLabel(s) { return s === 'approved' ? '인증 완료' : s === 'rejected' ? '반려됨' : '운영자 승인 대기'; }
function getCrewStatusColor(s) { return s === 'approved' ? 'var(--planet-green)' : s === 'rejected' ? '#f87171' : 'var(--planet-orange)'; }
function getMemberLabel(m, f = '크루 멤버') { return m?.studentName || m?.publicDisplayName || m?.displayName || f; }
function getTodayKey() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()); }
function getFunctionsErrorMessage(err, fb) {
  const c = err?.code || '';
  if (c.includes('not-found')) return '해당 크루를 찾지 못했습니다.';
  if (c.includes('failed-precondition') && err?.message) return err.message;
  return fb;
}

export default function CrewDetailView({ onBack, onEnterRoom }) {
  const { user, userData } = useAuth();
  const { data: clusters, isLoading: loadingClusters } = useClusters();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [greetingText, setGreetingText] = useState('');
  const [roomDuration, setRoomDuration] = useState(50);
  const [crewRoom, setCrewRoom] = useState(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [previewCameraOn, setPreviewCameraOn] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [formData, setFormData] = useState({ name: '', motto: '', color: '#00d4ff', groupId: 'none' });
  const previewStreamRef = useRef(null);

  const crew = userData?.crewSnapshot || null;
  const crewId = crew?.id || userData?.crewId || '';
  const members = useMemo(() => crew?.members || [], [crew?.members]);
  const greetings = useMemo(() => crew?.recentGreetings || [], [crew?.recentGreetings]);
  const status = crew?.status || userData?.crewStatus || 'pending';
  const todayKey = getTodayKey();
  const studiedToday = members.filter(m => m.lastStreakDate === todayKey);
  const isRoomParticipant = !!crewRoom?.participantIds?.includes(user?.uid);
  const roomIsFull = (crewRoom?.participantCount || 0) >= (crewRoom?.maxParticipants || 3);

  const groupOptions = useMemo(() => {
    const co = (clusters || []).map(c => ({ id: c.docId || c.id, name: c.name || c.title || c.id, clusterId: c.docId || c.id }));
    const merged = [...CREW_GROUP_PRESETS, ...co];
    const seen = new Set();
    return [{ id: 'none', name: '군집 선택 없이 시작' }, ...merged.filter(o => { if (!o.id || seen.has(o.id)) return false; seen.add(o.id); return true; })];
  }, [clusters]);
  const selectedGroup = groupOptions.find(o => o.id === formData.groupId) || groupOptions[0];

  const latestGreetingByUser = useMemo(() => {
    const m = new Map();
    greetings.forEach(g => { if (g?.userId && !m.has(g.userId)) m.set(g.userId, g); });
    return m;
  }, [greetings]);

  const enrichedMembers = useMemo(() => {
    const next = [...members];
    if (user?.uid && !next.some(m => m.uid === user.uid)) {
      next.unshift({ uid: user.uid, studentName: userData?.studentName || userData?.publicDisplayName || user.displayName || '나', currentStreak: userData?.currentStreak || 0, lastStreakDate: userData?.lastStreakDate || '', crewRole: userData?.crewRole || 'member' });
    }
    const unique = Array.from(new Map(next.map(m => [m.uid, m])).values());
    return unique.sort((a, b) => { if (a.uid === user?.uid) return -1; if (b.uid === user?.uid) return 1; if (a.crewRole === 'leader') return -1; if (b.crewRole === 'leader') return 1; return (b.currentStreak || 0) - (a.currentStreak || 0); }).slice(0, 3);
  }, [members, user, userData]);

  // Listen to study rooms
  useEffect(() => {
    if (!crewId) { setCrewRoom(null); return; }
    const unsub = onSnapshot(collection(db, 'studyRooms'), snap => {
      const room = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.crewId === crewId && r.status !== 'ended').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0] || null;
      setCrewRoom(room);
    });
    return () => unsub();
  }, [crewId]);

  // Sync form data from crew
  useEffect(() => {
    const s = crew || {};
    setFormData(p => ({ ...p, name: s.name || userData?.crewName || p.name, motto: s.motto || p.motto, color: s.color || userData?.crewColor || p.color, groupId: s.groupId || p.groupId || 'none' }));
  }, [crew, userData?.crewColor, userData?.crewName]);

  // Camera preview
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      if (!navigator.mediaDevices?.getUserMedia) { setPreviewError('카메라 미리보기를 지원하지 않습니다.'); return; }
      if (previewStreamRef.current) { setPreviewStream(previewStreamRef.current); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } }, audio: false });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        s.getVideoTracks().forEach(t => { t.enabled = previewCameraOn; });
        previewStreamRef.current = s;
        setPreviewStream(s);
        setPreviewError('');
      } catch (e) { if (!cancelled) { setPreviewStream(null); setPreviewError('카메라 미리보기 실패. 브라우저 권한을 확인해주세요.'); } }
    }
    setup();
    return () => { cancelled = true; };
  }, [previewCameraOn]);

  useEffect(() => {
    if (!previewStreamRef.current) return;
    previewStreamRef.current.getVideoTracks().forEach(t => { t.enabled = previewCameraOn; });
    setPreviewStream(previewStreamRef.current);
  }, [previewCameraOn]);

  useEffect(() => () => { if (previewStreamRef.current) { previewStreamRef.current.getTracks().forEach(t => t.stop()); previewStreamRef.current = null; } }, []);

  const handlePostGreeting = async (text = greetingText) => {
    const clean = text.trim().slice(0, 80);
    if (!user?.uid || !crewId || !clean || busy) return;
    setBusy(true);
    try {
      const fn = httpsCallable(functions, 'postStudyCrewGreeting');
      await fn({ crewId, text: clean });
      setGreetingText('');
      setMessage('인사말을 남겼습니다.');
    } catch { setMessage('인사말을 남기지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const handleUpdateCrewBasics = async () => {
    if (!user?.uid || !crewId || userData?.crewRole !== 'leader' || busy) return;
    setBusy(true); setMessage('');
    try {
      const fn = httpsCallable(functions, 'updateStudyCrew');
      const ng = selectedGroup?.id === 'none' ? { groupId: 'none', groupName: '자유 스터디', clusterId: '', clusterName: '' } : { groupId: selectedGroup.id, groupName: selectedGroup.name, clusterId: selectedGroup.clusterId || '', clusterName: selectedGroup.clusterId ? selectedGroup.name : '' };
      await fn({ crewId, name: formData.name.trim(), motto: formData.motto.trim(), color: formData.color, ...ng });
      setMessage('크루 소개가 업데이트되었습니다.');
    } catch { setMessage('업데이트 실패.'); }
    finally { setBusy(false); }
  };

  const handleCreateStudyRoom = async () => {
    if (!crewId || busy) return;
    setBusy(true); setMessage(''); soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'createStudyRoom');
      const res = await fn({ crewId, durationMinutes: roomDuration });
      if (onEnterRoom) onEnterRoom(res?.data?.roomId || '');
      setMessage('집중방을 열었습니다.');
    } catch (e) { setMessage(getFunctionsErrorMessage(e, '집중방 생성 실패.')); }
    finally { setBusy(false); }
  };

  const handleJoinStudyRoom = async () => {
    if (!crewRoom?.id || busy) return;
    setBusy(true); setMessage(''); soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'joinStudyRoomSession');
      await fn({ roomId: crewRoom.id });
      if (onEnterRoom) onEnterRoom(crewRoom.id);
    } catch (e) { setMessage(getFunctionsErrorMessage(e, '입장 실패.')); }
    finally { setBusy(false); }
  };

  if (!crew) return null;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%', padding: '2rem 1rem 6rem' }}>
      {/* Back */}
      <button onClick={() => { if (previewStreamRef.current) { previewStreamRef.current.getTracks().forEach(t => t.stop()); previewStreamRef.current = null; } onBack(); }} className="space-nav-link font-tech" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: 8 }}>
        <ArrowLeft size={16} /> 크루 목록으로
      </button>

      {/* Crew Header */}
      <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card hud-border" style={{ padding: '1.4rem', borderRadius: 12, marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: crew.color || '#00d4ff', boxShadow: `0 0 20px ${(crew.color || '#00d4ff')}55`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-tech" style={{ color: getCrewStatusColor(status), fontWeight: 800, fontSize: '0.82rem' }}>{getCrewStatusLabel(status)}</div>
            <h2 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.2rem 0 0', fontSize: '1.6rem' }}>{crew.name || userData?.crewName || '스터디 크루'}</h2>
            <p className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', margin: '0.3rem 0 0', lineHeight: 1.5 }}>{crew.motto || '아직 크루 모토가 없습니다.'}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginTop: '1rem' }}>
          {[
            { label: '초대 코드', value: crew.inviteCode || '-', color: 'var(--text-bright)' },
            { label: '군집', value: crew.groupName || '자유 스터디', color: 'var(--crystal-cyan)' },
            { label: '멤버', value: `${crew.memberCount || members.length || 1}명`, color: 'var(--text-bright)' },
            { label: '오늘 학습', value: studiedToday.length, color: 'var(--planet-green)' },
            { label: '내 역할', value: userData?.crewRole === 'leader' ? '리더' : '멤버', color: crew.color || 'var(--crystal-cyan)' },
          ].map(item => (
            <div key={item.label} style={{ ...panelStyle, padding: '0.7rem' }}>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{item.label}</div>
              <strong style={{ color: item.color, fontSize: '1rem' }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </Motion.div>

      {/* Members */}
      <div style={{ marginBottom: '1.2rem' }}>
        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.6rem' }}>CREW MEMBERS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.8rem' }}>
          {enrichedMembers.map(member => {
            const isSelf = member.uid === user?.uid;
            const isLeader = member.crewRole === 'leader';
            const studied = member.lastStreakDate === todayKey;
            const greeting = latestGreetingByUser.get(member.uid)?.text || '';
            return (
              <div key={member.uid} className="glass-card hud-border" style={{ padding: '1rem', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  {isLeader && <Crown size={14} style={{ color: '#fbbf24' }} />}
                  <span className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 700 }}>{getMemberLabel(member)}{isSelf ? ' (나)' : ''}</span>
                </div>
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  연속 {member.currentStreak || 0}일 · {studied ? '✅ 오늘 학습 완료' : '미학습'}
                </div>
                {greeting && <div className="font-tech" style={{ marginTop: '0.4rem', padding: '0.35rem 0.6rem', borderRadius: 999, background: 'rgba(148, 163, 184, 0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>"{greeting}"</div>}
                {isSelf && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <input style={{ ...inputStyle, minHeight: 36, padding: '0.5rem 0.65rem', background: 'rgba(2,6,23,0.75)' }} value={greetingText} onChange={e => setGreetingText(e.target.value)} placeholder="짧은 인사 남기기" maxLength={80} />
                    <button className="space-btn cosmic-btn font-tech" type="button" disabled={busy || !greetingText.trim()} onClick={() => handlePostGreeting()} style={{ borderRadius: 8, minWidth: 44, padding: '0 0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Send size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
          {enrichedMembers.length < 3 && (
            <div className="glass-card" style={{ padding: '1rem', borderRadius: 10, border: '1px dashed rgba(0,243,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', minHeight: 100 }}>
              <div className="font-tech" style={{ textAlign: 'center' }}>
                <Users size={20} style={{ opacity: 0.5, marginBottom: '0.3rem' }} />
                <div>초대 코드로 한 명 더 합류 가능</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Study Stream Control */}
      <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card hud-border" style={{ padding: '1.3rem', borderRadius: 12, marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <div>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.85rem' }}>STUDY STREAM</div>
            <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.2rem', marginTop: '0.15rem' }}>집중방 컨트롤</div>
          </div>
          <button type="button" className="space-nav-link font-tech" onClick={() => { setPreviewCameraOn(p => !p); soundManager.playClick(); }} style={{ borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {previewCameraOn ? <Camera size={15} /> : <CameraOff size={15} />}
            {previewCameraOn ? '카메라 ON' : '카메라 OFF'}
          </button>
        </div>

        {/* Camera Preview */}
        {previewStream && previewCameraOn && (
          <div style={{ width: '100%', maxWidth: 320, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,243,255,0.2)', marginBottom: '0.9rem' }}>
            <video ref={el => { if (el) el.srcObject = previewStream; }} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#020617' }} />
          </div>
        )}
        {previewError && <div className="font-tech" style={{ color: '#fda4af', lineHeight: 1.45, marginBottom: '0.8rem' }}>{previewError}</div>}

        {status !== 'approved' ? (
          <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>운영자 승인 후 방을 열 수 있습니다.</div>
        ) : crewRoom ? (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <div style={{ ...panelStyle, padding: '0.9rem', background: 'rgba(2,6,23,0.62)' }}>
              <div className="font-tech" style={{ color: crewRoom.status === 'live' ? 'var(--planet-green)' : 'var(--planet-orange)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Radio size={14} /> {crewRoom.status === 'live' ? '집중 진행 중' : '입장 대기 중'}
              </div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Users size={14} /> {crewRoom.participantCount || 0}/{crewRoom.maxParticipants || 3}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock3 size={14} /> {crewRoom.durationMinutes || 50}분</span>
              </div>
            </div>
            {isRoomParticipant ? (
              <button type="button" className="space-btn cosmic-btn font-tech" onClick={() => onEnterRoom && onEnterRoom(crewRoom.id)} style={{ borderRadius: 8, padding: '0.9rem 1.1rem' }}>집중방 다시 열기</button>
            ) : (
              <button type="button" className="space-btn cosmic-btn font-tech" disabled={busy || roomIsFull} onClick={handleJoinStudyRoom} style={{ borderRadius: 8, padding: '0.9rem 1.1rem' }}>{roomIsFull ? '정원 가득 참' : '집중방 입장'}</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>아직 열린 집중방이 없습니다.</div>
            {userData?.crewRole === 'leader' ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[30, 50, 90].map(d => (
                    <button key={d} type="button" className={`space-nav-link font-tech ${roomDuration === d ? 'active' : ''}`} onClick={() => { setRoomDuration(d); soundManager.playClick(); }} style={{ borderRadius: 999, padding: '0.5rem 0.85rem' }}>{d}분</button>
                  ))}
                </div>
                <button type="button" className="space-btn cosmic-btn font-tech" disabled={busy} onClick={handleCreateStudyRoom} style={{ borderRadius: 8, padding: '0.9rem 1.1rem' }}>{roomDuration}분 집중방 열기</button>
              </>
            ) : (
              <div className="font-tech" style={{ color: 'var(--text-muted)' }}>리더가 방을 열면 여기서 입장할 수 있습니다.</div>
            )}
          </div>
        )}
      </Motion.div>

      {/* Leader Settings */}
      {userData?.crewRole === 'leader' && (
        <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12 }}>
          <h3 className="font-tech" style={{ color: 'var(--crystal-cyan)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}><Crown size={16} /> 리더 설정</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 이름</span>
              <input style={inputStyle} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} maxLength={28} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 모토</span>
              <input style={inputStyle} value={formData.motto} onChange={e => setFormData(p => ({ ...p, motto: e.target.value }))} maxLength={52} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>군집</span>
              <select style={inputStyle} value={formData.groupId} onChange={e => setFormData(p => ({ ...p, groupId: e.target.value }))}>
                {groupOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>엠블럼 색상</span>
              <input type="color" style={{ ...inputStyle, padding: '0.35rem' }} value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} />
            </label>
          </div>
          <button type="button" className="space-btn cosmic-btn font-tech" disabled={busy} onClick={handleUpdateCrewBasics} style={{ marginTop: '1rem', padding: '0.85rem 1.2rem', borderRadius: 8 }}>크루 소개 저장</button>
        </section>
      )}

      {message && <p className="font-tech" style={{ marginTop: '1rem', color: message.includes('실패') || message.includes('못했') ? '#f87171' : 'var(--planet-green)' }}>{message}</p>}
    </div>
  );
}
