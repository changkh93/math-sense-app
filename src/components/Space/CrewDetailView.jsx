import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, CalendarDays, Camera, CameraOff, Clock3, Crown, Loader2, LogOut, Radio, Send, StickyNote, Trash2, Users } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import CrewSettingsModal from './CrewSettingsModal';
import { formatCrewSchedule } from './crewSchedule';

const inputStyle = {
  width: '100%', minHeight: 46, boxSizing: 'border-box', borderRadius: 8,
  border: '1px solid rgba(0, 243, 255, 0.28)', background: 'rgba(5, 10, 24, 0.72)',
  color: 'var(--text-bright)', padding: '0.75rem 0.9rem', outline: 'none'
};
const panelStyle = {
  background: 'rgba(7, 13, 30, 0.78)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 8, padding: '1.2rem'
};
const NOTE_MAX_LENGTH = 120;

function getCrewStatusLabel(s) { return s === 'approved' ? '인증 완료' : s === 'rejected' ? '반려됨' : '운영자 승인 대기'; }
function getCrewStatusColor(s) { return s === 'approved' ? 'var(--planet-green)' : s === 'rejected' ? '#f87171' : 'var(--planet-orange)'; }
function getMemberLabel(m, f = '크루 멤버') { return m?.studentName || m?.publicDisplayName || m?.displayName || f; }
function getTodayKey() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()); }
function getPresenceInfo(profile) {
  const liveStatus = profile?.liveStatus;
  const updatedMs = liveStatus?.lastUpdatedAt?.toMillis?.() || 0;
  const stale = !updatedMs || Date.now() - updatedMs > 120000;
  if (stale) return { label: '오프라인', color: 'rgba(255,255,255,0.42)', dot: '#64748b' };
  if (liveStatus?.state === 'away') return { label: '자리비움', color: '#fbbf24', dot: '#fbbf24' };
  return { label: '온라인', color: 'var(--planet-green)', dot: '#22c55e' };
}
function getFunctionsErrorMessage(err, fb) {
  const c = err?.code || '';
  if (c.includes('not-found')) return '해당 크루를 찾지 못했습니다.';
  if (c.includes('failed-precondition') && err?.message) return err.message;
  return fb;
}

function uniqueIds(ids = []) {
  return Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean)));
}

function getGreetingReadMeta(note, crewMemberIds = [], currentUid = '') {
  const normalizedReadBy = uniqueIds([note?.userId, ...(Array.isArray(note?.readBy) ? note.readBy : [])]);
  const members = uniqueIds(crewMemberIds);
  const totalCount = members.length || Math.max(normalizedReadBy.length, 1);
  const readCount = members.length
    ? members.filter((memberId) => normalizedReadBy.includes(memberId)).length
    : normalizedReadBy.length;
  const hasCurrentUserRead = currentUid ? normalizedReadBy.includes(currentUid) : false;
  const isFullyRead = totalCount > 0 && readCount >= totalCount;
  return { normalizedReadBy, totalCount, readCount, hasCurrentUserRead, isFullyRead };
}

