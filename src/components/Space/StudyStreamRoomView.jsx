import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Camera, CameraOff, Hash, MessageSquare, MessageSquareOff, Mic, MicOff, PhoneOff, Radio, Send, UserMinus, UserRound, Users, Video } from 'lucide-react';
import Peer from 'peerjs';
import { db, functions } from '../../firebase';
import soundManager from '../../utils/SoundManager';

const CHAT_MAX_LENGTH = 48;
const VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
};
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const INITIAL_MEDIA_STATUS = {
  phase: 'idle',
  camera: 'unknown',
  microphone: 'unknown',
  cameraPermission: 'unknown',
  microphonePermission: 'unknown',
  messages: [],
};
const PEER_RESTARTABLE_ERROR_TYPES = new Set(['network', 'server-error', 'socket-error', 'socket-closed']);
const PEER_REMOTE_WAIT_ERROR_TYPES = new Set(['peer-unavailable', 'disconnected']);
const PEER_RESTART_DELAY_MS = 1800;
const PEER_RESTART_ATTEMPT_LIMIT = 3;

const tileStyle = {
  position: 'relative',
  borderRadius: '10px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(3, 8, 20, 0.92)',
  aspectRatio: '4 / 5',
};

function getParticipantLabel(userLike = {}, fallback = '크루 멤버') {
  return userLike.publicDisplayName || userLike.studentName || userLike.displayName || userLike.name || fallback;
}

function getFocusStatusLabel(status) {
  if (status === 'away') return '자리 비움';
  if (status === 'break') return '쉬는 중';
  return '집중 중';
}

function isLiveTrack(track) {
  return !!track && track.readyState === 'live';
}

function hasLiveTrack(stream, kind) {
  return !!stream?.getTracks().some((track) => track.kind === kind && isLiveTrack(track));
}

function getMediaErrorMessage(err, kind) {
  const deviceLabel = kind === 'camera' ? '카메라' : '마이크';
  const name = err?.name || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return `${deviceLabel} 권한이 차단되어 있습니다. 주소창 왼쪽의 사이트 설정에서 ${deviceLabel}를 허용한 뒤 다시 연결해주세요.`;
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return `사용 가능한 ${deviceLabel} 장치를 찾지 못했습니다. 장치 연결과 브라우저 입력 장치 설정을 확인해주세요.`;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return `${deviceLabel}를 다른 앱이나 브라우저 탭이 사용 중일 수 있습니다. 화상회의 앱을 닫고 다시 시도해주세요.`;
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return `${deviceLabel} 장치가 요청한 품질 설정을 지원하지 않습니다. 기본 설정으로 다시 연결해주세요.`;
  }
  if (name === 'SecurityError') {
    return `보안 설정 때문에 ${deviceLabel} 접근이 막혔습니다. HTTPS 접속 상태와 브라우저 권한을 확인해주세요.`;
  }
  return `${deviceLabel}를 시작하지 못했습니다. 브라우저 권한과 장치 상태를 확인해주세요.`;
}

function getPeerErrorMessage(err) {
  const type = err?.type || err?.name || '';

  if (type === 'peer-unavailable') {
    return '상대방 연결 정보가 아직 준비되지 않았습니다. 잠시 후 자동으로 다시 연결을 시도합니다.';
  }
  if (type === 'network' || type === 'socket-error' || type === 'socket-closed') {
    return 'PeerJS 신호 서버 연결이 불안정합니다. 자동 재연결을 시도합니다.';
  }
  if (type === 'server-error') {
    return 'PeerJS 신호 서버가 응답하지 않습니다. 자동 재연결을 시도합니다.';
  }
  if (type === 'browser-incompatible') {
    return '현재 브라우저가 WebRTC 연결을 지원하지 않습니다. Chrome 또는 Edge 최신 버전으로 접속해주세요.';
  }
  if (type === 'ssl-unavailable') {
    return '보안 연결 설정 문제로 PeerJS에 연결하지 못했습니다. HTTPS 접속 상태를 확인해주세요.';
  }
  return 'PeerJS 연결에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 연결해주세요.';
}

async function queryMediaPermission(name) {
  if (!navigator.permissions?.query) return 'unknown';

  try {
    const result = await navigator.permissions.query({ name });
    return result?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function createLocalStudyMediaStream() {
  const [cameraPermission, microphonePermission] = await Promise.all([
    queryMediaPermission('camera'),
    queryMediaPermission('microphone'),
  ]);
  const messages = [];
  const tracks = [];
  let camera = 'blocked';
  let microphone = 'blocked';

  try {
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: VIDEO_CONSTRAINTS,
      audio: false,
    });
    const videoTracks = cameraStream.getVideoTracks().filter(isLiveTrack);
    tracks.push(...videoTracks);
    camera = videoTracks.length ? 'ready' : 'blocked';
  } catch (err) {
    console.warn('Failed to open Study Stream camera:', err);
    messages.push(getMediaErrorMessage(err, 'camera'));
  }

  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: AUDIO_CONSTRAINTS,
    });
    const audioTracks = audioStream.getAudioTracks().filter(isLiveTrack);
    tracks.push(...audioTracks);
    microphone = audioTracks.length ? 'ready' : 'blocked';
  } catch (err) {
    console.warn('Failed to open Study Stream microphone:', err);
    messages.push(getMediaErrorMessage(err, 'microphone'));
  }

  if (!tracks.length) {
    const error = new Error(messages[0] || '카메라와 마이크를 시작하지 못했습니다.');
    error.mediaStatus = {
      phase: 'blocked',
      camera,
      microphone,
      cameraPermission,
      microphonePermission,
      messages,
    };
    throw error;
  }

  return {
    stream: new MediaStream(tracks),
    status: {
      phase: messages.length ? 'partial' : 'ready',
      camera,
      microphone,
      cameraPermission,
      microphonePermission,
      messages,
    },
  };
}

