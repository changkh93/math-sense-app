import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Camera, CameraOff, Clock3, Crown, Hash, Radio, Send, Users } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';
import StudyStreamRoomView from './StudyStreamRoomView';

const CREW_GROUP_PRESETS = [
  { id: 'python', name: '파이썬' },
  { id: 'elementary_math', name: '초등수학' },
  { id: 'middle_math', name: '중등수학' }
];

const inputStyle = {
  width: '100%',
  minHeight: '46px',
  boxSizing: 'border-box',
  borderRadius: '8px',
  border: '1px solid rgba(0, 243, 255, 0.28)',
  background: 'rgba(5, 10, 24, 0.72)',
  color: 'var(--text-bright)',
  padding: '0.75rem 0.9rem',
  outline: 'none'
};

const panelStyle = {
  background: 'rgba(7, 13, 30, 0.78)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: '8px',
  padding: '1.2rem'
};

const actionButtonStyle = {
  minHeight: 92,
  borderRadius: '8px',
  padding: '1rem 1.15rem',
  textAlign: 'left',
  display: 'grid',
  gap: '0.35rem'
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>{label}</span>
      {children}
      {hint && <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{hint}</span>}
    </label>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '1rem', margin: '2rem 0 0.9rem', flexWrap: 'wrap' }}>
      <div>
        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.85rem' }}>{eyebrow}</div>
        <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.25rem 0 0', fontSize: '1.45rem' }}>{title}</h3>
      </div>
      {right}
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div style={{ ...panelStyle, color: 'var(--text-muted)', minHeight: 72, display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  );
}

const crewTileStyle = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.11)',
  background: 'rgba(4, 9, 22, 0.94)',
  aspectRatio: '4 / 5',
  minHeight: 320
};

function getMemberLabel(member, fallback = '크루 멤버') {
  return member?.studentName || member?.publicDisplayName || member?.displayName || fallback;
}