export default function CrewDetailView({ onBack, onEnterRoom }) {
  const { user, userData } = useAuth();
  const [roomAction, setRoomAction] = useState('');
  const [message, setMessage] = useState('');
  const [noteText, setNoteText] = useState('');
  const [pendingNotes, setPendingNotes] = useState([]);
  const [activeNoteAction, setActiveNoteAction] = useState('');
  const [roomDuration, setRoomDuration] = useState(50);
  const [crewRoom, setCrewRoom] = useState(null);
  const [crewDocData, setCrewDocData] = useState(null);
  const [liveNotes, setLiveNotes] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [previewStream, setPreviewStream] = useState(null);
  const [previewCameraOn, setPreviewCameraOn] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [leaveAction, setLeaveAction] = useState('');
  const previewStreamRef = useRef(null);

  const crew = useMemo(() => ({ ...(userData?.crewSnapshot || {}), ...(crewDocData || {}) }), [userData?.crewSnapshot, crewDocData]);
  const crewId = crew?.id || userData?.crewId || '';
  const members = useMemo(() => crew?.members || [], [crew?.members]);
  const crewMemberIds = useMemo(() => uniqueIds([
    ...(Array.isArray(crew?.memberIds) ? crew.memberIds : []),
    crew?.leaderId,
  ]), [crew?.memberIds, crew?.leaderId]);
  const notes = useMemo(() => liveNotes, [liveNotes]);
  const displayNotes = useMemo(() => {
    const serverKeys = new Set(notes.map((note) => `${note?.userId || ''}::${note?.text || ''}`));
    const filteredPending = pendingNotes.filter((note) => !serverKeys.has(`${note?.userId || ''}::${note?.text || ''}`));
    return [...filteredPending, ...notes].slice(0, 6);
  }, [notes, pendingNotes]);
  const status = crew?.status || userData?.crewStatus || 'pending';
  const todayKey = getTodayKey();
  const studiedToday = members.filter(m => m.lastStreakDate === todayKey);
  const isRoomParticipant = !!crewRoom?.participantIds?.includes(user?.uid);
  const roomIsFull = (crewRoom?.participantCount || 0) >= (crewRoom?.maxParticipants || 3);
  const isLeader = userData?.crewRole === 'leader';
  const canLeaderDeleteCrew = isLeader && crewMemberIds.length <= 1;

  const memberNameById = useMemo(() => {
    const next = new Map();
    members.forEach((member) => next.set(member.uid, getMemberLabel(member)));
    if (user?.uid) next.set(user.uid, getMemberLabel(userData, user.displayName || '나'));
    return next;
  }, [members, user?.uid, user?.displayName, userData]);

  const enrichedMembers = useMemo(() => {
    const next = [...members];
    if (user?.uid && !next.some(m => m.uid === user.uid)) {
      next.unshift({ uid: user.uid, studentName: userData?.studentName || userData?.publicDisplayName || user.displayName || '나', currentStreak: userData?.currentStreak || 0, lastStreakDate: userData?.lastStreakDate || '', crewRole: userData?.crewRole || 'member' });
    }
    const unique = Array.from(new Map(next.map(m => [m.uid, m])).values());
    return unique.sort((a, b) => { if (a.uid === user?.uid) return -1; if (b.uid === user?.uid) return 1; if (a.crewRole === 'leader') return -1; if (b.crewRole === 'leader') return 1; return (b.currentStreak || 0) - (a.currentStreak || 0); }).slice(0, 3);
  }, [members, user, userData]);

  useEffect(() => {
    const ids = enrichedMembers.map((member) => member.uid).filter(Boolean);
    if (!ids.length) {
      setMemberProfiles({});
      return undefined;
    }

    const unsubscribers = ids.map((uid) => onSnapshot(doc(db, 'users', uid), (snap) => {
      setMemberProfiles((prev) => ({
        ...prev,
        [uid]: snap.exists() ? snap.data() : null,
      }));
    }));

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [enrichedMembers]);

  // Listen to study rooms
  useEffect(() => {
    if (!crewId) { setCrewRoom(null); return; }
    const roomQuery = query(collection(db, 'studyRooms'), where('crewId', '==', crewId));
    const unsub = onSnapshot(roomQuery, snap => {
      const room = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status !== 'ended').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0] || null;
      setCrewRoom(room);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    if (!crewId) {
      setCrewDocData(null);
      return undefined;
    }
    const unsub = onSnapshot(doc(db, 'crews', crewId), (snap) => {
      setCrewDocData(snap.exists() ? ({ id: snap.id, ...snap.data() }) : null);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    if (!crewId) {
      setLiveNotes([]);
      return undefined;
    }
    const greetingsQuery = query(
      collection(db, 'crews', crewId, 'greetings'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(greetingsQuery, (snap) => {
      setLiveNotes(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to listen to crew greetings:', err);
      setLiveNotes([]);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    if (!notes.length) return;
    setPendingNotes((prev) => prev.filter((pending) => !notes.some((note) => note.userId === pending.userId && note.text === pending.text)));
  }, [notes]);

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
      } catch {
        if (!cancelled) { setPreviewStream(null); setPreviewError('카메라 미리보기 실패. 브라우저 권한을 확인해주세요.'); }
      }
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

  const handlePostNote = async (text = noteText) => {
    const clean = text.trim().slice(0, NOTE_MAX_LENGTH);
    if (!user?.uid || !crewId || !clean || activeNoteAction === 'posting') return;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticNote = {
      id: tempId,
      crewId,
      userId: user.uid,
      userName: userData?.studentName || userData?.publicDisplayName || user.displayName || '탐사원',
      text: clean,
      readBy: [user.uid],
      createdAt: new Date(),
      updatedAt: new Date(),
      localPending: true,
    };
    setActiveNoteAction('posting');
    setPendingNotes((prev) => [optimisticNote, ...prev].slice(0, 6));
    setNoteText('');
    try {
      const fn = httpsCallable(functions, 'postStudyCrewGreeting');
      await fn({ crewId, text: clean });
      setMessage('포스트잇을 남겼습니다.');
    } catch (err) {
      setPendingNotes((prev) => prev.filter((note) => note.id !== tempId));
      setNoteText(clean);
      console.error('Failed to post study crew greeting:', err);
      setMessage('포스트잇을 남기지 못했습니다.');
    } finally { setActiveNoteAction(''); }
  };

  const handleReadNote = async (noteId) => {
    if (!crewId || !noteId || activeNoteAction) return;
    setActiveNoteAction(`read:${noteId}`);
    try {
      const fn = httpsCallable(functions, 'markStudyCrewGreetingRead');
      await fn({ crewId, greetingId: noteId });
    } catch (err) {
      console.error('Failed to mark post-it as read:', err);
      setMessage('포스트잇 읽음 표시에 실패했습니다.');
    } finally {
      setActiveNoteAction('');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!crewId || !noteId || activeNoteAction) return;
    const confirmed = window.confirm('이 포스트잇을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.');
    if (!confirmed) return;
    const pendingNote = pendingNotes.find((note) => note.id === noteId);
    if (pendingNote) {
      setPendingNotes((prev) => prev.filter((note) => note.id !== noteId));
      setMessage('포스트잇을 삭제했습니다.');
      return;
    }
    setActiveNoteAction(`delete:${noteId}`);
    try {
      await deleteDoc(doc(db, 'crews', crewId, 'greetings', noteId));
      setPendingNotes((prev) => prev.filter((note) => note.id !== noteId));
      setMessage('포스트잇을 삭제했습니다.');
    } catch (err) {
      console.error('Failed to delete post-it:', err);
      setMessage('포스트잇 삭제에 실패했습니다.');
    } finally {
      setActiveNoteAction('');
    }
  };

  const handleNoteKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!noteText.trim() || activeNoteAction === 'posting') return;
    handlePostNote();
  };

  const handleCreateStudyRoom = async () => {
    if (!crewId || roomAction) return;
    setRoomAction('creating');
    setMessage('집중방 여는 중...');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'createStudyRoom');
      const res = await fn({ crewId, durationMinutes: roomDuration });
      if (onEnterRoom) onEnterRoom(res?.data?.roomId || '');
      setMessage('집중방을 열었습니다.');
    } catch (e) { setMessage(getFunctionsErrorMessage(e, '집중방 생성 실패.')); }
    finally { setRoomAction(''); }
  };

  const handleJoinStudyRoom = async () => {
    if (!crewRoom?.id || roomAction) return;
    setRoomAction('joining');
    setMessage('집중방 입장 중...');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'joinStudyRoomSession');
      await fn({ roomId: crewRoom.id });
      if (onEnterRoom) onEnterRoom(crewRoom.id);
    } catch (e) { setMessage(getFunctionsErrorMessage(e, '입장 실패.')); }
    finally { setRoomAction(''); }
  };

  const handleLeaveCrew = async () => {
    if (!crewId || leaveAction) return;

    if (isLeader && !canLeaderDeleteCrew) {
      alert('리더는 다른 멤버가 모두 나간 뒤, 혼자 남았을 때만 크루를 삭제할 수 있습니다.');
      return;
    }

    const confirmMessage = isLeader
      ? '혼자 남은 리더가 탈퇴하면 크루가 삭제됩니다.\n정말 크루를 삭제할까요?'
      : '정말 이 크루에서 탈퇴할까요?';
    if (!window.confirm(confirmMessage)) return;

    setLeaveAction('leaving');
    setMessage(isLeader ? '크루 삭제 처리 중...' : '크루 탈퇴 처리 중...');

    try {
      const fn = httpsCallable(functions, 'leaveStudyCrew');
      await fn({ crewId });
      setMessage(isLeader ? '크루를 삭제했습니다.' : '크루에서 탈퇴했습니다.');
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }
      onBack();
    } catch (err) {
      console.error('Failed to leave crew:', err);
      setMessage(getFunctionsErrorMessage(err, isLeader ? '크루 삭제에 실패했습니다.' : '크루 탈퇴에 실패했습니다.'));
    } finally {
      setLeaveAction('');
    }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '0.7rem', marginTop: '0.8rem' }}>
          <div style={{ ...panelStyle, padding: '0.85rem' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: '0.35rem' }}>크루 설명</div>
            <div className="font-tech" style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {crew.description || '아직 자세한 크루 설명이 없습니다.'}
            </div>
          </div>
          <div style={{ ...panelStyle, padding: '0.85rem' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarDays size={13} /> 정기 공부 일정
            </div>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', lineHeight: 1.55 }}>
              {formatCrewSchedule(crew.scheduleDays, crew.scheduleTimes)}
            </div>
          </div>
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
            const presence = getPresenceInfo(memberProfiles[member.uid]);
            return (
              <div key={member.uid} className="glass-card hud-border" style={{ padding: '1rem', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    {isLeader && <Crown size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />}
                    <span className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getMemberLabel(member)}{isSelf ? ' (나)' : ''}</span>
                  </div>
                  <span className="font-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: presence.color, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: presence.dot, boxShadow: `0 0 8px ${presence.dot}88` }} />
                    {presence.label}
                  </span>
                </div>
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  연속 {member.currentStreak || 0}일 · {studied ? '✅ 오늘 학습 완료' : '미학습'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post-it Board */}
      <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12, marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <div>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <StickyNote size={15} /> CREW POST-IT
            </div>
            <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.15rem', marginTop: '0.15rem' }}>함께 남기는 메모</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.55rem', alignItems: 'end', marginBottom: '1rem' }}>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.45 }}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            placeholder="나누고 싶은 글, 오늘의 약속, 먼저 들어온 사람이 남기는 말을 적어주세요."
            maxLength={NOTE_MAX_LENGTH}
            disabled={activeNoteAction === 'posting'}
          />
          <button
            className="space-btn cosmic-btn font-tech"
            type="button"
            disabled={activeNoteAction === 'posting' || !noteText.trim()}
            onClick={() => handlePostNote()}
            style={{ borderRadius: 8, minWidth: 54, minHeight: 46, padding: '0 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {activeNoteAction === 'posting' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>
        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.74rem', marginTop: '-0.4rem', marginBottom: '0.9rem', textAlign: 'right' }}>
          {noteText.length}/{NOTE_MAX_LENGTH}
        </div>
        {displayNotes.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.75rem' }}>
            {displayNotes.map((note, index) => {
              const { normalizedReadBy, totalCount, readCount, hasCurrentUserRead, isFullyRead } = getGreetingReadMeta(note, crewMemberIds, user?.uid);
              const canDeleteNote = note.userId === user?.uid || userData?.role === 'admin';
              const isPendingPost = !!note.localPending;
              const noteColor = ['rgba(250, 204, 21, 0.18)', 'rgba(45, 212, 191, 0.16)', 'rgba(96, 165, 250, 0.16)', 'rgba(251, 191, 36, 0.14)'][index % 4];
              return (
                <div
                  key={note.id || `${note.userId}-${index}`}
                  style={{
                    borderRadius: 12,
                    padding: '0.95rem 0.95rem 0.85rem',
                    minHeight: 132,
                    background: `${noteColor}`,
                    border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                    position: 'relative',
                    transform: `rotate(${index % 2 === 0 ? -1.2 : 1.1}deg)`,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    width: 34,
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.16)',
                  }} />
                  <div className="font-tech" style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.76rem', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {memberNameById.get(note.userId) || note.userName || '크루 멤버'}
                      {note.userId === user?.uid && (
                        <span style={{ padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(96,165,250,0.16)', color: 'var(--crystal-cyan)' }}>내 메모</span>
                      )}
                      {isPendingPost && (
                        <span style={{ padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}>저장 중</span>
                      )}
                    </span>
                    <span style={{ color: isFullyRead ? 'var(--planet-green)' : 'rgba(255,255,255,0.64)' }}>
                      읽음 {readCount}/{totalCount}명
                    </span>
                  </div>
                  <div className="font-tech" style={{ color: 'var(--text-bright)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.7rem' }}>{note.text}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="font-tech" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.74rem' }}>
                      {normalizedReadBy.length > 0 ? `읽은 사람 ${readCount}명` : '아직 읽은 사람이 없습니다'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {note.userId !== user?.uid && (
                        <button
                          type="button"
                          className="space-nav-link font-tech"
                          onClick={() => handleReadNote(note.id)}
                          disabled={activeNoteAction === `read:${note.id}` || activeNoteAction === 'posting' || hasCurrentUserRead}
                          style={{ borderRadius: 8, padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                        >
                          {activeNoteAction === `read:${note.id}` ? '처리 중...' : hasCurrentUserRead ? '읽음' : '읽었어요'}
                        </button>
                      )}
                      {canDeleteNote && (
                        <button
                          type="button"
                          className="space-nav-link font-tech"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={activeNoteAction === `delete:${note.id}` || activeNoteAction === 'posting'}
                          style={{ borderRadius: 8, padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#fca5a5' }}
                        >
                          {activeNoteAction === `delete:${note.id}` ? '삭제 중...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 size={13} />삭제</span>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
            <div
              style={{
                borderRadius: 12,
                minHeight: 132,
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.14)',
                display: 'grid',
                placeItems: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <div className="font-tech" style={{ textAlign: 'center', lineHeight: 1.55 }}>
                <StickyNote size={20} style={{ marginBottom: '0.45rem', opacity: 0.6 }} />
                <div>아직 남겨진 포스트잇이 없습니다.</div>
              </div>
            </div>
          </div>
        )}
      </Motion.div>

      {/* Study Stream Control */}
      <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card hud-border" style={{ padding: '1.3rem', borderRadius: 12, marginBottom: '1.2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.85rem' }}>STUDY STREAM</div>
          <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.2rem', marginTop: '0.15rem' }}>집중방 컨트롤</div>
          <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            이 제어는 각 참여자 자신의 화면에만 표시되고, 본인 카메라와 상태만 바꿉니다.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(420px, 100%), 1.35fr) minmax(min(300px, 100%), 0.85fr)', gap: '1rem', alignItems: 'stretch' }}>
          <div>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,243,255,0.2)', background: '#020617', position: 'relative' }}>
              {previewStream && previewCameraOn ? (
                <video ref={el => { if (el) el.srcObject = previewStream; }} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="font-tech" style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.54)' }}>
                  {previewError || '카메라가 꺼져 있습니다.'}
                </div>
              )}
              <div className="font-tech" style={{ position: 'absolute', left: 12, bottom: 12, padding: '0.32rem 0.6rem', borderRadius: 999, background: 'rgba(2,6,23,0.72)', color: 'var(--text-bright)', fontSize: '0.82rem' }}>
                {userData?.studentName || userData?.publicDisplayName || user?.displayName || '나'}
              </div>
            </div>
            {previewError && previewCameraOn && <div className="font-tech" style={{ color: '#fda4af', lineHeight: 1.45, marginTop: '0.65rem' }}>{previewError}</div>}
          </div>

          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: '0.8rem', minHeight: '100%' }}>
            <button type="button" className="space-nav-link font-tech" onClick={() => { setPreviewCameraOn(p => !p); soundManager.playClick(); }} style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%' }}>
              {previewCameraOn ? <Camera size={15} /> : <CameraOff size={15} />}
              {previewCameraOn ? '카메라 ON' : '카메라 OFF'}
            </button>

            {status !== 'approved' ? (
              <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>운영자 승인 후 방을 열 수 있습니다.</div>
            ) : crewRoom ? (
              <>
                <div style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(2,6,23,0.62)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="font-tech" style={{ color: crewRoom.status === 'live' ? 'var(--planet-green)' : 'var(--planet-orange)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Radio size={14} /> {crewRoom.status === 'live' ? '집중 진행 중' : '입장 대기 중'}
                  </div>
                  <div className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '0.45rem', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Users size={14} /> {crewRoom.participantCount || 0}/{crewRoom.maxParticipants || 3}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock3 size={14} /> {crewRoom.durationMinutes || 50}분</span>
                  </div>
                  <div className="font-tech" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.8rem', marginTop: '0.55rem', lineHeight: 1.45 }}>
                    이미 열린 방이 있어 새 시간 선택은 방이 종료된 뒤 가능합니다.
                  </div>
                </div>
                {isRoomParticipant ? (
                  <button type="button" className="space-btn cosmic-btn font-tech" onClick={() => onEnterRoom && onEnterRoom(crewRoom.id)} style={{ borderRadius: 8, padding: '0.9rem 1.1rem', marginTop: 'auto' }}>집중방 다시 열기</button>
                ) : (
                  <button type="button" className="space-btn cosmic-btn font-tech" disabled={!!roomAction || roomIsFull} onClick={handleJoinStudyRoom} style={{ borderRadius: 8, padding: '0.9rem 1.1rem', marginTop: 'auto' }}>{roomAction === 'joining' ? '입장 처리 중...' : roomIsFull ? '정원 가득 참' : '집중방 입장'}</button>
                )}
              </>
            ) : (
              <>
                <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>아직 열린 집중방이 없습니다.</div>
                {userData?.crewRole === 'leader' ? (
                  <>
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        집중 시간: <strong style={{ color: 'var(--crystal-cyan)' }}>{roomDuration}분</strong>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="10"
                        value={roomDuration}
                        onChange={(e) => setRoomDuration(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <div className="font-tech" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        <span>10분</span>
                        <span>60분</span>
                        <span>120분</span>
                      </div>
                    </div>
                    <button type="button" className="space-btn cosmic-btn font-tech" disabled={!!roomAction} onClick={handleCreateStudyRoom} style={{ borderRadius: 8, padding: '0.9rem 1.1rem', marginTop: 'auto' }}>{roomAction === 'creating' ? '집중방 여는 중...' : `${roomDuration}분 집중방 열기`}</button>
                  </>
                ) : (
                  <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>리더가 방을 열면 여기서 입장할 수 있습니다.</div>
                )}
              </>
            )}
          </div>
        </div>
      </Motion.div>

      {userData?.crewRole === 'leader' && (
        <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h3 className="font-tech" style={{ color: 'var(--crystal-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Crown size={16} /> 리더 설정
            </h3>
            <button
              type="button"
              className="space-nav-link font-tech active"
              onClick={() => { soundManager.playClick(); setShowSettingsModal(true); }}
              style={{ borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              설정 열기
            </button>
          </div>
          <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginTop: '0.8rem' }}>
            크루 이름, 모토, 군집, 엠블럼은 거의 수정하지 않는 값입니다. 버튼을 눌러 모달에서만 변경하세요.
          </div>
        </section>
      )}

      <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12, marginTop: '1.2rem', borderColor: 'rgba(248,113,113,0.24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 className="font-tech" style={{ color: '#fca5a5', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <LogOut size={16} /> {isLeader ? '크루 삭제' : '크루 탈퇴'}
          </h3>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={handleLeaveCrew}
            disabled={leaveAction === 'leaving' || (isLeader && !canLeaderDeleteCrew)}
            style={{ borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#fca5a5', opacity: leaveAction === 'leaving' || (isLeader && !canLeaderDeleteCrew) ? 0.55 : 1 }}
          >
            <LogOut size={15} />
            {leaveAction === 'leaving' ? '처리 중...' : isLeader ? '크루 삭제 후 탈퇴' : '크루 탈퇴'}
          </button>
        </div>
        <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.8rem' }}>
          {isLeader
            ? canLeaderDeleteCrew
              ? '현재 리더 혼자 남아 있어 탈퇴가 가능하며, 이 경우 크루 자체가 삭제됩니다.'
              : '리더는 다른 크루 멤버가 모두 탈퇴한 뒤, 혼자 남았을 때만 크루를 삭제할 수 있습니다.'
            : '탈퇴하면 현재 크루에서 빠집니다. 다시 참여하려면 일반 참여 흐름으로 다시 들어와야 합니다.'}
        </div>
      </section>

      {message && <p className="font-tech" style={{ marginTop: '1rem', color: message.includes('실패') || message.includes('못했') ? '#f87171' : 'var(--planet-green)' }}>{message}</p>}
      <CrewSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        crew={crew}
      />
    </div>
  );
}