function getMiniWindowDocument(pipWindow) {
  const pipDocument = pipWindow?.document;
  if (!pipDocument) return null;

  if (!pipDocument.getElementById('study-stream-mini-root')) {
    pipDocument.body.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        html, body {
          width: 100%;
          min-height: 100%;
          margin: 0;
          background: #070b1c;
          color: #f8fafc;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
        }
        body {
          padding: 8px;
          background:
            radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.16), transparent 34%),
            linear-gradient(135deg, #070b1c 0%, #151a36 100%);
        }
        #study-stream-mini-root {
          height: calc(100vh - 16px);
        }
        .mini-grid {
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .mini-tile {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(2, 6, 23, 0.92);
        }
        .mini-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #020617;
        }
        .mini-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,0.58);
          font-size: 11px;
          font-weight: 750;
          text-align: center;
          padding: 10px;
        }
        .mini-overlay {
          position: absolute;
          inset: auto 0 0 0;
          padding: 20px 8px 7px;
          background: linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.86) 45%, rgba(2,6,23,0.96));
        }
        .mini-name {
          color: #fff;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mini-status {
          margin-top: 2px;
          color: rgba(255,255,255,0.72);
          font-size: 9px;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mini-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          max-width: calc(100% - 12px);
          border-radius: 999px;
          padding: 3px 6px;
          background: rgba(3, 8, 20, 0.74);
          border: 1px solid rgba(34, 211, 238, 0.28);
          color: #67e8f9;
          font-size: 8px;
          line-height: 1.1;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }
        .mini-chat {
          position: absolute;
          top: 6px;
          right: 6px;
          max-width: 58%;
          border-radius: 9px;
          padding: 4px 6px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(125, 211, 252, 0.28);
          color: #f8fafc;
          font-size: 9px;
          line-height: 1.25;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }
      </style>
      <div id="study-stream-mini-root">
        <div id="study-stream-mini-grid" class="mini-grid"></div>
      </div>
    `;
  }

  return pipDocument;
}

function syncMiniStudyWindow(pipWindow, { title, tiles, onReturn }) {
  const pipDocument = getMiniWindowDocument(pipWindow);
  if (!pipDocument) return;
  void title;
  void onReturn;

  const grid = pipDocument.getElementById('study-stream-mini-grid');
  if (!grid) return;

  const visibleTiles = tiles.slice(0, 3);
  visibleTiles.forEach((tile, index) => {
    let tileNode = pipDocument.getElementById(`study-stream-mini-tile-${index}`);
    if (!tileNode) {
      tileNode = pipDocument.createElement('div');
      tileNode.id = `study-stream-mini-tile-${index}`;
      tileNode.className = 'mini-tile';
      tileNode.innerHTML = `
        <video class="mini-video" autoplay playsinline muted></video>
        <div class="mini-placeholder"></div>
        <div class="mini-badge"></div>
        <div class="mini-chat"></div>
        <div class="mini-overlay">
          <div class="mini-name"></div>
          <div class="mini-status"></div>
        </div>
      `;
      grid.appendChild(tileNode);
    }

    const video = tileNode.querySelector('video');
    const placeholder = tileNode.querySelector('.mini-placeholder');
    const badge = tileNode.querySelector('.mini-badge');
    const chat = tileNode.querySelector('.mini-chat');
    const name = tileNode.querySelector('.mini-name');
    const status = tileNode.querySelector('.mini-status');
    const hasVideo = !!tile.stream && tile.cameraOn !== false && hasLiveTrack(tile.stream, 'video');

    if (video) {
      if (hasVideo) {
        if (video.srcObject !== tile.stream) {
          video.srcObject = tile.stream;
        }
        video.muted = true;
        video.style.display = 'block';
        video.play().catch(() => {
          if (placeholder) {
            placeholder.style.display = 'grid';
            placeholder.textContent = '영상 재생 대기 중';
          }
        });
      } else {
        video.srcObject = null;
        video.style.display = 'none';
      }
    }
    if (placeholder) {
      placeholder.style.display = hasVideo ? 'none' : 'grid';
      placeholder.textContent = tile.cameraOn === false ? '카메라 꺼짐' : '영상 준비 중';
    }
    if (badge) {
      badge.style.display = tile.locationLine ? 'block' : 'none';
      badge.textContent = tile.locationLine || '';
    }
    if (chat) {
      chat.style.display = tile.message ? 'block' : 'none';
      chat.textContent = tile.message || '';
    }
    if (name) name.textContent = tile.label || '크루 멤버';
    if (status) status.textContent = tile.subtitle || '';
  });

  Array.from(grid.querySelectorAll('.mini-tile')).forEach((tileNode, index) => {
    if (index >= visibleTiles.length) tileNode.remove();
  });
}

function AudioLevelMeter({ level = 0, muted = false, blocked = false, compact = false }) {
  const bars = compact ? 8 : 12;
  const activeBars = muted || blocked ? 0 : Math.min(bars, Math.ceil(level * bars));
  const label = blocked ? '차단' : muted ? '음소거' : level > 0.04 ? '입력 중' : '대기';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', minWidth: compact ? 0 : 132 }}>
      <div style={{ display: 'inline-flex', alignItems: 'end', gap: 3, height: compact ? 14 : 18 }}>
        {Array.from({ length: bars }).map((_, index) => {
          const isActive = index < activeBars;
          return (
            <span
              key={index}
              style={{
                width: compact ? 3 : 4,
                height: `${5 + (index % 4) * (compact ? 2 : 3)}px`,
                borderRadius: 999,
                background: isActive ? 'var(--planet-green)' : 'rgba(255,255,255,0.16)',
                boxShadow: isActive ? '0 0 8px rgba(34,197,94,0.55)' : 'none',
                transition: 'height 80ms linear, background 120ms ease',
              }}
            />
          );
        })}
      </div>
      <span className="font-tech" style={{ color: muted || blocked ? 'rgba(255,255,255,0.48)' : 'var(--crystal-cyan)', fontSize: compact ? '0.68rem' : '0.76rem', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

function useAudioLevel(stream, enabled = true) {
  const [level, setLevel] = useState(0);
  const hasAudioInput = !!stream && enabled && stream.getAudioTracks().length > 0;

  useEffect(() => {
    if (!hasAudioInput) {
      return undefined;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return undefined;
    }

    let animationFrameId = 0;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    const source = audioContext.createMediaStreamSource(stream);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const centered = (samples[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / samples.length);
      setLevel(Math.min(1, Math.max(0, rms * 5)));
      animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => {});
    };
  }, [hasAudioInput, stream]);

  return hasAudioInput ? level : 0;
}

function StreamTile({ stream, muted, label, subtitle, cameraOn, micOn, audioBlocked = false, isLocal, message, badgeLabel, badgeColor = 'rgba(96, 165, 250, 0.18)', locationLine, liveStatusOverlay, action, compact = false, style }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const audioLevel = useAudioLevel(stream, !!stream);
  const hasLiveVideo = cameraOn && hasLiveTrack(stream, 'video');
  const [videoWaiting, setVideoWaiting] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
    if (stream && hasLiveVideo) {
      videoRef.current.play().catch(() => {
        setVideoWaiting(true);
      });
    }
  }, [stream, hasLiveVideo]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = stream || null;
    if (stream && !muted) {
      audioRef.current.play().catch(() => {
        // Remote audio can wait until the user interacts with the room.
      });
    }
  }, [cameraOn, muted, stream]);

  return (
    <div style={{ ...tileStyle, ...style }}>
      {hasLiveVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            onPlaying={() => setVideoWaiting(false)}
            onWaiting={() => setVideoWaiting(true)}
            onStalled={() => setVideoWaiting(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#030814' }}
          />
          {videoWaiting && (
            <div className="font-tech" style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: compact ? 70 : 86,
              padding: '0.45rem 0.65rem',
              borderRadius: 8,
              background: 'rgba(2, 6, 23, 0.78)',
              border: '1px solid rgba(251, 191, 36, 0.24)',
              color: '#fde68a',
              fontSize: compact ? '0.66rem' : '0.72rem',
              textAlign: 'center',
              zIndex: 2,
            }}>
              영상 재생을 준비 중입니다
            </div>
          )}
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.55)' }}>
          <div style={{ textAlign: 'center' }}>
            <UserRound size={compact ? 30 : 40} />
            <div style={{ marginTop: compact ? '0.4rem' : '0.6rem', fontSize: compact ? '0.78rem' : undefined }}>{cameraOn ? '카메라 연결 확인 중' : '카메라 꺼짐'}</div>
          </div>
        </div>
      )}
      {badgeLabel && (
        <div
          className="font-tech"
          style={{
            position: 'absolute',
            top: compact ? 8 : 12,
            left: compact ? 8 : 12,
            padding: compact ? '0.25rem 0.48rem' : '0.35rem 0.6rem',
            borderRadius: 999,
            background: badgeColor,
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: compact ? '0.68rem' : undefined,
            fontWeight: 700,
            backdropFilter: 'blur(10px)'
          }}
        >
          {badgeLabel}
        </div>
      )}
      {action && (
        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.title}
          style={{
            position: 'absolute',
            top: compact ? 8 : 10,
            right: compact ? 8 : 10,
            minWidth: 0,
            width: compact ? 32 : 36,
            height: compact ? 32 : 36,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(248, 113, 113, 0.36)',
            color: '#fecaca',
            backdropFilter: 'blur(10px)',
            opacity: action.disabled ? 0.55 : 1,
            zIndex: 2,
          }}
        >
          <UserMinus size={16} />
        </button>
      )}
      {liveStatusOverlay && (
        <div
          className="font-tech"
          title={liveStatusOverlay}
          style={{
            position: 'absolute',
            top: compact ? 8 : 12,
            left: badgeLabel ? (compact ? 70 : 92) : (compact ? 8 : 12),
            right: action ? (compact ? 46 : 54) : (compact ? 8 : 12),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: compact ? '0.32rem 0.5rem' : '0.42rem 0.62rem',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(3, 8, 20, 0.76), rgba(15, 23, 42, 0.66))',
            border: '1px solid rgba(34, 211, 238, 0.34)',
            color: 'var(--crystal-cyan)',
            fontSize: compact ? '0.62rem' : '0.72rem',
            fontWeight: 800,
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 1px 2px rgba(0,0,0,0.55)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.32), 0 0 18px rgba(34, 211, 238, 0.12)',
            backdropFilter: 'blur(12px)',
            zIndex: 2,
          }}
        >
          <Radio size={13} style={{ flex: '0 0 auto' }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{liveStatusOverlay}</span>
        </div>
      )}
      {!muted && stream && !cameraOn && (
        <audio ref={audioRef} autoPlay playsInline />
      )}
      <div style={{
        position: 'absolute',
        inset: 'auto 0 0 0',
        padding: compact ? '0.62rem' : '0.9rem',
        background: 'linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.82) 28%, rgba(2,6,23,0.94))',
        display: 'grid',
        gap: compact ? '0.42rem' : '0.6rem',
      }}>
        {message && (
          <div
            className="font-tech"
            style={{
              justifySelf: 'start',
              maxWidth: '88%',
              padding: compact ? '0.35rem 0.55rem' : '0.5rem 0.8rem',
              borderRadius: compact ? '10px' : '14px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9))',
              border: '1px solid rgba(125, 211, 252, 0.32)',
              color: '#f8fafc',
              fontSize: compact ? '0.7rem' : '0.84rem',
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
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: compact ? '0.4rem' : '0.75rem' }}>
          <div>
            <div className="font-tech" style={{ color: '#fff', fontWeight: 800, fontSize: compact ? '0.84rem' : undefined, lineHeight: 1.25 }}>
              {label}{isLocal ? ' (나)' : ''}
            </div>
            <div className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', fontSize: compact ? '0.7rem' : '0.82rem' }}>
              {subtitle}
            </div>
            {locationLine && !liveStatusOverlay && (
              <div
                className="font-tech"
                title={locationLine}
                style={{
                  marginTop: '0.28rem',
                  maxWidth: 'min(280px, 72vw)',
                  color: 'var(--crystal-cyan)',
                  fontSize: compact ? '0.64rem' : '0.76rem',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {locationLine}
              </div>
            )}
            <div style={{ marginTop: compact ? '0.28rem' : '0.45rem', display: 'flex', alignItems: 'center', gap: compact ? '0.28rem' : '0.45rem', flexWrap: 'wrap' }}>
              <span className="font-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', color: micOn ? 'var(--planet-green)' : 'rgba(255,255,255,0.5)', fontSize: compact ? '0.62rem' : '0.74rem' }}>
                {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                {audioBlocked ? '차단됨' : micOn ? '마이크 켜짐' : '음소거'}
              </span>
              <AudioLevelMeter level={audioLevel} muted={!micOn} blocked={audioBlocked} compact />
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

function formatElapsedCompact(ms) {
  if (!Number.isFinite(ms) || ms < 60000) return '';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}분째`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분째` : `${hours}시간째`;
}

function buildLiveLocationLine(liveStatus, nowMs) {
  const currentLocation = liveStatus?.currentLocation || '현재 위치 동기화 중';
  const enteredMs = getTimestampMs(liveStatus?.enteredAt) || getTimestampMs(liveStatus?.lastUpdatedAt);
  const elapsedLabel = enteredMs ? formatElapsedCompact(nowMs - enteredMs) : '';
  return elapsedLabel ? `${currentLocation} · ${elapsedLabel}` : currentLocation;
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
  const [mediaAction, setMediaAction] = useState('');
  const [mediaSessionRevision, setMediaSessionRevision] = useState(0);
  const [mediaStatus, setMediaStatus] = useState({ ...INITIAL_MEDIA_STATUS, phase: 'starting' });
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [miniWindowOpen, setMiniWindowOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callsRef = useRef(new Map());
  const leavingRef = useRef(false);
  const wasAcceptedParticipantRef = useRef(false);
  const miniWindowRef = useRef(null);
  const chatAlertStateRef = useRef({ initialized: false, messages: new Map() });
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');
  const peerRetryTimerRef = useRef(0);
  const peerRestartAttemptRef = useRef(0);

  const localParticipant = useMemo(
    () => participants.find((participant) => participant.uid === user.uid) || null,
    [participants, user.uid]
  );
  const isOpenStudyRoom = room?.roomType === 'openStudy';
  const isHost = room?.hostUid === user.uid || (!isOpenStudyRoom && (crew?.leaderId === user.uid || userData?.crewRole === 'leader'));
  const isChatEnabled = room?.chatEnabled !== false;
  const areMicsEnabled = room?.micsEnabled !== false;
  const localChatMessage = localParticipant?.chatMessage || '';
  const localAudioLevel = useAudioLevel(localStream, !!localStream);
  const hasLocalVideoTrack = hasLiveTrack(localStream, 'video');
  const hasLocalAudioTrack = hasLiveTrack(localStream, 'audio');
  const localMicBlocked = !areMicsEnabled || !hasLocalAudioTrack;

  const updateParticipantPresence = useCallback(async (partialData) => {
    await setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
      lastSeenAt: serverTimestamp(),
      ...partialData,
    }, { merge: true });
  }, [roomId, user.uid]);

  const closeRoomResources = useCallback(() => {
    callsRef.current.forEach((call) => call.close());
    callsRef.current.clear();
    setRemoteStreams([]);
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (miniWindowRef.current && !miniWindowRef.current.closed) {
      miniWindowRef.current.close();
    }
    miniWindowRef.current = null;
    setMiniWindowOpen(false);
    setLocalStream(null);
  }, []);

  const attachLocalTrackWatchers = useCallback((stream) => {
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        setCameraOn(false);
        setMediaStatus((prev) => ({
          ...prev,
          phase: 'partial',
          camera: 'blocked',
          messages: ['카메라 연결이 끊겼습니다. 카메라 다시 연결을 눌러 복구해주세요.'],
        }));
        updateParticipantPresence({ cameraOn: false }).catch((err) => {
          console.error('Failed to sync ended camera track:', err);
        });
      };
    });

    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        setMicOn(false);
        setMediaStatus((prev) => ({
          ...prev,
          phase: 'partial',
          microphone: 'blocked',
          messages: ['마이크 연결이 끊겼습니다. 마이크 다시 연결을 눌러 복구해주세요.'],
        }));
        updateParticipantPresence({ micOn: false }).catch((err) => {
          console.error('Failed to sync ended microphone track:', err);
        });
      };
    });
  }, [updateParticipantPresence]);

  const replaceOutgoingTrack = useCallback((kind, nextTrack) => {
    callsRef.current.forEach((call) => {
      const sender = call.peerConnection?.getSenders?.().find((candidate) => candidate.track?.kind === kind);
      if (sender) {
        sender.replaceTrack(nextTrack).catch((err) => {
          console.warn(`Failed to replace ${kind} track:`, err);
        });
      }
    });
  }, []);

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
    if (!user?.uid) return undefined;
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', user.uid);
    const syncHeartbeat = () => {
      setDoc(participantRef, {
        lastSeenAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.warn('Failed to sync Study Stream heartbeat:', err);
      });
    };

    syncHeartbeat();
    const intervalId = window.setInterval(syncHeartbeat, 20000);
    return () => window.clearInterval(intervalId);
  }, [roomId, user?.uid]);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const participantIds = Array.from(new Set(participants.map((participant) => participant.uid).filter(Boolean)));
    if (!participantIds.length) {
      setParticipantProfiles({});
      return undefined;
    }

    const unsubscribers = participantIds.map((participantUid) => onSnapshot(doc(db, 'users', participantUid), (snap) => {
      setParticipantProfiles((prev) => ({
        ...prev,
        [participantUid]: snap.exists() ? snap.data() : null,
      }));
    }));

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [participants]);

  useEffect(() => {
    let cancelled = false;

    async function setupLocalMediaAndPeer() {
      try {
        setMediaStatus({ ...INITIAL_MEDIA_STATUS, phase: 'starting' });
        setError('');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('이 브라우저는 카메라 접근을 지원하지 않습니다.');
        }

        const { stream, status } = await createLocalStudyMediaStream();

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        const nextCameraOn = hasLiveTrack(stream, 'video');

        attachLocalTrackWatchers(stream);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraOn(nextCameraOn);
        setMicOn(false);
        setMediaStatus(status);
        if (status.messages.length) setError(status.messages.join(' '));

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          peerRestartAttemptRef.current = 0;
          try {
            await setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
              uid: user.uid,
              displayName: userData?.studentName || userData?.publicDisplayName || user.displayName || '탐사원',
              peerId,
              cameraOn: nextCameraOn,
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
          const errorType = err?.type || err?.name || '';
          if (PEER_REMOTE_WAIT_ERROR_TYPES.has(errorType)) {
            return;
          }

          setError(getPeerErrorMessage(err));
          if (!PEER_RESTARTABLE_ERROR_TYPES.has(errorType)) return;
          if (peerRestartAttemptRef.current >= PEER_RESTART_ATTEMPT_LIMIT) return;

          peerRestartAttemptRef.current += 1;
          window.clearTimeout(peerRetryTimerRef.current);
          peerRetryTimerRef.current = window.setTimeout(() => {
            if (cancelled || peerRef.current !== peer) return;
            setMediaSessionRevision((value) => value + 1);
          }, PEER_RESTART_DELAY_MS);
        });
      } catch (err) {
        console.error('Failed to initialize Study Stream room:', err);
        if (err?.mediaStatus) {
          setMediaStatus(err.mediaStatus);
        }
        setError(err?.message || '카메라를 시작하지 못했습니다.');
      }
    }

    setupLocalMediaAndPeer();

    const activeCalls = callsRef.current;

    return () => {
      cancelled = true;
      window.clearTimeout(peerRetryTimerRef.current);
      peerRetryTimerRef.current = 0;
      setDoc(doc(db, 'studyRooms', roomId, 'participants', user.uid), {
        peerId: '',
        lastSeenAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.warn('Failed to clear peer id:', err);
      });
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
  }, [attachLocalTrackWatchers, mediaSessionRevision, roomId, user.uid, user.displayName, userData?.publicDisplayName, userData?.studentName]);

  useEffect(() => {
    if (!localStreamRef.current || !peerRef.current) return;
    participants.forEach((participant) => {
      if (participant.uid === user.uid || !participant.peerId) return;
      const existingCall = callsRef.current.get(participant.uid);
      if (existingCall?.peer === participant.peerId) return;
      if (existingCall) {
        existingCall.close();
        callsRef.current.delete(participant.uid);
        setRemoteStreams((prev) => prev.filter((item) => item.uid !== participant.uid));
      }
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

  useEffect(() => {
    if (!room || leavingRef.current) return;
    const participantIds = Array.isArray(room.participantIds) ? room.participantIds : [];
    if (participantIds.includes(user.uid)) {
      wasAcceptedParticipantRef.current = true;
      return;
    }
    if (!wasAcceptedParticipantRef.current) return;

    leavingRef.current = true;
    closeRoomResources();
    alert('운영자가 집중방에서 내보냈습니다.');
    if (onLeave) onLeave();
  }, [closeRoomResources, onLeave, room, user.uid]);

  useEffect(() => {
    const originalTitle = originalTitleRef.current;
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      setUnreadChatCount(0);
      document.title = originalTitle;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (document.hidden || unreadChatCount <= 0) return;
    setUnreadChatCount(0);
  }, [unreadChatCount]);

  useEffect(() => {
    document.title = unreadChatCount > 0
      ? `(${unreadChatCount}) Study Stream - ${originalTitleRef.current}`
      : originalTitleRef.current;
  }, [unreadChatCount]);

  useEffect(() => {
    if (!isChatEnabled) return;

    const nextMessages = new Map();
    const alertState = chatAlertStateRef.current;

    participants.forEach((participant) => {
      if (!participant.uid || participant.uid === user.uid) return;
      const message = normalizeChatMessage(participant.chatMessage);
      if (!message) return;

      const updatedMs = getTimestampMs(participant.chatUpdatedAt) || 0;
      const key = `${message}:${updatedMs || 'no-time'}`;
      nextMessages.set(participant.uid, key);

      if (!alertState.initialized) return;
      const previousKey = alertState.messages.get(participant.uid);
      if (previousKey === key) return;

      const senderName = participant.displayName || '크루 멤버';
      setUnreadChatCount((count) => count + 1);

      if (document.hidden && notificationPermission === 'granted' && 'Notification' in window) {
        const notification = new Notification(`${senderName}님의 Study Stream 채팅`, {
          body: message,
          tag: `study-stream-${roomId}-${participant.uid}`,
          renotify: true,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    });

    alertState.initialized = true;
    alertState.messages = nextMessages;
  }, [isChatEnabled, notificationPermission, participants, roomId, user.uid]);

  const toggleCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) {
      await reconnectCamera();
      return;
    }
    if (!hasLiveTrack(stream, 'video')) {
      await reconnectCamera();
      return;
    }
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
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !hasLiveTrack(stream, 'audio')) {
      const reconnected = await reconnectMicrophone();
      if (!reconnected) {
        alert('사용 가능한 마이크 입력이 없습니다. 브라우저 권한과 마이크 장치를 확인해주세요.');
        await updateParticipantPresence({ micOn: false });
        return;
      }
      const nextStream = localStreamRef.current;
      nextStream?.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setMicOn(true);
      await updateParticipantPresence({ micOn: true });
      return;
    }
    const nextValue = !micOn;
    audioTracks.forEach((track) => {
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

  const handleKickParticipant = async (participant) => {
    if (!isHost || !participant?.uid || participant.uid === user.uid || roomAction) return;
    const participantName = participant.label || '크루 멤버';
    if (!window.confirm(`${participantName}님을 집중방에서 내보낼까요?`)) return;

    setRoomAction(`kicking:${participant.uid}`);
    setError('');
    try {
      const kickStudyRoomParticipant = httpsCallable(functions, 'kickStudyRoomParticipant');
      await kickStudyRoomParticipant({ roomId, targetUid: participant.uid });
      soundManager.playClick();
    } catch (err) {
      console.error('Failed to kick study room participant:', err);
      setError(err?.message || '멤버를 내보내지 못했습니다.');
    } finally {
      setRoomAction('');
    }
  };

  const handleRetryMediaSetup = () => {
    setError('');
    setMediaAction('restarting');
    setMediaSessionRevision((value) => value + 1);
    window.setTimeout(() => setMediaAction(''), 400);
  };

  const reconnectCamera = async () => {
    if (mediaAction) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 카메라 접근을 지원하지 않습니다.');
      return false;
    }

    setMediaAction('camera');
    setError('');
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      });
      const [nextTrack] = cameraStream.getVideoTracks().filter(isLiveTrack);
      if (!nextTrack) {
        throw new Error('카메라 영상 트랙을 찾지 못했습니다.');
      }

      const stream = localStreamRef.current || new MediaStream();
      stream.getVideoTracks().forEach((track) => {
        stream.removeTrack(track);
        track.stop();
      });
      stream.addTrack(nextTrack);
      attachLocalTrackWatchers(stream);
      replaceOutgoingTrack('video', nextTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      setCameraOn(true);
      setMediaStatus((prev) => ({
        ...prev,
        phase: prev.microphone === 'blocked' ? 'partial' : 'ready',
        camera: 'ready',
        messages: prev.messages.filter((message) => !message.includes('카메라')),
      }));
      await updateParticipantPresence({ cameraOn: true });
      soundManager.playClick();
      return true;
    } catch (err) {
      console.error('Failed to reconnect camera:', err);
      const message = err?.message && !err.name ? err.message : getMediaErrorMessage(err, 'camera');
      setError(message);
      setMediaStatus((prev) => ({
        ...prev,
        phase: 'partial',
        camera: 'blocked',
        messages: [message],
      }));
      await updateParticipantPresence({ cameraOn: false });
      return false;
    } finally {
      setMediaAction('');
    }
  };

  const reconnectMicrophone = async () => {
    if (mediaAction) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 마이크 접근을 지원하지 않습니다.');
      return false;
    }

    setMediaAction('microphone');
    setError('');
    try {
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: AUDIO_CONSTRAINTS,
      });
      const [nextTrack] = microphoneStream.getAudioTracks().filter(isLiveTrack);
      if (!nextTrack) {
        throw new Error('마이크 입력 트랙을 찾지 못했습니다.');
      }

      const stream = localStreamRef.current || new MediaStream();
      stream.getAudioTracks().forEach((track) => {
        stream.removeTrack(track);
        track.stop();
      });
      nextTrack.enabled = false;
      stream.addTrack(nextTrack);
      attachLocalTrackWatchers(stream);
      replaceOutgoingTrack('audio', nextTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      setMicOn(false);
      setMediaStatus((prev) => ({
        ...prev,
        phase: prev.camera === 'blocked' ? 'partial' : 'ready',
        microphone: 'ready',
        messages: prev.messages.filter((message) => !message.includes('마이크')),
      }));
      await updateParticipantPresence({ micOn: false });
      soundManager.playClick();
      return true;
    } catch (err) {
      console.error('Failed to reconnect microphone:', err);
      const message = err?.message && !err.name ? err.message : getMediaErrorMessage(err, 'microphone');
      setError(message);
      setMediaStatus((prev) => ({
        ...prev,
        phase: 'partial',
        microphone: 'blocked',
        messages: [message],
      }));
      await updateParticipantPresence({ micOn: false });
      return false;
    } finally {
      setMediaAction('');
    }
  };

  const handleLeave = async () => {
    if (leavingRef.current || roomAction) return;
    leavingRef.current = true;
    setRoomAction('leaving');

    try {
      closeRoomResources();
      const leaveStudyRoomSession = httpsCallable(functions, isOpenStudyRoom ? 'leaveOpenStudyRoom' : 'leaveStudyRoomSession');
      await leaveStudyRoomSession({ roomId });
      if (onLeave) onLeave();
    } catch (err) {
      console.error('Failed to leave study room:', err);
      setError('집중방을 종료하지 못했습니다.');
      leavingRef.current = false;
      setRoomAction('');
    }
  };

  const handleOpenMiniWindow = async () => {
    if (!('documentPictureInPicture' in window)) {
      setError('미니 집중방은 Chrome 계열 브라우저의 최신 버전에서 지원됩니다.');
      return;
    }

    try {
      if (miniWindowRef.current && !miniWindowRef.current.closed) {
        miniWindowRef.current.focus();
        return;
      }

      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 420,
      });
      miniWindowRef.current = pipWindow;
      setMiniWindowOpen(true);
      pipWindow.addEventListener('pagehide', () => {
        miniWindowRef.current = null;
        setMiniWindowOpen(false);
      });
      syncMiniStudyWindow(pipWindow, {
        title: room?.title || crew?.name || 'Study Stream 집중방',
        tiles: miniTiles,
        onReturn: () => window.focus(),
      });
      soundManager.playClick();
    } catch (err) {
      console.error('Failed to open mini Study Stream window:', err);
      setError('미니 집중방 창을 열지 못했습니다. 브라우저 권한이나 지원 여부를 확인해주세요.');
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      setError('이 브라우저는 채팅 알림을 지원하지 않습니다.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        soundManager.playClick();
      } else {
        setError('브라우저에서 알림 권한이 허용되지 않았습니다.');
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      setError('채팅 알림 권한을 요청하지 못했습니다.');
    }
  };

  const remoteTiles = participants
    .filter((participant) => participant.uid !== user.uid)
    .map((participant) => {
      const remoteEntry = remoteStreams.find((streamItem) => streamItem.uid === participant.uid);
      return {
        uid: participant.uid,
        label: participant.displayName || '크루 멤버',
        subtitle: getFocusStatusLabel(participant.focusStatus),
        cameraOn: participant.cameraOn !== false,
        micOn: participant.micOn === true,
        stream: remoteEntry?.stream || null,
        role: participant.role,
        chatMessage: participant.chatMessage || '',
        liveStatus: participantProfiles[participant.uid]?.liveStatus || null,
      };
    });
  const localLiveStatusLine = buildLiveLocationLine(participantProfiles[user.uid]?.liveStatus || userData?.liveStatus, nowMs);
  const visibleRemoteTiles = remoteTiles.slice(0, 2);
  const isCompactRoom = viewport.width <= 860;
  const isCompactLandscapeRoom = isCompactRoom && viewport.width > viewport.height;
  const streamGridColumns = isCompactRoom
    ? 'repeat(2, minmax(0, 1fr))'
    : 'repeat(3, minmax(0, 1fr))';
  const streamTileAspectRatio = isCompactRoom
    ? (isCompactLandscapeRoom ? '16 / 10' : '1 / 1')
    : '4 / 5';
  const streamTileGap = isCompactRoom ? '0.55rem' : '0.9rem';
  const emptySlotCount = Math.max(0, 3 - (visibleRemoteTiles.length + 1));
  const localMiniTile = {
    uid: user.uid,
    label: getParticipantLabel(userData, user.displayName || '나'),
    subtitle: getFocusStatusLabel(focusStatus),
    cameraOn,
    stream: localStream,
    message: isChatEnabled ? localChatMessage : '',
    locationLine: localLiveStatusLine,
  };
  const miniTiles = [
    ...visibleRemoteTiles.map((participant) => ({
      uid: participant.uid,
      label: participant.label,
      subtitle: participant.subtitle,
      cameraOn: participant.cameraOn,
      stream: participant.stream,
      message: isChatEnabled ? participant.chatMessage : '',
      locationLine: buildLiveLocationLine(participant.liveStatus, nowMs),
    })),
    localMiniTile,
  ].slice(0, 3);

  useEffect(() => {
    if (!miniWindowRef.current || miniWindowRef.current.closed) return;
    syncMiniStudyWindow(miniWindowRef.current, {
      title: room?.title || crew?.name || 'Study Stream 집중방',
      tiles: miniTiles,
      onReturn: () => window.focus(),
    });
  }, [crew?.name, miniTiles, room?.title]);
  const miniWindowSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  const notificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const notificationLabel = notificationPermission === 'granted'
    ? '채팅 알림 켜짐'
    : notificationPermission === 'denied'
      ? '채팅 알림 차단됨'
      : '채팅 알림 켜기';

  return (
    <div className="glass-card hud-border" style={{ padding: isCompactRoom ? '0.75rem' : '1.1rem', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: isCompactRoom ? '0.75rem' : '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: isCompactRoom ? '0.75rem' : '1rem' }}>
        <div>
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800 }}>STUDY STREAM ROOM</div>
          <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.2rem 0 0', fontSize: isCompactRoom ? '1.08rem' : undefined, lineHeight: 1.25 }}>
            {room?.title || '집중방'}
          </h3>
          <div className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: isCompactRoom ? '0.5rem' : '0.75rem', flexWrap: 'wrap', fontSize: isCompactRoom ? '0.8rem' : undefined }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Radio size={14} /> {room?.status === 'live' ? 'LIVE' : 'WAITING'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} /> 현재 {participants.length}/{room?.maxParticipants || 3}명
            </span>
            <span>{formatRemainingLabel(room, nowMs)}</span>
            {!isOpenStudyRoom && crew?.inviteCode && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Hash size={14} /> {crew.inviteCode}
              </span>
            )}
            <span>{areMicsEnabled ? '마이크 전체 허용' : '마이크 전체 차단'}</span>
            <span>{isChatEnabled ? '채팅 열림' : '채팅 닫힘'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', justifyContent: isCompactRoom ? 'stretch' : 'flex-end', width: isCompactRoom ? '100%' : undefined }}>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={handleOpenMiniWindow}
            disabled={!miniWindowSupported}
            title={miniWindowSupported ? '다른 탭에서도 보이는 미니 집중방 창을 엽니다.' : '이 브라우저는 미니 집중방 창을 지원하지 않습니다.'}
            style={{ flex: isCompactRoom ? '1 1 0' : undefined, minWidth: isCompactRoom ? 0 : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderRadius: '8px', opacity: miniWindowSupported ? 1 : 0.55 }}
          >
            <Video size={16} /> {miniWindowOpen ? '미니창 열림' : '미니창 열기'}
          </button>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={handleEnableNotifications}
            disabled={!notificationSupported || notificationPermission === 'granted' || notificationPermission === 'denied'}
            title="다른 탭에서 공부할 때 Study Stream 채팅을 브라우저 알림으로 받습니다."
            style={{ flex: isCompactRoom ? '1 1 0' : undefined, minWidth: isCompactRoom ? 0 : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderRadius: '8px', opacity: notificationSupported && notificationPermission === 'default' ? 1 : 0.64 }}
          >
            <MessageSquare size={16} /> {notificationLabel}
          </button>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={handleLeave}
            disabled={!!roomAction}
            style={{ flex: isCompactRoom ? '1 1 0' : undefined, minWidth: isCompactRoom ? 0 : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderRadius: '8px' }}
          >
            <PhoneOff size={16} /> {roomAction === 'leaving' ? '나가는 중...' : '방 나가기'}
          </button>
        </div>
      </div>

      {error && (
        <div className="font-tech" style={{ marginBottom: '1rem', color: '#fda4af' }}>
          {error}
        </div>
      )}

      {(mediaStatus.phase !== 'ready' || mediaStatus.camera !== 'ready' || mediaStatus.microphone !== 'ready') && (
        <div className="hud-border" style={{ marginBottom: '1rem', padding: '0.9rem', borderRadius: '10px', background: 'rgba(6, 10, 28, 0.66)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>
                DEVICE CHECK
              </div>
              <div className="font-tech" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem', marginTop: '0.25rem', lineHeight: 1.55 }}>
                카메라 {mediaStatus.camera === 'ready' ? '연결됨' : mediaStatus.phase === 'starting' ? '확인 중' : '확인 필요'} ·
                마이크 {mediaStatus.microphone === 'ready' ? '연결됨' : mediaStatus.phase === 'starting' ? '확인 중' : '확인 필요'}
              </div>
              {mediaStatus.messages.length > 0 && (
                <div className="font-tech" style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '0.35rem', lineHeight: 1.55 }}>
                  {mediaStatus.messages[0]}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={handleRetryMediaSetup}
                disabled={!!mediaAction}
                style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Video size={15} /> {mediaAction === 'restarting' ? '확인 중...' : '전체 다시 확인'}
              </button>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={reconnectCamera}
                disabled={!!mediaAction}
                style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Camera size={15} /> {mediaAction === 'camera' ? '연결 중...' : '카메라 다시 연결'}
              </button>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={reconnectMicrophone}
                disabled={!!mediaAction}
                style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Mic size={15} /> {mediaAction === 'microphone' ? '연결 중...' : '마이크 다시 연결'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: streamGridColumns, gap: streamTileGap, alignItems: 'stretch' }}>
        {visibleRemoteTiles.map((participant) => {
          const isRemoteHost = room?.hostUid === participant.uid || crew?.leaderId === participant.uid;
          return (
            <StreamTile
              key={participant.uid}
              stream={participant.stream}
              muted={false}
              label={participant.label}
              subtitle={participant.subtitle}
              cameraOn={participant.cameraOn}
              micOn={participant.micOn && areMicsEnabled}
              audioBlocked={!areMicsEnabled}
              isLocal={false}
              message={isChatEnabled ? participant.chatMessage : ''}
              badgeLabel={isRemoteHost ? 'HOST' : 'CREW'}
              badgeColor={isRemoteHost ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)'}
              locationLine={buildLiveLocationLine(participant.liveStatus, nowMs)}
              action={isHost && !isRemoteHost ? {
                title: `${participant.label} 내보내기`,
                disabled: roomAction === `kicking:${participant.uid}`,
                onClick: () => handleKickParticipant(participant),
              } : null}
              compact={isCompactRoom}
              style={{ aspectRatio: streamTileAspectRatio }}
            />
          );
        })}
        <StreamTile
          stream={localStream}
          muted
          label={userData?.studentName || user.displayName || '나'}
          subtitle={focusStatus === 'away' ? '자리 비움' : focusStatus === 'break' ? '쉬는 중' : '집중 중'}
          cameraOn={cameraOn}
          micOn={micOn && hasLocalAudioTrack && areMicsEnabled}
          audioBlocked={localMicBlocked}
          isLocal
          message={isChatEnabled ? localChatMessage : ''}
          badgeLabel={isHost ? 'HOST' : 'ME'}
          badgeColor={isHost ? 'rgba(250, 204, 21, 0.22)' : 'rgba(96, 165, 250, 0.18)'}
          liveStatusOverlay={localLiveStatusLine}
          compact={isCompactRoom}
          style={{ aspectRatio: streamTileAspectRatio }}
        />
        {Array.from({ length: emptySlotCount }).map((_, index) => (
          <div key={`empty-${index}`} style={{ ...tileStyle, aspectRatio: streamTileAspectRatio, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.45)' }}>
            <div style={{ textAlign: 'center' }}>
              <Video size={isCompactRoom ? 28 : 34} />
              <div style={{ marginTop: '0.55rem', fontSize: isCompactRoom ? '0.82rem' : undefined }}>초대 대기 슬롯</div>
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

      <div className="hud-border" style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '10px', background: 'rgba(6, 10, 28, 0.46)', display: 'flex', justifyContent: 'space-between', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>
            MICROPHONE
          </div>
          <div className="font-tech" style={{ color: localMicBlocked ? '#fca5a5' : micOn ? 'var(--planet-green)' : 'rgba(255,255,255,0.62)', fontSize: '0.82rem', marginTop: '0.22rem' }}>
            {!areMicsEnabled
              ? '운영자가 전체 마이크를 차단했습니다.'
              : !hasLocalAudioTrack
                ? '마이크 입력 장치를 찾지 못했습니다.'
                : micOn
                  ? '내 마이크가 켜져 있습니다.'
                  : '내 마이크가 음소거되어 있습니다.'}
          </div>
        </div>
        <AudioLevelMeter level={localAudioLevel} muted={!micOn} blocked={localMicBlocked} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={toggleCamera}
          disabled={!!mediaAction}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px', opacity: mediaAction ? 0.55 : 1 }}
        >
          {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
          {mediaAction === 'camera' ? '카메라 연결 중...' : cameraOn ? '카메라 끄기' : hasLocalVideoTrack ? '카메라 켜기' : '카메라 연결'}
        </button>
        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={toggleMic}
          disabled={!areMicsEnabled || !!mediaAction}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px', opacity: areMicsEnabled && !mediaAction ? 1 : 0.55 }}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {!areMicsEnabled ? '마이크 차단됨' : mediaAction === 'microphone' ? '마이크 연결 중...' : !hasLocalAudioTrack ? '마이크 연결' : micOn ? '마이크 끄기' : '마이크 켜기'}
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
