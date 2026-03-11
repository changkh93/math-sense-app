import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, KeyRound, AlertCircle } from 'lucide-react';

const RegionAccessModal = ({ isOpen, onClose, region, onSubmitCode, loading, error }) => {
  const [code, setCode] = useState('');

  if (!isOpen || !region) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmitCode(region, code.trim());
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay" 
        style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="glass-card zoom-in" 
          style={{ padding: '2.5rem', width: '90%', maxWidth: '400px', background: 'rgba(5, 10, 25, 0.95)', border: '1px solid var(--neon-blue)', textAlign: 'center' }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>

          <Lock size={48} color="var(--crystal-cyan)" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px var(--crystal-cyan))' }} />
          
          <h2 className="font-title" style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.5rem' }}>접근 권한 필요</h2>
          <p className="font-tech" style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--planet-green)', fontWeight: 'bold' }}>{region.title}</span> 행성에 진입하려면<br/>선생님이 발급한 접근 코드가 필요합니다.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <KeyRound size={20} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="접근 코드 입력"
                className="glass font-tech"
                style={{ 
                  width: '100%', 
                  padding: '1rem 1rem 1rem 3rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: error ? '1px solid #ef4444' : '1px solid rgba(0, 243, 255, 0.3)', 
                  color: 'var(--star-gold)', 
                  borderRadius: '12px', 
                  fontSize: '1.2rem',
                  letterSpacing: '2px',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              className="hud-btn primary glass font-title" 
              style={{ padding: '1rem', marginTop: '1rem', fontSize: '1.1rem', background: 'rgba(0, 243, 255, 0.1)', borderColor: 'var(--neon-blue)' }}
              disabled={loading || !code.trim()}
            >
              {loading ? '검증 중...' : '접속 승인 요청'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RegionAccessModal;
