import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

const RegionEditModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    isPrivate: false,
    accessCode: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialData?.title || '',
        isPrivate: !!initialData?.isPrivate,
        accessCode: initialData?.accessCode || ''
      });
      
      // Auto-generate code if making private for the first time
      if (initialData && !initialData.accessCode) {
         setFormData(prev => ({ ...prev, accessCode: generateCode() }));
      }
    }
  }, [isOpen, initialData]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleGenerateNewCode = () => {
    setFormData(prev => ({
      ...prev,
      accessCode: generateCode()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      ...initialData,
      title: formData.title.trim(),
      isPrivate: formData.isPrivate,
      accessCode: formData.isPrivate ? formData.accessCode : null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card zoom-in" style={{ padding: '2rem', width: '90%', maxWidth: '400px', background: '#1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--crystal-cyan)' }}>
            {initialData?.isNew ? '행성 추가' : '행성 설정 (Region)'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>행성 이름 (Region Title)</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="glass"
              style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
              placeholder="예: 멀티플루비아"
              autoFocus
              required
            />
          </div>

          <div className="form-group row-group" style={{ marginTop: '0.5rem' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={formData.isPrivate}
                onChange={(e) => {
                  const isPrivate = e.target.checked;
                  setFormData({ 
                    ...formData, 
                    isPrivate,
                    accessCode: isPrivate && !formData.accessCode ? generateCode() : formData.accessCode
                  });
                }}
              />
              접근 제한 (초대 코드 활성화)
            </label>
          </div>

          {formData.isPrivate && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--neon-blue)' }}>
              <label style={{ color: 'var(--neon-blue)', fontSize: '0.85rem' }}>초대 코드 (Access Code)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                  className="glass"
                  style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0, 243, 255, 0.3)', color: '#fff', borderRadius: '6px', textAlign: 'center', letterSpacing: '2px', fontFamily: 'monospace' }}
                />
                <button type="button" onClick={handleGenerateNewCode} className="icon-btn" title="코드 재생성" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '0 0.8rem', cursor: 'pointer', color: '#fff' }}>
                  <RefreshCw size={16} />
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0', lineHeight: 1.4 }}>
                코드를 갱신하면 기존 코드는 무효화됩니다.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="hud-btn secondary glass" style={{ padding: '0.6rem 1.2rem' }}>
              취소
            </button>
            <button type="submit" className="hud-btn primary glass" style={{ padding: '0.6rem 1.2rem', borderColor: 'var(--planet-green)' }}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegionEditModal;
