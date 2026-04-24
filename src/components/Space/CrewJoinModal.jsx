import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Hash, ShoppingBag, Users, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';

function getFunctionsErrorMessage(err, fallback) {
  const code = err?.code || '';
  if (code.includes('not-found')) return '해당 초대 코드를 가진 크루를 찾지 못했습니다.';
  if (code.includes('failed-precondition') && err?.message) return err.message;
  if (code.includes('invalid-argument') && err?.message) return err.message;
  return fallback;
}

export default function CrewJoinModal({ isOpen, onClose, crew, onNavigateStore }) {
  const { userData } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const joinPasses = userData?.crewJoinPasses || 0;
  const hasPass = joinPasses > 0;

  const handleJoin = async () => {
    if (busy || !joinCode.trim()) return;
    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const joinCrew = httpsCallable(functions, 'joinStudyCrew');
      await joinCrew({ inviteCode: joinCode.trim().toUpperCase() });
      setSuccess(true);
      setMessage('크루에 합류했습니다! 참여권 1개가 사용되었습니다.');
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

          {/* Pass check */}
          {!hasPass ? (
            <div style={{
              padding: '1.1rem', borderRadius: 10,
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.22)',
              marginBottom: '1rem'
            }}>
              <div className="font-tech" style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '0.4rem' }}>
                ⚠ 참여권이 없습니다
              </div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55, fontSize: '0.88rem' }}>
                크루에 참여하려면 참여권 1개가 필요합니다. 스토어에서 300광석으로 구매할 수 있습니다.
              </div>
              <button
                className="space-btn cosmic-btn font-tech"
                onClick={() => { 
                  soundManager.playClick(); 
                  onClose(); 
                  if (onNavigateStore) onNavigateStore(true); // true means scroll to bottom
                }}
                style={{ marginTop: '0.8rem', padding: '0.7rem 1.1rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <ShoppingBag size={15} /> 스토어로 이동
              </button>
            </div>
          ) : (
            <>
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
                  크루 리더에게 받은 초대 코드를 입력하면 참여권 1개가 사용됩니다.
                </span>
              </label>

              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                보유 참여권: <strong style={{ color: 'var(--crystal-cyan)' }}>{joinPasses}개</strong>
              </div>

              <button
                className="space-btn cosmic-btn font-tech"
                disabled={busy || !joinCode.trim() || success}
                onClick={handleJoin}
                style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: 8, fontSize: '1rem' }}
              >
                {busy ? '참여 중...' : success ? '✅ 합류 완료!' : '참여권으로 합류하기'}
              </button>
            </>
          )}

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