function CrewStreamTile({
  stream,
  title,
  subtitle,
  accent = '#60a5fa',
  message = '',
  isLocal = false,
  cameraOn = false,
  topBadge = '',
  topBadgeColor = 'rgba(96, 165, 250, 0.18)',
  empty = false,
  children,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div style={crewTileStyle}>
      {stream && cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#020617' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            background: empty
              ? 'radial-gradient(circle at top, rgba(15,23,42,0.92), rgba(2,6,23,0.96))'
              : `radial-gradient(circle at top, ${accent}22, rgba(2,6,23,0.96) 62%)`,
            color: 'rgba(255,255,255,0.72)'
          }}
        >
          <div style={{ textAlign: 'center', padding: '1.2rem' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                margin: '0 auto 0.9rem',
                display: 'grid',
                placeItems: 'center',
                background: empty ? 'rgba(255,255,255,0.05)' : `${accent}20`,
                border: `1px solid ${accent}33`
              }}
            >
              {empty ? <Users size={28} /> : (cameraOn ? <Camera size={28} /> : <CameraOff size={28} />)}
            </div>
            {!empty && (
              <>
                <div className="font-tech" style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{title}</div>
                <div className="font-tech" style={{ marginTop: '0.4rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
                  {subtitle}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {topBadge && (
        <div
          className="font-tech"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '0.35rem 0.6rem',
            borderRadius: 999,
            background: topBadgeColor,
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 700,
            backdropFilter: 'blur(10px)'
          }}
        >
          {topBadge}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          padding: '0.95rem',
          background: 'linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.86) 28%, rgba(2,6,23,0.96))',
          display: 'grid',
          gap: '0.6rem'
        }}
      >
        {message && (
          <div
            className="font-tech"
            style={{
              justifySelf: 'start',
              maxWidth: '100%',
              padding: '0.42rem 0.65rem',
              borderRadius: 999,
              background: 'rgba(148, 163, 184, 0.18)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.86)',
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'end' }}>
          <div style={{ minWidth: 0 }}>
            <div className="font-tech" style={{ color: '#fff', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            <div className="font-tech" style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.82rem' }}>
              {subtitle}
            </div>
          </div>
          <div style={{ color: cameraOn ? 'var(--planet-green)' : 'rgba(255,255,255,0.45)' }}>
            {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function getCrewStatusLabel(status) {
  if (status === 'approved') return '인증 완료';
  if (status === 'rejected') return '반려됨';
  return '운영자 승인 대기';
}

function getCrewStatusColor(status) {
  if (status === 'approved') return 'var(--planet-green)';
  if (status === 'rejected') return '#f87171';
  return 'var(--planet-orange)';
}

function getFunctionsErrorMessage(err, fallback) {
  const code = err?.code || '';
  if (code.includes('not-found')) return '해당 초대 코드를 가진 크루를 찾지 못했습니다.';
  if (code.includes('failed-precondition') && err?.message) return err.message;
  if (code.includes('invalid-argument') && err?.message) return err.message;
  return fallback;
}

function CrewSummaryCard({ crew, compact = false }) {
  const status = crew?.status || 'pending';
  const color = crew?.color || '#00d4ff';

  return (
    <div style={{
      ...panelStyle,
      display: 'grid',
      gridTemplateColumns: compact ? '1fr' : 'auto 1fr auto',
      gap: '1rem',
      alignItems: 'center'
    }}>
      <div style={{
        width: 54,
        height: 54,
        borderRadius: 8,
        background: color,
        boxShadow: `0 0 22px ${color}55`
      }} />
      <div>
        <div className="font-tech" style={{ color: getCrewStatusColor(status), fontWeight: 800, fontSize: '0.82rem' }}>
          {getCrewStatusLabel(status)}
        </div>
        <h4 style={{ color: 'var(--text-bright)', margin: '0.25rem 0 0', fontSize: '1.15rem' }}>
          {crew?.name || '이름 없는 크루'}
        </h4>
        <p style={{ color: 'rgba(255,255,255,0.68)', margin: '0.35rem 0 0', lineHeight: 1.45 }}>
          {crew?.motto || '아직 소개가 없습니다.'}
        </p>
      </div>
      <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.6, justifySelf: compact ? 'start' : 'end' }}>
        <div>{crew?.groupName || crew?.clusterName || '자유 스터디'}</div>
        <div>멤버 {crew?.memberCount || crew?.memberIds?.length || 1}명</div>
      </div>
    </div>
  );
}

export default function StudyCrewView() {
  const { user, userData } = useAuth();
  const { data: clusters, isLoading: loadingClusters } = useClusters();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [greetingText, setGreetingText] = useState('');
  const [roomDuration, setRoomDuration] = useState(50);
  const [activePanel, setActivePanel] = useState(null);
  const [directoryCrews, setDirectoryCrews] = useState([]);
  const [crewRoom, setCrewRoom] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [previewStream, setPreviewStream] = useState(null);
  const [previewCameraOn, setPreviewCameraOn] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    motto: '',
    color: '#00d4ff',
    groupId: 'none'
  });
  const previewStreamRef = useRef(null);

  const groupOptions = useMemo(() => {
    const clusterOptions = (clusters || []).map(cluster => ({
      id: cluster.docId || cluster.id,
      name: cluster.name || cluster.title || cluster.id,
      clusterId: cluster.docId || cluster.id
    }));
    const merged = [...CREW_GROUP_PRESETS, ...clusterOptions];
    const seen = new Set();
    return [
      { id: 'none', name: '군집 선택 없이 시작' },
      ...merged.filter(option => {
        if (!option.id || seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
      })
    ];
  }, [clusters]);

  const crew = userData?.crewSnapshot || null;
  const crewId = crew?.id || userData?.crewId || '';
  const members = useMemo(() => crew?.members || [], [crew?.members]);
  const greetings = useMemo(() => crew?.recentGreetings || [], [crew?.recentGreetings]);
  const selectedGroup = groupOptions.find(option => option.id === formData.groupId) || groupOptions[0];
  const todayKey = getTodayKey();
  const studiedToday = members.filter(member => member.lastStreakDate === todayKey);
  const status = crew?.status || userData?.crewStatus || 'pending';
  const hasCrew = !!crewId;
  const isRoomParticipant = !!crewRoom?.participantIds?.includes(user?.uid);
  const roomIsFull = (crewRoom?.participantCount || 0) >= (crewRoom?.maxParticipants || 3);
  const latestGreetingByUser = useMemo(() => {
    const nextMap = new Map();
    greetings.forEach((greeting) => {
      if (!greeting?.userId || nextMap.has(greeting.userId)) return;
      nextMap.set(greeting.userId, greeting);
    });
    return nextMap;
  }, [greetings]);
  const enrichedMembers = useMemo(() => {
    const nextMembers = [...members];
    if (user?.uid && !nextMembers.some((member) => member.uid === user.uid)) {
      nextMembers.unshift({
        uid: user.uid,
        studentName: userData?.studentName || userData?.publicDisplayName || user.displayName || '나',
        publicDisplayName: userData?.publicDisplayName || '',
        currentStreak: userData?.currentStreak || 0,
        lastStreakDate: userData?.lastStreakDate || '',
        crewRole: userData?.crewRole || 'member'
      });
    }

    const uniqueMembers = Array.from(new Map(nextMembers.map((member) => [member.uid, member])).values());
    return uniqueMembers
      .sort((left, right) => {
        if (left.uid === user?.uid) return -1;
        if (right.uid === user?.uid) return 1;
        if (left.crewRole === 'leader' && right.crewRole !== 'leader') return -1;
        if (right.crewRole === 'leader' && left.crewRole !== 'leader') return 1;
        return (right.currentStreak || 0) - (left.currentStreak || 0);
      })
      .slice(0, 3);
  }, [members, user?.uid, user?.displayName, userData?.crewRole, userData?.currentStreak, userData?.lastStreakDate, userData?.publicDisplayName, userData?.studentName]);
  const memberTiles = useMemo(() => {
    const filledTiles = enrichedMembers.map((member) => ({
      key: member.uid,
      member,
      greeting: latestGreetingByUser.get(member.uid)?.text || '',
      isLive: !!crewRoom?.participantIds?.includes(member.uid)
    }));
    while (filledTiles.length < 3) {
      filledTiles.push({
        key: `empty-${filledTiles.length}`,
        member: null,
        greeting: '',
        isLive: false
      });
    }
    return filledTiles;
  }, [crewRoom?.participantIds, enrichedMembers, latestGreetingByUser]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'crews'), (snapshot) => {
      const nextCrews = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(nextCrew => nextCrew.status !== 'rejected')
        .sort((a, b) => {
          if ((a.status || 'pending') !== (b.status || 'pending')) {
            return (a.status === 'approved' ? -1 : 1);
          }
          return (b.memberCount || b.memberIds?.length || 0) - (a.memberCount || a.memberIds?.length || 0);
        });
      setDirectoryCrews(nextCrews);
    }, (err) => {
      console.error('Failed to load crew directory:', err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!crewId) {
      setCrewRoom(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(collection(db, 'studyRooms'), (snapshot) => {
      const nextRoom = snapshot.docs
        .map((roomDoc) => ({ id: roomDoc.id, ...roomDoc.data() }))
        .filter((roomDoc) => roomDoc.crewId === crewId && roomDoc.status !== 'ended')
        .sort((a, b) => {
          const aCreated = a.createdAt?.toMillis?.() || 0;
          const bCreated = b.createdAt?.toMillis?.() || 0;
          return bCreated - aCreated;
        })[0] || null;
      setCrewRoom(nextRoom);
    }, (err) => {
      console.error('Failed to load study rooms:', err);
    });

    return () => unsubscribe();
  }, [crewId]);

  useEffect(() => {
    if (!crewRoom && activeRoomId) {
      setActiveRoomId('');
      return;
    }
    if (crewRoom && activeRoomId && crewRoom.id !== activeRoomId) {
      setActiveRoomId('');
    }
  }, [crewRoom, activeRoomId]);

  useEffect(() => {
    const source = crew || {};
    setFormData(prev => ({
      ...prev,
      name: source.name || userData?.crewName || prev.name,
      motto: source.motto || prev.motto,
      color: source.color || userData?.crewColor || prev.color,
      groupId: source.groupId || userData?.crewSnapshot?.groupId || prev.groupId || 'none'
    }));
  }, [crew, userData?.crewColor, userData?.crewName, userData?.crewSnapshot?.groupId]);

  useEffect(() => {
    if (crewRoom?.id && isRoomParticipant && activeRoomId !== crewRoom.id) {
      setActiveRoomId(crewRoom.id);
    }
  }, [activeRoomId, crewRoom?.id, isRoomParticipant]);

  useEffect(() => {
    let cancelled = false;

    async function ensurePreviewStream() {
      if (!hasCrew || (activeRoomId && crewRoom?.id === activeRoomId && isRoomParticipant)) {
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((track) => track.stop());
          previewStreamRef.current = null;
        }
        setPreviewStream(null);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setPreviewError('이 브라우저는 카메라 미리보기를 지원하지 않습니다.');
        return;
      }

      if (previewStreamRef.current) {
        setPreviewStream(previewStreamRef.current);
        setPreviewError('');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream.getVideoTracks().forEach((track) => {
          track.enabled = previewCameraOn;
        });
        previewStreamRef.current = stream;
        setPreviewStream(stream);
        setPreviewError('');
      } catch (err) {
        console.error('Failed to create crew lobby preview stream:', err);
        if (!cancelled) {
          setPreviewStream(null);
          setPreviewError('카메라 미리보기를 시작하지 못했습니다. 브라우저 권한을 확인해주세요.');
        }
      }
    }

    ensurePreviewStream();

    return () => {
      cancelled = true;
    };
  }, [activeRoomId, crewRoom?.id, hasCrew, isRoomParticipant, previewCameraOn]);

  useEffect(() => {
    if (!previewStreamRef.current) return;
    previewStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = previewCameraOn;
    });
    setPreviewStream(previewStreamRef.current);
  }, [previewCameraOn]);

  useEffect(() => () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }
  }, []);

  const handleCreateCrew = async () => {
    if (!user?.uid || busy) return;
    if (hasCrew) {
      setMessage('이미 소속된 크루가 있습니다.');
      return;
    }
    if (!formData.name.trim()) {
      alert('크루 이름을 입력해주세요.');
      return;
    }

    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const createCrew = httpsCallable(functions, 'createStudyCrew');
      const nextGroup = selectedGroup?.id === 'none'
        ? { groupId: 'none', groupName: '자유 스터디', clusterId: '', clusterName: '' }
        : {
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            clusterId: selectedGroup.clusterId || '',
            clusterName: selectedGroup.clusterId ? selectedGroup.name : ''
          };

      await createCrew({
        name: formData.name.trim(),
        motto: formData.motto.trim(),
        color: formData.color,
        ...nextGroup
      });

      setActivePanel(null);
      setMessage('크루 생성 요청이 접수되었습니다. 창설권 1개가 사용되었고, 운영자 인증 후 Study Stream이 열립니다.');
    } catch (err) {
      console.error('Failed to create crew:', err);
      setMessage(getFunctionsErrorMessage(err, '크루 생성 요청에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const handleJoinCrew = async () => {
    if (!user?.uid || busy) return;
    if (hasCrew) {
      setMessage('이미 소속된 크루가 있습니다.');
      return;
    }
    if (!joinCode.trim()) {
      alert('초대 코드를 입력해주세요.');
      return;
    }

    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const joinCrew = httpsCallable(functions, 'joinStudyCrew');
      await joinCrew({ inviteCode: joinCode.trim().toUpperCase() });
      setJoinCode('');
      setActivePanel(null);
      setMessage('크루에 합류했습니다. 참여권 1개가 사용되었습니다.');
    } catch (err) {
      console.error('Failed to join crew:', err);
      setMessage(getFunctionsErrorMessage(err, '크루 참가에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePostGreeting = async (text = greetingText) => {
    const cleanText = text.trim().slice(0, 80);
    if (!user?.uid || !crewId || !cleanText || busy) return;

    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const postGreeting = httpsCallable(functions, 'postStudyCrewGreeting');
      await postGreeting({ crewId, text: cleanText });
      setGreetingText('');
      setMessage('인사말을 남겼습니다.');
    } catch (err) {
      console.error('Failed to post greeting:', err);
      setMessage('인사말을 남기지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCrewBasics = async () => {
    if (!user?.uid || !crewId || userData?.crewRole !== 'leader' || busy) return;
    setBusy(true);
    setMessage('');

    try {
      const updateCrew = httpsCallable(functions, 'updateStudyCrew');
      const nextGroup = selectedGroup?.id === 'none'
        ? { groupId: 'none', groupName: '자유 스터디', clusterId: '', clusterName: '' }
        : {
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            clusterId: selectedGroup.clusterId || '',
            clusterName: selectedGroup.clusterId ? selectedGroup.name : ''
          };

      await updateCrew({
        crewId,
        name: formData.name.trim(),
        motto: formData.motto.trim(),
        color: formData.color,
        ...nextGroup
      });

      setMessage('크루 소개가 업데이트되었습니다.');
    } catch (err) {
      console.error('Failed to update crew:', err);
      setMessage('크루 소개를 업데이트하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateStudyRoom = async () => {
    if (!crewId || busy) return;
    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const createStudyRoom = httpsCallable(functions, 'createStudyRoom');
      const result = await createStudyRoom({ crewId, durationMinutes: roomDuration });
      setActiveRoomId(result?.data?.roomId || '');
      setMessage('Study Stream 집중방을 열었습니다. 카메라 권한을 허용하면 바로 입장합니다.');
    } catch (err) {
      console.error('Failed to create study room:', err);
      setMessage(getFunctionsErrorMessage(err, '집중방 생성에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePreviewCamera = () => {
    setPreviewCameraOn((prev) => !prev);
    soundManager.playClick();
  };

  const handleJoinStudyRoom = async () => {
    if (!crewRoom?.id || busy) return;
    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const joinStudyRoomSession = httpsCallable(functions, 'joinStudyRoomSession');
      await joinStudyRoomSession({ roomId: crewRoom.id });
      setActiveRoomId(crewRoom.id);
      setMessage('Study Stream 집중방에 입장했습니다.');
    } catch (err) {
      console.error('Failed to join study room:', err);
      setMessage(getFunctionsErrorMessage(err, '집중방 입장에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  if (!user?.uid) return null;

  if (activeRoomId && crewRoom && crewRoom.id === activeRoomId && isRoomParticipant) {
    return (
      <div className="space-bg fade-in" style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', width: '100%', display: 'grid', gap: '1rem' }}>
          <StudyStreamRoomView
            roomId={activeRoomId}
            user={user}
            userData={userData}
            crew={crew}
            recentGreetings={greetings}
            onPostGreeting={handlePostGreeting}
            onLeave={() => {
              setActiveRoomId('');
              setMessage('집중방에서 나왔습니다.');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-bg fade-in" style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.2rem' }}>
          <h2 className="font-title" style={{ margin: 0, color: 'var(--crystal-cyan)', fontSize: 'clamp(1.9rem, 4vw, 3.1rem)' }}>
            STUDY CREW
          </h2>
          <p className="font-tech" style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {hasCrew
              ? '크루 전용 3인 Study Stream 로비에서 카메라를 준비하고 바로 집중방으로 들어갑니다.'
              : '창설권으로 크루를 만들고, 참여권과 초대 코드로 합류하는 프리미엄 스터디 네트워크'}
          </p>
        </div>

        {!hasCrew && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '1rem' }}>
              <button
                type="button"
                className={`space-nav-link font-tech ${activePanel === 'create' ? 'active' : ''}`}
                disabled={busy || hasCrew}
                onClick={() => { soundManager.playClick(); setActivePanel(prev => prev === 'create' ? null : 'create'); }}
                style={actionButtonStyle}
              >
                <strong style={{ color: 'var(--text-bright)', fontSize: '1.05rem' }}>새 크루 생성하기</strong>
                <span style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>창설권 1개 필요 · 스토어 가격 1000광석</span>
              </button>
              <button
                type="button"
                className={`space-nav-link font-tech ${activePanel === 'join' ? 'active' : ''}`}
                disabled={busy || hasCrew}
                onClick={() => { soundManager.playClick(); setActivePanel(prev => prev === 'join' ? null : 'join'); }}
                style={actionButtonStyle}
              >
                <strong style={{ color: 'var(--text-bright)', fontSize: '1.05rem' }}>초대 참여하기</strong>
                <span style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>참여권 1개와 초대 코드 필요 · 스토어 가격 300광석</span>
              </button>
            </div>
          </>
        )}

        {activePanel === 'create' && !hasCrew && (
          <Motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card hud-border"
            style={{ padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}
          >
            <h3 className="font-title" style={{ color: 'var(--text-bright)', marginTop: 0 }}>새 크루 생성</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Field label="크루 이름">
                <input style={inputStyle} value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="예: 오메가 증명단" maxLength={28} />
              </Field>
              <Field label="크루 모토">
                <input style={inputStyle} value={formData.motto} onChange={(e) => setFormData(prev => ({ ...prev, motto: e.target.value }))} placeholder="서로의 설명을 끝까지 듣는다" maxLength={52} />
              </Field>
              <Field label="군집 선택" hint={loadingClusters ? '군집 정보를 불러오는 중입니다.' : '선택 없이 자유 스터디로 시작할 수도 있습니다.'}>
                <select style={inputStyle} value={formData.groupId} onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}>
                  {groupOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </Field>
              <Field label="엠블럼 색상" hint="창설자는 별도 구매 없이 언제든 수정할 수 있습니다.">
                <input type="color" style={{ ...inputStyle, padding: '0.35rem' }} value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} />
              </Field>
            </div>
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              disabled={busy}
              onClick={handleCreateCrew}
              style={{ marginTop: '1rem', padding: '0.9rem 1.25rem', borderRadius: '8px' }}
            >
              {busy ? '생성 중...' : '창설권으로 크루 생성'}
            </button>
          </Motion.section>
        )}

        {activePanel === 'join' && !hasCrew && (
          <Motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card hud-border"
            style={{ padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}
          >
            <h3 className="font-title" style={{ color: 'var(--text-bright)', marginTop: 0 }}>초대 코드로 참여</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: '0.8rem', alignItems: 'end' }}>
              <Field label="초대 코드" hint="크루 리더에게 받은 코드를 입력하면 참여권 1개가 사용됩니다.">
                <input style={inputStyle} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="예: AB7Q2X" />
              </Field>
              <button
                type="button"
                className="space-btn cosmic-btn font-tech"
                disabled={busy || !joinCode.trim()}
                onClick={handleJoinCrew}
                style={{ minHeight: 46, padding: '0 1.2rem', borderRadius: '8px' }}
              >
                {busy ? '참여 중...' : '참여권으로 합류'}
              </button>
            </div>
          </Motion.section>
        )}

        {!hasCrew && (
          <>
            <SectionTitle eyebrow="STUDY STREAM" title="크루 집중방" />
            <div className="glass-card hud-border" style={{ padding: '1.4rem', borderRadius: '8px' }}>
              <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
                크루에 가입하면 앱 안에서 바로 들어가는 3인 Study Stream 집중방을 사용할 수 있습니다.
              </div>
            </div>
          </>
        )}

        {crew ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SectionTitle
              eyebrow="CREW LOBBY"
              title={crew.name || userData?.crewName || 'Study Crew'}
              right={(
                <div className="font-tech" style={{ color: 'var(--text-muted)', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <span style={{ color: getCrewStatusColor(status) }}>{getCrewStatusLabel(status)}</span>
                  <span>창설권 {userData?.crewCreationPasses || 0}개</span>
                  <span>참여권 {userData?.crewJoinPasses || 0}개</span>
                </div>
              )}
            />

            <Motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card hud-border"
              style={{ padding: '1.1rem', borderRadius: '10px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(290px, 0.95fr)', gap: '1rem', alignItems: 'start' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: '0.9rem' }}>
                  {memberTiles.map((tile) => {
                    if (!tile.member) {
                      return (
                        <CrewStreamTile
                          key={tile.key}
                          title="한 명 더 초대하기"
                          subtitle="초대 코드로 한 명 더 합류할 수 있습니다."
                          topBadge="INVITE"
                          topBadgeColor="rgba(14, 165, 233, 0.22)"
                          empty
                        />
                      );
                    }

                    const isSelf = tile.member.uid === user.uid;
                    const isLeader = tile.member.crewRole === 'leader';
                    const studiedTodayFlag = tile.member.lastStreakDate === todayKey;
                    const subtitle = tile.isLive
                      ? '집중방 연결 중'
                      : isSelf
                        ? (previewCameraOn ? '카메라 프리뷰 준비 완료' : '카메라 준비 중지')
                        : `${isLeader ? '리더' : '멤버'} · 연속 ${tile.member.currentStreak || 0}일`;

                    return (
                      <CrewStreamTile
                        key={tile.key}
                        stream={isSelf ? previewStream : null}
                        title={getMemberLabel(tile.member, '크루 멤버')}
                        subtitle={subtitle}
                        accent={isSelf ? (crew.color || userData?.crewColor || '#22d3ee') : '#818cf8'}
                        message={tile.greeting || (studiedTodayFlag ? '오늘 학습 완료' : '')}
                        isLocal={isSelf}
                        cameraOn={isSelf ? previewCameraOn && !!previewStream : tile.isLive}
                        topBadge={tile.isLive ? 'LIVE' : (isLeader ? 'LEADER' : 'CREW')}
                        topBadgeColor={tile.isLive ? 'rgba(16, 185, 129, 0.24)' : (isLeader ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)')}
                      >
                        {isSelf && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.45rem' }}>
                            <input
                              style={{ ...inputStyle, minHeight: 40, padding: '0.65rem 0.75rem', background: 'rgba(2,6,23,0.75)' }}
                              value={greetingText}
                              onChange={(e) => setGreetingText(e.target.value)}
                              placeholder="짧은 인사 남기기"
                              maxLength={80}
                            />
                            <button
                              className="space-btn cosmic-btn font-tech"
                              type="button"
                              disabled={busy || !greetingText.trim()}
                              onClick={() => handlePostGreeting()}
                              style={{ borderRadius: '8px', minWidth: 52, padding: '0 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        )}
                      </CrewStreamTile>
                    );
                  })}
                </div>

                <aside style={{ display: 'grid', gap: '0.9rem' }}>
                  <div style={{ ...panelStyle, display: 'grid', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'start' }}>
                      <div>
                        <div className="font-tech" style={{ color: getCrewStatusColor(status), fontWeight: 800 }}>
                          {getCrewStatusLabel(status)}
                        </div>
                        <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.65rem', marginTop: '0.25rem' }}>
                          {crew.name || userData?.crewName || '스터디 크루'}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          background: crew.color || userData?.crewColor || '#00d4ff',
                          boxShadow: `0 0 18px ${(crew.color || userData?.crewColor || '#00d4ff')}55`
                        }}
                      />
                    </div>
                    <div className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                      {crew.motto || '아직 크루 모토가 없습니다.'}
                    </div>
                    <div style={{ display: 'grid', gap: '0.55rem' }}>
                      <div className="font-tech" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Hash size={14} /> 초대 코드
                      </div>
                      <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.3rem' }}>
                        {crew.inviteCode || userData?.crewInviteCode || '-'}
                      </div>
                      <div className="font-tech" style={{ color: 'var(--crystal-cyan)' }}>
                        {crew.groupName || crew.clusterName || userData?.crewGroupName || '자유 스터디'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem' }}>
                      <div style={{ ...panelStyle, padding: '0.8rem' }}>
                        <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>멤버</div>
                        <strong style={{ color: 'var(--text-bright)', fontSize: '1.15rem' }}>{crew.memberCount || members.length || 1}</strong>
                      </div>
                      <div style={{ ...panelStyle, padding: '0.8rem' }}>
                        <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>오늘 학습</div>
                        <strong style={{ color: 'var(--planet-green)', fontSize: '1.15rem' }}>{studiedToday.length}</strong>
                      </div>
                      <div style={{ ...panelStyle, padding: '0.8rem' }}>
                        <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>내 역할</div>
                        <strong style={{ color: crew.color || userData?.crewColor || 'var(--crystal-cyan)', fontSize: '1rem' }}>
                          {userData?.crewRole === 'leader' ? '리더' : '멤버'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...panelStyle, display: 'grid', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
                      <div>
                        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800 }}>STUDY STREAM</div>
                        <div style={{ color: 'var(--text-bright)', fontWeight: 800, marginTop: '0.2rem' }}>집중방 컨트롤</div>
                      </div>
                      <button
                        type="button"
                        className="space-nav-link font-tech"
                        onClick={handleTogglePreviewCamera}
                        style={{ borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                      >
                        {previewCameraOn ? <Camera size={15} /> : <CameraOff size={15} />}
                        {previewCameraOn ? '카메라 ON' : '카메라 OFF'}
                      </button>
                    </div>

                    {previewError && (
                      <div className="font-tech" style={{ color: '#fda4af', lineHeight: 1.45 }}>
                        {previewError}
                      </div>
                    )}

                    {status !== 'approved' ? (
                      <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
                        운영자 승인 후 방을 열 수 있습니다. 지금은 타일과 카메라만 미리 준비해둘 수 있습니다.
                      </div>
                    ) : crewRoom ? (
                      <div style={{ display: 'grid', gap: '0.7rem' }}>
                        <div style={{ ...panelStyle, padding: '0.9rem', background: 'rgba(2,6,23,0.62)' }}>
                          <div className="font-tech" style={{ color: crewRoom.status === 'live' ? 'var(--planet-green)' : 'var(--planet-orange)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Radio size={14} /> {crewRoom.status === 'live' ? '집중 진행 중' : '입장 대기 중'}
                          </div>
                          <div style={{ color: 'var(--text-bright)', fontWeight: 800, marginTop: '0.35rem' }}>
                            {crewRoom.title || 'Study Stream 집중방'}
                          </div>
                          <div className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Users size={14} /> {crewRoom.participantCount || 0}/{crewRoom.maxParticipants || 3}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock3 size={14} /> {crewRoom.durationMinutes || 50}분</span>
                          </div>
                        </div>
                        {isRoomParticipant ? (
                          <button
                            type="button"
                            className="space-btn cosmic-btn font-tech"
                            onClick={() => setActiveRoomId(crewRoom.id)}
                            style={{ borderRadius: '8px', padding: '0.9rem 1.1rem' }}
                          >
                            집중방 다시 열기
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="space-btn cosmic-btn font-tech"
                            disabled={busy || roomIsFull}
                            onClick={handleJoinStudyRoom}
                            style={{ borderRadius: '8px', padding: '0.9rem 1.1rem' }}
                          >
                            {roomIsFull ? '정원 가득 참' : '집중방 입장'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.7rem' }}>
                        <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
                          아직 열린 집중방이 없습니다. 최대 3명만 참여하는 크루 전용 Study Stream을 사용할 수 있습니다.
                        </div>
                        {userData?.crewRole === 'leader' ? (
                          <>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {[30, 50, 90].map((duration) => (
                                <button
                                  key={duration}
                                  type="button"
                                  className={`space-nav-link font-tech ${roomDuration === duration ? 'active' : ''}`}
                                  onClick={() => { setRoomDuration(duration); soundManager.playClick(); }}
                                  style={{ borderRadius: '999px', padding: '0.5rem 0.85rem' }}
                                >
                                  {duration}분
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="space-btn cosmic-btn font-tech"
                              disabled={busy}
                              onClick={handleCreateStudyRoom}
                              style={{ borderRadius: '8px', padding: '0.9rem 1.1rem' }}
                            >
                              {roomDuration}분 집중방 열기
                            </button>
                          </>
                        ) : (
                          <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
                            리더가 방을 열면 여기서 바로 입장할 수 있습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </Motion.section>

            {userData?.crewRole === 'leader' && (
              <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: '8px' }}>
                <h3 className="font-tech" style={{ color: 'var(--crystal-cyan)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Crown size={16} /> 리더 설정
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Field label="크루 이름">
                    <input style={inputStyle} value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} maxLength={28} />
                  </Field>
                  <Field label="크루 모토">
                    <input style={inputStyle} value={formData.motto} onChange={(e) => setFormData(prev => ({ ...prev, motto: e.target.value }))} maxLength={52} />
                  </Field>
                  <Field label="군집">
                    <select style={inputStyle} value={formData.groupId} onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}>
                      {groupOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </Field>
                  <Field label="엠블럼 색상" hint="창설자는 별도 변경권 없이 수정할 수 있습니다.">
                    <input type="color" style={{ ...inputStyle, padding: '0.35rem' }} value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} />
                  </Field>
                </div>
                <button
                  type="button"
                  className="space-btn cosmic-btn font-tech"
                  disabled={busy}
                  onClick={handleUpdateCrewBasics}
                  style={{ marginTop: '1rem', padding: '0.85rem 1.2rem', borderRadius: '8px' }}
                >
                  크루 소개 저장
                </button>
              </section>
            )}
          </div>
        ) : (
          <EmptyPanel>
            아직 가입한 크루가 없습니다. 스토어에서 창설권 또는 참여권을 구매한 뒤 위 버튼으로 시작하세요.
          </EmptyPanel>
        )}

        {!hasCrew && (
          <>
            <SectionTitle eyebrow="CREW DIRECTORY" title="기존에 생성된 크루" />
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {directoryCrews.length === 0 && (
                <EmptyPanel>아직 생성된 크루가 없습니다.</EmptyPanel>
              )}
              {directoryCrews.map(nextCrew => (
                <CrewSummaryCard key={nextCrew.id} crew={nextCrew} />
              ))}
            </div>
            <div className="font-tech" style={{ marginTop: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              크루 목록은 탐색용입니다. 실제 참여는 크루 리더에게 받은 초대 코드를 입력하고 참여권을 사용해야 완료됩니다.
            </div>
          </>
        )}

        {message && (
          <p className="font-tech" style={{ marginTop: '1rem', color: message.includes('실패') || message.includes('못했습니다') || message.includes('필요') ? '#f87171' : 'var(--planet-green)' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
