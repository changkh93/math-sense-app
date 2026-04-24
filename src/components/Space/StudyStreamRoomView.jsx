import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Camera, CameraOff, Hash, Mic, MicOff, PhoneOff, Radio, Send, UserRound, Users, Video } from 'lucide-react';
import Peer from 'peerjs';
import { db, functions } from '../../firebase';
import soundManager from '../../utils/SoundManager';

const tileStyle = {
  position: 'relative',
  borderRadius: '10px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(3, 8, 20, 0.92)',
  aspectRatio: '4 / 5',
};

function StreamTile({ stream, muted, label, subtitle, cameraOn, isLocal, message, badgeLabel, badgeColor = 'rgba(96, 165, 250, 0.18)' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div style={tileStyle}>
      {stream && cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#030814' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.55)' }}>
          <div style={{ textAlign: 'center' }}>
            <UserRound size={40} />
            <div style={{ marginTop: '0.6rem' }}>{cameraOn ? '영상 준비 중' : '카메라 꺼짐'}</div>
          </div>
        </div>
      )}
      {badgeLabel && (
        <div
          className="font-tech"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '0.35rem 0.6rem',
            borderRadius: 999,
            background: badgeColor,
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 700,
            backdropFilter: 'blur(10px)'
          }}
        >
          {badgeLabel}
        </div>
      )}
      <div style={{
        position: 'absolute',
        inset: 'auto 0 0 0',
        padding: '0.9rem',
        background: 'linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.82) 28%, rgba(2,6,23,0.94))',
        display: 'grid',
        gap: '0.6rem',
      }}>
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
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>
            <div className="font-tech" style={{ color: '#fff', fontWeight: 800 }}>
              {label}{isLocal ? ' (나)' : ''}
            </div>
            <div className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
              {subtitle}
            </div>
          </div>
          <div style={{ color: cameraOn ? 'var(--planet-green)' : 'rgba(255,255,255,0.45)' }}>
            {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function formatRemainingLabel(room, nowMs) {
  const baseMs = getTimestampMs(room?.startedAt) || getTimestampMs(room?.createdAt);
  if (!baseMs) return '세션 준비 중';
  const durationMs = (room?.durationMinutes || 50) * 60 * 1000;
  const remainingMs = Math.max(0, (baseMs + durationMs) - nowMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds} 남음`;
}

export default function StudyStreamRoomView({ roomId, user, userData, crew, recentGreetings = [], onPostGreeting, onLeave }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [focusStatus, setFocusStatus] = useState('focused');
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(0);
  const [greetingDraft, setGreetingDraft] = useState('');

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callsRef = useRef(new Map());
  const leavingRef = useRef(false);
  const latestGreetingByUser = useMemo(() => {
    const nextMap = new Map();
    recentGreetings.forEach((greeting) => {
      if (!greeting?.userId || nextMap.has(greeting.userId)) return;
      nextMap.set(greeting.userId, greeting);
    });
    return nextMap;
  }, [recentGreetings]);

  useEffect(() => {
    const roomUnsubscribe = onSnapshot(doc(db, 'studyRooms', roomId), (snap) => {
      if (!snap.exists()) {
        setRoom(null);
        return;
      }
      setRoom({ id: snap.id, ...snap.data() });
    });

    const participantsUnsubscribe = onSnapshot(collection(db, 'studyRooms', roomId, 'participants'), (snapshot) => {
      const nextParticipants = snapshot.docs.map((participantDoc) => ({
        id: participantDoc.id,
        ...participantDoc.data(),
      }));
      setParticipants(nextParticipants);
    });

    return () => {
      roomUnsubscribe();
      participantsUnsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setupLocalMediaAndPeer() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('이 브라우저는 카메라 접근을 지원하지 않습니다.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraOn(true);
        setMicOn(false);

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          try {
            await setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
              uid: user.uid,
              displayName: userData?.studentName || userData?.publicDisplayName || user.displayName || '탐사원',
              role: room?.hostUid === user.uid ? 'host' : 'member',
              peerId,
              cameraOn: true,
              micOn: false,
              focusStatus: 'focused',
              lastSeenAt: serverTimestamp(),
              deviceLabel: 'browser',
            }, { merge: true });
          } catch (err) {
            console.error('Failed to sync peer id:', err);
            setError('Peer ID를 동기화하지 못했습니다.');
          }
        });

        peer.on('call', (call) => {
          const answerStream = localStreamRef.current;
          if (!answerStream) {
            call.close();
            return;
          }

          const remoteUid = call.metadata?.uid || call.peer;
          callsRef.current.set(remoteUid, call);
          call.answer(answerStream);
          call.on('stream', (remoteStream) => {
            setRemoteStreams((prev) => {
              const next = prev.filter((item) => item.uid !== remoteUid);
              next.push({ uid: remoteUid, stream: remoteStream });
              return next;
            });
          });
          call.on('close', () => {
            callsRef.current.delete(remoteUid);
            setRemoteStreams((prev) => prev.filter((item) => item.uid !== remoteUid));
          });
          call.on('error', () => {
            callsRef.current.delete(remoteUid);
            setRemoteStreams((prev) => prev.filter((item) => item.uid !== remoteUid));
          });
        });

        peer.on('error', (err) => {
          console.error('PeerJS error:', err);
          setError('PeerJS 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.');
        });
      } catch (err) {
        console.error('Failed to initialize Study Stream room:', err);
        setError(err?.message || '카메라를 시작하지 못했습니다.');
      }
    }

    setupLocalMediaAndPeer();

    const activeCalls = callsRef.current;

    return () => {
      cancelled = true;
      activeCalls.forEach((call) => call.close());
      activeCalls.clear();
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId, room?.hostUid, user.uid, user.displayName, userData?.publicDisplayName, userData?.studentName]);

  useEffect(() => {
    if (!localStreamRef.current || !peerRef.current) return;
    participants.forEach((participant) => {
      if (participant.uid === user.uid || !participant.peerId) return;
      if (callsRef.current.has(participant.uid)) return;
      if (user.uid > participant.uid) return;

      const outgoingCall = peerRef.current.call(participant.peerId, localStreamRef.current, {
        metadata: { uid: user.uid },
      });
      if (!outgoingCall) return;

      callsRef.current.set(participant.uid, outgoingCall);
      outgoingCall.on('stream', (remoteStream) => {
        setRemoteStreams((prev) => {
          const next = prev.filter((item) => item.uid !== participant.uid);
          next.push({ uid: participant.uid, stream: remoteStream });
          return next;
        });
      });
      outgoingCall.on('close', () => {
        callsRef.current.delete(participant.uid);
        setRemoteStreams((prev) => prev.filter((item) => item.uid !== participant.uid));
      });
      outgoingCall.on('error', () => {
        callsRef.current.delete(participant.uid);
        setRemoteStreams((prev) => prev.filter((item) => item.uid !== participant.uid));
      });
    });

    const activeParticipantIds = new Set(participants.map((participant) => participant.uid));
    callsRef.current.forEach((call, participantUid) => {
      if (!activeParticipantIds.has(participantUid)) {
        call.close();
        callsRef.current.delete(participantUid);
        setRemoteStreams((prev) => prev.filter((item) => item.uid !== participantUid));
      }
    });
  }, [participants, user.uid]);

  const updateParticipantPresence = async (partialData) => {
    await setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
      lastSeenAt: serverTimestamp(),
      ...partialData,
    }, { merge: true });
  };

  const toggleCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextValue = !cameraOn;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextValue;
    });
    setCameraOn(nextValue);
    await updateParticipantPresence({ cameraOn: nextValue });
    soundManager.playClick();
  };

  const toggleMic = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextValue = !micOn;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextValue;
    });
    setMicOn(nextValue);
    await updateParticipantPresence({ micOn: nextValue });
    soundManager.playClick();
  };

  const updateFocusStatus = async (nextStatus) => {
    setFocusStatus(nextStatus);
    await updateParticipantPresence({ focusStatus: nextStatus });
    soundManager.playClick();
  };

  const handleSendGreeting = async (text = greetingDraft) => {
    const cleanText = String(text || '').trim().slice(0, 80);
    if (!cleanText || !onPostGreeting) return;
    await onPostGreeting(cleanText);
    setGreetingDraft('');
  };

  const handleLeave = async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    try {
      callsRef.current.forEach((call) => call.close());
      callsRef.current.clear();
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      const leaveStudyRoomSession = httpsCallable(functions, 'leaveStudyRoomSession');
      await leaveStudyRoomSession({ roomId });
      if (onLeave) onLeave();
    } catch (err) {
      console.error('Failed to leave study room:', err);
      setError('집중방을 종료하지 못했습니다.');
      leavingRef.current = false;
    }
  };

  const remoteTiles = participants
    .filter((participant) => participant.uid !== user.uid)
    .map((participant) => {
      const remoteEntry = remoteStreams.find((streamItem) => streamItem.uid === participant.uid);
      return {
        uid: participant.uid,
        label: participant.displayName || '크루 멤버',
        subtitle: participant.focusStatus === 'away'
          ? '자리 비움'
          : participant.focusStatus === 'break'
            ? '쉬는 중'
            : '집중 중',
        cameraOn: participant.cameraOn !== false,
        stream: remoteEntry?.stream || null,
        role: participant.role,
        message: latestGreetingByUser.get(participant.uid)?.text || '',
      };
    });

  return (
    <div className="glass-card hud-border" style={{ padding: '1.1rem', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800 }}>STUDY STREAM ROOM</div>
          <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.2rem 0 0' }}>
            {room?.title || '집중방'}
          </h3>
          <div className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Radio size={14} /> {room?.status === 'live' ? 'LIVE' : 'WAITING'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} /> 현재 {participants.length}/3명
            </span>
            <span>{formatRemainingLabel(room, nowMs)}</span>
            {crew?.inviteCode && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Hash size={14} /> {crew.inviteCode}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={handleLeave}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px' }}
        >
          <PhoneOff size={16} /> 방 나가기
        </button>
      </div>

      {error && (
        <div className="font-tech" style={{ marginBottom: '1rem', color: '#fda4af' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '0.9rem' }}>
        <StreamTile
          stream={localStream}
          muted
          label={userData?.studentName || user.displayName || '나'}
          subtitle={focusStatus === 'away' ? '자리 비움' : focusStatus === 'break' ? '쉬는 중' : '집중 중'}
          cameraOn={cameraOn}
          isLocal
          message={latestGreetingByUser.get(user.uid)?.text || ''}
          badgeLabel={room?.hostUid === user.uid ? 'HOST' : 'ME'}
          badgeColor={room?.hostUid === user.uid ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)'}
        />
        {remoteTiles.map((participant) => (
          <StreamTile
            key={participant.uid}
            stream={participant.stream}
            muted={false}
            label={participant.label}
            subtitle={participant.subtitle}
            cameraOn={participant.cameraOn}
            isLocal={false}
            message={participant.message}
            badgeLabel={participant.role === 'host' ? 'HOST' : 'CREW'}
            badgeColor={participant.role === 'host' ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)'}
          />
        ))}
        {Array.from({ length: Math.max(0, 2 - remoteTiles.length) }).map((_, index) => (
          <div key={`empty-${index}`} style={{ ...tileStyle, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.45)' }}>
            <div style={{ textAlign: 'center' }}>
              <Video size={34} />
              <div style={{ marginTop: '0.55rem' }}>참여 대기 중</div>
            </div>
          </div>
        ))}
      </div>

      {onPostGreeting && (
        <div style={{ marginTop: '0.95rem', display: 'grid', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['오늘도 출석!', '집중 중입니다', '곧 문제 풉니다'].map((text) => (
              <button
                key={text}
                type="button"
                className="space-nav-link font-tech"
                onClick={() => handleSendGreeting(text)}
                style={{ borderRadius: '999px', padding: '0.45rem 0.72rem' }}
              >
                {text}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.55rem' }}>
            <input
              value={greetingDraft}
              onChange={(e) => setGreetingDraft(e.target.value)}
              placeholder="타일에 남길 짧은 인사"
              maxLength={80}
              style={{
                minHeight: 42,
                borderRadius: 8,
                border: '1px solid rgba(0, 243, 255, 0.24)',
                background: 'rgba(5, 10, 24, 0.78)',
                color: 'var(--text-bright)',
                padding: '0.7rem 0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              onClick={() => handleSendGreeting()}
              disabled={!greetingDraft.trim()}
              style={{ borderRadius: '8px', minWidth: 54, padding: '0 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button type="button" className="space-nav-link font-tech" onClick={toggleCamera} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px' }}>
          {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
          {cameraOn ? '카메라 끄기' : '카메라 켜기'}
        </button>
        <button type="button" className="space-nav-link font-tech" onClick={toggleMic} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px' }}>
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {micOn ? '마이크 끄기' : '마이크 켜기'}
        </button>
        <button type="button" className="space-nav-link font-tech" onClick={() => updateFocusStatus('focused')} style={{ borderRadius: '8px' }}>
          집중 중
        </button>
        <button type="button" className="space-nav-link font-tech" onClick={() => updateFocusStatus('away')} style={{ borderRadius: '8px' }}>
          자리 비움
        </button>
        <button type="button" className="space-nav-link font-tech" onClick={() => updateFocusStatus('break')} style={{ borderRadius: '8px' }}>
          쉬는 중
        </button>
      </div>
    </div>
  );
}
