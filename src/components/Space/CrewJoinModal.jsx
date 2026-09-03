import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Hash, Users, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import soundManager from '../../utils/SoundManager';

function getFunctionsErrorMessage(err, fallback) {
  const code = err?.code || '';
  if (code.includes('not-found')) return '해당 초대 코드를 가진 크루를 찾지 못했습니다.';
  if (code.includes('failed-precondition') && err?.message) return err.message;
  if (code.includes('invalid-argument') && err?.message) return err.message;
  return fallback;
}

export default function CrewJoinModal({ isOpen, onClose, crew, eventParticipationCompleted = false }) {
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    if (busy || !joinCode.trim()) return;
    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const joinCrew = httpsCallable(functions, 'joinStudyCrew');
      await joinCrew({ inviteCode: joinCode.trim().toUpperCase() });
      setSuccess(true);
      setMessage('크루에 합류했습니다!');
      soundManager.playLevelUp();
      setTimeout(() => {
        onClose(true); // true = refresh needed
      }, 1500);
    } catch (err) {
      console.error('Failed to join crew:', err);
      setMessage(getFunctionsErrorMessage(err, '크루 참가에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}
      >
        <Motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 440,
            background: 'rgba(7, 13, 30, 0.96)',
            border: '1px solid rgba(0, 243, 255, 0.22)',
            borderRadius: 14, padding: '1.6rem',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.2rem' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.82rem' }}>CREW JOIN</div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.25rem 0 0', fontSize: '1.3rem' }}>
                크루 참여하기
              </h3>
            </div>
            <button onClick={() => !busy && onClose()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Crew info (if provided) */}
          {crew && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.85rem',
              padding: '0.9rem', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '1.1rem'
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 8, flexShrink: 0,
                background: crew.color || '#00d4ff',
                boxShadow: `0 0 16px ${(crew.color || '#00d4ff')}44`
              }} />
              <div style={{ minWidth: 0 }}>
                <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 700 }}>
                  {crew.name || '이름 없는 크루'}
                </div>
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={13} /> {crew.memberCount || crew.memberIds?.length || 1}명
                  <span>·</span>
                  <span>{crew.groupName || '자유 스터디'}</span>
                </div>
              </div>
            </div>
          )}

          {eventParticipationCompleted && (
            <div className="font-tech" style={{ marginBottom: '1rem', padding: '0.75rem 0.85rem', borderRadius: 9, border: '1px solid rgba(240,171,252,0.28)', background: 'rgba(126,34,206,0.1)', color: '#f0abfc', fontSize: '0.78rem', lineHeight: 1.55 }}>
              크루 가입과 활동은 언제든 자유롭게 가능합니다. 다만 이전 크루에서 성장 이벤트에 참여한 이력이 있는 계정은 이번 이벤트의 달성 인원 및 광석 보상 대상에는 다시 포함되지 않습니다.
            </div>
          )}

          {/* Code input */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.8rem' }}>
                <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>
                  <Hash size={14} style={{ verticalAlign: -2 }} /> 초대 코드 입력
                </span>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="예: AB7Q2X"
                  maxLength={8}
                  disabled={busy || success}
                  style={{
                    width: '100%', minHeight: 48, boxSizing: 'border-box',
                    borderRadius: 8, border: '1px solid rgba(0, 243, 255, 0.28)',
                    background: 'rgba(5, 10, 24, 0.72)', color: 'var(--text-bright)',
                    padding: '0.75rem 0.9rem', outline: 'none',
                    fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.15em', textAlign: 'center',
                    fontFamily: 'var(--font-tech)'
                  }}
                />
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  크루 리더에게 받은 초대 코드를 입력하면 누구나 합류할 수 있습니다.
                </span>
              </label>

          <button
            className="space-btn cosmic-btn font-tech"
            disabled={busy || !joinCode.trim() || success}
            onClick={handleJoin}
            style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: 8, fontSize: '1rem' }}
          >
            {busy ? '참여 중...' : success ? '✅ 합류 완료!' : '크루에 합류하기'}
          </button>

          {/* Message */}
          {message && (
            <p className="font-tech" style={{
              marginTop: '0.8rem', fontSize: '0.88rem',
              color: success ? 'var(--planet-green)' : '#f87171',
              lineHeight: 1.45
            }}>
              {message}
            </p>
          )}
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
