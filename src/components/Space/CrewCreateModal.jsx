import React, { useState, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Palette, ShoppingBag, Sparkles, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';

const CREW_GROUP_PRESETS = [
  { id: 'python', name: '파이썬' },
  { id: 'elementary_math', name: '초등수학' },
  { id: 'middle_math', name: '중등수학' }
];

const inputStyle = {
  width: '100%', minHeight: 46, boxSizing: 'border-box',
  borderRadius: 8, border: '1px solid rgba(0, 243, 255, 0.28)',
  background: 'rgba(5, 10, 24, 0.72)', color: 'var(--text-bright)',
  padding: '0.75rem 0.9rem', outline: 'none',
  fontFamily: 'var(--font-tech)'
};

function getFunctionsErrorMessage(err, fallback) {
  const code = err?.code || '';
  if (code.includes('not-found')) return '해당 초대 코드를 가진 크루를 찾지 못했습니다.';
  if (code.includes('failed-precondition') && err?.message) return err.message;
  if (code.includes('invalid-argument') && err?.message) return err.message;
  return fallback;
}

export default function CrewCreateModal({ isOpen, onClose, onNavigateStore }) {
  const { user, userData } = useAuth();
  const { data: clusters, isLoading: loadingClusters } = useClusters();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '', motto: '', color: '#00d4ff', groupId: 'none'
  });

  const creationPasses = userData?.crewCreationPasses || 0;
  const hasPass = creationPasses > 0;

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

  const selectedGroup = groupOptions.find(o => o.id === formData.groupId) || groupOptions[0];

  const handleCreate = async () => {
    if (!user?.uid || busy) return;
    if (!formData.name.trim()) {
      setMessage('크루 이름을 입력해주세요.');
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

      setSuccess(true);
      setMessage('크루가 생성되었습니다! 운영자 인증 후 Study Stream이 열립니다.');
      soundManager.playLevelUp();
      setTimeout(() => {
        onClose(true);
      }, 1800);
    } catch (err) {
      console.error('Failed to create crew:', err);
      setMessage(getFunctionsErrorMessage(err, '크루 생성에 실패했습니다.'));
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
            width: '100%', maxWidth: 500,
            background: 'rgba(7, 13, 30, 0.96)',
            border: '1px solid rgba(0, 243, 255, 0.22)',
            borderRadius: 14, padding: '1.6rem',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh', overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.2rem' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.82rem' }}>NEW CREW</div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.25rem 0 0', fontSize: '1.3rem' }}>
                새 크루 만들기
              </h3>
            </div>
            <button onClick={() => !busy && onClose()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Pass check */}
          {!hasPass ? (
            <div style={{
              padding: '1.1rem', borderRadius: 10,
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.22)',
            }}>
              <div className="font-tech" style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '0.4rem' }}>
                ⚠ 창설권이 없습니다
              </div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55, fontSize: '0.88rem' }}>
                크루를 만들려면 창설권 1개가 필요합니다. 스토어에서 1,000광석으로 구매할 수 있습니다.
              </div>
              <button
                className="space-btn cosmic-btn font-tech"
                onClick={() => { 
                  soundManager.playClick(); 
                  onClose(); 
                  if (onNavigateStore) onNavigateStore(true); 
                }}
                style={{ marginTop: '0.8rem', padding: '0.7rem 1.1rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <ShoppingBag size={15} /> 스토어에서 구매하기
              </button>
            </div>
          ) : (
            <>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                보유 창설권: <strong style={{ color: 'var(--crystal-cyan)' }}>{creationPasses}개</strong>
                <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>· 생성 시 1개 차감</span>
              </div>

              {/* Form */}
              <div style={{ display: 'grid', gap: '0.9rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 이름 *</span>
                  <input
                    style={inputStyle}
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 오메가 증명단"
                    maxLength={28}
                    disabled={busy || success}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 모토</span>
                  <input
                    style={inputStyle}
                    value={formData.motto}
                    onChange={e => setFormData(prev => ({ ...prev, motto: e.target.value }))}
                    placeholder="서로의 설명을 끝까지 듣는다"
                    maxLength={52}
                    disabled={busy || success}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>학습 군집</span>
                  <select
                    style={inputStyle}
                    value={formData.groupId}
                    onChange={e => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                    disabled={busy || success}
                  >
                    {groupOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  {loadingClusters && (
                    <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>군집 정보를 불러오는 중...</span>
                  )}
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Palette size={14} /> 엠블럼 색상
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <input
                      type="color"
                      style={{ ...inputStyle, width: 52, height: 42, padding: '0.2rem', cursor: 'pointer' }}
                      value={formData.color}
                      onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      disabled={busy || success}
                    />
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: formData.color,
                      boxShadow: `0 0 14px ${formData.color}55`,
                      border: '1px solid rgba(255,255,255,0.12)'
                    }} />
                    <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      언제든 수정 가능합니다
                    </span>
                  </div>
                </label>
              </div>

              <button
                className="space-btn cosmic-btn font-tech"
                disabled={busy || !formData.name.trim() || success}
                onClick={handleCreate}
                style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: 8, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                <Sparkles size={16} />
                {busy ? '생성 중...' : success ? '✅ 생성 완료!' : '창설권으로 크루 생성'}
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
