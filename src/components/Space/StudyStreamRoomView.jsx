import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Camera, CameraOff, Hash, MessageSquare, MessageSquareOff, Mic, MicOff, PhoneOff, Radio, Send, UserRound, Users, Video } from 'lucide-react';
import Peer from 'peerjs';
import { db, functions } from '../../firebase';
import soundManager from '../../utils/SoundManager';

const CHAT_MAX_LENGTH = 48;

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
    if (stream && cameraOn) {
      videoRef.current.play().catch(() => {
        // Autoplay can briefly fail while the element is being remounted.
      });
    }
  }, [stream, cameraOn]);

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
              maxWidth: '88%',
              padding: '0.5rem 0.8rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9))',
              border: '1px solid rgba(125, 211, 252, 0.32)',
              color: '#f8fafc',
              fontSize: '0.84rem',
              fontWeight: 700,
              lineHeight: 1.35,
              boxShadow: '0 10px 24px rgba(2, 6, 23, 0.42)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(14px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
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

function normalizeChatMessage(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LENGTH);
}

function clampChatDraft(value) {
  return String(value || '').slice(0, CHAT_MAX_LENGTH);
}

export default function StudyStreamRoomView({ roomId, user, userData, crew, onLeave }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [focusStatus, setFocusStatus] = useState('focused');
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(0);
  const [roomAction, setRoomAction] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [chatAction, setChatAction] = useState('');
  const [controlAction, setControlAction] = useState('');

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callsRef = useRef(new Map());
  const leavingRef = useRef(false);

  const localParticipant = useMemo(
    () => participants.find((participant) => participant.uid === user.uid) || null,
    [participants, user.uid]
  );
  const isHost = room?.hostUid === user.uid;
  const isChatEnabled = room?.chatEnabled !== false;
  const areMicsEnabled = room?.micsEnabled !== false;
  const localChatMessage = localParticipant?.chatMessage || '';
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

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream || areMicsEnabled || !micOn) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    setMicOn(false);
    setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
      lastSeenAt: serverTimestamp(),
      micOn: false,
    }, { merge: true }).catch((err) => {
      console.error('Failed to sync forced mute:', err);
    });
  }, [areMicsEnabled, micOn, roomId, user.uid]);

  useEffect(() => {
    if (isChatEnabled) return;
    setChatDraft('');
  }, [isChatEnabled]);

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
    if (!areMicsEnabled) {
      alert('운영자가 전체 마이크를 꺼 두었습니다.');
      return;
    }
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

  const submitChatMessage = async () => {
    const nextMessage = normalizeChatMessage(chatDraft);
    if (!isChatEnabled) {
      alert('운영자가 채팅을 닫아 두었습니다.');
      return;
    }
    if (!nextMessage || chatAction) return;

    setChatAction('sending');
    setError('');
    try {
      await updateParticipantPresence({
        chatMessage: nextMessage,
        chatUpdatedAt: serverTimestamp(),
      });
      setChatDraft('');
      soundManager.playClick();
    } catch (err) {
      console.error('Failed to send stream chat:', err);
      setError('채팅을 보내지 못했습니다.');
    } finally {
      setChatAction('');
    }
  };

  const handleChatKeyDown = async (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    await submitChatMessage();
  };

  const handleRoomControl = async (partialData) => {
    if (!isHost || controlAction) return;

    setControlAction(Object.keys(partialData)[0] || 'updating');
    setError('');
    try {
      await setDoc(doc(db, 'studyRooms', roomId), {
        ...partialData,
        lastActivityAt: serverTimestamp(),
      }, { merge: true });
      soundManager.playClick();
    } catch (err) {
      console.error('Failed to update room controls:', err);
      setError('방 제어 상태를 바꾸지 못했습니다.');
    } finally {
      setControlAction('');
    }
  };

  const handleLeave = async () => {
    if (leavingRef.current || roomAction) return;
    leavingRef.current = true;
    setRoomAction('leaving');

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
      setRoomAction('');
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
        chatMessage: participant.chatMessage || '',
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
            <span>{areMicsEnabled ? '마이크 전체 허용' : '마이크 전체 차단'}</span>
            <span>{isChatEnabled ? '채팅 열림' : '채팅 닫힘'}</span>
          </div>
        </div>

        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={handleLeave}
          disabled={!!roomAction}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px' }}
        >
          <PhoneOff size={16} /> {roomAction === 'leaving' ? '나가는 중...' : '방 나가기'}
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
          message={isChatEnabled ? localChatMessage : ''}
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
            message={isChatEnabled ? participant.chatMessage : ''}
            badgeLabel={participant.role === 'host' ? 'HOST' : 'CREW'}
            badgeColor={participant.role === 'host' ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)'}
          />
        ))}
        {Array.from({ length: Math.max(0, 2 - remoteTiles.length) }).map((_, index) => (
          <div key={`empty-${index}`} style={{ ...tileStyle, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.45)' }}>
            <div style={{ textAlign: 'center' }}>
              <Video size={34} />
              <div style={{ marginTop: '0.55rem' }}>초대 대기 슬롯</div>
            </div>
          </div>
        ))}
      </div>

      <div className="hud-border" style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '10px', background: 'rgba(6, 10, 28, 0.62)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800 }}>
              STREAM CHAT
            </div>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.18rem' }}>
              짧게 보내면 내 화면 위 말풍선으로 보입니다.
            </div>
          </div>
          {isHost && (
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={() => handleRoomControl({ micsEnabled: !areMicsEnabled })}
                disabled={!!controlAction}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.42rem', borderRadius: '8px' }}
              >
                {areMicsEnabled ? <MicOff size={15} /> : <Mic size={15} />}
                {areMicsEnabled ? '마이크 전체 끄기' : '마이크 전체 켜기'}
              </button>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={() => handleRoomControl({ chatEnabled: !isChatEnabled })}
                disabled={!!controlAction}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.42rem', borderRadius: '8px' }}
              >
                {isChatEnabled ? <MessageSquareOff size={15} /> : <MessageSquare size={15} />}
                {isChatEnabled ? '채팅 닫기' : '채팅 열기'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.65rem', marginTop: '0.8rem' }}>
          <div>
            <input
              type="text"
              value={chatDraft}
              onChange={(event) => setChatDraft(clampChatDraft(event.target.value))}
              onKeyDown={handleChatKeyDown}
              disabled={!isChatEnabled || chatAction === 'sending'}
              maxLength={CHAT_MAX_LENGTH}
              placeholder={isChatEnabled ? '짧게 한마디 남겨보세요.' : '운영자가 채팅을 닫았습니다.'}
              className="font-tech"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 0.9rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(2, 6, 23, 0.88)',
                color: 'var(--text-bright)',
                outline: 'none'
              }}
            />
            <div className="font-tech" style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {chatDraft.length}/{CHAT_MAX_LENGTH}
            </div>
          </div>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={submitChatMessage}
            disabled={!isChatEnabled || !chatDraft.trim() || chatAction === 'sending'}
            style={{ minWidth: '120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderRadius: '10px' }}
          >
            <Send size={15} />
            {chatAction === 'sending' ? '보내는 중...' : '말하기'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button type="button" className="space-nav-link font-tech" onClick={toggleCamera} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px' }}>
          {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
          {cameraOn ? '카메라 끄기' : '카메라 켜기'}
        </button>
        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={toggleMic}
          disabled={!areMicsEnabled}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px', opacity: areMicsEnabled ? 1 : 0.55 }}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {!areMicsEnabled ? '마이크 차단됨' : micOn ? '마이크 끄기' : '마이크 켜기'}
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
